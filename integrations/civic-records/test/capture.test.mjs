import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm,mkdir} from 'node:fs/promises';import {createHash} from 'node:crypto';import {tmpdir} from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {discoverCapturedPdfs,extractCapturedPdf,discoveryDescriptor,extractionDescriptor} from '../src/capture.mjs';
import {createLocalCapabilities} from '../src/operation.mjs';
import {syntheticPdf} from './pdf-fixture.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
async function fixture(t){const dir=await mkdtemp(path.join(tmpdir(),'civic-capture-test-'));t.after(()=>rm(dir,{recursive:true,force:true}));return {dir,resource:async(name,value)=>{const bytes=Buffer.from(typeof value==='string'?value:JSON.stringify(value));const p=path.join(dir,name);await writeFile(p,bytes);return {path:p,sha256:'sha256:'+sha(bytes)};}};}
const scope={v:1,registryUrl:'https://example.org/council/minutes',documentPathPrefix:'/council/files/',maxDocuments:10};
const basis={v:1,jurisdictionKey:'synthetic-town',documentId:'meeting-one',recordId:'civic-records/meeting-one',sourceUrl:'https://example.org/council/files/one.pdf'};
test('captured HTML discovery uses real anchor semantics and explicit origin/path, not base/script/template',async t=>{
 const f=await fixture(t),listing=await f.resource('listing','<base href="https://evil.example"><script>"<a href=\'/council/files/evil.pdf\'>"</script><template><a href="/council/files/template.pdf">no</a></template><!-- <a href="/council/files/comment.pdf"> --><a href="/council/files/one.pdf">Council &amp; minutes</a><a href="/council/files/one.pdf">Council &amp; minutes</a><a href="/other/two.pdf">Other</a>');
 const result=await discoverCapturedPdfs({listing,basis:await f.resource('basis',scope)},{});assert.equal(result.candidates.length,1);assert.equal(result.candidates[0].label,'Council & minutes');assert.equal(result.coverage,'selected-only-unknown-tail');assert.equal(result.httpObservation,'not_observed');assert.equal(result.deletionInference,false);
});
test('discovery is deterministic, bounded, municipality-neutral and never infers removals',async t=>{
 const f=await fixture(t);const resources={listing:await f.resource('listing','<a href="/council/files/z.pdf">Z</a><a href="/council/files/a.pdf">A</a>'),basis:await f.resource('basis',{...scope,maxDocuments:1})};
 const a=await discoverCapturedPdfs(resources,{});assert.deepEqual(await discoverCapturedPdfs(resources,{}),a);assert.equal(a.observedCandidates,2);assert.equal(a.truncated,true);assert.match(a.candidates[0].sourceUrl,/a.pdf$/);
 resources.listing=await f.resource('empty','<h1>Loading documents…</h1>');assert.deepEqual((await discoverCapturedPdfs(resources,{})).candidates,[]);
});
test('discovery refuses scope escape, queries, credentials, changed bytes and extra settings',async t=>{
 const f=await fixture(t),b=await f.resource('basis',scope);
 for(const href of ['https://evil.example/council/files/x.pdf','https://user:pass@example.org/council/files/x.pdf','/council/files/x.pdf?secret=1','/council/files/x.pdf#page=1'])await assert.rejects(discoverCapturedPdfs({listing:await f.resource('listing',`<a href="${href}">X</a>`),basis:b},{}),/CIVIC_DISCOVERY_OUTSIDE_SCOPE/);
 const listing=await f.resource('listing','old');await writeFile(listing.path,'changed');await assert.rejects(discoverCapturedPdfs({listing,basis:b},{}),/CIVIC_CAPTURE_CHANGED/);await assert.rejects(discoverCapturedPdfs({listing,basis:b},{url:'http://elsewhere'}),/CIVIC_CAPTURE_SETTINGS/);
});
// A complete synthetic PDF, built with exact byte offsets; no captured government/customer data.

async function extraction(t,run){const f=await fixture(t),out=path.join(f.dir,'out');await mkdir(out);const resources={pdf:await f.resource('pdf',syntheticPdf()),basis:await f.resource('basis',basis)};let written;const context={resources,invocation:{id:'synthetic-native-invocation',outputDirectory:out},port:{runTool:async req=>{assert.equal(req.tool,'pdftotext');assert.deepEqual(req.argv.slice(0,3),['-layout','-enc','UTF-8']);return run(req,out);},writeJson:async(name,value)=>{written=value;await writeFile(path.join(out,name),JSON.stringify(value));}}};return {f,out,context,written:()=>written};}
test('native converter port produces actual synthetic PDF text with observed call, separate from source/authenticity',async t=>{
 const x=await extraction(t,async(req)=>{const r=spawnSync(process.env.SUPERBEE_TEST_PDFTOTEXT??'pdftotext',req.argv,{encoding:'utf8'});assert.ifError(r.error);return {exitCode:r.status,stdout:r.stdout,stderr:r.stderr};});
 const result=await extractCapturedPdf(x.context,{}),r=x.written();assert.equal(result.pageCount,1);assert.equal(r.extractorExecution,'observed_native_tool_call');assert.equal(r.sourceUrlAuthority,'caller_asserted');assert.equal(r.transcriptionVerified,false);assert.equal(r.httpObservation,'not_observed');assert.match(await readFile(path.join(x.out,'extracted.txt'),'utf8'),/without approval/);assert.equal(r.textSha256,sha(await readFile(path.join(x.out,'extracted.txt'))));
});
test('converter error and diagnostic never trigger a fallback or emit success',async t=>{
 for(const value of [{exitCode:1,stderr:'password required'},{exitCode:0,stderr:'Syntax warning'}]){let calls=0;const x=await extraction(t,async()=>{calls++;return value;});await assert.rejects(extractCapturedPdf(x.context,{}),/CIVIC_CONVERTER_/);assert.equal(calls,1);assert.equal(x.written(),undefined);}
});
test('low text/scanned output refuses, input mutation during conversion refuses',async t=>{
 const a=await extraction(t,async(_,out)=>{await writeFile(path.join(out,'extracted.txt'),'\f');return {exitCode:0,stderr:''};});await assert.rejects(extractCapturedPdf(a.context,{}),/CIVIC_TEXT_REVIEW_REQUIRED/);
 const b=await extraction(t,async(_,out)=>{await writeFile(path.join(out,'extracted.txt'),'This is synthetic extracted text with enough characters to pass the floor.\f');await writeFile(b.context.resources.pdf.path,'changed');return {exitCode:0,stderr:''};});await assert.rejects(extractCapturedPdf(b.context,{}),/CIVIC_CAPTURE_CHANGED/);
});
test('all three standalone operation descriptors match inert manifest',async()=>{const p=JSON.parse(await readFile(new URL('../package.json',import.meta.url)));const caps=createLocalCapabilities({});assert.equal(caps.length,3);assert.deepEqual(p.superbeeLocalOperations.operations[1].capability,discoveryDescriptor);assert.deepEqual(p.superbeeLocalOperations.operations[2].capability,extractionDescriptor);});
