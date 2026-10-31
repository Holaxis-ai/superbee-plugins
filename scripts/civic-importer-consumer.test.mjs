import test from 'node:test';import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile,cp} from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {createWorkspace,isolatedEnvironment,runProcess} from './vendor/package-verification/src/harness.mjs';
import {prepareCapturedText} from '../integrations/civic-records/src/operation.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),sha=x=>createHash('sha256').update(x).digest('hex');
test('local civic importer: installed public CLI, no-op, concurrent human edits, partial restart and uncertain acknowledgement',async t=>{
 const workspace=await createWorkspace(),scratch=workspace.root,home=path.join(scratch,'home');await mkdir(home);
 const env=isolatedEnvironment({home,values:{PATH:path.dirname(process.execPath)}});
 const run=(cmd,args,expected=0)=>runProcess(cmd,args,{cwd:scratch,env,expected,timeout:120000,maxBuffer:2*1024*1024});
 try{
  await writeFile(path.join(scratch,'package.json'),JSON.stringify({private:true,type:'module'}));
  await run(process.execPath,[process.env.npm_execpath,'install','superbee@0.4.4-pre.6','--ignore-scripts','--no-audit','--no-fund','--package-lock=false','--registry=https://registry.npmjs.org/']);
  const cli=path.join(scratch,'node_modules/.bin/superbee'),bundle=path.join(scratch,'bundle');
  const native=async(args,expected=0)=>JSON.parse((await run(cli,[...args,'--dir',bundle,'--json'],expected)).stdout);
  const identity=JSON.parse((await run(cli,['version','--json'])).stdout);assert.equal(identity.identity.package.version,'0.4.4-pre.6');assert.equal(identity.identity.source.commit,'688d62a2e1395a6ca7dde52f08e0caf97b643d60');
  await native(['init','--create-only','--recipe','none']);await native(['recipe','add',path.join(root,'recipes/civic-records')]);
  const files=[];
  for(let n=1;n<=2;n++){
   const pdf='%PDF-1.4\nsynthetic only\n',text=`SYNTHETIC MINUTES ${n}\nOnly discussion occurred, without an authorization or completed project.\n\f`,recordId=`civic-records/synthetic-${n}`;
   const basis={v:1,jurisdictionKey:'synthetic-town',documentId:String(n),recordId,sourceUrl:`https://example.org/${n}.pdf`,pdfSha256:sha(pdf),textSha256:sha(text),expectedPages:1,extractionLabel:'synthetic text; no converter execution'};
   const resources={};for(const [role,bytes]of Object.entries({pdf,text,basis:JSON.stringify(basis)})){const p=path.join(scratch,`${n}-${role}`);await writeFile(p,bytes);resources[role]={path:p,sha256:'sha256:'+sha(bytes)};}
   const prepared=await prepareCapturedText(resources,{}),file=path.join(scratch,`${n}-prepared.json`);await writeFile(file,JSON.stringify(prepared));files.push(file);
   await native(['new','Civic Record',recordId,'--title=Synthetic minutes','--jurisdiction_key=synthetic-town','--body_name=Synthetic council','--meeting_date=2026-01-01','--record_kind=minutes','--session_kind=unknown',`--provider_document_id=${n}`,`--source_url=${basis.sourceUrl}`,`--content_sha256=${basis.pdfSha256}`,'--observed_at=2026-01-02T00:00:00.000Z','--approval_status=unknown','--extraction_status=text-extracted','--page_count=1','--actor=process:civic-import-test']);
  }
  const importer=path.join(root,'examples/civic-records/import-prepared.mjs'),common=['--bundle',bundle,'--actor','process:civic-import-test','--derived-at','2026-01-03T00:00:00.000Z'];
  const invoke=async(selected,{apply=false,expected=0,executable=cli}={})=>JSON.parse((await run(process.execPath,[importer,'--cli',executable,...common,...selected.flatMap(f=>['--prepared',f]),...(apply?['--apply']:[])],expected)).stdout);
  const preview=await invoke(files);assert.deepEqual(preview.results.map(x=>x.outcome),['would-create','would-create']);
  const first=await invoke([files[0]],{apply:true});assert.equal(first.created,1);const id=first.results[0].id;
  const before=await native(['doc','read',id,'--offset','0']);
  // Actual partial batch restart: one record already committed; rerun both without a new importer journal.
  const resumed=await invoke(files,{apply:true});assert.equal(resumed.created,1);assert.equal(resumed.unchanged,1);
  const repeated=await invoke(files,{apply:true});assert.equal(repeated.created,0);assert.equal(repeated.unchanged,2);
  assert.equal((await native(['doc','read',id,'--offset','0'])).head_version,before.head_version);
  // Unowned human field survives a no-op.
  await native(['doc','update',id,'--description=Human research note','--expected-version',before.head_version,'--actor=human:synthetic-reviewer']);
  assert.equal((await invoke(files,{apply:true})).unchanged,2);assert.equal((await native(['doc','read',id])).description,'Human research note');
  // Owned body edit conflicts, leaving both documents unchanged by the importer.
  const edited=await native(['doc','update',id,'--body',before.body+'\nHuman correction.\n','--actor=human:synthetic-reviewer']);
  const conflict=await invoke(files,{apply:true,expected:1});assert.equal(conflict.error,'CIVIC_EXISTING_CONFLICT');assert.equal(conflict.created,0);assert.equal((await native(['doc','read',id])).body,before.body+'\nHuman correction.\n');
  // A new synthetic output revision is used to exercise actual CLI create + lost acknowledgement.
  const changed=JSON.parse(await readFile(files[0],'utf8'));changed.extractionLabel+=' revised';const revised=path.join(scratch,'revised.json');await writeFile(revised,JSON.stringify(changed));
  const wrapper=path.join(scratch,'lost-ack.mjs');await writeFile(wrapper,`#!${process.execPath}\nimport{spawnSync}from'node:child_process';const args=process.argv.slice(2);const r=spawnSync(${JSON.stringify(cli)},args,{encoding:'utf8'});if(args[0]==='new'&&r.status===0){process.exit(1);}process.stdout.write(r.stdout);process.stderr.write(r.stderr);process.exit(r.status??1);\n`,{mode:0o700});
  const lost=await invoke([revised],{apply:true,expected:1,executable:wrapper});assert.equal(lost.error,'CIVIC_CREATE_STOPPED');assert.equal(lost.results[0].outcome,'refused-or-unknown');
  const reconciled=await invoke([revised],{apply:true});assert.equal(reconciled.created,0);assert.equal(reconciled.unchanged,1);
  // A second document is fully validated before the first could be written.
  changed.extractionLabel+=' invalid';const fresh=path.join(scratch,'fresh.json');await writeFile(fresh,JSON.stringify(changed));const broken=path.join(scratch,'broken.json');await writeFile(broken,'{}');
  const preflight=await invoke([fresh,broken],{apply:true,expected:1});assert.equal(preflight.created,0);assert.equal((await invoke([fresh])).results[0].outcome,'would-create');
  // Another CLI writer wins the expected-absent boundary; the importer must never replace it.
  const racing=path.join(scratch,'racing-writer.mjs');await writeFile(racing,`#!${process.execPath}\nimport{spawnSync}from'node:child_process';const args=process.argv.slice(2);if(args[0]==='new'){const other=args.map(x=>x.startsWith('--title=')?'--title=Concurrent human title':x);spawnSync(${JSON.stringify(cli)},other,{encoding:'utf8'});}const r=spawnSync(${JSON.stringify(cli)},args,{encoding:'utf8'});process.stdout.write(r.stdout);process.stderr.write(r.stderr);process.exit(r.status??1);\n`,{mode:0o700});
  const race=await invoke([fresh],{apply:true,expected:1,executable:racing});assert.equal(race.error,'CIVIC_CREATE_STOPPED');assert.equal((await native(['doc','read',race.results[0].id])).title,'Concurrent human title');assert.equal((await invoke([fresh],{apply:true,expected:1})).error,'CIVIC_EXISTING_CONFLICT');
  // Kill the actual importer process after native commit, before the CLI response is returned.
  changed.extractionLabel+=' killed';const killedFile=path.join(scratch,'killed.json');await writeFile(killedFile,JSON.stringify(changed));
  const killer=path.join(scratch,'kill-after-commit.mjs');await writeFile(killer,`#!${process.execPath}\nimport{spawnSync}from'node:child_process';const args=process.argv.slice(2);const r=spawnSync(${JSON.stringify(cli)},args,{encoding:'utf8'});if(args[0]==='new'&&r.status===0)process.kill(process.ppid,'SIGKILL');process.stdout.write(r.stdout);process.stderr.write(r.stderr);process.exit(r.status??1);\n`,{mode:0o700});
  await assert.rejects(()=>invoke([killedFile],{apply:true,executable:killer}));
  const recovered=await invoke([killedFile],{apply:true});assert.equal(recovered.created,0);assert.equal(recovered.unchanged,1);
  // Replace a synthetic local root at the same pathname after preflight's missing-target read.
  changed.extractionLabel+=' root-replaced';const replacementInput=path.join(scratch,'replacement-input.json');await writeFile(replacementInput,JSON.stringify(changed));
  const rootSwap=path.join(scratch,'swap-root.mjs');await writeFile(rootSwap,`#!${process.execPath}\nimport{spawnSync}from'node:child_process';import{renameSync,cpSync}from'node:fs';const args=process.argv.slice(2);const r=spawnSync(${JSON.stringify(cli)},args,{encoding:'utf8'});if(args[0]==='doc'&&args[1]==='read'&&args[2].startsWith('civic-texts/import-v1-')&&r.status===6){const b=${JSON.stringify(bundle)};renameSync(b,b+'-original');cpSync(b+'-original',b,{recursive:true});}process.stdout.write(r.stdout);process.stderr.write(r.stderr);process.exit(r.status??1);\n`,{mode:0o700});
  const replaced=await invoke([replacementInput],{apply:true,expected:1,executable:rootSwap});assert.equal(replaced.error,'CIVIC_TARGET_REPLACED');assert.equal(replaced.created,0);assert.equal(replaced.results.length,0);
  t.diagnostic('Installed CLIpre6/Core41, native strict create-only/readback; actual partial progress and lost-ack readback recovery. Local only, not hosted journal qualification.');
 }finally{await workspace.close();}
});
