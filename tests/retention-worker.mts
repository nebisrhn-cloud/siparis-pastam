import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
const source=await readFile(new URL('../supabase/functions/order-retention/index.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
let handler:(request:Request)=>Promise<Response>;
let calls:string[]=[];let failStorage=false;
runInNewContext(js,{Request,Response,Deno:{env:{get:(name:string)=>({RETENTION_JOB_SECRET:'test-secret',SUPABASE_URL:'https://example.test',SUPABASE_SERVICE_ROLE_KEY:'server-only'}[name])},serve:(fn:typeof handler)=>{handler=fn;}},fetch:async(url:string,options:any)=>{
 const path=new URL(url).pathname;calls.push(path);
 assert.equal(options.headers.apikey,'server-only');
 if(path.endsWith('retention_candidates'))return Response.json([{id:'one'}]);
 if(path.includes('/object/list/'))return Response.json([{name:'1'},{name:'2'}]);
 if(path==='/storage/v1/object/order-images'){
  assert.deepEqual(JSON.parse(options.body),{prefixes:['one/1','one/2']});
  return failStorage?new Response('error',{status:500}):Response.json([]);
 }
 if(path.endsWith('finish_order_retention'))return Response.json(true);
 throw new Error('Unexpected request');
}});
assert.equal((await handler!(new Request('https://example.test',{method:'POST'}))).status,401);assert.equal(calls.length,0);
assert.equal((await handler!(new Request('https://example.test'))).status,405);
const request=()=>new Request('https://example.test',{method:'POST',headers:{'x-retention-secret':'test-secret'}});
const result=await handler!(request());assert.deepEqual(await result.json(),{removed:1,failed:0});assert.ok(calls.at(-1)?.endsWith('finish_order_retention'));
calls=[];failStorage=true;
assert.equal((await handler!(request())).status,500);
assert.ok(!calls.some(path=>path.endsWith('finish_order_retention')));
console.log('Retention worker: unauthorized requests rejected, images removed before records, storage failures preserve records passed.');
