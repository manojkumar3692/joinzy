import test from 'node:test';
import assert from 'node:assert/strict';
import {freshSeed} from '../lib/freshSeed.mjs';
import {residentAction,residentFor,publicState} from '../lib/residents.mjs';
const input={name:'Verification Resident',email:'verification@example.test',password:'test-password-123',communityId:'osian-chlorophyll',phone:'+91 9876543210',block:'Tower B',flat:'204'};
const proof={name:'maintenance.png',data:'data:image/png;base64,aGVsbG8=',type:'maintenance',nameMatches:true};
test('signup without proof allows browsing; admin must wait for document before approval',()=>{
 const s=freshSeed();s.deals.forEach(d=>d.status='open');const token=residentAction(s,{type:'signup',input});const r=residentFor(s,token);
 assert.equal(r.status,'pending');assert.equal(r.proof,undefined);assert.equal(r.flat,'204');assert.ok(publicState(s,token).deals.length>0);
 const review={type:'reviewResident',role:'admin',residentId:r.id,decision:'approved',reason:'Checked resident details'};
 assert.throws(()=>residentAction(s,review),/upload residence proof/);
 residentAction(s,{type:'resubmitProof',input:{proof}},token);
 assert.equal(r.proof.type,'maintenance');assert.ok(r.proof.submittedAt);
 const admin=publicState(s,undefined,'admin').residents[0];assert.equal(admin.phone,input.phone);assert.equal(admin.block,input.block);assert.equal(admin.proof.data,proof.data);
 const customer=publicState(s,token);assert.equal(customer.currentResident.proof,undefined);assert.equal(customer.currentResident.proofName,proof.name);assert.equal(publicState(s,undefined).residents.length,0);assert.equal(publicState(s,undefined,'business').residents.length,0);
 residentAction(s,{...review,decision:'rejected',reason:'Please provide society confirmation'});assert.equal(r.status,'rejected');
 residentAction(s,{type:'resubmitProof',input:{proof:{...proof,type:'society',nameMatches:false,explanation:'My spouse is the named resident'}}},token);assert.equal(r.status,'pending');assert.equal(r.reviewNote,'');
 residentAction(s,review);assert.equal(r.status,'approved');assert.throws(()=>residentAction(s,{type:'resubmitProof',input:{proof}},token),/unverified/);
});
test('contact, address and document validation cannot be bypassed through API input',()=>{
 for(const change of [{phone:''},{phone:'abcdefghij'},{block:' '},{flat:''}])assert.throws(()=>residentAction(freshSeed(),{type:'signup',input:{...input,...change}}));
 const s=freshSeed(),token=residentAction(s,{type:'signup',input});
 for(const change of [{type:'passport'},{nameMatches:undefined},{nameMatches:false,explanation:''},{data:'data:text/html;base64,aGVsbG8='},{data:'data:application/pdf;base64,'+Buffer.alloc(2*1024*1024+1).toString('base64')}])assert.throws(()=>residentAction(s,{type:'resubmitProof',input:{proof:{...proof,...change}}},token));
 assert.throws(()=>residentAction(s,{type:'resubmitProof',input:{proof}},'wrong-session'),/unverified/);
 assert.equal(residentFor(s,token).proof,undefined);
});
