import {upgradeIndia} from './indiaLaunch.mjs';
import {seed as legacySeed} from './domain.mjs';

// The runtime/reset baseline. Historical launch scenarios remain regression fixtures.
export function freshSeed(){
 const state=legacySeed();
 state.businesses=state.businesses.filter(b=>['kitchen','wecare'].includes(b.id));
 state.packages=state.packages.filter(p=>p.id.startsWith('hira-biryani')||p.businessId==='wecare');
 state.businesses.push({id:'mohan',name:'Mohan AC Cleaning',tagline:'Simple care for your everyday cooling',email:'hello@mohanac.example',phone:'+971 50 000 0108',description:'Basic indoor AC dusting, filter cleaning and function checks for community homes.',categories:['ac'],communities:['wasl'],status:'verified',license:'DEMO-MOHAN-2026',licenseExpiry:new Date(Date.now()+365*86400000).toISOString().slice(0,10),address:'Dubai · Sample business',createdAt:new Date().toISOString().slice(0,10)});
 state.packages.push({id:'pkg-mohan-ac-basic',businessId:'mohan',categoryId:'ac',currency:'AED',title:'Basic AC Cleaning',description:'Basic cleaning for one accessible indoor AC unit: dusting, removable filter cleaning and a function check.',includes:'Dust accessible indoor surfaces; clean removable filters; wipe external cover; basic function check',excludes:'Deep coil cleaning, ducts, gas refill, repairs, spare parts, installation and outdoor units',instructions:'Provide safe access to the indoor unit. The technician isolates power before cleaning. Sample price and duration: review before publishing.',cancellation:'Full deposit refund before booking closes. Refund if the group minimum is not reached.',unit:'AC unit',duration:45,retail:79,price:59,deposit:15,imageUrl:'',active:true});
 state.categories=state.categories.filter(c=>['food','car','ac'].includes(c.id));
 state.deals=[];state.bookings=[];state.allocations=[];state.audit=[];
 state.workspaceVersion=1;
 return upgradeIndia(state);
}
