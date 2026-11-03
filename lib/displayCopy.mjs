// Normalize legacy presentation text without changing persisted IDs or payment records.
export function cleanDisplayCopy(value,key=''){
 if(Array.isArray(value))return value.map(x=>cleanDisplayCopy(x));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,cleanDisplayCopy(v,k)]));
 if(typeof value!=='string')return value;
 if(key==='license'&&/^DEMO-/i.test(value))return 'Unverified placeholder credential';
 if(!['description','cancellation','notes','reviewNote','subtitle','tagline','address','documentExceptionReason'].includes(key))return value;
 return value.replace(/Demo payments and refunds are simulated\.?/gi,'Online payments and refunds are not connected yet.').replace(/Demo refunds are simulated\.?/gi,'Online refunds are not connected yet.').replace(/Demo payments only\.?/gi,'Online payments are not connected yet.').replace(/\bdemo\b/gi,'test').replace(/\bsimulated\b/gi,'not processed');
}
