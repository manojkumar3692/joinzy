export function remainingTime(deadline,now){
 const end=Date.parse(deadline);if(!Number.isFinite(end))return null;
 const total=Math.max(0,Math.ceil((end-now)/1000));
 return {total,days:Math.floor(total/86400),hours:Math.floor(total%86400/3600),minutes:Math.floor(total%3600/60),seconds:total%60};
}
export function serviceTiming(deal){
 const date=deal.serviceDates?.[0]||deal.slots?.[0]?.date;
 const valid=date&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date+'T12:00:00Z'));
 const day=valid?new Intl.DateTimeFormat('en-IN',{weekday:'long',day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z')):'Date to be confirmed';
 const format=t=>{if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(t||''))return null;const [h,m]=t.split(':').map(Number);return `${h%12||12}${m?':'+String(m).padStart(2,'0'):''} ${h>=12?'PM':'AM'}`;};
 const start=format(deal.startTime||deal.slots?.[0]?.time),end=format(deal.endTime||deal.slots?.[0]?.endTime);
 return {day,window:start&&end?`${start}–${end}`:'Time to be confirmed',zone:deal.currency==='INR'?'IST':'GST'};
}
