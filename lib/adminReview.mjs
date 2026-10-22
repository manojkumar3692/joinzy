export function credentialIssue(b,today){
 if(!b?.license?.trim())return 'Business licence reference is missing. Ask the business to add it, or record the checked reference below.';
 const date=b.licenseExpiry;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)return 'A valid licence expiry date is required.';
 if(date<today)return 'The business licence has expired. A current licence is required.';
 return '';
}
export function offerApprovalIssues(data,deal,dates,now=Date.now()){
 const issues=[],b=data.businesses.find(b=>b.id===deal.businessId);
 if(deal.status!=='pending')issues.push('Only submitted requests awaiting approval can be approved.');
 if(!b||b.status!=='verified')issues.push('Approve the business first. This request cannot be published while business verification is pending or rejected.');
 if(b&&(!b.categories.includes(deal.categoryId)||!b.communities.includes(deal.communityId)))issues.push('The business profile must include this category and community.');
 if(Date.parse(deal.deadline)<=now)issues.push('The booking cutoff has passed. Request changes so the business can submit new dates.');
 if(!dates.length)issues.push('Select at least one available service day.');
 if(dates.some(date=>data.allocations.some(a=>a.active&&a.date===date&&a.communityId===deal.communityId&&a.categoryId===deal.categoryId)))issues.push('A selected day is already allocated to another offer.');
 if(!b?.documentException&&data.categories.find(c=>c.id===deal.categoryId)?.credential&&(!b?.license||dates.some(date=>!b?.licenseExpiry||b.licenseExpiry<date)))issues.push('This service requires a business licence valid through every selected service day.');
 const capacity=Math.min(deal.capacity,deal.slots.filter(s=>dates.includes(s.date)).reduce((n,s)=>n+s.capacity,0));
 if(dates.length&&capacity<deal.min)issues.push('Selected days do not have enough capacity for the offer minimum.');
 if((deal.priceTiers||[]).some(t=>t.threshold>capacity))issues.push('Selected days must support every community price stage.');
 return issues;
}
