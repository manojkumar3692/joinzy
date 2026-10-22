import {NextResponse,NextRequest} from 'next/server';
import {portalForHost,portalUrl} from './lib/portals.mjs';
export function middleware(req:NextRequest){
 if((process.env.VERCEL||process.env.NETLIFY)&&['/app','/workspace','/api/demo'].includes(req.nextUrl.pathname))return new NextResponse('The portal is not part of this public launch.',{status:404});
 const host=req.headers.get('host')||'localhost:3000',role=portalForHost(host),url=new URL(req.nextUrl.pathname+req.nextUrl.search,`${req.nextUrl.protocol}//${host}`);
 const old=url.searchParams.get('portal');
 if((process.env.VERCEL||process.env.NETLIFY)&&old){url.searchParams.delete('portal');return NextResponse.redirect(url);}
 if(url.pathname==='/'&&old&&['resident','business','admin'].includes(old))return NextResponse.redirect(portalUrl(old,'/app',host,url.protocol));
 if(url.pathname==='/workspace')return NextResponse.redirect(new URL(role==='public'?'/':'/app',url));
 if(url.pathname==='/app'){
  if(role==='public')return NextResponse.redirect(new URL('/',url));
  return NextResponse.next();
 }
 return NextResponse.next();
}
export const config={matcher:['/','/app','/workspace','/api/demo']};
