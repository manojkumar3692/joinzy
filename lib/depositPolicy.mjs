export const tenPercent = total => Math.round(Math.round(total * 100) / 10) / 100;
// Reprice only future deposits; booked amounts remain immutable snapshots.
export function upgradeDepositPolicy(s){
 for(const p of s.packages||[])if(p.businessId==='clp-cleaning-service'||p.businessId==='deepthis-delicacy'){p.deposit=tenPercent(p.price);p.depositPercent=10;}
 for(const d of s.deals||[])if(d.clpCampaign||d.bakeryCampaign){d.deposit=tenPercent(d.price);d.depositPercent=10;}
 return s;
}
export const bookingCount=(deal,booking)=>deal.bakeryCampaign?1:booking.quantity;
