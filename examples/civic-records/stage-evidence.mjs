/** Existing Civic Evidence projection/staging. Native caller retains original bytes first. */
import {createHash} from 'node:crypto';
import {mkdtemp,writeFile,rm,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {buildKindRegistry,validateAgainstKind} from '@superbee/core/kinds';
import {queryHeads,parseLinksFromDoc} from '@superbee/core';
import {readHostedCivicJson,selectHostedCivicTarget} from './stage-hosted.mjs';
import {assertCapturedSourceUrl} from './register-captured.mjs';
import {readCapturedBytes} from '../../integrations/civic-records/src/capture.mjs';
import {originalEvidenceId,textEvidenceId,originalBlobKey,EVIDENCE_FORMAT} from '../../integrations/civic-records/src/evidence.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const fail=code=>{throw Error(code);};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const exact=(x,keys)=>object(x)&&Object.keys(x).sort().join('|')===[...keys].sort().join('|');
const text=(x,max)=>typeof x==='string'&&x.length>0&&x.length<=max&&!/[\x00-\x1f\x7f]/.test(x);
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const instant=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
const exactMatch=(actual,wanted)=>actual.type===wanted.type&&actual.body===wanted.body&&Object.entries(wanted.fields).every(([k,v])=>actual[k]===v);
export const existingEvidenceMatches=(actual,wanted)=>instant(actual.observed_at)&&actual.type===wanted.type&&actual.body===wanted.body&&Object.entries(wanted.fields).every(([k,v])=>k==='observed_at'||actual[k]===v);
export function evidenceProjections(p,source,observedAt){
 const keys=['schema','formatVersion','jurisdictionKey','documentId','sourceId','sourceUrl','title','documentKind','pdfSha256','textSha256','pageCount','association','extractorExecution','accessScope','representations'];
 if(!exact(p,keys)||p.schema!=='civic-prepared-evidence/v1'||p.formatVersion!==EVIDENCE_FORMAT||p.association!=='caller_asserted'||p.extractorExecution!=='not_observed'||p.accessScope!=='private-research'||!instant(observedAt)||!text(p.jurisdictionKey,128)||!text(p.documentId,128)||!text(p.title,500)||!hex(p.pdfSha256)||!hex(p.textSha256)||!Number.isSafeInteger(p.pageCount)||p.pageCount<1||p.pageCount>250)fail('CIVIC_EVIDENCE_CONTRACT');
 if(source?.id!==p.sourceId||source.type!=='Civic Source'||source.jurisdiction_key!==p.jurisdictionKey||!/^civic-sources\/[a-z0-9][a-z0-9._-]{0,200}$/.test(p.sourceId))fail('CIVIC_EVIDENCE_SOURCE');
 assertCapturedSourceUrl({sourceUrl:p.sourceUrl,documentId:p.documentId},source);
 if(!Array.isArray(p.representations)||p.representations.length!==2)fail('CIVIC_EVIDENCE_REPRESENTATIONS');
 const [a,b]=p.representations;
 if(!exact(a,['role','id','blobKey','contentType','representationSha256','bodySha256','body'])||!exact(b,['role','id','contentType','representationSha256','bodySha256','body'])||a.role!=='original'||b.role!=='text'||a.contentType!=='application/pdf'||b.contentType!=='text/markdown'||a.blobKey!==originalBlobKey(p.pdfSha256)||a.representationSha256!==p.pdfSha256||b.representationSha256!==b.bodySha256)fail('CIVIC_EVIDENCE_REPRESENTATIONS');
 const expectedOriginal=originalEvidenceId(p);
 const expectedText=textEvidenceId(expectedOriginal,p.formatVersion,p.textSha256,b.bodySha256);
 if(a.id!==expectedOriginal||b.id!==expectedText)fail('CIVIC_EVIDENCE_IDENTITY');
 return [a,b].map(r=>{
  if(typeof r.body!=='string'||Buffer.byteLength(r.body)>60000||!hex(r.bodySha256)||hash(r.body)!==r.bodySha256||!r.body.endsWith('\n')||r.body.endsWith('\n\n')||/[\r\0]/.test(r.body))fail('CIVIC_EVIDENCE_BODY');
  const links=parseLinksFromDoc({id:r.id,frontmatter:{},body:r.body});if(!links.some(l=>l.to===p.sourceId&&l.text==='from source')||r.role==='text'&&!links.some(l=>l.to===a.id&&l.text==='Original representation'))fail('CIVIC_EVIDENCE_SOURCE_LINK');
  const fields={title:p.title+(r.role==='original'?' — supplied original':' — complete supplied text'),jurisdiction_key:p.jurisdictionKey,source_url:p.sourceUrl,document_kind:p.documentKind,observed_at:observedAt,capture_status:'captured',capture_format:r.role==='original'?'provider-bytes':'tool-rendered-text',capture_note:r.role==='original'?'Supplied original bytes verified through native host blob readback. Source URL association is a caller assertion; official authenticity, approval and meeting date are not established.':'Complete page-linked Markdown from supplied text. Original PDF/text association is a caller assertion; converter execution and transcription verification are not established by this formatter. Native invocation evidence remains separate.',representation_sha256:r.representationSha256,original_content_sha256:p.pdfSha256,media_type:r.contentType};
  if(r.role==='original')fields.evidence_path=a.blobKey;
  return {id:r.id,type:'Civic Evidence',fields,body:r.body};
 });
}
export async function stageHostedEvidence(config){
 const {actor,apply=false,preparedFile,observedAt,expectedBlobVersion}=config;
 const receipt={schema:'civic-hosted-evidence-stage/v1',apply,stagedLocal:0,matchingLocal:0,hostedConfirmed:0,needsNativeSync:true,verifiedExistingBlob:false,results:[]};let temp;
 try{
  if(typeof apply!=='boolean'||!/^process:[a-zA-Z0-9._-]+$/.test(actor??'')||!instant(observedAt)||typeof expectedBlobVersion!=='string'||!/^sha256:[a-f0-9]{64}$/.test(expectedBlobVersion))fail('CIVIC_EVIDENCE_ARGUMENTS');
  const target=await selectHostedCivicTarget(config),{native,read}=target;
  const prepared=await readHostedCivicJson(preparedFile,70000);
  if(!text(prepared?.sourceId,220)||!/^civic-sources\/[a-z0-9][a-z0-9._-]{0,200}$/.test(prepared.sourceId))fail('CIVIC_EVIDENCE_SOURCE');
  const source=await read(prepared.sourceId),kind=await read('conventions/civic-evidence');
  if(kind?.governs!=='Civic Evidence'||kind.path!=='civic-evidence/')fail('CIVIC_KIND_REQUIRED');
  const registry=buildKindRegistry([{id:kind.id,frontmatter:kind,body:kind.body}]),definition=registry.kinds.get('Civic Evidence');if(!definition||registry.warnings.length)fail('CIVIC_KIND_REQUIRED');
  const proposals=evidenceProjections(prepared,source,observedAt);
  if(expectedBlobVersion!==`sha256:${prepared.pdfSha256}`)fail('CIVIC_ORIGINAL_PIN');
  for(const wanted of proposals){if(validateAgainstKind({id:wanted.id,frontmatter:{type:wanted.type,...wanted.fields},body:wanted.body},definition).length)fail('CIVIC_EVIDENCE_KIND_INVALID');const existing=await read(wanted.id);if(existing&&!existingEvidenceMatches(existing,wanted))fail('CIVIC_EXISTING_CONFLICT');}
  // A known dated original stays in its existing Record/Text lane. This is a bounded local
  // snapshot check, not a cross-document transaction or global exactly-once guarantee.
  const dated=await queryHeads({root:target.root},{type:'Civic Record'});if(dated.length>200)fail('CIVIC_DATED_LOOKUP_BOUNDED');
  for(const row of dated){const d=await read(row.id);if(d?.jurisdiction_key===prepared.jurisdictionKey&&d.content_sha256===prepared.pdfSha256&&d.source_url===prepared.sourceUrl&&d.provider_document_id===prepared.documentId)fail('CIVIC_DATED_RECORD_EXISTS');}
  const known=await queryHeads({root:target.root},{type:'Civic Evidence'});if(known.length>200)fail('CIVIC_EVIDENCE_LOOKUP_BOUNDED');
  for(const row of known){if(proposals.some(p=>p.id===row.id))continue;const d=await read(row.id);if(d?.jurisdiction_key===prepared.jurisdictionKey&&d.source_url===prepared.sourceUrl&&d.original_content_sha256===prepared.pdfSha256)fail('CIVIC_EXISTING_EVIDENCE_REQUIRES_REUSE');}
  temp=await mkdtemp(path.join(tmpdir(),'civic-evidence-stage-'));
  const pulled=path.join(temp,'original.pdf'),pin=native.ok(['pull','--doc-key',prepared.representations[0].blobKey,'--from-host','--out',pulled]);
  if(pin.pull!=='read'||pin.route!=='blob'||pin.version!==expectedBlobVersion||pin.content_type!=='application/pdf'||pin.key!==prepared.representations[0].blobKey||pin.source!=='hosted'||!Number.isSafeInteger(pin.size_bytes)||pin.size_bytes<1||pin.size_bytes>8*1024*1024)fail('CIVIC_ORIGINAL_READBACK');
  const bytes=await readCapturedBytes({path:pulled,sha256:expectedBlobVersion},8*1024*1024);if(bytes.length!==pin.size_bytes||!bytes.subarray(0,5).equals(Buffer.from('%PDF-')))fail('CIVIC_ORIGINAL_READBACK');
  receipt.verifiedExistingBlob=true;receipt.blob={key:pin.key,version:pin.version,content_type:pin.content_type};
  const check=async()=>{await target.check();if(!await read(source.id,source.head_version)||!await read(kind.id,kind.head_version))fail('CIVIC_PREREQUISITE_CHANGED');};await check();
  if(!apply){receipt.results=[];for(const wanted of proposals){const current=await read(wanted.id);if(current&&!existingEvidenceMatches(current,wanted))fail('CIVIC_EXISTING_CONFLICT');receipt.results.push({id:wanted.id,outcome:current?'locally-matching':'would-stage',...(current?{localVersion:current.head_version}:{})});if(current)receipt.matchingLocal++;}await check();receipt.complete=true;return receipt;}
  for(const wanted of proposals){await check();const current=await read(wanted.id);if(current){if(!existingEvidenceMatches(current,wanted))fail('CIVIC_EXISTING_CONFLICT');receipt.results.push({id:wanted.id,outcome:'locally-matching',localVersion:current.head_version});receipt.matchingLocal++;continue;}
   const bodyFile=path.join(temp,'body.md');await writeFile(bodyFile,wanted.body,{mode:0o600});receipt.results.push({id:wanted.id,outcome:'stage-outcome-unknown'});
   const r=native.call(['new',wanted.type,wanted.id,...Object.entries(wanted.fields).map(([k,v])=>`--${k}=${v}`),'--body-file',bodyFile,'--actor',actor]);if(r.status!==0){receipt.results.at(-1).nativeStatus=r.status;fail('CIVIC_CREATE_STOPPED');}
   const ack=r.data;if(!object(ack)||ack.new!=='written'||ack.id!==wanted.id||ack.type!==wanted.type||!text(ack.version,200))fail('CIVIC_NATIVE_RECEIPT_UNKNOWN');receipt.results.at(-1).outcome='staged-unconfirmed';
   const actual=await read(wanted.id);if(!actual||actual.head_version!==ack.version||!exactMatch(actual,wanted))fail('CIVIC_READBACK_CONFLICT');await check();Object.assign(receipt.results.at(-1),{outcome:'staged-local',localVersion:actual.head_version});receipt.stagedLocal++;
  }
  receipt.complete=true;return receipt;
 }catch(error){const code=/^CIVIC_[A-Z0-9_]+$/.test(error.message)?error.message:'CIVIC_EVIDENCE_STAGE_FAILED';const stopped=Error(code);stopped.receipt={...receipt,error:code,complete:false};throw stopped;}finally{if(temp)await rm(temp,{recursive:true,force:true});}
}
const main=process.argv[1]&&(await realpath(process.argv[1]).catch(()=>null))===await realpath(fileURLToPath(import.meta.url));
if(main){try{const config={},names={'--cli':'cli','--bundle':'bundle','--expected-host':'expectedHost','--expected-workspace':'expectedWorkspace','--expected-bundle':'expectedBundle','--expected-principal':'expectedPrincipal','--actor':'actor','--prepared':'preparedFile','--observed-at':'observedAt','--expected-blob-version':'expectedBlobVersion'};for(let i=2;i<process.argv.length;i++){const f=process.argv[i];if(f==='--apply'&&!config.apply){config.apply=true;continue;}const v=process.argv[++i];if(!names[f]||Object.hasOwn(config,names[f])||!text(v,4000)||v.startsWith('--'))fail('CIVIC_EVIDENCE_ARGUMENTS');config[names[f]]=v;}console.log(JSON.stringify(await stageHostedEvidence(config)));}catch(error){console.log(JSON.stringify(error.receipt??{error:'CIVIC_EVIDENCE_ARGUMENTS'}));process.exitCode=1;}}
