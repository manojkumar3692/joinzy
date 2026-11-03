import {NextResponse,NextRequest} from 'next/server';
import {portalForHost,portalUrl} from './lib/portals.mjs';
export function middleware(req:NextRequest){
 const host=req.headers.get('host')||'localhost:3012',role=portalForHost(host),url=new URL(req.nextUrl.pathname+req.nextUrl.search,`${req.nextUrl.protocol}//${host}`);
 // Staff portals still require a production authentication integration.
 if((process.env.VERCEL||process.env.NETLIFY)&&['business','admin'].includes(role))return new NextResponse('Staff portals are not enabled on this deployment.',{status:404});
 const old=url.searchParams.get('portal');
 if(url.pathname==='/'&&old&&['resident','business','admin'].includes(old))return NextResponse.redirect(new URL(portalUrl(old,'/app',host,url.protocol),url));
 if(url.pathname==='/workspace')return NextResponse.redirect(new URL('/app',url));
 return NextResponse.next();
}
export const config={matcher:['/','/app','/workspace','/api/demo','/api/portal']};
