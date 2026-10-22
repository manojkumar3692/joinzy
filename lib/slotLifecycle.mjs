// Shared lifecycle for independently qualifying community service windows.
export function slotCount(state,d,slot){return state.bookings.filter(b=>b.dealId===d.id&&b.slotId===slot.id&&['reserved','completed'].includes(b.status)).reduce((n,b)=>n+b.quantity,0);}
export function refreshWindowStatus(state,d){if(!d.slotMinimums)return;for(const slot of d.slots){const joined=slotCount(state,d,slot);slot.status=joined===slot.capacity?'full':joined>=slot.minimum?'confirmed':'open';}d.status=d.joined===d.capacity?'full':d.slots.every(s=>['confirmed','full'].includes(s.status))?'confirmed':'open';}
export function closeServiceWindows(state,d){
 for(const slot of d.slots){if(slotCount(state,d,slot)>=slot.minimum){slot.status='locked';}else{slot.status='failed';for(const b of state.bookings.filter(b=>b.dealId===d.id&&b.slotId===slot.id&&b.status==='reserved')){b.status='refunded';b.paymentStatus='refunded';d.joined-=b.quantity;}}}
 d.status=d.slots.some(s=>s.status==='locked')?'locked':'failed';
 if(d.status==='failed')for(const a of state.allocations)if(a.dealId===d.id)a.active=false;
}
