import {normalizeQuantityPrices} from './quantityPricing.mjs';
import {normalizeTiers} from './tierPricing.mjs';
import {rulesFor} from './serviceRules.mjs';
const check=(ok,message)=>{if(!ok)throw new Error(message);};
const stamp=(cid,date,time)=>Date.parse(`${date}T${time}:00${cid==='palm'?'+05:30':'+04:00'}`);
const validTime=t=>/^([01]\d|2[0-3]):[0-5]\d$/.test(t);
const validDate=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
export function upgradeFood(state){
 if(state.foodVersion)return state;
 const b=state.businesses.find(b=>b.id==='kitchen');if(!b)return state;
 b.name='Hira Kitchen';b.tagline='Fresh food, planned around your community';
 for(const d of state.deals)if(d.businessId===b.id)d.business=b.name;
 for(const currency of ['AED','INR'])state.packages.push({id:'hira-biryani-'+currency,businessId:b.id,categoryId:'food',currency,title:'Hyderabadi Biryani',description:'One portion of Hyderabadi chicken biryani with raita.',includes:'One portion of chicken biryani and raita',excludes:'Extra portions and beverages',instructions:'Contains dairy. Confirm complete ingredient and allergen details before publication.',cancellation:'Full deposit refund before booking closes. Refund if your slot does not reach its minimum.',unit:'portion',duration:60,retail:currency==='AED'?35:350,price:currency==='AED'?29:299,deposit:currency==='AED'?10:100,imageUrl:'',active:true});
 state.foodVersion=1;return state;
}
export function saveFoodOffer(state,action,now){
 check(action.role==='business','Business access required.');const b=state.businesses.find(b=>b.id===action.businessId);check(b&&b.categories.includes('food'),'Select a food business.');const i=action.input;
 check(i&&typeof i.title==='string'&&i.title.trim().length>=3,'Enter the food package name.');
 for(const k of ['description','includes','allergens','pickup'])check(typeof i[k]==='string'&&i[k].trim().length>=3,`Please complete ${k}.`);
 check(['pickup','delivery'].includes(i.fulfillment),'Choose pickup or delivery.');
 check(Array.isArray(i.communityIds)&&i.communityIds.length>0&&new Set(i.communityIds).size===i.communityIds.length&&i.communityIds.every(id=>b.communities.includes(id)&&state.communities.some(c=>c.id===id)),'Choose communities this business serves.');
 check(validDate(i.serviceDate),'Choose a valid service date.');
 check(Array.isArray(i.slots)&&i.slots.length>=1&&i.slots.length<=12,'Add between one and twelve service slots.');
 const slots=i.slots.map(s=>{check(validTime(s.start)&&validTime(s.end)&&s.start<s.end,'Every slot needs a valid start and end time.');check(Number.isInteger(+s.minimum)&&+s.minimum>0&&Number.isInteger(+s.capacity)&&+s.capacity>=+s.minimum&&+s.capacity<=1000,'Each slot needs a positive minimum and capacity ≥ minimum (maximum 1,000).');return {time:s.start,endTime:s.end,minimum:+s.minimum,capacity:+s.capacity};}).sort((a,b)=>a.time.localeCompare(b.time));
 for(let n=1;n<slots.length;n++)check(slots[n].time>=slots[n-1].endTime,'Service slots must not overlap.');
 check(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(i.publishAt)&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(i.closeAt),'Set the publish time and booking cutoff.');
 const existing=action.campaignId?state.deals.filter(d=>d.campaignId===action.campaignId):[];
 if(action.campaignId)check(existing.length&&existing.every(d=>d.businessId===b.id&&['draft','pending','rejected'].includes(d.status)),'Only an entirely unpublished food offer can be edited.');
 const campaignId=action.campaignId||crypto.randomUUID(),newDeals=[],newPackages=[];
 for(const cid of i.communityIds){const c=state.communities.find(c=>c.id===cid);const prices=i.pricing?.[c.currency];check(prices,'Provide pricing in '+c.currency+'.');for(const k of ['price','deposit'])check(Number.isFinite(+prices[k])&&+prices[k]>0&&Math.abs(+prices[k]*100-Math.round(+prices[k]*100))<0.00001,'Price and deposit must be positive with at most two decimals.');check(+prices.deposit<=+prices.price,'Deposit cannot exceed the portion price.');
 const quantityPrices=normalizeQuantityPrices(prices.quantityPrices,+prices.price,+prices.deposit,Math.min(10,...slots.map(s=>s.capacity)));
 const opening=stamp(cid,...i.publishAt.split('T')),closing=stamp(cid,...i.closeAt.split('T')),start=stamp(cid,i.serviceDate,slots[0].time);
 check(Number.isFinite(opening)&&Number.isFinite(closing)&&opening<closing&&closing>now&&closing<=start,'Publish before the booking cutoff; cutoff must be in the future and before the first service slot.');
 const old=existing.find(d=>d.communityId===cid);const packageId=`${campaignId}-${c.currency}`;
 const p={id:packageId,businessId:b.id,categoryId:'food',currency:c.currency,title:i.title.trim(),description:i.description.trim(),includes:i.includes.trim(),excludes:'Only the listed meal package is included.',instructions:i.allergens.trim(),cancellation:'Full refund before cutoff. If your slot misses its minimum, its deposit is refunded.',quantityPrices,unit:'portion',duration:60,retail:+prices.price,price:+prices.price,deposit:+prices.deposit,imageUrl:'',active:true};if(!newPackages.some(p=>p.id===packageId))newPackages.push(p);
 const week=new Date(i.serviceDate+'T12:00:00Z');week.setUTCDate(week.getUTCDate()-(week.getUTCDay()+6)%7);
 newDeals.push({...p,id:old?.id||crypto.randomUUID(),packageId,campaignId,communityId:cid,category:'Licensed food orders',categoryId:'food',business:b.name,subtitle:p.description,emoji:'🍱',color:'peach',managed:true,priceTiers:normalizeTiers(i,Math.max(...slots.map(s=>s.minimum)),Math.min(...slots.map(s=>s.capacity)),[prices,...quantityPrices.map(t=>({price:t.unitPrice,deposit:+prices.deposit}))]),ruleSnapshot:rulesFor('food',b),slotMinimums:true,min:slots.reduce((n,s)=>n+s.minimum,0),capacity:slots.reduce((n,s)=>n+s.capacity,0),joined:0,status:action.submit?'pending':'draft',bookingOpens:new Date(opening).toISOString(),deadline:new Date(closing).toISOString(),publishLocal:i.publishAt,closeLocal:i.closeAt,serviceDates:[i.serviceDate],requestedDates:[i.serviceDate],week:week.toISOString().slice(0,10),startTime:slots[0].time,endTime:slots.at(-1).endTime,slots:slots.map(s=>({...s,id:crypto.randomUUID(),date:i.serviceDate,status:'open'})),maxPerHousehold:10,pickup:i.pickup.trim(),fulfillment:i.fulfillment,notes:'Each community and time slot has an independent minimum of paid portions.',reviewNote:'',createdAt:old?.createdAt||new Date(now).toISOString()});
 }
 state.deals=state.deals.filter(d=>!existing.some(x=>x.id===d.id));state.deals.unshift(...newDeals);
 state.packages=state.packages.filter(p=>!newPackages.some(x=>x.id===p.id));state.packages.unshift(...newPackages);
 state.audit.unshift({id:crypto.randomUUID(),role:action.role,businessId:b.id,action:action.submit?'submitFoodOffer':'saveFoodDraft',at:new Date(now).toISOString()});
}
