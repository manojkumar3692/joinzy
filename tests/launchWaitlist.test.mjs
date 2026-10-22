import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeLaunchInterest,saveLaunchInterest} from '../lib/launchWaitlist.mjs';
import {seed} from '../lib/domain.mjs';
import {publicState} from '../lib/residents.mjs';
const input={name:' Test Resident ',email:' JOIN@example.test ',audience:'resident',country:'India',city:'Bengaluru',organisation:'Sample society',consent:true};
test('launch waitlist validates consent, contact and market',()=>{assert.equal(normalizeLaunchInterest(input).email,'join@example.test');for(const patch of [{consent:false},{email:'invalid'},{country:'Other'},{audience:'admin'},{organisation:''}])assert.throws(()=>normalizeLaunchInterest({...input,...patch}));});
test('waitlist repeats are idempotent, separate audiences are retained',()=>{const s={};saveLaunchInterest(s,input);saveLaunchInterest(s,{...input,email:'join@example.test'});assert.equal(s.launchWaitlists.length,1);saveLaunchInterest(s,{...input,audience:'business'});assert.equal(s.launchWaitlists.length,2);assert.equal(s.launchWaitlists[0].status,'waiting');});
test('launch contacts are only visible to admin',()=>{const s=seed();saveLaunchInterest(s,input);for(const role of ['public','resident','business'])assert.equal(publicState(s,undefined,role).launchWaitlists.length,0);assert.equal(publicState(s,undefined,'admin').launchWaitlists[0].email,'join@example.test');});
