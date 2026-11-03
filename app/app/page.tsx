'use client';
import {useEffect,useState} from 'react';
import CustomerPortal from '../components/CustomerPortal';
import BusinessAccess from '../components/BusinessAccess';
import BusinessModule from '../components/BusinessModule';
import type {AppData} from '../../lib/types';
export default function Workspace(){
 const [data,setData]=useState<AppData|null>(null),[role,setRole]=useState('resident'),[community,setCommunity]=useState('osian-chlorophyll'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{const host=window.location.hostname.split('.')[0];setRole(['business','admin'].includes(host)?host:'resident');fetch('/api/portal').then(async r=>{if(!r.ok)throw Error('Could not load the portal. Please refresh.');setData(await r.json());}).catch(e=>setError(e.message));},[]);
 useEffect(()=>{if(data?.currentBusiness)setCommunity(data.currentBusiness.communities[0]);else if(data?.currentResident)setCommunity(data.currentResident.communityId);},[data?.currentBusiness?.id,data?.currentResident?.id]);
 async function act(action:Record<string,unknown>){setBusy(true);setError('');setNotice('');try{const response=await fetch('/api/portal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(action)});const result=await response.json();if(!response.ok)throw Error(result.error);setData(result);setNotice(action.type==='book'?'Your spot is reserved. No payment has been collected. See My bookings for the price breakdown.':action.type==='cancelBooking'?'Booking cancelled. No payment was collected, so no refund was issued.':['login','logout'].includes(String(action.type))?'':'Updated successfully.');return true;}catch(e){setError(e instanceof Error?e.message:'Please try again.');return false;}finally{setBusy(false);}}
 if(!data)return <div className="joinzy customer"><header className="j-nav"><a className="j-logo" href="/">joinzy.</a></header><main className="customer-main"><p role={error?'alert':'status'}>{error||'Getting your neighbourhood ready…'}</p></main></div>;
 if(role==='resident')return <CustomerPortal data={data} act={act} busy={busy} error={error} notice={notice}/>;
 if(role==='business'&&!data.currentBusiness)return <BusinessAccess data={data} act={act} busy={busy} error={error}/>;
 return <BusinessModule data={data} role={role} onRole={()=>{window.location.href='/';}} community={community} onCommunity={setCommunity} act={act} busy={busy} notice={notice} error={error}/>;
}
