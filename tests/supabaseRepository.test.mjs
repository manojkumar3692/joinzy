import test from 'node:test';import assert from 'node:assert/strict';
import {createSupabaseRepository,withDatabaseState,supabaseConfig} from '../lib/supabaseRepository.mjs';
const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_SECRET_KEY:'test-secret'};
test('server RPC uses API key without caching and never includes a key in error text',async()=>{
 let request;const repo=createSupabaseRepository({env,fetcher:async(url,options)=>{request={url,options};return new Response(JSON.stringify({revision:1,state:{}}));}});await repo.read();assert.equal(request.options.headers.apikey,'test-secret');assert.equal(request.options.cache,'no-store');assert.equal(request.options.headers.Authorization,undefined);
 await assert.rejects(createSupabaseRepository({env,fetcher:async()=>new Response('secret', {status:403})}).read(),e=>!e.message.includes('test-secret')&&e.message.includes('403'));
 assert.throws(()=>supabaseConfig({}),/credentials/);
});
test('optimistic retries preserve a concurrent booking and never overbook',async()=>{
 let state={bookings:[],capacity:1},revision=1,reads=0;
 const repo={read:async()=>{reads++;return {revision,state:structuredClone(state)};},commit:async(v,s)=>{if(revision===1){state.bookings.push('other-client');revision++;return false;}if(v!==revision)return false;state=s;revision++;return true;}};
 await assert.rejects(withDatabaseState(repo,s=>{if(s.bookings.length>=s.capacity)throw new Error('Full');s.bookings.push('this-client');}),/Full/);
 assert.equal(reads,2);assert.deepEqual(state.bookings,['other-client']);
});
test('no-op reads do not write; missing DB and contention fail explicitly',async()=>{
 let writes=0;const repo={read:async()=>({revision:1,state:{value:1}}),commit:async()=>{writes++;return false;}};
 assert.equal(await withDatabaseState(repo,s=>s.value),1);assert.equal(writes,0);
 await assert.rejects(withDatabaseState(repo,s=>{s.value++;},{attempts:2}),/busy/);assert.equal(writes,2);
 await assert.rejects(withDatabaseState({read:async()=>({revision:0,state:null})},()=>{}),/not initialized/);
});
