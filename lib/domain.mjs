import {couponAction} from './eonCampaign.mjs';
import {syncWeeklyCampaigns,weeklyAction,validateWeeklyBooking} from './weeklyCampaigns.mjs';
import {scheduleBakery} from './bakeryCatalog.mjs';
import {bookingCount,tenPercent} from './depositPolicy.mjs';
import {scheduleClp} from './clpCampaigns.mjs';
import {communityCatalog,upgradeCommunities} from './communityCatalog.mjs';
import {saveLaunchInterest} from './launchWaitlist.mjs';
import {updateTierPrices} from './tierPricing.mjs';
import {waitlistAction,updateWaitlists,convertWaitlist} from './waitlists.mjs';
import {closeServiceWindows,refreshWindowStatus} from './slotLifecycle.mjs';
import {quoteBooking,normalizedVehicle} from './serviceRules.mjs';
import {upgrade,businessAction,validateServiceBooking} from './business.mjs';
export const communities = [
  ...communityCatalog,
  {id:'wasl', name:'Wasl Village', city:'Dubai, UAE', currency:'AED', residents:1240},
  {id:'palm', name:'Palm Meadows Society', city:'Bengaluru, India · Sample society', currency:'INR', residents:480}
];
export function seed() {
 const now = Date.now();
 const deals = [
  ['fresh','wasl','Fresh essentials, together','Farm-fresh fruit & vegetable box','Groceries','Green Basket Farms',89,59,15,12,30,18,'🥬','mint'],
  ['clean','wasl','A fresh start for your home','Professional 3-hour home cleaning','Home care','Sparkle Home Services',180,119,25,8,16,7,'✨','peach'],
  ['water','wasl','Good water. Better value.','Six 5-gallon drinking water bottles','Essentials','Oasis Water',72,49,10,10,40,26,'💧','blue'],
  ['mango','palm','A little sunshine, by the box','Premium seasonal fruit box · 3 kg','Groceries','Orchard Collective',900,649,150,10,24,14,'🥭','peach'],
  ['laundry','palm','Your weekend, reclaimed','Wash & fold laundry · 5 kg','Home care','FreshFold',600,399,100,8,20,5,'🧺','mint']
 ].map(([id,communityId,title,subtitle,category,business,retail,price,deposit,min,capacity,joined,emoji,color])=>({id,communityId,title,subtitle,category,business,businessId:'vendor',retail,price,deposit,min,capacity,joined,emoji,color,status:joined>=min?'confirmed':'open',deadline:new Date(now+48*3600000).toISOString(),pickup:'Community clubhouse · Saturday, 10am–1pm'}));
 return upgrade({communities,deals,bookings:[],audit:[],version:1},now);
}
export function reconcile(state, now = Date.now()) {
 upgradeCommunities(state);
 upgrade(state,now);
 updateTierPrices(state);
 for (const d of state.deals) {
  if(d.status==='scheduled'&&Date.parse(d.bookingOpens)<=now)d.status='open';
  if (['open','confirmed','full'].includes(d.status) && Date.parse(d.deadline)<=now) {
   if(d.slotMinimums){closeServiceWindows(state,d);continue;}
   d.status=d.joined>=d.min?'locked':'failed';
   if(d.status==='failed') refundDeal(state,d);
  }
 }
 syncWeeklyCampaigns(state,now);
 updateWaitlists(state);
 return state;
}
function refundDeal(state,d) {
 for(const a of state.allocations||[])if(a.dealId===d.id)a.active=false;
 for(const b of state.bookings.filter(b=>b.dealId===d.id&&b.status==='reserved')) {b.status='refunded'; b.paymentStatus='refunded'; d.joined-=bookingCount(d,b);}
}
function check(condition,message){if(!condition) throw new Error(message);}
export function apply(state,action,now=Date.now()) {
 reconcile(state,now);
 if(action.type==='joinLaunchWaitlist'){saveLaunchInterest(state,action.input);return state;}
 if(action.role==='business'&&state.businesses.find(b=>b.id===action.businessId)?.status==='blocked'&&!['saveProfile','completeBooking','fulfill','withdrawOffer','leaveWaitlist'].includes(action.type))throw new Error('Your business is blocked. See the admin reason in your workspace.');
 if(couponAction(state,action))return state;
 if(weeklyAction(state,action,now))return state;
 if(waitlistAction(state,action))return state;
 if(['completeBooking','fulfill'].includes(action.type)){
  const booking=state.bookings.find(b=>b.id===action.bookingId);
  const campaign=state.deals.find(d=>d.id===(action.dealId||booking?.dealId));
  if(campaign?.clpCampaign||campaign?.bakeryCampaign){const slots=action.type==='completeBooking'?campaign.slots.filter(s=>s.id===booking?.slotId):campaign.slots;check(slots.length>0&&slots.every(s=>Date.parse(`${s.date}T${s.time}:00+05:30`)+(s.duration||campaign.duration)*60000<=now),'Complete service or pickup before settling the balance.');}
 }
 if(scheduleClp(state,action,now)||scheduleBakery(state,action,now))return state;
 if(businessAction(state,action,now))return state;
 const d=state.deals.find(d=>d.id===action.dealId);
 if(action.type==='book') {
  const existing=state.bookings.find(b=>b.requestId===action.requestId);
  if(existing){check(existing.residentId===(action.residentId||'demo-resident')&&existing.dealId===action.dealId&&existing.quantity===Number(action.quantity)&&existing.slotId===(action.slotId||null)&&(!existing.vehicleType||(existing.vehicleType===action.vehicleType&&existing.vehicleKey===normalizedVehicle(action.vehiclePlate)))&&action.role==='resident','Booking request ID was already used for another request.');return state;}
  check(action.role==='resident','Use the Resident portal to book.');
  check(typeof action.requestId==='string'&&action.requestId.length>5,'Missing booking request ID.');
  check(d&&['open','confirmed','full'].includes(d.status),'This deal is no longer accepting bookings.');
  check(!state.businesses.some(b=>b.id===d.businessId&&b.status==='blocked'),'This business is temporarily blocked. New bookings are paused.');
  if(d.clpCampaign){check(+action.quantity===1,'Book one cleaning appointment at a time.');const r=state.residents?.find(r=>r.id===action.residentId);check(r?.status==='approved'&&r.communityId===d.communityId,'Approved Osian Chlorophyll membership required.');check(state.businesses.find(b=>b.id===d.businessId)?.status==='verified','CLP must be approved before booking.');}
  if(d.bakeryCampaign){const r=state.residents?.find(r=>r.id===action.residentId);check(r?.status==='approved'&&r.communityId===d.communityId,'Approved Osian Chlorophyll membership required.');check(state.businesses.find(b=>b.id===d.businessId)?.status==='verified','Bakery must be approved before booking.');}
  const q=Number(action.quantity);check(Number.isInteger(q)&&q>0&&q<=10,'Choose between 1 and 10 units.');
  check(d.joined+bookingCount(d,{quantity:q})<=d.capacity,'Not enough capacity remains. Please reduce the quantity.');
  validateWeeklyBooking(state,d,action);
  const slot=validateServiceBooking(state,d,action,now);
  const quote=quoteBooking(state,d,action);
  const total=Math.round(quote.price*100)*q/100,deposit=d.depositPercent===10?tenPercent(total):Math.round(quote.deposit*100)*q/100;
  state.bookings.unshift({...quote.details,slotId:slot?.id||null,serviceDate:slot?.date||null,serviceTime:slot?.time||null,id:crypto.randomUUID(),requestId:action.requestId,dealId:d.id,residentId:action.residentId||'demo-resident',quantity:q,total,deposit,balance:Math.round((total-deposit)*100)/100,status:'reserved',paymentStatus:'deposit_paid',createdAt:new Date(now).toISOString()});
  d.joined+=bookingCount(d,{quantity:q}); d.status=d.joined===d.capacity?'full':d.joined>=d.min?'confirmed':'open';refreshWindowStatus(state,d);
 } else if(action.type==='cancelBooking') {
  check(action.role==='resident','Resident access required.');
  const b=state.bookings.find(b=>b.id===action.bookingId&&b.residentId===(action.residentId||'demo-resident'));
  check(b&&b.status==='reserved','This reservation cannot be cancelled.');
  const deal=state.deals.find(d=>d.id===b.dealId);
  check(!['fulfilled','cancelled','failed'].includes(deal.status),'This booking can no longer be cancelled.');
  b.status='refunded';b.paymentStatus='refunded';deal.joined-=bookingCount(deal,b);
  if(deal.status!=='locked'){deal.status=deal.joined>=deal.min?'confirmed':'open';refreshWindowStatus(state,deal);}
 } else if(action.type==='createDeal') {
  check(action.role==='business','Business access required.');
  const input=action.input;
  check(input&&state.communities.some(c=>c.id===input.communityId),'Select a community.');
  for(const k of ['price','retail','deposit','min','capacity'])check(Number.isFinite(Number(input[k]))&&Number(input[k])>0,`Invalid ${k}.`);
  check(Number.isInteger(+input.min)&&Number.isInteger(+input.capacity),'Threshold and capacity must be whole units.');
  check(+input.deposit<=+input.price&&+input.price<=+input.retail,'Deposit must not exceed deal price; deal price must not exceed retail price.');
  check(['price','retail','deposit'].every(k=>Math.abs(+input[k]*100-Math.round(+input[k]*100))<0.00001),'Prices support at most two decimal places.');
  check(+input.min<=+input.capacity,'Minimum cannot exceed capacity.');
  check(typeof input.title==='string'&&input.title.trim().length>=5,'Enter a title of at least 5 characters.');
  state.deals.unshift({id:crypto.randomUUID(),communityId:input.communityId,title:input.title.trim().slice(0,100),subtitle:'A new offer from your neighborhood business',category:'Essentials',business:'Neighborhood Partners',businessId:'vendor',price:Math.round(+input.price*100)/100,retail:Math.round(+input.retail*100)/100,deposit:Math.round(+input.deposit*100)/100,min:+input.min,capacity:+input.capacity,joined:0,emoji:'📦',color:'blue',status:'pending',deadline:new Date(now+48*3600000).toISOString(),pickup:'Community clubhouse · Collection details at confirmation'});
 } else {
  check(d,'Deal not found.');
  if(action.type==='approve'){check(!d.managed,'Use the allocation review to approve this service.');check(action.role==='admin'&&d.status==='pending','Only admins can approve pending deals.');d.status='open';}
  else if(action.type==='close'){check(action.role==='admin'&&['open','confirmed','full'].includes(d.status),'Only admins can close an active deal.');d.deadline=new Date(now).toISOString();reconcile(state,now);}
  else if(action.type==='cancelDeal'){check(action.role==='admin'&&['pending','scheduled','open','confirmed','full','locked'].includes(d.status),'This deal cannot be cancelled.');d.status='cancelled';refundDeal(state,d);}
  else if(action.type==='fulfill'){check(!d.managed||d.businessId===action.businessId,'This deal belongs to another business.');check(action.role==='business'&&d.status==='locked','Only locked deals can be fulfilled by a business.');d.status='fulfilled';for(const b of state.bookings.filter(b=>b.dealId===d.id&&b.status==='reserved')){b.status='completed';b.paymentStatus='paid';b.balance=0;}}
  else throw new Error('Unknown action.');
 }
 updateTierPrices(state);
 if(action.type==='book')convertWaitlist(state,action);
 updateWaitlists(state);
 state.audit.unshift({id:crypto.randomUUID(),action:action.type,role:action.role,dealId:action.dealId||null,at:new Date(now).toISOString()});
 return state;
}
