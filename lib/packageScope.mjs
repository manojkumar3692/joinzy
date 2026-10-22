export const SCOPED_CATEGORIES=['sofa','ac','pest','laundry-pickup'];
const check=(ok,m)=>{if(!ok)throw new Error(m);};
export function normalizeScope(category,input){
 if(!SCOPED_CATEGORIES.includes(category))return undefined;
 const scope={version:1,kind:category};
 const number=(key,min,max)=>{const n=Number(input['scope_'+key]??input[key]);check(Number.isFinite(n)&&n>=min&&n<=max,`Scope: ${key} must be between ${min} and ${max}.`);scope[key]=n;return n;};
 const text=(key)=>{const v=String(input['scope_'+key]??input[key]??'').trim();check(v.length>=3&&v.length<=1200,`Complete the ${key} scope field.`);scope[key]=v;return v;};
 const integer=(key,min,max)=>{const n=number(key,min,max);check(Number.isInteger(n),`${key} must be a whole number.`);return n;};
 if(category==='sofa'){integer('seats',0,12);integer('mattresses',0,3);check(scope.seats+scope.mattresses>0,'Include sofa seats or a mattress.');text('material');text('mattressSize');text('drying');scope.countLabel='households';scope.unit='home package';scope.householdLimit=1;scope.summary=`${scope.seats} sofa seats + ${scope.mattresses} mattress(es) · ${scope.mattressSize} · ${scope.material}`;}
 if(category==='ac'){text('acType');number('tonnage',0.5,5);text('method');scope.countLabel='AC units';scope.unit='AC unit';scope.householdLimit=10;scope.summary=`1 ${scope.acType} AC · up to ${scope.tonnage} ton · ${scope.method}`;}
 if(category==='pest'){integer('bhk',1,4);integer('sqft',200,4000);text('pest');text('method');text('safety');text('followup');scope.countLabel='homes';scope.unit='flat';scope.householdLimit=1;scope.summary=`1 ${scope.bhk} BHK flat · up to ${scope.sqft} sq ft carpet area · ${scope.pest} · 1 visit`;}
 if(category==='laundry-pickup'){number('kg',1,20);integer('hours',24,168);text('garments');text('excess');text('lossPolicy');scope.countLabel='bags';scope.unit='laundry bag';scope.householdLimit=1;scope.summary=`1 bag · up to ${scope.kg} kg dry weight · wash, dry & fold · return within ${scope.hours} hours`;}
 return scope;
}
export function scopeBooking(state,d,a){
 const scope=d.serviceScope;if(!scope)return {};
 check(+a.quantity===1,'Book one scoped package per appointment. For additional AC units, book separate appointments.');
 check(a.scopeAccepted===true,'Confirm the package scope before paying.');
 const location=String(a.serviceAddress||'').trim();check(location.length>=3&&location.length<=200,'Enter your building and flat number.');
 if(scope.kind==='pest'){check(+a.homeBhk===scope.bhk,'Choose a package matching your BHK size.');check(+a.homeSqft>0&&+a.homeSqft<=scope.sqft,'Your home exceeds the package floor-area limit. Choose another package.');}
 if(scope.kind==='ac')check(+a.acTonnage>=0.5&&+a.acTonnage<=scope.tonnage,'AC size is outside this package.');
 if(scope.kind==='laundry-pickup')check(+a.laundryKg>0&&+a.laundryKg<=scope.kg,'The declared laundry weight exceeds this bag allowance.');
 const householdKey=location.toLowerCase().replace(/[^a-z0-9]/g,'');
 if(scope.householdLimit===1)check(!state.bookings.some(b=>b.dealId===d.id&&b.householdKey===householdKey&&['reserved','completed'].includes(b.status)),'This home already has an active booking in this campaign.');
 return {householdKey,scopeAccepted:true,scopeSummary:scope.summary,serviceAddress:location,homeBhk:a.homeBhk,homeSqft:a.homeSqft,acTonnage:a.acTonnage,laundryKg:a.laundryKg};
}
