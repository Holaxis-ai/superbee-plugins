/** Trusted report observation, never a proof checker or automatic discharge authority. */
import { readFile, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const own = (x,k) => Object.hasOwn(x,k);
const hex = x => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
const revision = x => typeof x === 'string' && /^[a-f0-9]{40}$/.test(x);
const key = x => typeof x === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(x);
const digest = b => `sha256:${createHash('sha256').update(b).digest('hex')}`;
const refuse = code => { throw new Error(code); };
function closed(x, keys, code) {
  if (!object(x) || Object.keys(x).sort().join('|') !== [...keys].sort().join('|')) refuse(code);
}
export const descriptor = Object.freeze({
  name: 'verification_observe_tlc', implementationId: 'verification-observe-tlc.v1',
  description: 'Observe a retained TLC checker report against explicitly selected input identities. Caller-associated evidence only; no checker execution or proof discharge.',
  inputSchema: {type:'object',additionalProperties:false,required:['generation'],properties:{generation:{type:'integer',minimum:1,maximum:Number.MAX_SAFE_INTEGER}}},
  annotations: {readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:false}, maximumOutputBytes:65536,
});
function basisValue(x) {
  closed(x,['v','runKey','artifactRevision','sourceRevision','tlcSha256','checkedInputs','expectedRuns'],'VERIFICATION_BASIS');
  if(x.v!==1 || !key(x.runKey) || !revision(x.artifactRevision) || !revision(x.sourceRevision) || !hex(x.tlcSha256)) refuse('VERIFICATION_BASIS');
  if(!Array.isArray(x.checkedInputs)||x.checkedInputs.length<1||x.checkedInputs.length>24||!Array.isArray(x.expectedRuns)||x.expectedRuns.length<1||x.expectedRuns.length>32)refuse('VERIFICATION_BASIS');
  const names=new Set(),roles=new Set(),variants=new Set();
  for(const row of x.checkedInputs){
    closed(row,['name','role','sha256'],'VERIFICATION_INPUT_PLAN');
    if(typeof row.name!=='string'||row.name.length>240||!/^[-A-Za-z0-9_./]+$/.test(row.name)||row.name.startsWith('/')||row.name.split('/').some(p=>!p||p==='.'||p==='..')||!/^input([0-9]|1[0-9]|2[0-3])$/.test(row.role)||!hex(row.sha256)||names.has(row.name)||roles.has(row.role))refuse('VERIFICATION_INPUT_PLAN');
    names.add(row.name);roles.add(row.role);
  }
  for(const row of x.expectedRuns){
    closed(row,['variant','expectedError'],'VERIFICATION_RUN_PLAN');
    if(!key(row.variant)||variants.has(row.variant)||row.expectedError!==null&&(typeof row.expectedError!=='string'||row.expectedError.length<1||row.expectedError.length>256||/[\r\n\x00-\x1f]/.test(row.expectedError)))refuse('VERIFICATION_RUN_PLAN');
    variants.add(row.variant);
  }
  return x;
}
async function bytes(resource,maximum){
  if(!object(resource)||typeof resource.path!=='string'||typeof resource.sha256!=='string')refuse('VERIFICATION_RESOURCE');
  const s=await lstat(resource.path);
  if(!s.isFile()||s.size>maximum||s.nlink!==1)refuse('VERIFICATION_RESOURCE');
  const b=await readFile(resource.path);
  if(b.length>maximum||digest(b)!==resource.sha256)refuse('VERIFICATION_RESOURCE_CHANGED');
  return b;
}
function json(b){
  try {return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b));}
  catch {refuse('VERIFICATION_JSON');}
}
/** Inspect normalized native claims; hashes do not authenticate a past checker invocation. */
export async function observeReport(resources,input,{signal}={}){
  closed(input,['generation'],'VERIFICATION_SETTINGS');
  if(!Number.isSafeInteger(input.generation)||input.generation<1)refuse('VERIFICATION_SETTINGS');
  if(!object(resources)||!own(resources,'report')||!own(resources,'basis')||!own(resources,'tlc'))refuse('VERIFICATION_RESOURCE');
  signal?.throwIfAborted();
  const basis=basisValue(json(await bytes(resources.basis,65536)));
  const expectedRoles=['basis','report','tlc',...basis.checkedInputs.map(x=>x.role)].sort();
  if(Object.keys(resources).sort().join('|')!==expectedRoles.join('|'))refuse('VERIFICATION_RESOURCE_ROLES');
  const reportBytes=await bytes(resources.report,2*1024*1024),report=json(reportBytes);
  if(!object(report)||!['PASS','FAIL'].includes(report.status)||report.bounded_model_only!==true||typeof report.inputs_unchanged!=='boolean'||typeof report.source_bytes_checked!=='boolean'||!object(report.checked_input_hashes)||!Array.isArray(report.runs)||report.runs.length<1||report.runs.length>basis.expectedRuns.length)refuse('VERIFICATION_REPORT');
  if(report.tlc_sha256!==basis.tlcSha256||digest(await bytes(resources.tlc,8*1024*1024))!==`sha256:${basis.tlcSha256}`)refuse('VERIFICATION_TOOL_IDENTITY');
  const expectedNames=basis.checkedInputs.map(x=>x.name).sort();
  if(Object.keys(report.checked_input_hashes).sort().join('|')!==expectedNames.join('|'))refuse('VERIFICATION_INPUT_IDENTITIES');
  let matches=true,total=0;
  for(const row of basis.checkedInputs){
    if(report.checked_input_hashes[row.name]!==row.sha256)refuse('VERIFICATION_INPUT_IDENTITIES');
    const b=await bytes(resources[row.role],2*1024*1024);total+=b.length;if(total>8*1024*1024)refuse('VERIFICATION_INPUT_LIMIT');
    if(digest(b)!==`sha256:${row.sha256}`)matches=false;
  }
  const seen=new Set();let passed=0;
  for(const [index,row] of report.runs.entries()){
    if(!object(row)||!key(row.variant)||seen.has(row.variant)||typeof row.pass!=='boolean'||!Array.isArray(row.errors)||row.errors.length>16||!row.errors.every(e=>typeof e==='string'&&e.length<=1024)||!(row.exit_code===null||Number.isSafeInteger(row.exit_code))||!hex(row.log_sha256))refuse('VERIFICATION_RUN');
    const planned=basis.expectedRuns[index];
    if(!planned||row.variant!==planned.variant||row.expected_error!==planned.expectedError)refuse('VERIFICATION_RUN_IDENTITIES');
    if(row.pass){
      if(planned.expectedError===null ? row.exit_code!==0||row.errors.length!==0 : row.exit_code===null||row.exit_code===0||!row.errors.includes(planned.expectedError)||!row.errors.every(error=>[planned.expectedError,'The behavior up to this point is:','The following behavior constitutes a counter-example:'].includes(error)))refuse('VERIFICATION_RUN_INCONSISTENT');
      passed++;
    }
    seen.add(row.variant);
  }
  if(report.status==='PASS'&&(report.runs.length!==basis.expectedRuns.length||passed!==report.runs.length||!report.inputs_unchanged))refuse('VERIFICATION_REPORT_INCONSISTENT');
  if(report.status==='FAIL'&&report.inputs_unchanged&&passed===report.runs.length)refuse('VERIFICATION_REPORT_INCONSISTENT');
  signal?.throwIfAborted();
  return {v:1,resource:'urn:superbee:verification:tlc',generation:input.generation,complete:false,
    records:[{key:basis.runKey,verification:{reported_status:report.status==='PASS'?'reported_pass':'reported_fail',input_match:matches&&report.inputs_unchanged?'matches':'mismatch',report_digest:digest(reportBytes),artifact_revision:basis.artifactRevision,source_revision:basis.sourceRevision,variant_count:report.runs.length,expected_variant_count:basis.expectedRuns.length,report_completion:report.runs.length===basis.expectedRuns.length?'complete':'partial',reported_source_check:report.source_bytes_checked,association:'caller_asserted'}}],
    evidence:{v:1,association:'caller_asserted',inputs:basis.checkedInputs.map(row=>({id:row.role,sha256:`sha256:${row.sha256}`})),required_identities:[{id:'tlc',sha256:`sha256:${basis.tlcSha256}`}]} };
}
export function createLocalCapabilities({port,resources}){
  return [{...descriptor,execute:async(input,context)=>{
    const snapshot=await observeReport(resources,input,context);
    await port.writeJson('verification-snapshot.json',snapshot);
    return {observation:snapshot.records[0].verification,outputs:[{role:'snapshot',path:'verification-snapshot.json',mimeType:'application/json'}],authority:'caller-associated observation; no historical execution attestation or proof discharge'};
  }}];
}
