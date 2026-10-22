import {scryptSync,randomBytes,createHash,timingSafeEqual,randomUUID} from 'node:crypto';
const check=(ok,message)=>{if(!ok)throw new Error(message);};
const hash=x=>createHash('sha256').update(x||'').digest('hex');
export const plans={UAE:{amount:99,currency:'AED',interval:'month'},India:{amount:499,currency:'INR',interval:'month'}};
export function businessFor(s,token){const session=(s.businessSessions||[]).find(x=>x.tokenHash===hash(token)&&x.expires>Date.now());return s.businesses.find(b=>b.id===session?.businessId);}
export function businessAccountAction(s,a,token){s.businessAccounts??=[];s.businessSessions??=[];
 if(a.type==='businessSignup'){
  const i=a.input||{},email=String(i.email||'').trim().toLowerCase();
  check(i.name?.trim().length>=2&&i.contactName?.trim().length>=2,'Enter your business and contact names.');check(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),'Enter a valid email.');check(typeof i.password==='string'&&i.password.length>=10&&i.password.length<=256,'Use a password of 10–256 characters.');
  check(plans[i.country],'Select UAE or India.');check(i.planConsent===true,'Confirm the monthly plan before joining.');check(!s.businesses.some(b=>b.email.toLowerCase()===email),'This business email already exists. Please log in.');
  const communities=[...new Set(i.communities||[])],categories=[...new Set(i.categories||[])],plan=plans[i.country];
  check(communities.length&&communities.every(id=>s.communities.some(c=>c.id===id&&c.currency===plan.currency)),'Select communities in your plan country.');check(categories.length&&categories.every(id=>s.categories.some(c=>c.id===id)),'Choose your service categories.');check(i.phone?.trim().length>=7,'Enter a contact phone number.');
  const id=randomUUID(),salt=randomBytes(16).toString('hex');
  s.businesses.push({id,name:i.name.trim(),contactName:i.contactName.trim(),email,phone:i.phone.trim(),country:i.country,categories,communities,status:'pending',tagline:'',description:'',license:'',licenseExpiry:'',address:'',createdAt:new Date().toISOString(),subscription:{...plan,status:'demo_pending',paymentCollected:false,acceptedAt:new Date().toISOString()}});
  s.businessAccounts.push({businessId:id,email,salt,passwordHash:scryptSync(i.password,salt,64).toString('hex')});a={type:'businessLogin',input:i};
 }
 if(a.type==='businessLogin'){const account=s.businessAccounts.find(x=>x.email===a.input?.email?.trim().toLowerCase());check(account&&typeof a.input?.password==='string'&&a.input.password.length<=256&&timingSafeEqual(Buffer.from(account.passwordHash,'hex'),scryptSync(a.input.password,account.salt,64)),'Email or password is incorrect.');const next=randomBytes(32).toString('hex');s.businessSessions.push({tokenHash:hash(next),businessId:account.businessId,expires:Date.now()+7*86400000});return next;}
 if(a.type==='businessLogout'){s.businessSessions=s.businessSessions.filter(x=>x.tokenHash!==hash(token));return '';}
 return token;
}
export function businessState(data,s,token){const b=businessFor(s,token);data.currentBusiness=b||null;data.businesses=b?[b]:[];data.communities=b?data.communities.filter(c=>b.communities.includes(c.id)):data.communities;data.packages=data.packages.filter(p=>p.businessId===b?.id);data.deals=data.deals.filter(d=>d.businessId===b?.id);data.bookings=data.bookings.filter(x=>data.deals.some(d=>d.id===x.dealId));data.allocations=data.allocations.filter(x=>x.businessId===b?.id);data.waitlists=data.waitlists.filter(x=>x.businessId===b?.id);data.audit=[];return data;}
