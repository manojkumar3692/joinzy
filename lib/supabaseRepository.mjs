// Imported by server routes and CLI tools only. Never expose the secret key to clients.
export function supabaseConfig(env=process.env){
 const url=env.SUPABASE_URL, key=env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw new Error('Supabase server credentials are not configured.');
 const parsed=new URL(url);if(parsed.protocol!=='https:'||!parsed.hostname.endsWith('.supabase.co'))throw new Error('Invalid Supabase project URL.');
 return {url:parsed.origin,key};
}
export function createSupabaseRepository({fetcher=fetch,env=process.env}={}){
 const {url,key}=supabaseConfig(env);
 async function rpc(name,body={}){
  let response;
  try{response=await fetcher(`${url}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(20000)});}catch{throw new Error('Database connection failed. Please try again.');}
  if(!response.ok)throw new Error(`Database operation failed (HTTP ${response.status}). Check the JOINZY runtime migration and server configuration.`);
  return response.json();
 }
 return {
  async read(){const value=await rpc('joinzy_read_state');if(!Number.isSafeInteger(value?.revision)||value.revision<0)throw new Error('Invalid database revision.');return value;},
  async commit(revision,state){return await rpc('joinzy_commit_state',{expected_revision:revision,next_state:state})===true;}
 };
}
export async function withDatabaseState(repository,mutate,{attempts=8}={}){
 for(let attempt=0;attempt<attempts;attempt++){
  const {state,revision}=await repository.read();
  if(!state)throw new Error('JOINZY database is not initialized. Run the one-time import first.');
  const before=JSON.stringify(state),result=await mutate(state);
  if(JSON.stringify(state)===before||await repository.commit(revision,state))return result;
 }
 throw new Error('The database is busy. Please retry your request.');
}
