/** Finite supplied-file registrar; public Core validates Kinds, native CLI owns atomic creates. */
import {createHash} from 'node:crypto';
import {constants} from 'node:fs';
import {open,lstat,realpath,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalizeDocumentBodyForStorage} from '@superbee/core/document-codec';
import {buildKindRegistry,validateAgainstKind} from '@superbee/core/kinds';
import {nativeCli} from './import-prepared.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const fail=code=>{throw Error(code);};
const string=(x,max)=>typeof x==='string'&&x.length>0&&x.length<=max&&!/[\x00-\x1f\x7f]/.test(x);
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const exact=(x,required,optional=[])=>object(x)&&required.every(k=>Object.hasOwn(x,k))&&Object.keys(x).every(k=>required.includes(k)||optional.includes(k));
const required=['documentId','pdfFile','pdfSha256','sourceUrl','capturedAt','title','bodyName','meetingDate','recordKind','sessionKind','extractionStatus','pageCount'];
const optional=['sourceLabel','secondaryDateRaw','statusNote'];
export function assertCapturedSourceUrl(entry,source){
 if(!string(source?.provider,128))fail('CIVIC_CAPTURE_SOURCE');
 let url,registry;try{url=new URL(entry.sourceUrl);registry=new URL(source.registry_url);}catch{fail('CIVIC_CAPTURE_URL');}
 if(!string(entry.sourceUrl,2000)||url.protocol!=='https:'||url.username||url.password||url.hash||/[<>\s]/.test(entry.sourceUrl)||url.href!==entry.sourceUrl||registry.protocol!=='https:'||registry.username||registry.password||url.origin!==registry.origin)fail('CIVIC_CAPTURE_URL');
 if(source.provider==='ecode360'&&(!/^[A-Z]{2}\d{4}$/.test(source.provider_jurisdiction_id)||registry.hostname!=='ecode360.com'||!/^\d{1,128}$/.test(entry.documentId)||url.search||url.pathname!==`/${source.provider_jurisdiction_id}/document/${entry.documentId}.pdf`))fail('CIVIC_CAPTURE_URL');
}
export function captureProjection(entry,source){
 if(!exact(entry,required,optional))fail('CIVIC_CAPTURE_ENTRY_SHAPE');
 if(!string(source.id,220)||!/^civic-sources\/[a-z0-9][a-z0-9._-]{0,200}$/.test(source.id)||source.type!=='Civic Source'||!string(source.jurisdiction_key,128)||!string(source.body_name,500)||!string(source.provider,128))fail('CIVIC_CAPTURE_SOURCE');
 if(!string(entry.documentId,128)||!string(entry.title,500)||!string(entry.bodyName,500)||entry.bodyName!==source.body_name)fail('CIVIC_CAPTURE_METADATA');
 if(!string(entry.pdfFile,4000)||!path.isAbsolute(entry.pdfFile)||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(entry.capturedAt)||!Number.isFinite(Date.parse(entry.capturedAt))||new Date(entry.capturedAt).toISOString()!==entry.capturedAt)fail('CIVIC_CAPTURE_METADATA');
 if(!/^[a-f0-9]{64}$/.test(entry.pdfSha256)||!Number.isSafeInteger(entry.pageCount)||entry.pageCount<1||entry.pageCount>250)fail('CIVIC_CAPTURE_METADATA');
 for(const key of ['meetingDate','recordKind','sessionKind','extractionStatus'])if(!string(entry[key],100))fail('CIVIC_CAPTURE_METADATA');
 for(const key of optional)if(Object.hasOwn(entry,key)&&!string(entry[key],1000))fail('CIVIC_CAPTURE_METADATA');
 assertCapturedSourceUrl(entry,source);
 // All framed inputs exclude controls. No trailing newline; this is a domain identity, not a shared canonicalizer.
 const id='civic-records/capture-v1-'+hash(['civic-capture-v1',source.id,source.jurisdiction_key,entry.documentId,entry.pdfSha256].join('\n'));
 const fields={title:entry.title,jurisdiction_key:source.jurisdiction_key,body_name:entry.bodyName,meeting_date:entry.meetingDate,record_kind:entry.recordKind,session_kind:entry.sessionKind,provider_document_id:entry.documentId,source_url:entry.sourceUrl,content_sha256:entry.pdfSha256,observed_at:entry.capturedAt,approval_status:'unknown',extraction_status:entry.extractionStatus,page_count:entry.pageCount,evidence_path:entry.pdfFile};
 for(const [from,to]of [['sourceLabel','source_label'],['secondaryDateRaw','provider_secondary_date_raw'],['statusNote','source_status_note']])if(Object.hasOwn(entry,from))fields[to]=entry[from];
 const body=normalizeDocumentBodyForStorage('## Supplied capture\n\nOperator-supplied local PDF bytes checked against the supplied SHA256. Source URL, capture time, meeting metadata, extraction status and page count are caller assertions. PDF magic and byte identity do not establish official authenticity, PDF validity or conversion execution. The evidence path is a local pointer, not immutable evidence custody.\n\nCoverage: selected files only; unexamined discovery tails remain unknown. No approval, supersession, disappearance, source freshness or publication is inferred.\n\n[from source](../'+source.id+'.md)\n');
 return {id,type:'Civic Record',fields,body};
}
/** Existing semantic revision: preserve its first observation/custody pointer verbatim. */
export function existingCaptureMatches(actual,wanted){
 const at=actual.observed_at;
 if(typeof at!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(at)||!Number.isFinite(Date.parse(at))||new Date(at).toISOString()!==at||!string(actual.evidence_path,4000)||!path.isAbsolute(actual.evidence_path))return false;
 return actual.type===wanted.type&&actual.body===wanted.body&&Object.entries(wanted.fields).every(([key,value])=>['observed_at','evidence_path'].includes(key)||actual[key]===value);
}
function matches(actual,wanted){return actual.type===wanted.type&&actual.body===wanted.body&&Object.entries(wanted.fields).every(([key,value])=>actual[key]===value);}
async function boundedFile(file,max){
 let handle;try{
  if(!string(file,4000)||!path.isAbsolute(file))fail('CIVIC_CAPTURE_FILE');
  // Inspect the opened file, bound allocation/read, and never follow a final-component symlink.
  handle=await open(file,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);const stat=await handle.stat();
  if(!stat.isFile()||stat.nlink!==1||stat.size<1||stat.size>max)fail('CIVIC_CAPTURE_FILE');
  const buffer=Buffer.alloc(max+1);let size=0;
  while(size<buffer.length){const read=await handle.read(buffer,size,buffer.length-size,null);if(!read.bytesRead)break;size+=read.bytesRead;}
  if(size>max)fail('CIVIC_CAPTURE_FILE');return buffer.subarray(0,size);
 }catch(error){if(error.message==='CIVIC_CAPTURE_FILE')throw error;fail('CIVIC_CAPTURE_FILE');}
 finally{if(handle)await handle.close();}
}
export async function registerCaptured({cli='superbee',bundle,manifest,actor,apply=false}){
 const receipt={schema:'civic-local-capture/v1',scope:'operator-supplied files; local-only; no network, conversion, sync or publication',coverage:'selected-only-unknown-tail',apply,results:[],created:0,unchanged:0};let temp;
 try{
  if(typeof bundle!=='string'||!path.isAbsolute(bundle)||!string(actor,200)||!/^process:[a-zA-Z0-9._-]+$/.test(actor))fail('CIVIC_CAPTURE_SELECTION');
  const bytes=await boundedFile(manifest,65536);let input;try{input=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{fail('CIVIC_CAPTURE_MANIFEST');}
  if(!exact(input,['schema','sourceId','captureBasis','coverage','entries'])||input.schema!=='civic-captured-records/v1'||input.captureBasis!=='operator-supplied-files'||input.coverage!=='selected-only-unknown-tail'||!/^civic-sources\/[a-z0-9][a-z0-9._-]{0,200}$/.test(input.sourceId)||!Array.isArray(input.entries)||input.entries.length<1||input.entries.length>10)fail('CIVIC_CAPTURE_MANIFEST');
  const root=await realpath(bundle),selected=await lstat(root,{bigint:true}),native=nativeCli(cli,root);
  const local=async()=>{if(await realpath(bundle)!==root)fail('CIVIC_TARGET_MOVED');const current=await lstat(root,{bigint:true});if(!current.isDirectory()||current.dev!==selected.dev||current.ino!==selected.ino)fail('CIVIC_TARGET_REPLACED');const located=native.ok(['bundle','locate']);if(located.home!=='local'||located.locator?.kind!=='local-path'||located.locator.path!==root)fail('CIVIC_LOCAL_ONLY');};
  await local();
  const source=await native.read(input.sourceId);if(!source)fail('CIVIC_CAPTURE_SOURCE');
  const kind=await native.read('conventions/civic-record');if(kind?.governs!=='Civic Record'||kind.path!=='civic-records/')fail('CIVIC_KIND_REQUIRED');
  const registry=buildKindRegistry([{id:kind.id,frontmatter:kind,body:kind.body}]),definition=registry.kinds.get('Civic Record');
  if(!definition||registry.warnings.length)fail('CIVIC_KIND_REQUIRED');
  const proposals=[],seen=new Set();
  for(const entry of input.entries){
   const wanted=captureProjection(entry,source);if(seen.has(wanted.id))fail('CIVIC_CAPTURE_DUPLICATE');seen.add(wanted.id);
   const pdf=await boundedFile(entry.pdfFile,8*1024*1024);if(!pdf.subarray(0,5).equals(Buffer.from('%PDF-'))||hash(pdf)!==entry.pdfSha256)fail('CIVIC_CAPTURE_PDF_IDENTITY');
   if(validateAgainstKind({id:wanted.id,frontmatter:{type:wanted.type,...wanted.fields},body:wanted.body},definition).length)fail('CIVIC_CAPTURE_KIND_INVALID');
   const existing=await native.read(wanted.id);if(existing&&!existingCaptureMatches(existing,wanted))fail('CIVIC_EXISTING_CONFLICT');proposals.push({wanted,existing});
  }
  if(!apply){receipt.results=proposals.map(({wanted,existing})=>({id:wanted.id,outcome:existing?'up-to-date':'would-create'}));return receipt;}
  temp=await mkdtemp(path.join(tmpdir(),'civic-capture-body-'));
  for(const {wanted}of proposals){
   await local();if(!await native.read(kind.id,kind.head_version)||!await native.read(source.id,source.head_version))fail('CIVIC_PREREQUISITE_CHANGED');
   const current=await native.read(wanted.id);if(current){if(!existingCaptureMatches(current,wanted))fail('CIVIC_EXISTING_CONFLICT');receipt.results.push({id:wanted.id,outcome:'up-to-date',version:current.head_version});receipt.unchanged++;continue;}
   const bodyFile=path.join(temp,'body.md');await writeFile(bodyFile,wanted.body,{mode:0o600});
   await local();receipt.results.push({id:wanted.id,outcome:'create-outcome-unknown'});
   const result=native.call(['new',wanted.type,wanted.id,...Object.entries(wanted.fields).map(([key,value])=>`--${key}=${value}`),'--body-file',bodyFile,'--actor',actor]);
   if(result.status!==0){Object.assign(receipt.results.at(-1),{outcome:'refused-or-unknown',nativeStatus:result.status});fail('CIVIC_CREATE_STOPPED');}
   const ack=result.data;if(!object(ack)||ack.new!=='written'||ack.id!==wanted.id||ack.type!==wanted.type||!string(ack.version,200))fail('CIVIC_NATIVE_RECEIPT_UNKNOWN');
   receipt.results.at(-1).outcome='created-unconfirmed';
   const actual=await native.read(wanted.id);if(!actual||actual.head_version!==ack.version||!matches(actual,wanted))fail('CIVIC_READBACK_CONFLICT');
   if(!await native.read(source.id,source.head_version)||!await native.read(kind.id,kind.head_version))fail('CIVIC_PREREQUISITE_CHANGED');
   Object.assign(receipt.results.at(-1),{outcome:'created',version:actual.head_version});receipt.created++;
  }
  return receipt;
 }catch(error){const code=/^CIVIC_[A-Z_]+$/.test(error.message)?error.message:'CIVIC_CAPTURE_FAILED';const stopped=Error(code);stopped.receipt={...receipt,error:code,complete:false};throw stopped;}
 finally{if(temp)await rm(temp,{recursive:true,force:true});}
}
// Node resolves module URLs physically; argv may retain a symlinked ancestor such as /tmp.
const isMain=process.argv[1]&&(await realpath(process.argv[1]).catch(()=>null))===await realpath(fileURLToPath(import.meta.url));
if(isMain){
 try{const config={apply:false},names={'--cli':'cli','--bundle':'bundle','--manifest':'manifest','--actor':'actor'};for(let i=2;i<process.argv.length;i++){const flag=process.argv[i];if(flag==='--apply'&&!config.apply)config.apply=true;else if(names[flag]&&!config[names[flag]]&&process.argv[i+1]&&!process.argv[i+1].startsWith('--'))config[names[flag]]=process.argv[++i];else fail('CIVIC_CAPTURE_ARGUMENTS');}console.log(JSON.stringify(await registerCaptured(config)));}
 catch(error){console.log(JSON.stringify(error.receipt??{error:/^CIVIC_[A-Z_]+$/.test(error.message)?error.message:'CIVIC_CAPTURE_FAILED'}));process.exitCode=1;}
}
