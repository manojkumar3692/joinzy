'use client';
import {useState,useEffect} from 'react';
import type {AppData} from '../../lib/types';
const documents=[['maintenance','Society maintenance bill / receipt'],['rental','Current rental agreement'],['utility','Electricity / piped-gas bill'],['society','Society-issued resident confirmation'],['masked_aadhaar','Masked Aadhaar (optional)']];
export default function ResidentAccess({data,act,busy}:{data:AppData;act:(a:Record<string,unknown>)=>Promise<boolean>;busy:boolean}){
 const [mode,setMode]=useState('signup'),[proof,setProof]=useState<{name:string;data:string}|null>(null),[error,setError]=useState('');
 const [documentType,setDocumentType]=useState('maintenance'),[nameMatches,setNameMatches]=useState(true),[explanation,setExplanation]=useState('');
 const r=data.currentResident;
 useEffect(()=>{if(new URLSearchParams(window.location.search).get('login'))setMode('login');},[]);
 async function file(f?:File){setError('');setProof(null);if(!f)return;if(f.size>2*1024*1024||!['image/png','image/jpeg','application/pdf'].includes(f.type)){setError('Choose a PNG, JPG or PDF up to 2 MB.');return;}const reader=new FileReader();reader.onload=()=>setProof({name:f.name,data:String(reader.result)});reader.onerror=()=>setError('Could not read that file. Please select it again.');reader.readAsDataURL(f);}
 return <section className="panel resident-access">{r?<>
  <div className="section-title"><div><span className="eyebrow">YOUR ACCOUNT</span><h2>Hello, {r.name}</h2><p>{data.communities.find(c=>c.id===r.communityId)?.name}</p></div><button className="outline" disabled={busy} onClick={async()=>{if(await act({type:'logout'}))window.location.replace('/app?login=1');}}>Log out</button></div>
  <dl className="resident-details"><dt>Email</dt><dd>{r.email}</dd><dt>Phone</dt><dd>{r.phone||'Not provided on this older account'}</dd><dt>Block / building</dt><dd>{r.block||'Not provided on this older account'}</dd><dt>Flat / door number</dt><dd>{r.flat||'Not provided on this older account'}</dd></dl>
  <div className="customer-notice"><strong>{r.status==='approved'?'Residence verified':r.status==='rejected'?'Please update your proof':r.proofName?'Proof submitted · awaiting review':'One more step: verify your residence'}</strong><p>{r.status==='approved'?'You can book offers in your society.':'You can explore offers now. Booking opens after admin verifies your residence.'}</p></div>
  {r.reviewNote&&<p><strong>Admin feedback:</strong> {r.reviewNote}</p>}
  {r.proofName&&<p>Document submitted: {r.proofName}</p>}
  {r.status!=='approved'&&<form onSubmit={async e=>{e.preventDefault();const form=e.currentTarget;if(proof&&await act({type:'resubmitProof',input:{proof:{...proof,type:documentType,nameMatches,explanation}}})){setProof(null);form.reset();setExplanation('');setNameMatches(true);setDocumentType('maintenance');}}}>
   <h3>{r.proofName?'Replace your document':'Confirm you live here'}</h3><p>Upload just one document showing your name and society / flat address. Bills should be from the last 3 months; rental agreements should cover your current tenancy.</p>
   <label className="field">Document type<select value={documentType} onChange={e=>setDocumentType(e.target.value)}>{documents.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
   <p className="muted">{documentType==='rental'?'Only upload the pages showing your name, address and tenancy dates.':documentType==='masked_aadhaar'?'Optional: use masked Aadhaar showing your current society address. Hide the first 8 Aadhaar digits.':'Keep the resident name, society, flat number and document date visible.'} You can hide payment amounts, account numbers and unrelated personal details. Documents are for admin review, not shared with businesses.</p>
   <label className="field">Residence document<input type="file" accept="image/png,image/jpeg,application/pdf" required onChange={e=>file(e.target.files?.[0])}/><small>PNG, JPG or PDF · maximum 2 MB</small></label>
   <label className="field">Is your name on this document?<select value={nameMatches?'yes':'no'} onChange={e=>setNameMatches(e.target.value==='yes')}><option value="yes">Yes, my name is shown</option><option value="no">No, it is in someone else’s name</option></select></label>
   {!nameMatches&&<label className="field">Whose name is shown, and what is your relationship?<textarea required minLength={5} maxLength={500} value={explanation} onChange={e=>setExplanation(e.target.value)} placeholder="For example: my spouse, parent or landlord. Admin may ask for society confirmation."/></label>}
   <button className="primary" disabled={busy||!proof}>{busy?'Submitting…':r.proofName?'Submit replacement proof':'Submit for verification'}</button>
  </form>}
 </>:<>
  <div className="section-title"><div><span className="eyebrow">YOUR COMMUNITY STARTS HERE</span><h2>{mode==='signup'?'Join your society':'Welcome back'}</h2><p>{mode==='signup'?'A few details to get started. Upload residence proof later to unlock bookings.':'Log in to discover your society’s offers.'}</p></div><button className="outline" disabled={busy} onClick={()=>{setMode(mode==='signup'?'login':'signup');setError('');}}>{mode==='signup'?'Log in instead':'Create an account'}</button></div>
  <form onSubmit={async e=>{e.preventDefault();await act({type:mode,input:Object.fromEntries(new FormData(e.currentTarget))});}}><div className="form-grid">
   {mode==='signup'&&<><label className="field">Full name<input name="name" required minLength={2} maxLength={100} autoComplete="name"/></label><label className="field">Society<select name="communityId" required defaultValue=""><option value="" disabled>Choose your society</option>{data.communities.map(c=><option key={c.id} value={c.id}>{c.name} · {c.cityName||c.city.split(',')[0]}</option>)}</select></label></>}
   <label className="field">Email<input name="email" type="email" required autoComplete="email"/></label>
   {mode==='signup'&&<><label className="field">Phone number<input name="phone" type="tel" required autoComplete="tel" minLength={10} maxLength={22} placeholder="10-digit mobile or +country code"/></label><label className="field">Block / building<input name="block" required maxLength={80} autoComplete="address-line1" placeholder="For example: Tower A"/></label><label className="field">Flat / door number<input name="flat" required maxLength={40} autoComplete="address-line2" placeholder="For example: 101"/></label></>}
   <label className="field">Password<input name="password" type="password" required minLength={10} autoComplete={mode==='signup'?'new-password':'current-password'}/><small>At least 10 characters</small></label>
  </div><button className="primary" disabled={busy}>{busy?'Please wait…':mode==='signup'?'Create account & explore':'Log in'}</button></form>
 </>}{error&&<p role="alert" className="error">{error}</p>}</section>;
}
