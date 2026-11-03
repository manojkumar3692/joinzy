export const BAKERY_ID='deepthis-delicacy';
export const BAKERY_COMMUNITY='osian-chlorophyll';
export const BAKERY_NAME="Deepthi's Delicacy - Home made Cakes & Bakery";
// Supplied selling prices. Each product has an independent 3–10-order campaign.
export const bakeryCatalog=[
 ['brownie','Brownie',95,'piece',null,null,'One standard brownie piece.'],
 ['wheat-brownie','Wheat brownie',120,'piece',null,null,'One wheat brownie piece.'],
 ['nutella-brownie','Nutella brownie',105,'piece',null,null,'One Nutella brownie piece.'],
 ['triple-chocolate-brownie','Triple chocolate brownie',110,'piece',null,null,'One triple chocolate brownie piece.'],
 ['biscoff-brownie','Biscoff brownie',105,'piece',null,null,'One Biscoff brownie piece.'],
 ['korean-bun','Korean bun',120,'piece',null,null,'One Korean bun.'],
 ['bomboloni-chocolate','Bomboloni · chocolate filling',110,'piece',null,null,'One chocolate-filled bomboloni.'],
 ['bomboloni-vanilla','Bomboloni · vanilla filling',120,'piece',null,null,'One vanilla-filled bomboloni.'],
 ['bomboloni-nutella','Bomboloni · Nutella filling',130,'piece',null,null,'One Nutella-filled bomboloni.'],
 ['cookies-250g','Cookies · 250 g',350,'250 g pack',250,null,'One 250 g pack of cookies.'],
 ['brownie-250g','Brownie box · 250 g · 4 larger pieces',440,'250 g box',250,4,'Four larger brownie pieces in a quarter-kilo box. These pieces are larger than the ₹95 individual brownie; this is a separate product.']
].map(([key,title,price,unit,weightGrams,pieceCount,description])=>({id:'deepthi-osian-'+key,businessId:BAKERY_ID,communityId:BAKERY_COMMUNITY,title,price,currency:'INR',unit,weightGrams,pieceCount,description,status:'pending',deposit:Math.round(price*10)/100,minimum:3,capacity:10}));
export function upgradeBakery(s){
 if(!s.businesses.some(b=>b.id===BAKERY_ID))s.businesses.push({id:BAKERY_ID,name:BAKERY_NAME,tagline:'Home made cakes and bakery',description:'Brownies, buns, filled bomboloni and cookies for Osian Chlorophyll.',email:'',phone:'',address:'Chennai',categories:['food'],communities:[BAKERY_COMMUNITY],status:'pending',license:'',licenseExpiry:'',createdAt:new Date().toISOString(),reviewNote:''});
 for(const item of bakeryCatalog){
  const p={id:'pkg-'+item.id,businessId:BAKERY_ID,categoryId:'food',currency:'INR',title:item.title,description:item.description,includes:item.description,excludes:'Other menu items are separate products.',instructions:'Ingredients and allergens will be confirmed before orders open.',cancellation:'Deposit refunded if this campaign is cancelled or does not reach 3 confirmed orders. Online refunds are not connected yet.',unit:item.unit,duration:60,retail:item.price,price:item.price,deposit:item.deposit,depositPercent:10,imageUrl:'',active:true};
  if(!s.packages.some(x=>x.id===p.id))s.packages.push(p);
  if(!s.deals.some(d=>d.id===item.id))s.deals.push({...p,id:item.id,packageId:p.id,bakeryCampaign:true,communityId:BAKERY_COMMUNITY,business:BAKERY_NAME,category:'Bakery',subtitle:item.description,emoji:item.id.includes('cookies')?'🍪':'🍫',color:'peach',managed:true,status:'pending',min:3,capacity:10,joined:0,maxPerHousehold:10,bookingOpens:'',deadline:'',serviceDates:[],requestedDates:[],week:'',startTime:'',endTime:'',slotCapacity:10,slots:[],pickup:'',notes:'Each product needs 3 confirmed orders independently, maximum 10 orders. Up to 10 sale units per order.',reviewNote:'',createdAt:new Date().toISOString()});
 }
 return s;
}

const check=(ok,message)=>{if(!ok)throw new Error(message);};
export function scheduleBakery(s,a,now=Date.now()){
 if(a.type!=='scheduleBakery')return false;
 check(a.role==='admin','Admin access required.');
 const d=s.deals.find(d=>d.id===a.dealId&&d.bakeryCampaign);
 check(d&&d.status==='pending'&&!s.bookings.some(b=>b.dealId===d.id),'Only an unbooked pending bakery campaign can be scheduled.');
 const b=s.businesses.find(b=>b.id===d.businessId),i=a.input||{};
 check(b?.status==='verified'&&b.communities.includes(d.communityId)&&b.categories.includes('food'),'Approve the bakery for this community first.');
 check(/^\d{4}-\d{2}-\d{2}$/.test(i.date||'')&&new Date(i.date+'T12:00:00Z').toISOString().slice(0,10)===i.date,'Choose a valid pickup date.');
 const time=t=>/^([01]\d|2[0-3]):[0-5]\d$/.test(t||'');
 check(time(i.startTime)&&time(i.endTime)&&i.startTime<i.endTime,'Choose valid pickup hours.');
 check(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(i.deadline||''),'Choose a booking cutoff in India time.');
 const start=Date.parse(`${i.date}T${i.startTime}:00+05:30`),end=Date.parse(`${i.date}T${i.endTime}:00+05:30`),cutoff=Date.parse(i.deadline+'+05:30');
 check(Number.isFinite(cutoff)&&cutoff>now&&cutoff<start,'Booking cutoff must be in the future and before pickup.');
 check(b.documentException||(b.license&&b.licenseExpiry>=i.date),'Review food credentials or record an explicit admin document exception.');
 for(const field of ['pickup','allergens','reason'])check(typeof i[field]==='string'&&i[field].trim().length>=5&&i[field].length<=1500,`Complete ${field}.`);
 Object.assign(d,{bookingOpens:new Date(now).toISOString(),deadline:new Date(cutoff).toISOString(),serviceDates:[i.date],requestedDates:[i.date],slots:[{id:crypto.randomUUID(),date:i.date,time:i.startTime,endTime:i.endTime,capacity:10,duration:(end-start)/60000}],startTime:i.startTime,endTime:i.endTime,duration:(end-start)/60000,pickup:i.pickup.trim(),instructions:i.allergens.trim(),status:'open',reviewNote:i.reason.trim()});
 s.audit.unshift({id:crypto.randomUUID(),action:'scheduleBakery',role:'admin',dealId:d.id,reason:i.reason.trim(),at:new Date(now).toISOString()});return true;
}
