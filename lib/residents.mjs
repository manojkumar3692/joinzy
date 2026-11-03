import {couponForResident} from './eonCampaign.mjs';
import {cleanDisplayCopy} from './displayCopy.mjs';
import {isActiveSociety} from './customerAccess.mjs';
import {bookingCount} from './depositPolicy.mjs';
import {scryptSync,randomBytes,createHash,timingSafeEqual} from 'node:crypto';
const check=(v,m)=>{if(!v)throw new Error(m);};
const hash=t=>createHash('sha256').update(t).digest('hex');
const proofTypes=['maintenance','rental','utility','society','masked_aadhaar'];
function validateProof(p){
 check(p&&/^data:(image\/(png|jpeg)|application\/pdf);base64,[A-Za-z0-9+/=]+$/.test(p.data)&&Buffer.from(p.data.split(',')[1],'base64').length<=2*1024*1024,'Upload a PNG, JPG or PDF proof, up to 2 MB.');
 check(proofTypes.includes(p.type),'Choose an accepted document type.');
 check(typeof p.nameMatches==='boolean','Tell us whether your name is on the document.');
 check(p.nameMatches||typeof p.explanation==='string'&&p.explanation.trim().length>=5,'Explain whose name is on the document and your relationship.');
 return {name:String(p.name||'Residence proof').slice(0,150),data:p.data,type:p.type,nameMatches:p.nameMatches,explanation:p.nameMatches?'':p.explanation.trim().slice(0,500),submittedAt:new Date().toISOString()};
}
export function residentFor(s,token){const session=(s.sessions||[]).find(x=>x.tokenHash===hash(token||'')&&x.expires>Date.now());return (s.residents||[]).find(r=>r.id===session?.residentId);}
export function residentAction(s,a,token){s.residents??=[];s.sessions??=[];
 if(a.type==='signup'){
 const i=a.input||{};check(i.name?.trim().length>=2,'Enter your full name.');check(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.email||''),'Enter a valid email.');check(typeof i.password==='string'&&i.password.length>=10,'Use a password of at least 10 characters.');check(isActiveSociety(i.communityId),'This society is not open yet. Request your society through the waiting list.');check(!s.residents.some(r=>r.email===i.email.trim().toLowerCase()),'An account already exists with this email. Please log in.');
 check(typeof i.phone==='string'&&/^\+?[0-9 ()-]+$/.test(i.phone)&&i.phone.replace(/\D/g,'').length>=10&&i.phone.replace(/\D/g,'').length<=15,'Enter a valid phone number, including country code if outside India.');
 check(typeof i.block==='string'&&i.block.trim().length>=1&&i.block.trim().length<=80,'Enter your block / building.');
 check(typeof i.flat==='string'&&i.flat.trim().length>=1&&i.flat.trim().length<=40,'Enter your flat / door number.');
 const proof=i.proof?validateProof(i.proof):undefined;
 const salt=randomBytes(16).toString('hex');s.residents.push({id:crypto.randomUUID(),name:i.name.trim(),email:i.email.trim().toLowerCase(),communityId:i.communityId,status:'pending',phone:i.phone.trim(),block:i.block.trim(),flat:i.flat.trim(),proof,salt,passwordHash:scryptSync(i.password,salt,64).toString('hex'),createdAt:new Date().toISOString(),reviewNote:''});
 a={type:'login',input:i};
 }
 if(a.type==='login'){const r=s.residents.find(r=>r.email===a.input?.email?.trim().toLowerCase());check(r&&typeof a.input?.password==='string'&&timingSafeEqual(Buffer.from(r.passwordHash,'hex'),scryptSync(a.input.password,r.salt,64)),'Email or password is incorrect.');const next=randomBytes(32).toString('hex');s.sessions.push({tokenHash:hash(next),residentId:r.id,expires:Date.now()+7*86400000});return next;}
 if(a.type==='logout'){s.sessions=s.sessions.filter(x=>x.tokenHash!==hash(token||''));return '';}
 if(a.type==='reviewResident'){check(a.role==='admin','Admin access required.');const r=s.residents.find(r=>r.id===a.residentId);check(r&&r.status==='pending','Select a pending application.');check(['approved','rejected'].includes(a.decision),'Choose approve or reject.');check(a.reason?.trim().length>=3,'Provide a review reason.');check(a.decision!=='approved'||r.proof,'The resident must upload residence proof before approval.');r.reviewedAt=new Date().toISOString();r.status=a.decision;r.reviewNote=a.reason.trim();s.audit.unshift({id:crypto.randomUUID(),action:'resident_'+a.decision,role:'admin',at:new Date().toISOString()});return token;}
 if(a.type==='resubmitProof'){const r=residentFor(s,token);check(r&&['pending','rejected'].includes(r.status),'Only unverified residents may submit proof.');r.proof=validateProof(a.input?.proof);r.status='pending';r.reviewNote='';return token;}
 return undefined;
}
export function publicState(s,token,role='resident'){
 const r=residentFor(s,token);const safe=x=>{const {passwordHash,salt,proof,...rest}=x;return {...rest,proofName:proof?.name,proofType:proof?.type,proofSubmittedAt:proof?.submittedAt};};
 const {sessions,residents,waitlists,businessAccounts,businessSessions,launchWaitlists,couponCampaigns,...out}=s;
 out.couponCampaigns=role==='admin'||role==='business'?(couponCampaigns||{}):{};
 out.launchWaitlists=role==='admin'?(launchWaitlists||[]):[];
 out.waitlists=role==='admin'?(waitlists||[]):role==='resident'?(waitlists||[]).filter(w=>r&&w.residentId===r.id):(waitlists||[]).filter(w=>w.kind==='business');
 out.waitlistDemand=s.categories.flatMap(cat=>s.communities.map(c=>({categoryId:cat.id,communityId:c.id,count:(waitlists||[]).filter(w=>w.kind==='resident'&&w.communityId===c.id&&w.categoryId===cat.id&&['waiting','available','reviewing','invited'].includes(w.status)).length})));
 out.currentResident=r?safe(r):null;
 out.residents=role==='admin'?(residents||[]).map(x=>({...safe(x),proof:x.proof})):[];
 out.deals=s.deals.map(d=>({...d,businessBlocked:s.businesses.some(b=>b.id===d.businessId&&b.status==='blocked'),slots:d.slots?.map(slot=>({...slot,joined:s.bookings.filter(b=>b.slotId===slot.id&&['reserved','completed'].includes(b.status)).reduce((n,b)=>n+bookingCount(d,b),0)}))}));
 if(role==='resident'){
 out.communities=s.communities.filter(c=>isActiveSociety(c.id));
 const allowed=r&&isActiveSociety(r.communityId);
 out.deals=allowed?out.deals.filter(d=>d.communityId===r.communityId&&['open','confirmed','full','scheduled','locked','fulfilled','failed','cancelled'].includes(d.status)):[];
 const ids=new Set(out.deals.map(d=>d.id));
 out.businesses=allowed?s.businesses.filter(b=>out.deals.some(d=>d.businessId===b.id)).map(b=>({id:b.id,name:b.name,categories:b.categories,communities:[r.communityId],status:b.status})):[];
 out.deals=out.deals.map(d=>({...d,...couponForResident(s,d,r)}));
 out.packages=[];out.allocations=[];out.weeklyVendorCapacity={};out.weeklyTemplates=[];out.waitlists=[];out.waitlistDemand=[];out.bookings=allowed?s.bookings.filter(b=>b.residentId===r.id&&ids.has(b.dealId)):[];out.audit=[];
 }
 return cleanDisplayCopy(out);
}
