import {quantityPrice} from './quantityPricing.mjs';
import {stagePrice,discountFor} from './tierPricing.mjs';
import {scopeBooking} from './packageScope.mjs';
// Versioned category contracts. Offers keep a snapshot; edits affect only new offers.
export const RULES={
 food:{key:'food',version:1,label:'Food orders',countUnit:'paid portions',minimumScope:'community_window',priceMode:'per_portion',bookingQuantity:'multiple',refundPolicy:'failed_window',vehicleDetails:false},
 car:{key:'car',version:1,label:'Car cleaning',countUnit:'cars',minimumScope:'community_window',priceMode:'vehicle_variant',bookingQuantity:'one_vehicle',refundPolicy:'failed_window',vehicleDetails:true,maxCrews:20,maxCapacity:200,allowedVehicleTypes:['sedan','suv','crossover']}
};
export const VEHICLE_TYPES=[{id:'sedan',label:'Sedan'},{id:'suv',label:'SUV'},{id:'crossover',label:'Crossover'}];
export function rulesFor(category,business){const base=RULES[category];if(!base)throw new Error('Unknown service rule.');return structuredClone({...base,businessSettings:business?.serviceSettings?.[category]||{}});}
export const minutes=t=>{const [h,m]=t.split(':').map(Number);return h*60+m;};
export const validTime=t=>typeof t==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(t);
export const stamp=(cid,date,time)=>Date.parse(`${date}T${time}:00${cid==='palm'?'+05:30':'+04:00'}`);
export function normalizedVehicle(value){return String(value||'').toUpperCase().replace(/[^A-Z0-9]/g,'');}
export function quoteBooking(state,d,action){
 const count=d.slotMinimums?state.bookings.filter(b=>b.dealId===d.id&&b.slotId===action.slotId&&['reserved','completed'].includes(b.status)).reduce((n,b)=>n+b.quantity,0):d.joined;const discount=discountFor(d,action.slotId,count+Number(action.quantity));
 if(d.ruleSnapshot?.key!=='car'){const base=quantityPrice(d,Number(action.quantity));return {price:stagePrice(base,discount),deposit:d.deposit,details:{...scopeBooking(state,d,action),baseUnitPrice:base,quantityUnitPrice:base,tierDiscount:discount}};}
 if(Number(action.quantity)!==1)throw new Error('Book one vehicle at a time.');
 const variant=d.vehicleVariants.find(v=>v.id===action.vehicleType);if(!variant)throw new Error('Choose an available vehicle type.');
 const plate=String(action.vehiclePlate||'').trim().toUpperCase();const location=String(action.parkingLocation||'').trim();
 if(!/^[A-Z0-9 -]{2,20}$/.test(plate)||normalizedVehicle(plate).length<2)throw new Error('Enter a plate including its emirate / registration code.');
 if(location.length<3||location.length>200)throw new Error('Enter your building and parking bay (3–200 characters).');
 const slot=d.slots.find(s=>s.id===action.slotId);if(!slot)throw new Error('Choose a service window.');
 if(state.bookings.some(b=>['reserved','completed'].includes(b.status)&&b.vehicleKey===normalizedVehicle(plate)&&b.serviceDate===slot.date))throw new Error('This vehicle already has an active cleaning booking on this date.');
 const used=state.bookings.filter(b=>b.slotId===slot.id&&['reserved','completed'].includes(b.status)).reduce((n,b)=>n+(b.serviceMinutes||0),0);
 if(used+variant.minutes>(minutes(slot.endTime)-minutes(slot.time))*d.crews)throw new Error('The crew has no remaining service time in this window.');
 return {price:stagePrice(variant.price,discount),deposit:variant.deposit,details:{baseUnitPrice:variant.price,tierDiscount:discount,vehicleType:variant.id,vehicleLabel:variant.label,vehiclePlate:plate,vehicleKey:normalizedVehicle(plate),parkingLocation:location,serviceMinutes:variant.minutes,unitPrice:variant.price,ruleVersion:d.ruleSnapshot.version}};
}
