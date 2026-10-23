import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createWorkspace,isolatedEnvironment,runProcess} from './vendor/package-verification/src/harness.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),sha=x=>createHash('sha256').update(x).digest('hex');
test('installed Core38/CLIpre3 observes a standalone plugin report and ingests only linked observation fields',async t=>{
 const workspace=await createWorkspace(),scratch=workspace.root,home=path.join(scratch,'home'),exports=path.join(scratch,'exports'),inputs=path.join(scratch,'inputs'),plugin=path.join(scratch,'plugin');
 await Promise.all([mkdir(home),mkdir(exports),mkdir(inputs),mkdir(path.join(plugin,'dist'),{recursive:true})]);
 const env=isolatedEnvironment({home,values:{PATH:path.dirname(process.execPath),SUPERBEE_ACTOR:'process:verification-consumer'}});
 const run=(cmd,args,expected=0)=>runProcess(cmd,args,{cwd:scratch,env,expected,timeout:120000,maxBuffer:2*1024*1024});
 try{
  assert.ok(process.env.npm_execpath,'invoke through npm');
  await writeFile(path.join(scratch,'package.json'),JSON.stringify({private:true,type:'module'}));
  await run(process.execPath,[process.env.npm_execpath,'install','superbee@0.4.4-pre.3','--ignore-scripts','--no-audit','--no-fund','--package-lock=false','--registry=https://registry.npmjs.org/']);
  const cli=path.join(scratch,'node_modules/superbee/dist/superbee.mjs');
  const command=async(args,expected=0)=>JSON.parse((await run(process.execPath,[cli,...args,'--json'],expected)).stdout);
  const identity=await command(['version']);assert.equal(identity.identity.package.version,'0.4.4-pre.3');assert.equal(identity.identity.source.commit,'bf9a2a2bb54c7d682853679a4c241533eb8de381');assert.equal(identity.identity.source.dirty,false);
  for(const name of ['package.json','dist/operation.mjs'])await copyFile(path.join(root,'integrations/verification',name),path.join(plugin,name));
  const bundle=path.join(scratch,'bundle'),flags=['--dir',bundle];await command(['init','--create-only','--recipe','none',...flags]);
  const put=async(file,text)=>{const p=path.join(bundle,file);await mkdir(path.dirname(p),{recursive:true});await writeFile(p,text);};
  await put('conventions/run.md','---\ntype: Convention\ntitle: Synthetic verification run\ngoverns: VerificationRun\nfields:\n  required: [title]\n  optional: [verdict, observed_status, observed_input_match, observed_digest]\n---\n');
  await put('conventions/signal.md',await readFile(path.join(root,'recipes/source-feeds/conventions/signal.md')));
  await put('sources/verification.md','---\ntype: Reference\ntitle: Synthetic report observations\nresource: urn:superbee:verification:tlc\ntarget_kind: VerificationRun\nidentity:\n  id: "{key}"\nfields:\n  observed_status: verification.reported_status\n  observed_input_match: verification.input_match\n  observed_digest: verification.report_digest\nowned_fields: [observed_status, observed_input_match, observed_digest]\nauto_apply: [new, changed]\nneeds_review: [disappeared]\ncompleteness: partial\n---\n');
  await put('verification-runs/linked.md','---\ntype: VerificationRun\ntitle: Human reviewed label\nverdict: accepted\nsources:\n  - resource: urn:superbee:verification:tlc\n    id: trial-1\n---\n# Human notes\nPreserve the independent review and statement.\n');
  const report={status:'PASS',bounded_model_only:true,tlc_sha256:sha('synthetic jar'),source_bytes_checked:true,inputs_unchanged:true,checked_input_hashes:{'model.tla':sha('synthetic model')},runs:[{variant:'safe',pass:true,expected_error:null,errors:[],exit_code:0,log_sha256:sha('synthetic log')}]};
  const basis={v:1,runKey:'trial-1',artifactRevision:'a'.repeat(40),sourceRevision:'b'.repeat(40),tlcSha256:report.tlc_sha256,checkedInputs:[{name:'model.tla',role:'input0',sha256:sha('synthetic model')}],expectedRuns:[{variant:'safe',expectedError:null}]};
  const resources={};for(const [role,content]of Object.entries({report:JSON.stringify(report),basis:JSON.stringify(basis),input0:'synthetic model',tlc:'synthetic jar'})){const file=path.join(inputs,role);await writeFile(file,content);resources[role]={path:file,logicalRef:role};}
  const proposal=await command(['op','register',plugin,'--local',...flags]);assert.equal(proposal.accepted,false);await command(['op','register',plugin,'--local','--accept',proposal.digest,...flags]);
  const resourcesFile=path.join(scratch,'resources.json');await writeFile(resourcesFile,JSON.stringify({resources,tools:{},outputRoot:exports,profile:'synthetic-v1'}));
  const bindingPreview=await command(['op','bind','local.verification.observe-tlc.v1','--local','--resources-file',resourcesFile,...flags]);const binding=await command(['op','bind','local.verification.observe-tlc.v1','--local','--resources-file',resourcesFile,'--accept',bindingPreview.digest,...flags]);
  const inputFile=path.join(scratch,'run.json');await writeFile(inputFile,JSON.stringify({expectedInputs:binding.expectedInputs,settings:{generation:1}}));
  const snapshot=path.join(exports,'g1.json');const result=await command(['op','run','local.verification.observe-tlc.v1','--local','--binding',binding.binding,'--input-file',inputFile,'--export-output','snapshot='+snapshot,...flags]);assert.equal(result.status,'succeeded');assert.equal(result.outputExport.status,'exported');assert.equal(result.publication,'not_attempted');
  const sourceBinding=await command(['source','snapshot','bind','sources/verification',...flags]);await command(['source','snapshot','bind','sources/verification','--accept',sourceBinding.digest,...flags]);
  const ingest=async file=>{const preview=await command(['source','snapshot','run','sources/verification','--snapshot',file,...flags]);return command(['source','snapshot','run','sources/verification','--snapshot',file,'--accept',preview.digest,...flags]);};
  assert.equal((await ingest(snapshot)).observation,'new');assert.equal((await ingest(snapshot)).observation,'replay');
  const target=await command(['doc','read','verification-runs/linked',...flags]);assert.equal(target.observed_status,'reported_pass');assert.equal(target.observed_input_match,'matches');assert.equal(target.verdict,'accepted');assert.equal(target.title,'Human reviewed label');assert.match(target.body,/Preserve the independent review/);
  assert.equal((await command(['list','--type','VerificationRun',...flags])).count,1,'no mirrored targets created');
  const selections=path.join(scratch,'selection.json');await writeFile(selections,JSON.stringify({inputs:{input0:resources.input0.path},required_identities:{tlc:resources.tlc.path}}));
  assert.equal((await command(['source','snapshot','check',snapshot,'--inputs-file',selections])).status,'current');
  await writeFile(resources.input0.path,'changed model');assert.equal((await command(['source','snapshot','check',snapshot,'--inputs-file',selections])).status,'stale');
  await run(process.execPath,[cli,'op','run','local.verification.observe-tlc.v1','--local','--binding',binding.binding,'--input-file',inputFile,...flags,'--json'],2);
  t.diagnostic('Published CLIpre3/Core38, standalone accepted generation, native captured inputs/export, Core ingestion/replay/currentness and reviewed-field preservation. Synthetic inputs only; no TLC proof executed.');
 }finally{await workspace.close();}
});
