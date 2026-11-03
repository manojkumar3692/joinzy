// Stable keys make startup/reset imports safe to repeat without changing existing campaigns.
export const CLP_ID='clp-cleaning-service';
export const CLP_COMMUNITY='osian-chlorophyll';
export const clpCatalog=[
 ['1bhk-occupied','1 BHK occupied house',4500,4000],['1bhk-empty','1 BHK empty house',3500,3000],
 ['2bhk-occupied','2 BHK occupied house',5500,5000],['2bhk-empty','2 BHK empty house',4500,4000],
 ['3bhk-occupied','3 BHK occupied house',6500,6000],['3bhk-empty','3 BHK empty house',5500,5000],
 ['bathroom','Per bathroom',700,500]
];
const check=(ok,message)=>{if(!ok)throw new Error(message);};
export function upgradeClp(s){
 if(!s.categories.some(c=>c.id==='deep-clean'))s.categories.push({id:'deep-clean',name:'Deep cleaning',icon:'✨',group:'Home care',unit:'appointment',duration:60});
 if(!s.businesses.some(b=>b.id===CLP_ID))s.businesses.push({id:CLP_ID,name:'CLP Cleaning Service',tagline:'Deep cleaning in Osian Chlorophyll',description:'Provider supplied by the community organiser. Contact and service schedule need admin review.',email:'',phone:'',address:'Chennai',categories:['deep-clean'],communities:[CLP_COMMUNITY],status:'pending',license:'',licenseExpiry:'',createdAt:new Date().toISOString(),reviewNote:''});
 for(const [key,name,retail,price] of clpCatalog){
  const id='clp-osian-'+key;
  const p={id:'pkg-'+id,businessId:CLP_ID,categoryId:'deep-clean',title:name+' deep cleaning',currency:'INR',description:name+' · CLP Cleaning Service',includes:name+' deep cleaning',excludes:'Services outside this booked package require a separate agreed quote.',instructions:'Confirm access and detailed cleaning scope with CLP before service.',cancellation:'Deposit credited to full price; balance after service. Refund due if this campaign fails its minimum or is cancelled. Online payments are not connected yet.',unit:key==='bathroom'?'bathroom':'home',duration:60,retail,price,deposit:Math.round(price*10)/100,depositPercent:10,imageUrl:'',active:true,serviceScope:{kind:'deep-clean',summary:name+' deep cleaning',countLabel:'confirmed bookings',householdLimit:key==='bathroom'?10:1}};
  if(!s.packages.some(x=>x.id===p.id))s.packages.push(p);
  if(!s.deals.some(x=>x.id===id))s.deals.push({...p,id,packageId:p.id,clpCampaign:true,communityId:CLP_COMMUNITY,business:'CLP Cleaning Service',category:'Deep cleaning',subtitle:p.description,emoji:'✨',color:'mint',managed:true,status:'pending',min:5,capacity:10,joined:0,maxPerHousehold:key==='bathroom'?10:1,bookingOpens:'',deadline:'',serviceDates:[],requestedDates:[],week:'',startTime:'',endTime:'',slotCapacity:1,slots:[],pickup:'At your home in Osian Chlorophyll, Chennai',notes:'Awaiting admin scheduling. Each campaign needs 5 confirmed bookings independently; maximum 10.',reviewNote:'',createdAt:new Date().toISOString()});
 }
 return s;
}
const instant=(date,time)=>Date.parse(`${date}T${time}:00+05:30`);
export function scheduleClp(s,a,now=Date.now()){
 if(a.type!=='scheduleClp')return false;
 check(a.role==='admin','Admin access required.');
 const d=s.deals.find(d=>d.id===a.dealId&&d.clpCampaign);
 check(d&&d.status==='pending'&&!s.bookings.some(b=>b.dealId===d.id),'Only an unbooked pending CLP campaign can be scheduled.');
 const b=s.businesses.find(b=>b.id===d.businessId);
 check(b?.status==='verified'&&b.communities.includes(d.communityId)&&b.categories.includes(d.categoryId),'Approve CLP for this society and category first.');
 const i=a.input||{},dates=String(i.dates||'').split(',').map(x=>x.trim());
 check(dates.length>0&&dates.length<=30&&new Set(dates).size===dates.length&&dates.every(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x),'Enter distinct valid service dates (up to 30).');
 const valid=t=>/^([01]\d|2[0-3]):[0-5]\d$/.test(t||'');
 check(valid(i.startTime)&&valid(i.endTime),'Enter valid working hours.');
 const minutes=t=>+t.slice(0,2)*60 + +t.slice(3);const start=minutes(i.startTime),end=minutes(i.endTime),duration=Number(i.duration);
 check(Number.isInteger(duration)&&duration>=15&&duration<=480&&start+duration<=end,'Set a confirmed duration (15–480 minutes) fitting working hours.');
 const slots=[];
 for(const date of dates.sort())for(let t=start;t+duration<=end&&slots.length<10;t+=duration){const time=`${Math.floor(t/60)}`.padStart(2,'0')+':'+`${t%60}`.padStart(2,'0');slots.push({id:crypto.randomUUID(),date,time,capacity:1,duration});}
 check(slots.length===10,'Provide working days and hours with room for all 10 appointments.');
 const closes=Date.parse(i.deadline+'+05:30');
 check(Number.isFinite(closes)&&closes>now&&slots.every(x=>instant(x.date,x.time)>closes),'Closing time (India time) must be in the future and before every appointment.');
 for(const slot of slots)for(const other of s.deals.filter(x=>x.id!==d.id&&x.businessId===d.businessId&&!['pending','draft','cancelled','failed','rejected','withdrawn'].includes(x.status)))for(const occupied of other.slots||[]){const x=instant(slot.date,slot.time),y=instant(occupied.date,occupied.time);check(x+duration*60000<=y||y+(occupied.duration||other.duration)*60000<=x,'CLP already has an overlapping appointment in another campaign. Use a different time or day.');}
 check(String(i.reason||'').trim().length>=5,'Record the scheduling decision.');
 Object.assign(d,{slots,duration,serviceDates:[...new Set(slots.map(x=>x.date))],requestedDates:dates,startTime:i.startTime,endTime:i.endTime,bookingOpens:new Date(now).toISOString(),deadline:new Date(closes).toISOString(),status:'open',reviewNote:i.reason.trim()});
 s.audit.unshift({id:crypto.randomUUID(),action:'scheduleClp',role:'admin',dealId:d.id,reason:i.reason.trim(),at:new Date(now).toISOString()});
 return true;
}
