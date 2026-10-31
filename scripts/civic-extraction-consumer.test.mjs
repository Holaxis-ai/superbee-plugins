import test from 'node:test';import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile,copyFile,realpath} from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {createWorkspace,isolatedEnvironment,runProcess} from './vendor/package-verification/src/harness.mjs';
import {syntheticPdf} from '../integrations/civic-records/test/pdf-fixture.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),sha=x=>createHash('sha256').update(x).digest('hex');
test('standalone civic discovery and real PDF extraction through public native registration/tool admission/export',async t=>{
 const workspace=await createWorkspace(),scratch=workspace.root,home=path.join(scratch,'home'),output=path.join(scratch,'outputs'),plugin=path.join(scratch,'plugin');
 await Promise.all([mkdir(home),mkdir(output),mkdir(path.join(plugin,'dist'),{recursive:true})]);
 const resolved=process.env.SUPERBEE_TEST_PDFTOTEXT??spawnSync('/usr/bin/which',['pdftotext'],{encoding:'utf8'}).stdout.trim();assert.ok(path.isAbsolute(resolved),'pdftotext must be provisioned; no skipped converter qualification');const tool=await realpath(resolved);
 const env=isolatedEnvironment({home,values:{PATH:path.dirname(process.execPath),SUPERBEE_ACTOR:'process:civic-extraction-consumer'}});
 const run=(cmd,args,expected=0)=>runProcess(cmd,args,{cwd:scratch,env,expected,timeout:120000,maxBuffer:2*1024*1024});
 try{
  await writeFile(path.join(scratch,'package.json'),JSON.stringify({private:true,type:'module'}));
  await run(process.execPath,[process.env.npm_execpath,'install','superbee@0.4.4-pre.11','--ignore-scripts','--no-audit','--no-fund','--package-lock=false','--registry=https://registry.npmjs.org/']);
  const cli=path.join(scratch,'node_modules/superbee/dist/superbee.mjs'),bundle=path.join(scratch,'bundle');
  const command=async(args,expected=0)=>JSON.parse((await run(process.execPath,[cli,...args,'--dir',bundle,'--json'],expected)).stdout);
  const identity=JSON.parse((await run(process.execPath,[cli,'version','--json'])).stdout);assert.equal(identity.identity.package.version,'0.4.4-pre.11');assert.equal(identity.identity.source.dirty,false);
  for(const file of ['package.json','dist/operation.mjs'])await copyFile(path.join(root,'integrations/civic-records',file),path.join(plugin,file));
  await command(['init','--create-only','--recipe','none']);const before=(await command(['list'])).count;
  const preview=await command(['op','register',plugin,'--local']);assert.equal(preview.accepted,false);await command(['op','register',plugin,'--local','--accept',preview.digest]);
  const prepare=async(id,resources,tools={})=>{const file=path.join(scratch,id+'.json');await writeFile(file,JSON.stringify({resources,tools,outputRoot:output,profile:'synthetic-v1'}));const p=await command(['op','bind',id,'--local','--resources-file',file]);return command(['op','bind',id,'--local','--resources-file',file,'--accept',p.digest]);};
  const resource=async(name,value)=>{const file=path.join(scratch,name);await writeFile(file,typeof value==='string'?value:JSON.stringify(value));return {path:file,logicalRef:'synthetic/'+name};};
  const discover=await prepare('local.civic.discover-pdfs.v1',{listing:await resource('listing.html','<a href="/ZZ0001/document/123.pdf">Synthetic Council</a>'),basis:await resource('discovery-basis.json',{v:1,registryUrl:'https://ecode360.com/ZZ0001/documents/Minutes',documentPathPrefix:'/ZZ0001/document/',maxDocuments:10})});
  const invoke=async(id,binding,name,roles)=>{const input=path.join(scratch,name+'-input.json');await writeFile(input,JSON.stringify({expectedInputs:binding.expectedInputs,settings:{}}));return command(['op','run',id,'--local','--binding',binding.binding,'--input-file',input,...roles.flatMap(([role,file])=>['--export-output',role+'='+path.join(output,file)])]);};
  const found=await invoke('local.civic.discover-pdfs.v1',discover,'discover',[['discovery','discovery.json']]);assert.equal(found.status,'succeeded');
  const d=JSON.parse(await readFile(path.join(output,'discovery.json')));assert.equal(d.candidates.length,1);assert.equal(d.coverage,'selected-only-unknown-tail');
  const ecodeBasis={v:1,registryUrl:'https://ecode360.com/ZZ0001/documents/Minutes',listingUrl:'https://ecode360.com/api/ZZ0001/pub-doc/type/12',jurisdictionCode:'ZZ0001',typeTitle:'Minutes',typeId:12,categoryId:34,year:2030,maxDocuments:2};
  const ecodeData={type:{id:12,custId:'ZZ0001',title:'Minutes'},documents:[{id:123,title:'Synthetic council minutes',date:'2030-01-02',categoryId:34,category:{id:34,custId:'ZZ0001',typeId:12,typeTitle:'Minutes',title:'Synthetic Council',private:false},type:'DOCUMENT',extension:'pdf',origExtension:'pdf',url:null,private:false,corrupt:false}]};
  const ecode=await prepare('local.civic.discover-ecode360.v1',{listing:await resource('ecode-listing.json',ecodeData),basis:await resource('ecode-basis.json',ecodeBasis)});
  assert.equal((await invoke('local.civic.discover-ecode360.v1',ecode,'ecode',[['discovery','ecode.json']])).status,'succeeded');
  const ecodeResult=JSON.parse(await readFile(path.join(output,'ecode.json')));assert.equal(ecodeResult.candidates[0].sourceUrl,'https://ecode360.com/ZZ0001/document/123.pdf');assert.equal(ecodeResult.coverage,'selected-only-unknown-tail');
  const pdf=await resource('source.pdf',syntheticPdf());
  const binding=await prepare('local.civic.extract-pdf.v1',{pdf,basis:await resource('extraction-basis.json',{v:1,jurisdictionKey:'synthetic-town',documentId:'123',recordId:'civic-records/synthetic-123',sourceUrl:d.candidates[0].sourceUrl})},{pdftotext:{path:tool,versionFlag:'-v',versionChannel:'stderr'}});
  for(const name of ['first','repeat']){
   const r=await invoke('local.civic.extract-pdf.v1',binding,name,[['extraction',name+'.json']]);assert.equal(r.status,'succeeded');assert.equal(r.outputExport.status,'exported');assert.equal(r.publication,'not_attempted');
   const manifest=JSON.parse(await readFile(r.manifest));assert.equal(manifest.tools.pdftotext.versionFlag,'-v');assert.equal(manifest.tools.pdftotext.versionChannel,'stderr');assert.match(manifest.tools.pdftotext.version,/pdftotext version/);assert.match(manifest.tools.pdftotext.sha256,/^sha256:/);
  }
  const a=Buffer.from(JSON.parse(await readFile(path.join(output,'first.json'))).text),b=Buffer.from(JSON.parse(await readFile(path.join(output,'repeat.json'))).text);assert.deepEqual(a,b);assert.match(a.toString(),/without approval/);
  const receipt=JSON.parse(await readFile(path.join(output,'first.json')));assert.equal(receipt.textSha256,sha(a));assert.equal(receipt.extractorExecution,'observed_native_tool_call');assert.equal(receipt.sourceUrlAuthority,'caller_asserted');assert.equal(receipt.transcriptionVerified,false);
  const evidenceBasis={v:1,jurisdictionKey:'synthetic-town',documentId:'123',sourceId:'civic-sources/synthetic-council',sourceUrl:d.candidates[0].sourceUrl,title:'Synthetic supplied source',documentKind:'other',pdfSha256:sha(await readFile(pdf.path)),textSha256:receipt.textSha256,expectedPages:receipt.pageCount};
  const evidence=await prepare('local.civic.prepare-evidence.v1',{pdf,text:await resource('evidence-text.txt',receipt.text),basis:await resource('evidence-basis.json',evidenceBasis)});
  assert.equal((await invoke('local.civic.prepare-evidence.v1',evidence,'evidence',[['evidence','evidence.json']])).status,'succeeded');
  const undated=JSON.parse(await readFile(path.join(output,'evidence.json')));assert.equal(undated.representations.length,2);assert.equal(undated.extractorExecution,'not_observed');assert.equal(undated.association,'caller_asserted');assert.equal('meetingDate' in undated,false);assert.match(undated.representations[0].id,/^civic-evidence\/original-v1-/);assert.match(undated.representations[1].body,/without approval/);assert.equal(undated.representations[1].bodySha256,sha(undated.representations[1].body));
  assert.equal((await command(['list'])).count,before,'processing creates no bundle documents');
  await writeFile(pdf.path,'changed bytes');const input=path.join(scratch,'changed.json');await writeFile(input,JSON.stringify({expectedInputs:binding.expectedInputs,settings:{}}));await run(process.execPath,[cli,'op','run','local.civic.extract-pdf.v1','--local','--binding',binding.binding,'--input-file',input,'--dir',bundle,'--json'],2);
  t.diagnostic('Public CLIpre11; standalone bundled plugin; native -v/stderr tool identity; actual Poppler synthetic PDF conversion and exact repeats. No network, managed admission, research writes or publication.');
 }finally{await workspace.close();}
});
