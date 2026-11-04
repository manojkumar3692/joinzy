import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import {createSupabaseRepository} from '../lib/supabaseRepository.mjs';
try{process.loadEnvFile('.env.local');}catch(e){if(e.code!=='ENOENT')throw e;}
async function main(){
 const connection=process.env.SUPABASE_DB_URL;
 if(!connection)throw new Error('Add SUPABASE_DB_URL from Supabase Connect → Session pooler to .env.local. API keys cannot create tables.');
 const project=new URL(process.env.SUPABASE_URL).hostname.split('.')[0],uri=new URL(connection);
 if(!uri.hostname.endsWith('.supabase.com')&&!uri.hostname.endsWith('.supabase.co'))throw new Error('Expected a Supabase PostgreSQL connection.');
 if(!uri.hostname.includes(project)&&!decodeURIComponent(uri.username).includes(project))throw new Error('Database connection does not match SUPABASE_URL project.');
 for(const key of ['sslmode','sslcert','sslkey','sslrootcert'])uri.searchParams.delete(key);
 const client=new pg.Client({connectionString:uri.toString(),ssl:{rejectUnauthorized:true},connectionTimeoutMillis:15000,statement_timeout:30000});
 try{
  await client.connect();
  await client.query(await readFile(new URL('../supabase/runtime/001_app_storage.sql',import.meta.url),'utf8'));
  console.log('Runtime schema applied (safe to rerun).');
  const {rows}=await client.query('select public.joinzy_read_state() as value');
  if(rows[0].value.revision>0){console.log('Database already initialized; existing data was left unchanged.');return;}
  const source=await readFile(path.resolve('.demo/state.json'),'utf8'),state=JSON.parse(source);
  for(const key of ['communities','deals','bookings','businesses'])if(!Array.isArray(state[key]))throw new Error('Invalid source state: '+key);
  await mkdir('.demo/backups',{recursive:true});const backup='.demo/backups/pre-supabase-'+Date.now()+'.json';await writeFile(backup,source,{mode:0o600});
  const result=await client.query('select public.joinzy_commit_state(0,$1::jsonb) as saved',[JSON.stringify(state)]);
  if(!result.rows[0].saved)throw new Error('Another process initialized the database. Nothing was overwritten.');
  const remote=(await client.query('select public.joinzy_read_state() as value')).rows[0].value.state;
  for(const [key,value] of Object.entries(state))if(Array.isArray(value)&&remote[key]?.length!==value.length)throw new Error('Import verification failed: '+key);
  console.log('Imported and verified records. Local backup retained at '+backup);
  console.log(JSON.stringify(Object.fromEntries(['communities','businesses','deals','weeklyTemplates','bookings','residents'].map(k=>[k,remote[k]?.length||0]))));
 }finally{await client.end();}
}
try{await main();}catch(e){console.error(e.message?.startsWith('Add SUPABASE_DB_URL')?e.message:'Migration stopped. Check database access, TLS and schema. No credentials were printed.');process.exitCode=1;}
