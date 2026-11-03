import assert from 'node:assert/strict';
import http from 'node:http';
const base=process.env.JOINZY_URL||'http://127.0.0.1:3012';
async function request(role,action){const host=role+'.localhost:'+new URL(base).port;return new Promise((resolve,reject)=>{const req=http.request(base+'/api/demo',{method:action?'POST':'GET',headers:{host,origin:'http://'+host,'content-type':'application/json'}},res=>{let body='';res.on('data',chunk=>body+=chunk);res.on('end',()=>{try{resolve({response:{status:res.statusCode},data:JSON.parse(body)});}catch(e){reject(e);}});});req.on('error',reject);req.end(action?JSON.stringify(action):undefined);});}

const {response,data}=await request('resident');assert.equal(response.status,200);const ds=data.deals.filter(d=>d.clpCampaign);assert.equal(ds.length,7);assert.ok(ds.every(d=>d.communityId==='osian-chlorophyll'&&d.deposit===d.price/10));
let result=await request('resident',{type:'scheduleClp',dealId:ds[0].id});assert.equal(result.response.status,403);
result=await request('resident',{type:'book',dealId:ds[0].id,quantity:1,requestId:'unauthenticated-smoke'});assert.equal(result.response.status,400);assert.match(result.data.error,/log in/);
const admin=await request('admin');assert.equal(admin.response.status,200);assert.equal(admin.data.deals.filter(d=>d.clpCampaign).length,7);
const again=await request('resident');assert.equal(again.data.deals.filter(d=>d.clpCampaign).length,7);
const bakery=again.data.deals.filter(d=>d.bakeryCampaign);assert.equal(bakery.length,11);assert.ok(bakery.every(d=>d.communityId==='osian-chlorophyll'&&d.min===3&&d.capacity===10&&d.deposit===d.price/10));assert.equal(bakery.find(d=>d.id==='deepthi-osian-brownie').deposit,9.5);
console.log('PASS running HTTP: seven CLP and eleven bakery scoped campaigns, correct 10% deposits, resident/admin API, unauthorized scheduling and booking rejected, repeat reads create no duplicates.');
