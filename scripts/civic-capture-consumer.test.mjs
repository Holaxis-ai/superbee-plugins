import test from 'node:test';import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile,symlink,link} from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {createWorkspace,isolatedEnvironment,runProcess} from './vendor/package-verification/src/harness.mjs';
import {prepareCapturedText} from '../integrations/civic-records/src/operation.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),sha=x=>createHash('sha256').update(x).digest('hex');
test('finite capture registrar: installed public CLI, revisions, conflicts, uncertain create recovery and existing text importer',async t=>{
 const workspace=await createWorkspace(),scratch=workspace.root,home=path.join(scratch,'home');await mkdir(home);
 const env=isolatedEnvironment({home,values:{PATH:path.dirname(process.execPath)}}),run=(cmd,args,expected=0)=>runProcess(cmd,args,{cwd:scratch,env,expected,timeout:120000,maxBuffer:2*1024*1024});
 try{
  await writeFile(path.join(scratch,'package.json'),JSON.stringify({private:true,type:'module'}));
  await run(process.execPath,[process.env.npm_execpath,'install','superbee@0.4.4-pre.6','--ignore-scripts','--no-audit','--no-fund','--package-lock=false','--registry=https://registry.npmjs.org/']);
  const cli=path.join(scratch,'node_modules/.bin/superbee'),bundle=path.join(scratch,'bundle'),sourceId='civic-sources/synthetic-council';
  const native=async(args,expected=0)=>JSON.parse((await run(cli,[...args,'--dir',bundle,'--json'],expected)).stdout);
  const identity=JSON.parse((await run(cli,['version','--json'])).stdout);assert.equal(identity.identity.package.version,'0.4.4-pre.6');assert.equal(identity.identity.source.commit,'688d62a2e1395a6ca7dde52f08e0caf97b643d60');
  await native(['init','--create-only','--recipe','none']);await native(['recipe','add',path.join(root,'recipes/civic-records')]);
  await native(['new','Civic Source',sourceId,'--title=Synthetic civic source','--jurisdiction_key=synthetic-town','--jurisdiction_name=Synthetic Town','--body_name=Synthetic Council','--provider=ecode360','--provider_jurisdiction_id=ZZ0001','--registry_url=https://ecode360.com/ZZ0001/documents/Minutes','--coverage=sample','--capture_mode=operator-run','--actor=process:civic-capture-test']);
  const make=async(n,pdf=`%PDF-1.4\nSYNTHETIC fixture ${n} only; not a real PDF\n`)=>{const pdfFile=path.join(scratch,`capture-${n}-${sha(pdf).slice(0,12)}.pdf`);await writeFile(pdfFile,pdf);return {documentId:String(n),pdfFile,pdfSha256:sha(pdf),sourceUrl:`https://ecode360.com/ZZ0001/document/${n}.pdf`,capturedAt:'2026-01-03T00:00:00.000Z',title:`Synthetic council minutes ${n}`,bodyName:'Synthetic Council',meetingDate:'2026-01-02',recordKind:'minutes',sessionKind:'regular',extractionStatus:'text-extracted',pageCount:1};};
  const firstEntry=await make(1),secondEntry=await make(2),manifest=path.join(scratch,'manifest.json');
  const registrar=path.join(root,'examples/civic-records/register-captured.mjs');
  const invoke=async(entries,{apply=false,expected=0,executable=cli,source=sourceId,extra={}}={})=>{await writeFile(manifest,JSON.stringify({schema:'civic-captured-records/v1',sourceId:source,captureBasis:'operator-supplied-files',coverage:'selected-only-unknown-tail',entries,...extra}));return JSON.parse((await run(process.execPath,[registrar,'--cli',executable,'--bundle',bundle,'--manifest',manifest,'--actor','process:civic-capture-test',...(apply?['--apply']:[])],expected)).stdout);};
  assert.deepEqual((await invoke([firstEntry,secondEntry])).results.map(x=>x.outcome),['would-create','would-create']);
  const created=await invoke([firstEntry],{apply:true});assert.equal(created.created,1);const id=created.results[0].id;
  const before=await native(['doc','read',id]);assert.equal(before.approval_status,'unknown');assert.match(before.body,/caller assertions/);assert.match(before.body,/unexamined discovery tails remain unknown/);
  const resumed=await invoke([firstEntry,secondEntry],{apply:true});assert.equal(resumed.created,1);assert.equal(resumed.unchanged,1);
  assert.equal((await invoke([firstEntry,secondEntry],{apply:true})).unchanged,2);assert.equal((await native(['doc','read',id])).head_version,before.head_version);
  // Same bytes retain the first materialization time: a new observation is not another source revision.
  const later={...firstEntry,capturedAt:'2026-01-04T00:00:00.000Z'};assert.equal((await invoke([later],{apply:true,expected:1})).error,'CIVIC_EXISTING_CONFLICT');
  const changed=await make(1,'%PDF-1.4\nSYNTHETIC changed bytes same provider URL\n');const revised=await invoke([changed],{apply:true});assert.equal(revised.created,1);assert.notEqual(revised.results[0].id,id);assert.equal((await native(['doc','read',id])).head_version,before.head_version);
  await native(['doc','update',id,'--description=Human unowned note','--actor=human:synthetic-reviewer']);assert.equal((await invoke([firstEntry],{apply:true})).unchanged,1);assert.equal((await native(['doc','read',id])).description,'Human unowned note');
  await native(['doc','update',id,'--title=Human correction','--actor=human:synthetic-reviewer']);assert.equal((await invoke([firstEntry],{apply:true,expected:1})).error,'CIVIC_EXISTING_CONFLICT');assert.equal((await native(['doc','read',id])).title,'Human correction');
  // Validate all entries before writing any, including the installed Kind's real date/enum rules.
  const third=await make(3);const malformed={...secondEntry,meetingDate:'2026-02-31'};const invalid=await invoke([third,malformed],{apply:true,expected:1});assert.equal(invalid.created,0);assert.equal(invalid.error,'CIVIC_CAPTURE_KIND_INVALID');assert.equal((await invoke([third])).results[0].outcome,'would-create');
  for(const bad of [{...third,pdfSha256:'0'.repeat(64)},{...third,sourceUrl:'https://ecode360.com/XX9999/document/3.pdf'},{...third,bodyName:'Other Council'},{...third,approvalStatus:'approved'}])assert.equal((await invoke([bad],{apply:true,expected:1})).created,0);
  assert.equal((await invoke([third],{expected:1,extra:{credentials:'forbidden'}})).error,'CIVIC_CAPTURE_MANIFEST');
  const linked=path.join(scratch,'linked.pdf');await symlink(third.pdfFile,linked);assert.equal((await invoke([{...third,pdfFile:linked}],{expected:1})).error,'CIVIC_CAPTURE_FILE');
  const hard=path.join(scratch,'hard.pdf');await link(third.pdfFile,hard);assert.equal((await invoke([third],{expected:1})).error,'CIVIC_CAPTURE_FILE');
  const fourth=await make(4),wrapper=path.join(scratch,'lost-ack.mjs');await writeFile(wrapper,`#!${process.execPath}\nimport{spawnSync}from'node:child_process';const args=process.argv.slice(2);const r=spawnSync(${JSON.stringify(cli)},args,{encoding:'utf8'});if(args[0]==='new'&&r.status===0)process.exit(1);process.stdout.write(r.stdout);process.stderr.write(r.stderr);process.exit(r.status??1);\n`,{mode:0o700});
  const lost=await invoke([fourth],{apply:true,expected:1,executable:wrapper});assert.equal(lost.error,'CIVIC_CREATE_STOPPED');assert.equal(lost.results[0].outcome,'refused-or-unknown');assert.equal((await invoke([fourth],{apply:true})).unchanged,1);
  // A concurrent writer wins strict create; no overwrite or silent adoption follows.
  const fifth=await make(5),racer=path.join(scratch,'racer.mjs');await writeFile(racer,`#!${process.execPath}\nimport{spawnSync}from'node:child_process';const args=process.argv.slice(2);if(args[0]==='new')spawnSync(${JSON.stringify(cli)},args.map(x=>x.startsWith('--title=')?'--title=Human concurrent title':x),{encoding:'utf8'});const r=spawnSync(${JSON.stringify(cli)},args,{encoding:'utf8'});process.stdout.write(r.stdout);process.stderr.write(r.stderr);process.exit(r.status??1);\n`,{mode:0o700});
  const raced=await invoke([fifth],{apply:true,expected:1,executable:racer});assert.equal(raced.error,'CIVIC_CREATE_STOPPED');assert.equal((await native(['doc','read',raced.results[0].id])).title,'Human concurrent title');assert.equal((await invoke([fifth],{apply:true,expected:1})).error,'CIVIC_EXISTING_CONFLICT');
  // A malformed success acknowledgement remains uncertain, then native readback recovers.
  const sixth=await make(6),malformedAck=path.join(scratch,'malformed-ack.mjs');await writeFile(malformedAck,`#!${process.execPath}\nimport{spawnSync}from'node:child_process';const args=process.argv.slice(2);const r=spawnSync(${JSON.stringify(cli)},args,{encoding:'utf8'});process.stdout.write(args[0]==='new'&&r.status===0?'not-json':r.stdout);process.stderr.write(r.stderr);process.exit(r.status??1);\n`,{mode:0o700});
  const uncertain=await invoke([sixth],{apply:true,expected:1,executable:malformedAck});assert.equal(uncertain.error,'CIVIC_NATIVE_RECEIPT_UNKNOWN');assert.equal(uncertain.results[0].outcome,'create-outcome-unknown');assert.equal((await invoke([sixth],{apply:true})).unchanged,1);
  // Feed an actual registrar id into existing supplied-text preparation and unchanged importer-v2.
  const recordId=revised.results[0].id,text='SYNTHETIC MINUTES\nDiscussion occurred; no completed project or approval is established.\n\f',textFile=path.join(scratch,'text.txt'),basisFile=path.join(scratch,'basis.json');
  const basis={v:1,jurisdictionKey:'synthetic-town',documentId:changed.documentId,recordId,sourceUrl:changed.sourceUrl,pdfSha256:changed.pdfSha256,textSha256:sha(text),expectedPages:1,extractionLabel:'synthetic caller text; no converter'};await writeFile(textFile,text);await writeFile(basisFile,JSON.stringify(basis));
  const prepared=await prepareCapturedText({pdf:{path:changed.pdfFile,sha256:'sha256:'+changed.pdfSha256},text:{path:textFile,sha256:'sha256:'+sha(text)},basis:{path:basisFile,sha256:'sha256:'+sha(JSON.stringify(basis))}},{});assert.equal(prepared.extractionAssociation,'caller_asserted');assert.equal(prepared.extractorExecution,'not_observed');
  const preparedFile=path.join(scratch,'prepared.json');await writeFile(preparedFile,JSON.stringify(prepared));const importArgs=[path.join(root,'examples/civic-records/import-prepared.mjs'),'--cli',cli,'--bundle',bundle,'--actor','process:civic-capture-test','--derived-at','2026-01-05T00:00:00.000Z','--prepared',preparedFile,'--apply'];
  assert.equal(JSON.parse((await run(process.execPath,importArgs)).stdout).created,1);assert.equal(JSON.parse((await run(process.execPath,importArgs)).stdout).unchanged,1);
  t.diagnostic('CLIpre6 installed from public npm; immutable byte revisions and first-capture metadata; synthetic local-only files, no provider access.');
 }finally{await workspace.close();}
});
