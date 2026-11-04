import {createSupabaseRepository,withDatabaseState} from './supabaseRepository.mjs';
import {upgradeEon} from './eonCampaign.mjs';
import {isActiveSociety} from './customerAccess.mjs';
import {upgradeDepositPolicy} from './depositPolicy.mjs';
import {upgradeBakery} from './bakeryCatalog.mjs';
import {upgradeClp} from './clpCampaigns.mjs';
import {upgradeCommunities} from './communityCatalog.mjs';
import {businessAccountAction,businessFor,businessState} from './businessAccounts.mjs';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {upgradeIndia} from './indiaLaunch.mjs';
import {residentAction,residentFor,publicState} from './residents.mjs';
import {apply,reconcile} from './domain.mjs';
import {freshSeed as seed} from './freshSeed.mjs';
const dir=path.join(process.cwd(),'.demo');
const file=path.join(dir,'state.json');
const storeKey=Symbol.for('joinzy.demo.store.queue');
const shared=globalThis[storeKey]??=( {queue:Promise.resolve()} );
export function transact(action,context){
 const job=shared.queue.then(async()=>{
  const backend=process.env.JOINZY_DATA_BACKEND||'file';
  if(!['file','supabase'].includes(backend))throw new Error('Invalid data backend.');
  if(backend==='supabase')return withDatabaseState(createSupabaseRepository(),state=>processState(state,action,context));
  if(process.env.VERCEL||process.env.NETLIFY)throw new Error('Configure JOINZY_DATA_BACKEND=supabase before using the hosted app.');
  await mkdir(dir,{recursive:true});
  let state;try{state=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;state=seed();}
  const result=processState(state,action,context);
  await writeFile(file+'.tmp',JSON.stringify(state,null,2));await rename(file+'.tmp',file);
  return result;
 });
 shared.queue=job.catch(()=>{});return job;
}

function processState(state,action,context){
  upgradeIndia(state);
  upgradeCommunities(state);
  upgradeClp(state);
  upgradeBakery(state);
  upgradeEon(state);
  upgradeDepositPolicy(state);
  let token=context?.token;
  const businessAuth=action&&['businessSignup','businessLogin','businessLogout'].includes(action.type);
  if(businessAuth)token=businessAccountAction(state,action,token);
  if(context?.enforcePortal&&context.role==='business'&&action&&!businessAuth){const b=businessFor(state,token);if(!b)throw new Error('Please log in to your business account.');if(action.type==='saveProfile'){if(action.input.email.trim().toLowerCase()!==b.email.toLowerCase())throw new Error('Your sign-in email cannot be changed here.');if(b.subscription&&action.input.communities.some(id=>!state.communities.some(c=>c.id===id&&c.currency===b.subscription.currency)))throw new Error('Choose communities in your subscription country.');}action={...action,businessId:b.id};}

  const auth=action&&['signup','login','logout','reviewResident','resubmitProof'].includes(action.type);
  if(auth)token=residentAction(state,action,token);
  if(context&&action&&['book','cancelBooking'].includes(action.type)){const r=residentFor(state,token);if(!r)throw new Error('Please log in first.');if(action.type==='book'&&(r.status!=='approved'||!isActiveSociety(r.communityId)||state.deals.find(d=>d.id===action.dealId)?.communityId!==r.communityId))throw new Error('Admin approval for this community is required before booking.');action={...action,residentId:r.id};}
  if(context&&action&&['joinWaitlist','leaveWaitlist'].includes(action.type)){const r=residentFor(state,token);action={...action,residentId:r?.id};}
  if(action?.type==='reset') {if(action.role!=='admin')throw new Error('Admin access required.');if(process.env.JOINZY_DATA_BACKEND==='supabase')throw new Error('Database reset is disabled.');for(const key of Object.keys(state))delete state[key];Object.assign(state,seed());}
  else if(action&&!auth&&!businessAuth)apply(state,action);
  reconcile(state);
  if(!context)return state;
  let data=publicState(state,token,context.role);
  if(context.enforcePortal&&context.role==='business')data=businessState(data,state,token);
  return {data,token};
}
