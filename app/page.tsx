import {headers} from 'next/headers';
import Landing from './components/Landing';
import {portalForHost,portalUrl} from '../lib/portals.mjs';
export const dynamic='force-dynamic';
export default async function Page(){const h=await headers(),host=h.get('host')||'localhost:3000',role=portalForHost(host),protocol=host.includes('localhost')||host.includes('127.0.0.1')?'http:':'https:';return <Landing role={role} residentUrl={portalUrl('resident','/app?join=1',host,protocol)} portalsAvailable={!(process.env.VERCEL||process.env.NETLIFY)} businessUrl={portalUrl('business','/app',host,protocol)}/>;}
