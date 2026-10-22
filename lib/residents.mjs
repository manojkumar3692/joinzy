import {scryptSync,randomBytes,createHash,timingSafeEqual} from 'node:crypto';
const check=(v,m)=>{if(!v)throw new Error(m);};
const hash=t=>createHash('sha256').update(t).digest('hex');
export function residentFor(s,token){const session=(s.sessions||[]).find(x=>x.tokenHash===hash(token||'')&&x.expires>Date.now());return (s.residents||[]).find(r=>r.id===session?.residentId);}
export function residentAction(s,a,token){s.residents??=[];s.sessions??=[];
 if(a.type==='signup'){
 const i=a.input||{};check(i.name?.trim().length>=2,'Enter your full name.');check(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.email||''),'Enter a valid email.');check(typeof i.password==='string'&&i.password.length>=10,'Use a password of at least 10 characters.');check(s.communities.some(c=>c.id===i.communityId),'Choose a community from the list.');check(!s.residents.some(r=>r.email===i.email.trim().toLowerCase()),'An account already exists with this email. Please log in.');
 check(i.proof&&/^data:(image\/(png|jpeg)|application\/pdf);base64,[A-Za-z0-9+/=]+$/.test(i.proof.data)&&i.proof.data.length<2800000,'Upload a PNG, JPG or PDF proof, up to 2 MB.');
 const salt=randomBytes(16).toString('hex');s.residents.push({id:crypto.randomUUID(),name:i.name.trim(),email:i.email.trim().toLowerCase(),communityId:i.communityId,status:'pending',proof:{name:String(i.proof.name).slice(0,150),data:i.proof.data},salt,passwordHash:scryptSync(i.password,salt,64).toString('hex'),createdAt:new Date().toISOString(),reviewNote:''});
 a={type:'login',input:i};
 }
 if(a.type==='login'){const r=s.residents.find(r=>r.email===a.input?.email?.trim().toLowerCase());check(r&&typeof a.input?.password==='string'&&timingSafeEqual(Buffer.from(r.passwordHash,'hex'),scryptSync(a.input.password,r.salt,64)),'Email or password is incorrect.');const next=randomBytes(32).toString('hex');s.sessions.push({tokenHash:hash(next),residentId:r.id,expires:Date.now()+7*86400000});return next;}
 if(a.type==='logout'){s.sessions=s.sessions.filter(x=>x.tokenHash!==hash(token||''));return '';}
 if(a.type==='reviewResident'){check(a.role==='admin','Admin access required.');const r=s.residents.find(r=>r.id===a.residentId);check(r&&r.status==='pending','Select a pending application.');check(['approved','rejected'].includes(a.decision),'Choose approve or reject.');check(a.reason?.trim().length>=3,'Provide a review reason.');r.status=a.decision;r.reviewNote=a.reason.trim();s.audit.unshift({id:crypto.randomUUID(),action:'resident_'+a.decision,role:'admin',at:new Date().toISOString()});return token;}
 if(a.type==='resubmitProof'){const r=residentFor(s,token);check(r?.status==='rejected','Only rejected applications may be resubmitted.');const p=a.input?.proof;check(p&&/^data:(image\/(png|jpeg)|application\/pdf);base64,[A-Za-z0-9+/=]+$/.test(p.data)&&p.data.length<2800000,'Upload PNG, JPG or PDF up to 2 MB.');r.proof={name:String(p.name).slice(0,150),data:p.data};r.status='pending';r.reviewNote='';return token;}
 return undefined;
}
export function publicState(s,token,role='resident'){
 const r=residentFor(s,token);const safe=x=>{const {passwordHash,salt,proof,...rest}=x;return {...rest,proofName:proof?.name};};
 const {sessions,residents,waitlists,businessAccounts,businessSessions,launchWaitlists,...out}=s;
 out.launchWaitlists=role==='admin'?(launchWaitlists||[]):[];
 out.waitlists=role==='admin'?(waitlists||[]):role==='resident'?(waitlists||[]).filter(w=>r&&w.residentId===r.id):(waitlists||[]).filter(w=>w.kind==='business');
 out.waitlistDemand=s.categories.flatMap(cat=>s.communities.map(c=>({categoryId:cat.id,communityId:c.id,count:(waitlists||[]).filter(w=>w.kind==='resident'&&w.communityId===c.id&&w.categoryId===cat.id&&['waiting','available','reviewing','invited'].includes(w.status)).length})));
 out.currentResident=r?safe(r):null;
 out.residents=role==='admin'?(residents||[]).map(x=>({...safe(x),proof:x.proof})):[];
 out.deals=s.deals.map(d=>({...d,businessBlocked:s.businesses.some(b=>b.id===d.businessId&&b.status==='blocked'),slots:d.slots?.map(slot=>({...slot,joined:s.bookings.filter(b=>b.slotId===slot.id&&['reserved','completed'].includes(b.status)).reduce((n,b)=>n+b.quantity,0)}))}));
 if(role==='resident'){out.bookings=s.bookings.filter(b=>b.residentId===r?.id);out.audit=[];}
 return out;
}
