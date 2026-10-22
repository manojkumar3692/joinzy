import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {seed} from '../lib/domain.mjs';
test('persistent store serializes competing approvals and concurrent slot bookings',async()=>{
 const cwd=process.cwd();const temp=await mkdtemp(path.join(tmpdir(),'together-store-'));process.chdir(temp);
 try{
  await mkdir(path.join(temp,'.demo'));await writeFile(path.join(temp,'.demo/state.json'),JSON.stringify(seed()));
  const {transact}=await import('../lib/store.mjs');const state=await transact(null);const pending=state.deals.filter(d=>d.managed&&d.status==='pending');
  const results=await Promise.allSettled(pending.map(d=>transact({type:'reviewOffer',role:'admin',dealId:d.id,decision:'approve',dates:d.requestedDates,reason:'Concurrent approval test',overrideReason:'Test availability verified independently'})));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected').length,1);
  const saved=await transact(null);const winner=saved.deals.find(d=>pending.some(p=>p.id===d.id)&&d.status==='open');
  const bookings=await Promise.allSettled(Array.from({length:20},()=>transact({type:'book',role:'resident',dealId:winner.id,slotId:winner.slots[0].id,quantity:1,requestId:crypto.randomUUID()})));
  assert.equal(bookings.filter(r=>r.status==='fulfilled').length,1);assert.equal(bookings.filter(r=>r.status==='rejected').length,19);
  const final=await transact(null);assert.equal(final.deals.find(d=>d.id===winner.id).joined,1);assert.equal(final.bookings.length,1);
 }finally{process.chdir(cwd);await rm(temp,{recursive:true,force:true});}
});
