import {tenPercent,bookingCount} from './depositPolicy.mjs';
import {communityCatalog} from './communityCatalog.mjs';
const check=(ok,message)=>{if(!ok)throw new Error(message);};
const india=cid=>cid==='palm'||communityCatalog.some(c=>c.id===cid&&c.currency==='INR');
export const weeklyZone=cid=>india(cid)?'Asia/Kolkata':'Asia/Dubai';
const offset=cid=>india(cid)?'+05:30':'+04:00';
export function weeklyDates(cid,now=Date.now()){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:weeklyZone(cid),year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const day=new Date(today+'T12:00:00Z'),days=(7-day.getUTCDay())%7||7;
 day.setUTCDate(day.getUTCDate()+days);const serviceDate=day.toISOString().slice(0,10);
 const deadline=new Date(serviceDate+'T00:00:00'+offset(cid)).toISOString();
 return {serviceDate,deadline,cutoffLabel:new Date(Date.parse(deadline)-60000).toISOString()};
}
function eligible(s,t){const b=s.businesses.find(b=>b.id===t.businessId);return b?.status==='verified'&&b.communities.includes(t.communityId)&&b.categories.includes(t.snapshot.categoryId);}
function occurrence(s,t,now){
 const dates=weeklyDates(t.communityId,now);
 if(s.deals.some(d=>d.weeklyTemplateId===t.id&&d.serviceDates?.[0]===dates.serviceDate))return;
 const source=s.deals.find(d=>d.id===t.sourceDealId);
 const adopt=source&&source.status==='pending'&&!source.weeklyTemplateId&&!s.bookings.some(b=>b.dealId===source.id);
 const id=adopt?source.id:`${t.id}--${dates.serviceDate}`;
 const d={...structuredClone(t.snapshot),id,weeklyTemplateId:t.id,weeklyWindow:true,serviceDates:[dates.serviceDate],requestedDates:[dates.serviceDate],week:dates.serviceDate,bookingOpens:new Date(now).toISOString(),deadline:dates.deadline,cutoffLabel:dates.cutoffLabel,startTime:'09:00',endTime:'18:00',duration:540,slotCapacity:t.snapshot.capacity,slots:[{id:`${id}-sunday`,date:dates.serviceDate,time:'09:00',endTime:'18:00',duration:540,capacity:t.snapshot.capacity}],joined:0,status:'open',deposit:tenPercent(t.snapshot.price),depositPercent:10,slotMinimums:false,priceTiers:[],quantityPrices:[],createdAt:new Date(now).toISOString(),notes:'Weekly Sunday service. Book until Saturday 23:59 local time. Exact time coordinated by the business when the minimum is reached.',reviewNote:t.reviewNote||'Approved weekly campaign'};
 if(adopt)Object.assign(source,d);else s.deals.push(d);
 s.audit.unshift({id:crypto.randomUUID(),action:'weekly_cycle_opened',role:'system',dealId:id,at:new Date(now).toISOString()});
}
export function syncWeeklyCampaigns(s,now=Date.now()){
 for(const t of s.weeklyTemplates||[])if(t.enabled&&t.status==='approved'&&eligible(s,t))occurrence(s,t,now);
 return s;
}
export function validateWeeklyBooking(s,d,a){
 if(!d.weeklyWindow)return;
 const r=s.residents?.find(r=>r.id===a.residentId),b=s.businesses.find(b=>b.id===d.businessId);
 check(r?.status==='approved'&&r.communityId===d.communityId,'Approved membership for this society is required.');
 check(b?.status==='verified','This business must be approved before booking.');
 if(d.fulfillment==='coupon_shipping'){check(+a.quantity===1,'Book one trial pack per order.');return;}
 if(d.categoryId!=='food'){
  check(+a.quantity===1,'Book one service appointment per order.');
  const limit=s.weeklyVendorCapacity?.[d.businessId]??10;
  const ids=new Set(s.deals.filter(x=>x.businessId===d.businessId&&x.serviceDates?.includes(d.serviceDates[0])).map(x=>x.id));
  const used=s.bookings.filter(x=>ids.has(x.dealId)&&['reserved','completed'].includes(x.status)).reduce((n,x)=>n+bookingCount(d,x),0);
  check(used<limit,'This business has reached its shared Sunday service capacity. Choose a later weekly campaign.');
 }
}
function snapshot(d){const copy=structuredClone(d);for(const key of ['id','joined','status','slots','serviceDates','requestedDates','bookingOpens','deadline','cutoffLabel','weeklyTemplateId','weeklyWindow','createdAt'])delete copy[key];return copy;}
export function weeklyAction(s,a,now=Date.now()){
 if(!['enableWeeklyCampaign','enableAllWeekly','saveWeeklyCampaign','reviewWeeklyCampaign','toggleWeeklyCampaign','setWeeklyCapacity'].includes(a.type))return false;
 s.weeklyTemplates??=[];s.weeklyVendorCapacity??={};
 if(a.type==='enableAllWeekly'||a.type==='enableWeeklyCampaign'){
  check(a.role==='admin','Admin access required.');
  const deals=s.deals.filter(d=>a.type==='enableAllWeekly'?(d.clpCampaign||d.bakeryCampaign)&&!d.weeklyTemplateId&&d.status==='pending':d.id===a.dealId);
  check(deals.length,'No pending campaigns to enable.');
  for(const d of deals){
   check(d.managed&&d.status==='pending'&&!s.bookings.some(b=>b.dealId===d.id),'Only unbooked pending campaigns can start weekly recurrence.');
   const id='weekly-'+d.id;if(s.weeklyTemplates.some(t=>t.id===id))continue;
   const t={id,sourceDealId:d.id,businessId:d.businessId,communityId:d.communityId,snapshot:snapshot(d),status:'approved',enabled:true,reviewNote:'Admin enabled Sunday recurrence',createdAt:new Date(now).toISOString()};
   check(eligible(s,t),'Approve the business for its category and society first.');s.weeklyTemplates.push(t);
   if(d.categoryId!=='food')s.weeklyVendorCapacity[d.businessId]??=10;
  }
 }else if(a.type==='saveWeeklyCampaign'){
  check(a.role==='business','Business access required.');const b=s.businesses.find(b=>b.id===a.businessId),i=a.input||{};
  check(b&&b.status!=='blocked','Business unavailable.');check(b.communities.includes(i.communityId)&&b.categories.includes(i.categoryId),'Choose your own society and service category.');
  for(const k of ['title','description','includes','excludes','instructions','pickup','unit'])check(typeof i[k]==='string'&&i[k].trim().length>=3&&i[k].length<=2000,`Complete ${k} (3–2000 characters).`);
  const price=+i.price,retail=+i.retail,min=+i.min,capacity=+i.capacity;
  check(Number.isFinite(price)&&price>0&&price<=100000&&Number.isFinite(retail)&&retail>=price&&[price,retail].every(n=>Math.abs(n*100-Math.round(n*100))<0.00001),'Enter valid prices with at most two decimal places.');
  check(Number.isInteger(min)&&Number.isInteger(capacity)&&min>=1&&capacity>=min&&capacity<=10,'Minimum and maximum must be whole numbers from 1 to 10.');
  const old=a.templateId?s.weeklyTemplates.find(t=>t.id===a.templateId):null;check(!a.templateId||old?.businessId===b.id,'This campaign belongs to another business.');
  check(!old||old.snapshot.fulfillment!=='coupon_shipping','Coupon campaign package changes require Admin setup. You can update the redemption details separately.');
 const cat=s.categories.find(c=>c.id===i.categoryId),food=i.categoryId==='food';
  const t={id:old?.id||crypto.randomUUID(),businessId:b.id,communityId:i.communityId,status:'pending',enabled:false,createdAt:old?.createdAt||new Date(now).toISOString(),reviewNote:'Awaiting admin approval',snapshot:{...Object.fromEntries(['title','description','includes','excludes','instructions','pickup','unit'].map(k=>[k,i[k].trim()])),businessId:b.id,business:b.name,communityId:i.communityId,categoryId:i.categoryId,category:food?'Bakery':cat?.name||i.categoryId,currency:s.communities.find(c=>c.id===i.communityId).currency,price,retail,min,capacity,deposit:tenPercent(price),depositPercent:10,managed:true,bakeryCampaign:food,clpCampaign:b.id==='clp-cleaning-service',maxPerHousehold:food?10:1,subtitle:i.description.trim(),emoji:food?'🍰':'✨',color:food?'peach':'mint',imageUrl:'',active:true,cancellation:'Deposit refunded if the weekly minimum is missed or the campaign is cancelled. Online payments are not connected yet.'}};
  if(old)Object.assign(old,t);else s.weeklyTemplates.push(t);
 }else if(a.type==='setWeeklyCapacity'){
  check(a.role==='admin','Admin access required.');check(s.businesses.some(b=>b.id===a.businessId),'Business not found.');const limit=+a.capacity;check(Number.isInteger(limit)&&limit>=1&&limit<=100,'Weekly capacity must be 1–100 service appointments.');s.weeklyVendorCapacity[a.businessId]=limit;
 }else{
  const t=s.weeklyTemplates.find(t=>t.id===a.templateId);check(t,'Weekly campaign not found.');
  if(a.type==='reviewWeeklyCampaign'){
   check(a.role==='admin','Admin access required.');check(t.status==='pending','Only pending templates can be reviewed.');check(['approve','reject'].includes(a.decision),'Choose approve or reject.');check(a.reason?.trim().length>=5,'Record the decision reason.');
   if(a.decision==='approve')check(eligible(s,t),'Approve the business for this society and category first.');
   t.status=a.decision==='approve'?'approved':'rejected';t.enabled=t.status==='approved';t.reviewNote=a.reason.trim();
  }else{check(a.role==='admin'||(a.role==='business'&&a.businessId===t.businessId),'This campaign belongs to another business.');check(typeof a.enabled==='boolean','Choose enabled or paused.');check(t.status==='approved','Admin must approve the weekly campaign first.');t.enabled=a.enabled;}
 }
 syncWeeklyCampaigns(s,now);
 s.audit.unshift({id:crypto.randomUUID(),action:a.type,role:a.role,at:new Date(now).toISOString()});return true;
}
