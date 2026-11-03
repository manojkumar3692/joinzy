import {randomBytes} from 'node:crypto';
const email='customer@joinzy.local',password='Joinzy-'+randomBytes(12).toString('base64url');
import http from 'node:http';
function post(role,action){return new Promise((resolve,reject)=>{const req=http.request({hostname:'127.0.0.1',port:3012,path:'/api/demo',method:'POST',headers:{host:`${role}.localhost:3012`,origin:`http://${role}.localhost:3012`,'content-type':'application/json'}},res=>{let body='';res.on('data',x=>body+=x);res.on('end',()=>{try{const d=JSON.parse(body);if(res.statusCode!==200)reject(Error(d.error));else resolve(d);}catch(e){reject(e);}});});req.on('error',reject);req.end(JSON.stringify(action));});}

const d=await post('resident',{type:'signup',input:{name:'Osian Test Customer',email,password,communityId:'osian-chlorophyll',phone:'9876543210',block:'Tower A',flat:'101',proof:{type:'society',nameMatches:true,name:'LOCAL-TEST-ONLY-not-residence-verification.png',data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6zS8AAAAASUVORK5CYII='}}});
await post('admin',{type:'reviewResident',residentId:d.currentResident.id,decision:'approved',reason:'User-authorized local end-to-end test account. Placeholder document only; no real residence verification performed.'});
console.log(JSON.stringify({email,password,residentId:d.currentResident.id}));
