import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createSupabaseRepository} from '../lib/supabaseRepository.mjs';
try{process.loadEnvFile('.env.local');}catch(e){if(e.code!=='ENOENT')throw e;}
try{
 const repository=createSupabaseRepository(),existing=await repository.read();
 if(existing.revision>0){console.log('Supabase already initialized. Existing data was left unchanged.');}
 else{
  const source=await readFile('.demo/state.json','utf8'),state=JSON.parse(source);
  for(const k of ['communities','businesses','deals','bookings'])if(!Array.isArray(state[k]))throw new Error('Invalid import file.');
  await mkdir('.demo/backups',{recursive:true});await writeFile('.demo/backups/pre-supabase-'+Date.now()+'.json',source,{mode:0o600});
  if(!await repository.commit(0,state))throw new Error('Database changed during initialization. Import aborted without overwriting it.');
  const saved=await repository.read();for(const key of Object.keys(state))assert.deepEqual(saved.state[key],state[key]);
  console.log('Import and full record verification passed. Local backup preserved.');
  console.log(JSON.stringify(Object.fromEntries(['communities','businesses','deals','weeklyTemplates','bookings','residents'].map(k=>[k,saved.state[k]?.length||0]))));
 }
}catch(e){console.error(e.name==='AssertionError'?'Import verification failed; keep the local backend active.':e.message);process.exitCode=1;}
