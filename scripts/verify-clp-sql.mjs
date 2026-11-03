import {readFile,readdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
// Pass a locally installed @electric-sql/pglite entry point, or install it as a dev dependency.
const {PGlite}=await import(process.env.PGLITE_PATH?pathToFileURL(process.env.PGLITE_PATH).href:'@electric-sql/pglite');
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`);
for(const file of ['schema.sql','seed.sql',...(await readdir('supabase')).filter(x=>/^\d.*sql$/.test(x)).sort()]){await db.exec(await readFile('supabase/'+file,'utf8'));console.log('PASS migration',file);}
await db.exec(await readFile('supabase/014_bakery_and_percentage_deposits.sql','utf8'));
const owner='00000000-0000-4000-8000-000000000001',admin='00000000-0000-4000-8000-000000000002';
for(const id of [owner,admin])await db.query('insert into auth.users values($1);',[id]);
for(const id of [owner,admin])await db.query("insert into profiles values($1,'CLP test')",[id]);
await db.query("insert into memberships values($1,'osian-chlorophyll','admin')",[admin]);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[admin]);
await db.query('select seed_clp_campaigns($1)',[owner]);await db.query('select seed_clp_campaigns($1)',[owner]);
const ds=(await db.query('select * from deals where clp_key is not null order by clp_key')).rows;assert.equal(ds.length,7);assert.ok(ds.every(d=>d.minimum===5&&d.capacity===10&&d.deposit_minor===d.price_minor/10));
await db.query("update business_profiles set status='verified' where owner_id=$1",[owner]);
const close=new Date(Date.now()+86400000).toISOString();
// Use fixed India daytime to avoid crossing midnight on arbitrary test run times.
const day=new Date(Date.now()+4*86400000).toISOString().slice(0,10);
const makeSlots=offset=>Array.from({length:10},(_,i)=>{const start=Date.parse(day+'T08:00:00+05:30')+offset*86400000+i*3600000;return {start:new Date(start).toISOString(),end:new Date(start+3600000).toISOString()};});
await db.query('select schedule_clp_campaign($1,$2,$3,$4)',[ds[0].id,close,JSON.stringify(makeSlots(0)),'Confirmed CLP hours']);
await assert.rejects(db.query('select schedule_clp_campaign($1,$2,$3,$4)',[ds[1].id,close,JSON.stringify(makeSlots(0)),'Conflicting CLP hours']),/overlap/);
await db.query('select schedule_clp_campaign($1,$2,$3,$4)',[ds[1].id,close,JSON.stringify(makeSlots(1)),'Confirmed CLP hours']);
const residentIds=[];for(let i=0;i<11;i++){const id='10000000-0000-4000-8000-'+String(i).padStart(12,'0');residentIds.push(id);await db.query('insert into auth.users values($1)',[id]);await db.query("insert into profiles values($1,'Resident')",[id]);await db.query("insert into memberships values($1,'osian-chlorophyll','resident')",[id]);}
async function book(d,n,reference){const ss=(await db.query('select id from service_slots where deal_id=$1 order by starts_at',[d.id])).rows;return db.query("select book_service_deposit($1,$2,$3,1,$4,$5,'INR')",[d.id,ss[n%10].id,residentIds[n],reference||d.id+n,d.deposit_minor]);}
for(let i=0;i<5;i++)await book(ds[0],i);for(let i=0;i<4;i++)await book(ds[1],i);await book(ds[0],0);
let statuses=(await db.query('select id,status,joined from deals where id=any($1::uuid[])',[[ds[0].id,ds[1].id]])).rows;
assert.equal(statuses.find(d=>d.id===ds[0].id).joined,5);assert.equal(statuses.find(d=>d.id===ds[1].id).status,'open');
for(let i=5;i<10;i++)await book(ds[0],i);await assert.rejects(book(ds[0],10),/capacity/);
await db.query("select transition_deal($1,'close')",[ds[1].id]);assert.equal((await db.query('select status from deals where id=$1',[ds[1].id])).rows[0].status,'failed');assert.equal((await db.query('select count(*)::int as n from refund_jobs')).rows[0].n,4);
console.log('PASS SQL rerun, seven campaigns, schedule overlap, separate minimums, idempotent payment, max ten, failure/refund jobs');
const bakeryOwner='00000000-0000-4000-8000-000000000003';await db.query('insert into auth.users values($1)',[bakeryOwner]);await db.query("insert into profiles values($1,'Bakery owner')",[bakeryOwner]);
await db.query('select seed_deepthi_campaigns($1)',[bakeryOwner]);await db.query('select seed_deepthi_campaigns($1)',[bakeryOwner]);
const bakery=(await db.query('select * from deals where bakery_key is not null order by bakery_key')).rows;assert.equal(bakery.length,11);assert.ok(bakery.every(d=>d.minimum===3&&d.capacity===10&&d.deposit_minor===d.price_minor/10));
const brownie=bakery.find(d=>d.bakery_key==='brownie'),box=bakery.find(d=>d.bakery_key==='brownie-250g');assert.equal(brownie.price_minor,9500);assert.equal(box.price_minor,44000);
const pickup=day+'T16:00:00+05:30',end=day+'T18:00:00+05:30';
await assert.rejects(db.query('select schedule_bakery_campaign($1,$2,$3,$4,$5,$6,$7)',[brownie.id,close,pickup,end,'Test pickup point','Test allergen details','Test scheduling decision']),/Approved bakery/);
await db.query("update business_profiles set status='verified',document_exception=true where owner_id=$1",[bakeryOwner]);
for(const d of [brownie,box])await db.query('select schedule_bakery_campaign($1,$2,$3,$4,$5,$6,$7)',[d.id,close,pickup,end,'Test pickup point','Test allergen details','Test scheduling decision']);
const bakerySlot=async d=>(await db.query('select id from service_slots where deal_id=$1',[d.id])).rows[0].id;
async function bakeryBook(d,n,units=1){return db.query("select book_bakery_deposit($1,$2,$3,$4,$5,$6,'INR')",[d.id,await bakerySlot(d),residentIds[n],units,'bakery-'+d.id+'-'+n,d.price_minor*units/10]);}
await bakeryBook(brownie,0,4);await bakeryBook(brownie,0,4);
assert.equal((await db.query('select joined from deals where id=$1',[brownie.id])).rows[0].joined,1);
let row=(await db.query('select * from bookings where deal_id=$1',[brownie.id])).rows[0];assert.equal(row.quantity,1);assert.equal(row.bakery_units,4);assert.equal(row.total_minor,38000);assert.equal(row.deposit_minor,3800);
await assert.rejects(db.query("select book_service_deposit($1,$2,$3,1,'wrong-rpc',950,'INR')",[brownie.id,await bakerySlot(brownie),residentIds[0]]),/Invalid bakery/);
await assert.rejects(db.query("select book_bakery_deposit($1,$2,$3,1,'wrong-price',9900,'INR')",[brownie.id,await bakerySlot(brownie),residentIds[0]]),/Payment mismatch/);
await bakeryBook(brownie,1);await bakeryBook(brownie,2);await bakeryBook(box,0,4);
assert.equal((await db.query('select status from deals where id=$1',[brownie.id])).rows[0].status,'confirmed');assert.equal((await db.query('select status from deals where id=$1',[box.id])).rows[0].status,'open');
for(let i=3;i<10;i++)await bakeryBook(brownie,i);await assert.rejects(bakeryBook(brownie,10),/capacity/);
await db.query("select transition_deal($1,'close')",[box.id]);assert.equal((await db.query('select joined from deals where id=$1',[box.id])).rows[0].joined,0);
assert.equal((await db.query('select amount_minor from refund_jobs r join bookings b on b.id=r.booking_id where b.deal_id=$1',[box.id])).rows[0].amount_minor,17600);
// Represent a pre-policy booking; rerunning 014 must not rewrite its paid deposit.
const historic=(await db.query('select id from bookings where deal_id=$1 limit 1',[ds[0].id])).rows[0].id;
await db.query('update bookings set deposit_minor=9900 where id=$1',[historic]);
await db.exec(await readFile('supabase/014_bakery_and_percentage_deposits.sql','utf8'));
assert.equal((await db.query('select deposit_minor from bookings where id=$1',[historic])).rows[0].deposit_minor,9900);
assert.equal((await db.query('select count(*)::int as n from deals where bakery_key is not null')).rows[0].n,11);
console.log('PASS SQL bakery: eleven products, repeatable seed, credential gate, multi-unit order counts, exact 10% deposits, invalid payment/RPC rejected, independent minimums, ten-order cap, refunds, historical CLP deposit preserved.');
await db.close();
