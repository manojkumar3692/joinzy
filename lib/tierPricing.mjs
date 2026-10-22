const check=(ok,m)=>{if(!ok)throw new Error(m);};
export const stagePrice=(base,discount=0)=>Math.round(base*(100-discount))/100;
export function normalizeTiers(input,min,capacity,prices){
 let tiers=input?.priceTiers;
 if(!tiers)tiers=[1,2,3].filter(n=>String(input?.['tierCount'+n]||'').trim()!=='').map(n=>({threshold:+input['tierCount'+n],discount:+input['tierDiscount'+n]}));
 check(Array.isArray(tiers)&&tiers.length<=3,'Use up to three additional price stages.');let previous=min,discount=0;
 return tiers.map(t=>{check(Number.isInteger(+t.threshold)&&+t.threshold>previous&&+t.threshold<=capacity,'Price-stage targets must increase above the minimum and fit every applicable window.');check(Number.isFinite(+t.discount)&&+t.discount>discount&&+t.discount<=60,'Stage discounts must increase, up to 60% off the base group price.');check(prices.every(p=>stagePrice(p.price,+t.discount)>=p.deposit),'The lowest stage price cannot be below the deposit.');previous=+t.threshold;discount=+t.discount;return {threshold:previous,discount};});
}
export function discountFor(d,slotId,count){const slot=d.slotMinimums?d.slots.find(s=>s.id===slotId):null;const earned=slot?.earnedDiscount||(!d.slotMinimums?d.earnedDiscount:0)||0;return Math.max(earned,...(d.priceTiers||[]).filter(t=>count>=t.threshold).map(t=>t.discount),0);}
export function updateTierPrices(s){for(const d of s.deals){if(!d.priceTiers?.length||!['open','confirmed','full'].includes(d.status))continue;
 const windows=d.slotMinimums?d.slots:[d];
 for(const w of windows){const active=s.bookings.filter(b=>b.dealId===d.id&&(!d.slotMinimums||b.slotId===w.id)&&['reserved','completed'].includes(b.status));const count=d.slotMinimums?active.reduce((n,b)=>n+b.quantity,0):d.joined;const discount=discountFor(d,w.id,count);w.earnedDiscount=discount;
 for(const b of active){if(b.status!=='reserved')continue;const base=b.baseUnitPrice??(b.vehicleType?d.vehicleVariants.find(v=>v.id===b.vehicleType)?.price:d.price);b.baseUnitPrice=base;b.unitPrice=stagePrice(base,discount);b.total=Math.round(b.unitPrice*b.quantity*100)/100;b.balance=Math.round((b.total-b.deposit)*100)/100;b.tierDiscount=discount;}
 }
}}
