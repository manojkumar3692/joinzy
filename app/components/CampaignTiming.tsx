'use client';
import {Clock3,CalendarDays} from 'lucide-react';
import {remainingTime,serviceTiming} from '../../lib/campaignTiming.mjs';
import type {Offer} from '../../lib/types';
export function BookingCountdown({deal,now,featured=false}:{deal:Offer;now:number;featured?:boolean}){
 const opening=deal.status==='scheduled'&&Date.parse(deal.bookingOpens)>now;
 const t=remainingTime(opening?deal.bookingOpens:deal.deadline,now);
 if(!t)return <div className="campaign-countdown">Booking dates to be confirmed</div>;
 const closed=t.total===0&&!opening;
 const label=closed?'Bookings closed':deal.status==='full'?'Fully booked':opening?'Bookings open in':'Bookings close in';
 const stamp=opening?deal.bookingOpens:deal.cutoffLabel||deal.deadline;
 const cutoff=new Intl.DateTimeFormat('en-IN',{weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit',timeZone:deal.currency==='INR'?'Asia/Kolkata':'Asia/Dubai'}).format(new Date(stamp));
 return <div className={`campaign-countdown ${featured?'featured':''} ${closed?'closed':''}`}><div className="countdown-label"><Clock3 size={14}/><span>{label}</span></div>{!closed&&deal.status!=='full'&&<div className="countdown-digits" role="timer" aria-live="off" aria-label={`${t.days} days ${t.hours} hours ${t.minutes} minutes ${t.seconds} seconds remaining`}>{[[t.days,'days'],[t.hours,'hrs'],[t.minutes,'min'],[t.seconds,'sec']].map(([value,unit])=><span key={unit}><b>{String(value).padStart(2,'0')}</b><small>{unit}</small></span>)}</div>}{featured&&<p>{opening?'Opens':'Cutoff'}: {cutoff} {deal.currency==='INR'?'IST':'GST'}</p>}</div>;
}
export function ServiceWindow({deal,compact=false}:{deal:Offer;compact?:boolean}){const t=serviceTiming(deal);if(deal.fulfillment==='coupon_shipping')return <div className={`campaign-service ${compact?'compact':''}`}><CalendarDays size={18}/><div><small>FREE SHIPPING · COUPON OFFER</small><strong>Unlocks at {deal.min} bookings</strong><span>Trial-pack link + coupon</span>{!compact&&<p>Available in My bookings after the minimum is reached. Order on HOUSE OF EON; delivery timing is confirmed there.</p>}</div></div>;return <div className={`campaign-service ${compact?'compact':''}`}><CalendarDays size={18}/><div><small>{deal.bakeryCampaign?'EXPECTED PICKUP':'EXPECTED SERVICE'}</small><strong>{t.day}</strong><span>{t.window} <b>{t.zone}</b></span>{!compact&&<p>{deal.weeklyWindow?'Exact time coordinated by the business once the minimum is reached.':'Your selected slot is shown at checkout.'}</p>}</div></div>;}
