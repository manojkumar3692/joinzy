// Local demo lifecycle worker. Catch up on startup and every minute while Next runs.
export async function register(){
 if(process.env.JOINZY_WEEKLY_WORKER!=='1')return;
 if(process.env.NEXT_RUNTIME!=='nodejs'||process.env.NODE_ENV==='test'||process.env.VERCEL||process.env.NETLIFY)return;
 if(process.env.NEXT_RUNTIME==='nodejs'){
 const {transact}=await import('./lib/store.mjs');
 const shared=globalThis as typeof globalThis & {joinzyWeeklyTimer?:ReturnType<typeof setInterval>};
 if(shared.joinzyWeeklyTimer)return;
 const tick=()=>{void transact(null).catch((e:Error)=>console.error('Weekly campaign worker:',e.message));};
 shared.joinzyWeeklyTimer=setInterval(tick,60000);shared.joinzyWeeklyTimer.unref();tick();
 }
}
