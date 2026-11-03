export const EON_ID='house-of-eon';
export const EON_TEMPLATE='weekly-eon-osian-trial-pack';
export function upgradeEon(s,now=Date.now()){
 if(!s.categories.some(c=>c.id==='perfume'))s.categories.push({id:'perfume',name:'Perfume',icon:'✦',group:'Products',unit:'trial pack',duration:0});
 if(!s.businesses.some(b=>b.id===EON_ID))s.businesses.push({id:EON_ID,name:'HOUSE OF EON',tagline:'Discover your next fragrance',description:'Perfume trial packs: three 8 ml fragrances.',email:'',phone:'',address:'',categories:['perfume'],communities:['osian-chlorophyll'],status:'verified',license:'',licenseExpiry:'',documentException:true,documentExceptionReason:'Listing approved by owner on 3 November 2026; business credentials not independently verified.',reviewNote:'Owner approved HOUSE OF EON for Osian Chlorophyll.',createdAt:new Date(now).toISOString()});
 s.weeklyTemplates??=[];s.couponCampaigns??={};
 if(!s.weeklyTemplates.some(t=>t.id===EON_TEMPLATE)){
 const snapshot={businessId:EON_ID,business:'HOUSE OF EON',communityId:'osian-chlorophyll',categoryId:'perfume',category:'Perfume',currency:'INR',title:'Perfume discovery trial pack · 3 × 8 ml',description:'Three 8 ml perfume samples for ₹249, with free shipping. Once 3 bookings join, booked members receive the trial-pack link and coupon in My bookings.',subtitle:'3 fragrances · 8 ml each · free shipping',includes:'One trial pack containing three 8 ml perfume samples. Free shipping.',excludes:'Full-size bottles and other products.',instructions:'After the minimum is reached, open My bookings, follow the HOUSE OF EON link and apply the coupon at checkout. Provide your delivery address on their website. Fragrance choices and shipping timing are confirmed there.',pickup:'Shipped by HOUSE OF EON after you redeem the trial-pack offer.',unit:'trial pack',price:249,retail:249,deposit:24.9,depositPercent:10,min:3,capacity:10,maxPerHousehold:1,managed:true,active:true,fulfillment:'coupon_shipping',duration:0,imageUrl:'',emoji:'✦',color:'mint',cancellation:'If the minimum is not reached, your reservation is cancelled. Online payments are not connected; no payment is collected.',notes:'Coupon unlocks for booked members at 3 bookings. One pack per member per weekly campaign. No Sunday delivery guarantee.'};
 s.weeklyTemplates.push({id:EON_TEMPLATE,businessId:EON_ID,communityId:'osian-chlorophyll',status:'approved',enabled:true,snapshot,createdAt:new Date(now).toISOString(),reviewNote:'Owner approved weekly Saturday cutoff and Sunday renewal on 3 November 2026.'});
 s.couponCampaigns[EON_TEMPLATE]={url:'https://www.houseofeon.in/trial-pack',code:'JOINZY'};
 s.audit.unshift({id:crypto.randomUUID(),action:'approve_house_of_eon',role:'admin',reason:'Owner requested approval and weekly launch for Osian Chlorophyll.',at:new Date(now).toISOString()});
 }
 return s;
}
export function couponForResident(s,d,resident){
 if(d.fulfillment!=='coupon_shipping')return {};
 const joined=s.bookings.filter(b=>b.dealId===d.id&&['reserved','completed'].includes(b.status)).length;
 const eligible=resident?.status==='approved'&&resident.communityId===d.communityId&&s.businesses.some(b=>b.id===d.businessId&&b.status==='verified')&&joined>=d.min&&!['failed','cancelled','rejected','withdrawn'].includes(d.status)&&s.bookings.some(b=>b.dealId===d.id&&b.residentId===resident.id&&['reserved','completed'].includes(b.status));
 const config=s.couponCampaigns?.[d.weeklyTemplateId];
 return eligible&&config?.url&&config?.code?{redemption:{url:config.url,code:config.code}}:{};
}
export function couponAction(s,a){
 if(a.type!=='saveCouponDetails')return false;
 const t=s.weeklyTemplates?.find(t=>t.id===a.templateId&&t.snapshot.fulfillment==='coupon_shipping');
 if(!t||!(a.role==='admin'||a.role==='business'&&a.businessId===t.businessId))throw Error('Only this business or Admin may edit its coupon.');
 let url;try{url=new URL(a.url);}catch{throw Error('Enter a valid HTTPS trial-pack link.');}
 if(url.protocol!=='https:'||url.username||url.password)throw Error('Enter a valid HTTPS trial-pack link.');
 if(typeof a.code!=='string'||!a.code.trim()||a.code.length>80)throw Error('Enter a coupon code (up to 80 characters).');
 s.couponCampaigns??={};s.couponCampaigns[t.id]={url:url.href,code:a.code.trim()};
 s.audit.unshift({id:crypto.randomUUID(),action:'update_coupon_details',role:a.role,at:new Date().toISOString()});return true;
}
