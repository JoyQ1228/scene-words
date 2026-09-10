import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// The bundler imports JSON; replace this one import for Node's independent HTTP tests.
const source=readFileSync(new URL('./index.js',import.meta.url),'utf8').replace("import rows from '../frontend/public/subtitles.json';",'const rows=[];').replace("'./search.js'",JSON.stringify(new URL('./search.js',import.meta.url).href));
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const env={ALLOWED_ORIGIN:'https://joyq1228.github.io',DEEPSEEK_API_KEY:'test'};
const request=(query,origin=env.ALLOWED_ORIGIN)=>new Request('https://example.com/search?q='+encodeURIComponent(query),{headers:{Origin:origin}});
test('rejects other origins before contacting provider',async()=>assert.equal((await worker.fetch(request('hello','https://other.com'),env,{})).status,403));
test('rejects oversized queries',async()=>assert.equal((await worker.fetch(request('a'.repeat(121)),env,{})).status,400));
test('missing secret returns recoverable failure',async()=>assert.equal((await worker.fetch(request('hello'),{...env,DEEPSEEK_API_KEY:''},{})).status,503));
test('rate limit blocks provider request',async()=>{
 globalThis.caches={default:{match:async()=>null}};
 assert.equal((await worker.fetch(request('hello'),{...env,PER_IP:{limit:async()=>({success:false})}},{})).status,429);
});
