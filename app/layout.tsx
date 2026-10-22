import type {Metadata} from 'next';
import './globals.css';
import './joinzy.css';
export const metadata:Metadata={title:'Joinzy — Your neighbourhood, better together',description:'Free for residents. Join your society, discover local services and unlock group prices together. Join the Joinzy waitlist in India and the UAE.',openGraph:{title:'Joinzy — Your neighbourhood, better together',description:'Everyday services. Neighbourhood prices. Free for residents.',type:'website'},icons:{icon:'/joinzy-icon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
