import test from 'node:test';import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile,readdir,realpath} from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';
import {createWorkspace,isolatedEnvironment,runProcess} from './vendor/package-verification/src/harness.mjs';
import {syntheticPdf} from '../integrations/civic-records/test/pdf-fixture.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
test('standalone civic host package imports inertly and composes public native discovery/extraction/evidence',async t=>{
 const workspace=await createWorkspace(),scratch=workspace.root,home=path.join(scratch,'home');await mkdir(home);
 const env=isolatedEnvironment({home,values:{PATH:process.env.PATH}}),run=(command,args,expected=0)=>runProcess(command,args,{cwd:scratch,env,expected,timeout:120000,maxBuffer:2*1024*1024});
 try{
  await writeFile(path.join(scratch,'package.json'),JSON.stringify({private:true,type:'module'}));
  const packed=JSON.parse((await run(process.execPath,[process.env.npm_execpath,'pack',path.join(root,'integrations/civic-records'),'--ignore-scripts','--pack-destination',scratch,'--json'])).stdout)[0];
  assert.ok(packed.files.some(f=>f.path==='dist/host.mjs'));assert.equal(packed.files.some(f=>f.path.startsWith('src/')||f.path.startsWith('examples/')),false);
  await run(process.execPath,[process.env.npm_execpath,'install',path.join(scratch,packed.filename),'@superbee/core@0.2.0-pre.41','superbee@0.4.4-pre.11','--ignore-scripts','--no-audit','--no-fund','--package-lock=false','--registry=https://registry.npmjs.org/']);
  const before=await readdir(scratch);const inert=path.join(scratch,'inert.mjs');await writeFile(inert,"import * as api from '@superbee/integration-civic-records/host';console.log(JSON.stringify(Object.keys(api)));\n");
  const exports=JSON.parse((await run(process.execPath,[inert,'--apply','--unknown'])).stdout);assert.ok(exports.includes('stageHostedEvidence'));assert.ok(exports.includes('createCivicOperations'));assert.deepEqual((await readdir(scratch)).sort(),[...before,'inert.mjs'].sort());
  const tool=await realpath(process.env.SUPERBEE_TEST_PDFTOTEXT??spawnSync('/usr/bin/which',['pdftotext'],{encoding:'utf8'}).stdout.trim());assert.ok(path.isAbsolute(tool));
  await writeFile(path.join(scratch,'source.pdf'),syntheticPdf());
  const consumer=path.join(scratch,'consumer.mjs');await writeFile(consumer,`import assert from 'node:assert/strict';import {mkdir,writeFile,readFile} from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import {createCivicOperations} from '@superbee/integration-civic-records/host';
const dir=process.cwd(),outDir=path.join(dir,'run');await mkdir(outDir);const cli=path.join(dir,'node_modules/.bin/superbee'),packageRoot=path.join(dir,'node_modules/@superbee/integration-civic-records');const invoke=await createCivicOperations({cli,packageRoot,outDir});
await assert.rejects(invoke('other.operation',{}),/CIVIC_CAPTURE_OPERATION/);
const resource=async(name,value)=>{const file=path.join(dir,name);await writeFile(file,typeof value==='string'?value:JSON.stringify(value));return {path:file,logicalRef:'synthetic/'+name};};
const listing={type:{id:12,custId:'ZZ0001',title:'Minutes'},documents:[{id:123,title:'Synthetic minutes',date:'2030-01-02',categoryId:34,category:{id:34,custId:'ZZ0001',typeId:12,typeTitle:'Minutes',title:'Synthetic Council',private:false},type:'DOCUMENT',extension:'pdf',origExtension:'pdf',url:null,private:false,corrupt:false}]};
const discovery=await invoke('local.civic.discover-ecode360.v1',{listing:await resource('listing.json',listing),basis:await resource('discovery.json',{v:1,registryUrl:'https://ecode360.com/ZZ0001/documents/Minutes',listingUrl:'https://ecode360.com/api/ZZ0001/pub-doc/type/12',jurisdictionCode:'ZZ0001',typeTitle:'Minutes',typeId:12,categoryId:34,year:2030,maxDocuments:2})});assert.equal(discovery.candidates.length,1);assert.equal(discovery.candidates[0].dateRole,'unknown');
const sourceUrl=discovery.candidates[0].sourceUrl,pdf={path:path.join(dir,'source.pdf'),logicalRef:'synthetic/source.pdf'};const extraction=await invoke('local.civic.extract-pdf.v1',{pdf,basis:await resource('extract.json',{v:1,jurisdictionKey:'synthetic-town',documentId:'123',recordId:'civic-records/processing',sourceUrl})},{pdftotext:{path:process.argv[2],versionFlag:'-v',versionChannel:'stderr'}});assert.equal(extraction.extractorExecution,'observed_native_tool_call');
const evidence=await invoke('local.civic.prepare-evidence.v1',{pdf,text:await resource('text.txt',extraction.text),basis:await resource('evidence.json',{v:1,jurisdictionKey:'synthetic-town',documentId:'123',sourceId:'civic-sources/synthetic',sourceUrl,title:'Synthetic minutes',documentKind:'minutes',pdfSha256:extraction.pdfSha256,textSha256:extraction.textSha256,expectedPages:extraction.pageCount})});assert.equal(evidence.representations.length,2);assert.equal('meetingDate' in evidence,false);assert.equal(evidence.extractorExecution,'not_observed');assert.match(evidence.representations[0].blobKey,/^evidence\\/source-bytes\\//);
const listed=JSON.parse(execFileSync(cli,['list','--dir',path.join(outDir,'operations'),'--json'],{encoding:'utf8'}));assert.equal(listed.count,0);console.log(JSON.stringify({discovery:1,extraction:1,prepared:1,bundleDocuments:0}));\n`);
  const result=JSON.parse((await run(process.execPath,[consumer,tool])).stdout);assert.deepEqual(result,{discovery:1,extraction:1,prepared:1,bundleDocuments:0});
  t.diagnostic('Actual packed host export/publicCore41/publicCLIpre11/Poppler, no sibling source or example runtime imports. Native local processing only; no provider fetch, hosted sync or authority qualification.');
 }finally{await workspace.close();}
});
