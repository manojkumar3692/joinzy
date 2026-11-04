import {createSupabaseRepository} from '../lib/supabaseRepository.mjs';
try{process.loadEnvFile('.env.local');}catch(e){if(e.code!=='ENOENT')throw e;}
try{const result=await createSupabaseRepository().read();console.log('Supabase runtime connection OK. Revision:',result.revision);console.log('Initialized:',!!result.state);if(result.state)console.log(JSON.stringify(Object.fromEntries(['communities','businesses','deals','weeklyTemplates','bookings','residents'].map(k=>[k,result.state[k]?.length||0]))));}catch(e){console.error(e.message);process.exitCode=1;}
