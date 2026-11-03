import test from 'node:test';
import assert from 'node:assert/strict';
import {portalUrl,portalApiRole} from '../lib/portals.mjs';
test('customer links stay on the current local or deployed origin',()=>{
 for(const host of ['localhost:3012','localhost:3000','127.0.0.1:3012','resident.localhost:3012','joinzy.in','preview.vercel.app']){
  assert.equal(portalUrl('resident','/app?login=1',host),'/app?login=1');
  assert.equal(portalUrl('resident','/app?join=1',host),'/app?join=1');
  assert.equal(portalApiRole(host),'resident');
 }
});
test('root API is resident-only and staff authority stays separate',()=>{
 assert.equal(portalApiRole('business.localhost:3012'),'business');
 assert.equal(portalApiRole('admin.localhost:3012'),'admin');
 assert.equal(portalApiRole('admin.localhost.attacker.test'),'resident');
 assert.equal(portalUrl('business','/app','localhost:3012'),'http://business.localhost:3012/app');
});
