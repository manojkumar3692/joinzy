export function normalizeLaunchInterest(input){
 const text=(key,max)=>String(input?.[key]||'').trim().slice(0,max);
 const data={name:text('name',100),email:text('email',254).toLowerCase(),audience:text('audience',20),country:text('country',10),city:text('city',100),organisation:text('organisation',160),service:text('service',80),consent:input?.consent===true};
 if(!['resident','business'].includes(data.audience)||!['India','UAE'].includes(data.country))throw new Error('Choose resident or business and your country.');
 if(data.name.length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))throw new Error('Enter your name and a valid email.');
 if(data.city.length<2||data.organisation.length<2)throw new Error('Tell us your city and society or business name.');
 if(!data.consent)throw new Error('Please agree to updates about your Joinzy request.');
 return data;
}
export function saveLaunchInterest(s,input){const data=normalizeLaunchInterest(input);s.launchWaitlists??=[];if(!s.launchWaitlists.some(w=>w.email===data.email&&w.audience===data.audience&&w.country===data.country))s.launchWaitlists.push({...data,id:crypto.randomUUID(),createdAt:new Date().toISOString(),status:'waiting'});return data;}
