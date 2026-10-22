// Run against a disposable local demo; resets data before and after testing.
import assert from 'node:assert/strict';
const endpoint='http://127.0.0.1:3000/api/demo';
async function post(action){const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(action)});return {status:r.status,data:await r.json()};}
await post({type:'reset',role:'admin'});
try {
 const results=await Promise.all(Array.from({length:20},()=>post({type:'book',role:'resident',dealId:'clean',quantity:1,requestId:crypto.randomUUID()})));
 assert.equal(results.filter(r=>r.status===200).length,9);assert.equal(results.filter(r=>r.status===400).length,11);
 let state=await (await fetch(endpoint)).json();assert.equal(state.deals.find(d=>d.id==='clean').joined,16);assert.equal(state.bookings.length,9);
 const replay=await post({type:'book',role:'resident',dealId:'clean',quantity:1,requestId:state.bookings[0].requestId});assert.equal(replay.data.bookings.length,9);
 assert.equal((await post({type:'close',role:'resident',dealId:'clean'})).status,400);
 await post({type:'close',role:'admin',dealId:'clean'});state=(await post({type:'fulfill',role:'business',dealId:'clean'})).data;
 assert.ok(state.bookings.every(b=>b.status==='completed'&&b.balance===0));
 await post({type:'book',role:'resident',dealId:'laundry',quantity:1,requestId:crypto.randomUUID()});state=(await post({type:'close',role:'admin',dealId:'laundry'})).data;
 assert.equal(state.bookings.find(b=>b.dealId==='laundry').status,'refunded');
 console.log('PASS: 20 concurrent requests → 9 accepted, 11 rejected; idempotency, role enforcement, fulfillment and failure refunds.');
} finally {await post({type:'reset',role:'admin'});}
