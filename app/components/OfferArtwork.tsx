'use client';
import {useState} from 'react';
export default function OfferArtwork({imageUrl,bakery,perfume,title}:{imageUrl?:string;bakery?:boolean;perfume?:boolean;title:string}){
 const [failed,setFailed]=useState(false);
 const supplied=!!imageUrl&&!failed;
 return <><img className="customer-offer-image" src={supplied?imageUrl:perfume?'/images/services/perfume-3d.webp':bakery?'/images/services/bakery-3d.webp':'/images/services/cleaning-3d.webp'} alt={supplied?title:perfume?'Illustration of three perfume sample vials':bakery?'3D illustration of brownies, a bun and cookies':'3D illustration of a living room and cleaning supplies'} width={900} height={600} loading="lazy" decoding="async" onError={()=>{if(supplied)setFailed(true);}}/>{!supplied&&<small className="customer-illustration-label">Service illustration</small>}</>;
}
