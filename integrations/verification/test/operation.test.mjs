import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {observeReport,descriptor,createLocalCapabilities} from '../src/operation.mjs';
import {decodeSnapshot} from '@superbee/core/source-engine';
const sha=b=>createHash('sha256').update(b).digest('hex');
async function fixture(fn){
 const dir=await mkdtemp(path.join(tmpdir(),'verification-plugin-'));const resources={};
 const put=async(role,value)=>{const bytes=Buffer.isBuffer(value)?value:Buffer.from(JSON.stringify(value));const file=path.join(dir,role);await writeFile(file,bytes);resources[role]={path:file,sha256:'sha256:'+sha(bytes),logicalRef:role};};
 const report={status:'PASS',bounded_model_only:true,tlc_sha256:sha('synthetic jar'),source_bytes_checked:true,inputs_unchanged:true,checked_input_hashes:{'model.tla':sha('synthetic model')},runs:[{variant:'safe',pass:true,expected_error:null,errors:[],exit_code:0,log_sha256:sha('synthetic log')}]};
 const basis={v:1,runKey:'trial-1',artifactRevision:'a'.repeat(40),sourceRevision:'b'.repeat(40),tlcSha256:report.tlc_sha256,checkedInputs:[{name:'model.tla',role:'input0',sha256:report.checked_input_hashes['model.tla']}],expectedRuns:[{variant:'safe',expectedError:null}]};
 await put('report',report);await put('basis',basis);await put('input0',Buffer.from('synthetic model'));await put('tlc',Buffer.from('synthetic jar'));
 try {await fn({dir,resources,report,basis,put});}finally{await rm(dir,{recursive:true,force:true});}
}
test('closed synthetic report yields Core-decodable caller-associated snapshot, no authoritative verdict',()=>fixture(async({resources})=>{
 const snapshot=await observeReport(resources,{generation:1});const decoded=decodeSnapshot(Buffer.from(JSON.stringify(snapshot)));assert.equal(decoded.data.generation,1);
 assert.deepEqual(snapshot.records[0].verification,{reported_status:'reported_pass',input_match:'matches',report_digest:resources.report.sha256,artifact_revision:'a'.repeat(40),source_revision:'b'.repeat(40),variant_count:1,expected_variant_count:1,report_completion:'complete',reported_source_check:true,association:'caller_asserted'});
 assert.equal(snapshot.evidence.association,'caller_asserted');assert.equal(snapshot.complete,false);assert.ok(!('verdict' in snapshot.records[0].verification));assert.ok(!('discharges' in snapshot));assert.ok(!JSON.stringify(snapshot).includes(resources.report.path));
}));
test('current input differs from retained original basis: observation says mismatch and preserves original evidence hashes',()=>fixture(async({resources,put,basis})=>{
 await put('input0',Buffer.from('changed model'));const snapshot=await observeReport(resources,{generation:2});assert.equal(snapshot.records[0].verification.input_match,'mismatch');assert.equal(snapshot.evidence.inputs[0].sha256,'sha256:'+basis.checkedInputs[0].sha256);
}));
test('report cannot substitute a different input manifest or tool identity',()=>fixture(async({resources,report,put})=>{
 report.checked_input_hashes['model.tla']='0'.repeat(64);await put('report',report);await assert.rejects(observeReport(resources,{generation:1}),/VERIFICATION_INPUT_IDENTITIES/);
 await put('tlc',Buffer.from('another jar'));await assert.rejects(observeReport(resources,{generation:1}),/VERIFICATION_TOOL_IDENTITY/);
}));
test('missing/partial/duplicate/unexpected variants and inconsistent pass refuse',()=>fixture(async({resources,report,put})=>{
 report.runs=[];await put('report',report);await assert.rejects(observeReport(resources,{generation:1}),/VERIFICATION_REPORT/);
 report.runs=[{variant:'other',pass:true,expected_error:null,errors:[],exit_code:0,log_sha256:'c'.repeat(64)}];await put('report',report);await assert.rejects(observeReport(resources,{generation:1}),/VERIFICATION_RUN_IDENTITIES/);
 report.runs[0].variant='safe';report.runs[0].pass=false;await put('report',report);await assert.rejects(observeReport(resources,{generation:1}),/VERIFICATION_REPORT_INCONSISTENT/);
 report.status='FAIL';await put('report',report);assert.equal((await observeReport(resources,{generation:1})).records[0].verification.reported_status,'reported_fail');
}));
test('negative control is a reported success only with nonzero native exit and expected diagnostic',()=>fixture(async({resources,report,basis,put})=>{
 basis.expectedRuns[0].expectedError='Invariant Unsafe is violated.';report.runs[0].expected_error=basis.expectedRuns[0].expectedError;await put('basis',basis);await put('report',report);await assert.rejects(observeReport(resources,{generation:1}),/VERIFICATION_RUN_INCONSISTENT/);
 report.runs[0].exit_code=12;report.runs[0].errors=[basis.expectedRuns[0].expectedError];await put('report',report);assert.equal((await observeReport(resources,{generation:1})).records[0].verification.reported_status,'reported_pass');
}));
test('closed roles/settings/basis and captured-byte identity are enforced',()=>fixture(async({resources,basis,put})=>{
 await assert.rejects(observeReport(resources,{generation:1,command:'do something'}),/VERIFICATION_SETTINGS/);
 await assert.rejects(observeReport({...resources,extra:resources.report},{generation:1}),/VERIFICATION_RESOURCE_ROLES/);
 basis.checkedInputs[0].name='../outside';await put('basis',basis);await assert.rejects(observeReport(resources,{generation:1}),/VERIFICATION_INPUT_PLAN/);
 await writeFile(resources.basis.path,'modified after capture');await assert.rejects(observeReport(resources,{generation:1}),/VERIFICATION_RESOURCE_CHANGED/);
}));
test('metadata descriptor matches exported module; local execution only writes declared snapshot role',()=>fixture(async({resources})=>{
 const manifest=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));assert.deepEqual(manifest.superbeeLocalOperations.operations[0].capability,descriptor);
 const writes=[];const port={writeJson:async(...x)=>writes.push(x),runTool:()=>{throw Error('unexpected tool');}};const [cap]=createLocalCapabilities({port,resources});const result=await cap.execute({generation:1},{});assert.equal(writes.length,1);assert.equal(writes[0][0],'verification-snapshot.json');assert.deepEqual(result.outputs,[{role:'snapshot',path:'verification-snapshot.json',mimeType:'application/json'}]);
}));

test('partial failed attempts retain observations without claiming all controls completed',()=>fixture(async({resources,report,basis,put})=>{
 basis.expectedRuns.push({variant:'next-control',expectedError:null});await put('basis',basis);
 await assert.rejects(observeReport(resources,{generation:1}),/VERIFICATION_REPORT_INCONSISTENT/);
 report.status='FAIL';report.runs[0].pass=false;report.runs[0].exit_code=1;await put('report',report);
 const v=(await observeReport(resources,{generation:1})).records[0].verification;assert.equal(v.reported_status,'reported_fail');assert.equal(v.report_completion,'partial');assert.equal(v.expected_variant_count,2);assert.equal(v.variant_count,1);
}));
test('duplicate receipts cannot fill a missing planned control',()=>fixture(async({resources,report,basis,put})=>{
 basis.expectedRuns.push({variant:'next-control',expectedError:null});report.runs.push({...report.runs[0]});await put('basis',basis);await put('report',report);await assert.rejects(observeReport(resources,{generation:1}),/VERIFICATION_RUN/);
}));
