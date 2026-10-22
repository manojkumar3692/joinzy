import test from 'node:test';
import assert from 'node:assert/strict';
import {freshSeed} from '../lib/freshSeed.mjs';
import {reconcile} from '../lib/domain.mjs';
test('fresh workspace retains the seven launch businesses and no activity; upgrades do not repopulate it',()=>{
 const s=freshSeed();reconcile(s);reconcile(s);
 assert.deepEqual(s.businesses.map(b=>b.id),['kitchen','wecare','mohan','society-fabric','society-cooling','society-pest','society-laundry']);
 assert.deepEqual(s.categories.map(c=>c.id).sort(),['ac','car','food','laundry-pickup','pest','sofa']);
 for(const key of ['deals','bookings','allocations','audit'])assert.equal(s[key].length,0,key);
 assert.ok(s.packages.every(p=>s.businesses.some(b=>b.id===p.businessId)));
 assert.ok(s.packages.some(p=>p.businessId==='kitchen'&&p.title==='Hyderabadi Biryani'));
 assert.ok(s.packages.some(p=>p.businessId==='wecare'));
 const ac=s.packages.find(p=>p.businessId==='mohan');assert.equal(ac.unit,'AC unit');assert.match(ac.includes,/filter/);assert.match(ac.excludes,/gas refill/);
});
