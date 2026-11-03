// Run only with the local Next server stopped. Never stores the plaintext password.
import {readFile,writeFile,rename} from 'node:fs/promises';
import {randomBytes,scryptSync} from 'node:crypto';
const file=new URL('../.demo/state.json',import.meta.url);
const s=JSON.parse(await readFile(file,'utf8')),id='clp-cleaning-service',email='clp@joinzy.local';
s.businessAccounts??=[];
if(s.businessAccounts.some(a=>a.businessId===id||a.email===email))throw new Error('Account already exists. No password was changed.');
const b=s.businesses.find(b=>b.id===id);if(!b)throw new Error('CLP business missing');
const password='Clp-'+randomBytes(12).toString('base64url'),salt=randomBytes(16).toString('hex');
s.businessAccounts.push({businessId:id,email,salt,passwordHash:scryptSync(password,salt,64).toString('hex')});b.email=email;
await writeFile(new URL('../.demo/state.json.tmp',import.meta.url),JSON.stringify(s,null,2));await rename(new URL('../.demo/state.json.tmp',import.meta.url),file);
console.log(JSON.stringify({email,password}));
