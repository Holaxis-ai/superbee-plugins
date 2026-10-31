import test from 'node:test';import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,copyFile,cp} from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {createWorkspace,isolatedEnvironment,runProcess} from './vendor/package-verification/src/harness.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),sha=x=>createHash('sha256').update(x).digest('hex');
test('standalone Civic Records package: pinned public CLI recipe/install/register/bind/prepare/export/repeat/refusal',async t=>{
 const workspace=await createWorkspace(),scratch=workspace.root,home=path.join(scratch,'home'),output=path.join(scratch,'outputs'),inputs=path.join(scratch,'inputs'),plugin=path.join(scratch,'standalone-plugin'),recipe=path.join(scratch,'standalone-recipe');
 await Promise.all([mkdir(home),mkdir(output),mkdir(inputs),mkdir(path.join(plugin,'dist'),{recursive:true})]);
 const env=isolatedEnvironment({home,values:{PATH:path.dirname(process.execPath),SUPERBEE_ACTOR:'process:civic-records-consumer'}});
 const run=(cmd,args,expected=0)=>runProcess(cmd,args,{cwd:scratch,env,expected,timeout:120000,maxBuffer:2*1024*1024});
 try{
  assert.ok(process.env.npm_execpath,'invoke through npm');await writeFile(path.join(scratch,'package.json'),JSON.stringify({private:true,type:'module'}));
  await run(process.execPath,[process.env.npm_execpath,'install','superbee@0.4.4-pre.6','--ignore-scripts','--no-audit','--no-fund','--package-lock=false','--registry=https://registry.npmjs.org/']);
  const cli=path.join(scratch,'node_modules/superbee/dist/superbee.mjs'),command=async(args,expected=0)=>JSON.parse((await run(process.execPath,[cli,...args,'--json'],expected)).stdout);
  const identity=await command(['version']);assert.equal(identity.identity.package.version,'0.4.4-pre.6');assert.equal(identity.identity.source.commit,'688d62a2e1395a6ca7dde52f08e0caf97b643d60');assert.equal(identity.identity.source.dirty,false);
  for(const file of ['package.json','dist/operation.mjs'])await copyFile(path.join(root,'integrations/civic-records',file),path.join(plugin,file));
  await cp(path.join(root,'recipes/civic-records'),recipe,{recursive:true});assert.equal((await command(['recipe','validate',recipe])).ok,true);
  const bundle=path.join(scratch,'bundle'),flags=['--dir',bundle];await command(['init','--create-only','--recipe','none',...flags]);await command(['recipe','add',recipe,...flags]);
  const before=(await command(['list',...flags])).count;
  const pdf='%PDF-1.4\nSYNTHETIC header fixture, not an official or structurally validated PDF.\n%%EOF\n';
  const text='SYNTHETIC MUNICIPALITY\nThe Bluebird project was discussed without a decision.\n\fSYNTHETIC SECOND PAGE\nAn allocation remains conditional on later review and confirmation.\n\f';
  const basis={v:1,jurisdictionKey:'synthetic-other-village',documentId:'minutes-1',recordId:'civic-records/synthetic-record-1',sourceUrl:'https://example.org/council/minutes-1.pdf',pdfSha256:sha(pdf),textSha256:sha(text),expectedPages:2,extractionLabel:'synthetic; no converter ran'};
  const resources={};for(const [role,bytes] of Object.entries({pdf,text,basis:JSON.stringify(basis)})){const file=path.join(inputs,role);await writeFile(file,bytes);resources[role]={path:file,logicalRef:'synthetic/'+role};}
  const reg=await command(['op','register',plugin,'--local',...flags]);assert.equal(reg.accepted,false);await command(['op','register',plugin,'--local','--accept',reg.digest,...flags]);
  const file=path.join(scratch,'resources.json');await writeFile(file,JSON.stringify({resources,tools:{},outputRoot:output,profile:'synthetic-v1'}));
  const preview=await command(['op','bind','local.civic.prepare-text.v1','--local','--resources-file',file,...flags]);const binding=await command(['op','bind','local.civic.prepare-text.v1','--local','--resources-file',file,'--accept',preview.digest,...flags]);
  const input=path.join(scratch,'run.json');await writeFile(input,JSON.stringify({expectedInputs:binding.expectedInputs,settings:{}}));
  for(const name of ['one','two']){
   const result=await command(['op','run','local.civic.prepare-text.v1','--local','--binding',binding.binding,'--input-file',input,'--export-output','prepared='+path.join(output,name+'.json'),...flags]);
   assert.equal(result.status,'succeeded');assert.equal(result.outputExport.status,'exported');assert.equal(result.publication,'not_attempted');
  }
  const a=await readFile(path.join(output,'one.json')),b=await readFile(path.join(output,'two.json'));assert.deepEqual(a,b);const prepared=JSON.parse(a);assert.equal(prepared.pageCount,2);assert.equal(prepared.extractionAssociation,'caller_asserted');assert.equal(prepared.extractorExecution,'not_observed');assert.equal(prepared.pdfSha256,basis.pdfSha256);assert.equal(prepared.markdownSha256,sha(prepared.markdown));assert.match(prepared.markdown,/conditional/);
  assert.equal((await command(['list',...flags])).count,before,'execution did not create domain documents');
  await writeFile(resources.text.path,'changed captured input');await run(process.execPath,[cli,'op','run','local.civic.prepare-text.v1','--local','--binding',binding.binding,'--input-file',input,...flags,'--json'],2);
  await command(['op','unregister','civic-records','--local',...flags]);
  t.diagnostic('Public CLIpre6 exact producer, standalone inert recipe + accepted native operation + finite inputs + JSON output + byte-equal repeats + changed-input refusal. Synthetic only; no PDF conversion, official identity, live crawl or publication established.');
 }finally{await workspace.close();}
});
