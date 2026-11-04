import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
test('runtime schema round-trips collections, rejects stale writes, survives reruns and denies public access',async()=>{
 const db=new PGlite();try{
 await db.exec('create role anon;create role authenticated;create role service_role bypassrls;');
 const migration=await readFile(new URL('../supabase/runtime/001_app_storage.sql',import.meta.url),'utf8');await db.exec(migration);
 const rpc=async sql=>(await db.query(sql)).rows[0].value;
 assert.deepEqual(await rpc('select joinzy_read_state() as value'),{revision:0,state:null});
 const state={communities:[{id:'osian',name:'Osian'}],residents:[{id:'r1',passwordHash:'test-hash'}],businessAccounts:[{businessId:'b1'}],sessions:[{tokenHash:'session-hash'}],deals:[{id:'offer1',joined:0}],bookings:[],weeklyTemplates:[],couponCampaigns:{a:{code:'JOINZY'}}};
 assert.equal((await db.query('select joinzy_commit_state(0,$1) as value',[JSON.stringify(state)])).rows[0].value,true);
 assert.equal((await db.query('select joinzy_commit_state(0,$1) as value',[JSON.stringify({...state,bookings:[{id:'lost'}]})])).rows[0].value,false);
 await db.exec(migration);const loaded=await rpc('select joinzy_read_state() as value');assert.equal(loaded.revision,1);for(const [k,v]of Object.entries(state))assert.deepEqual(loaded.state[k],v);
 await assert.rejects(db.query('select joinzy_commit_state(1,$1)',[JSON.stringify({...state,bookings:[{id:'duplicate'},{id:'duplicate'}]})]));assert.equal((await rpc('select joinzy_read_state() as value')).revision,1);
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.query('select * from joinzy_residents'),/permission denied/);await assert.rejects(db.query('select joinzy_read_state()'),/permission denied/);await db.exec('reset role');}
 await db.exec('set role service_role');assert.equal((await rpc('select joinzy_read_state() as value')).revision,1);await db.exec('reset role');
 }finally{await db.close();}
});
