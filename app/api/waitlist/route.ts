import {NextResponse} from 'next/server';
import {normalizeLaunchInterest} from '../../../lib/launchWaitlist.mjs';
export const runtime='nodejs';
export async function POST(req:Request){
 try{
  const origin=req.headers.get('origin');if(!origin||new URL(origin).host!==req.headers.get('host'))return NextResponse.json({error:'Please submit from the Joinzy website.'},{status:403});
  const raw=await req.text();if(raw.length>6000)return NextResponse.json({error:'Please shorten your details.'},{status:413});const input=JSON.parse(raw);
  if(input.website)return NextResponse.json({ok:true});
  const data=normalizeLaunchInterest(input);
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(url&&key){const response=await fetch(url.replace(/\/$/,'')+'/rest/v1/launch_waitlist?on_conflict=email,audience,country',{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify(data),signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error('storage');}
  else if(process.env.VERCEL||process.env.NETLIFY)return NextResponse.json({error:'The waitlist is temporarily unavailable. Please try again soon.'},{status:503});
  else{const {transact}=await import('../../../lib/store.mjs');await transact({type:'joinLaunchWaitlist',role:'resident',input:data});}
  return NextResponse.json({ok:true});
 }catch(error){const message=error instanceof Error?error.message:'';return NextResponse.json({error:['storage','fetch failed'].includes(message)||message.includes('timeout')?'We couldn’t save your request. Please try again.':message==='Unexpected end of JSON input'?'Please complete the form.':message||'Please check your details and try again.'},{status:400});}
}
