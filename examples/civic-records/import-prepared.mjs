/** Local-only civic projection. Public CLI owns parsing, Kinds and atomic create-only writes. */
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {lstat,readFile,realpath,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const hash=x=>createHash('sha256').update(x).digest('hex');
const fail=code=>{throw Error(code);};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const string=(x,max)=>typeof x==='string'&&x.length>0&&x.length<=max&&!/[\x00-\x1f\x7f]/.test(x);
const keys=['schema','formatVersion','jurisdictionKey','documentId','recordId','sourceUrl','pdfSha256','textSha256','markdownSha256','pageCount','extractionLabel','extractionAssociation','extractorExecution','accessScope','markdown'];
export function projection(p,record,derivedAt){
 if(!p||Array.isArray(p)||Object.keys(p).sort().join('|')!==[...keys].sort().join('|'))fail('CIVIC_PREPARED_SHAPE');
 if(p.schema!=='civic-prepared-text/v1'||p.formatVersion!=='civic-layout-markdown-v1'||p.extractionAssociation!=='caller_asserted'||p.extractorExecution!=='not_observed'||p.accessScope!=='local-private-research')fail('CIVIC_PREPARED_CONTRACT');
 if(!string(p.jurisdictionKey,128)||!string(p.documentId,128)||!string(p.extractionLabel,200)||!/^civic-records\/[a-z0-9][a-z0-9._-]{0,200}$/.test(p.recordId))fail('CIVIC_IDENTITY');
 for(const name of ['pdfSha256','textSha256','markdownSha256'])if(!/^[a-f0-9]{64}$/.test(p[name]))fail('CIVIC_DIGEST');
 if(!Number.isSafeInteger(p.pageCount)||p.pageCount<1||p.pageCount>250||typeof p.markdown!=='string'||Buffer.byteLength(p.markdown)>60000||hash(p.markdown)!==p.markdownSha256)fail('CIVIC_OUTPUT_IDENTITY');
 // This format already emits canonical newline-terminated Markdown. Never copy a frontmatter parser/normalizer here.
 if(!p.markdown.endsWith('\n')||p.markdown.endsWith('\n\n')||p.markdown.includes('\r')||p.markdown.includes('\0'))fail('CIVIC_BODY_FORMAT');
 let url;try{url=new URL(p.sourceUrl);}catch{fail('CIVIC_SOURCE_URL');}
 if(!string(p.sourceUrl,2000)||url.protocol!=='https:'||url.username||url.password||url.hash||/[<>\s]/.test(p.sourceUrl)||url.href!==p.sourceUrl)fail('CIVIC_SOURCE_URL');
 if(record.id!==p.recordId||record.type!=='Civic Record'||record.jurisdiction_key!==p.jurisdictionKey||record.provider_document_id!==p.documentId||record.content_sha256!==p.pdfSha256||record.source_url!==p.sourceUrl||record.page_count!==p.pageCount||!string(record.title,500))fail('CIVIC_SOURCE_RECORD_MISMATCH');
 if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(derivedAt)||new Date(derivedAt).toISOString()!==derivedAt)fail('CIVIC_DERIVED_AT');
 // Domain-specific, unambiguous newline framing (all variable strings exclude controls), not a shared JSON canonicalizer.
 const basis=['civic-import-v2',p.recordId,p.pdfSha256,p.textSha256,p.markdownSha256,p.extractionLabel].join('\n');
 return {id:'civic-texts/import-v2-'+hash(basis),type:'Civic Text',fields:{title:record.title+' — supplied complete text',jurisdiction_key:p.jurisdictionKey,source_record_id:p.recordId,source_url:p.sourceUrl,source_content_sha256:p.pdfSha256,extraction_version:p.formatVersion,formatter_version:p.formatVersion,input_text_sha256:p.textSha256,extraction_association:p.extractionAssociation,extractor_execution:p.extractorExecution,text_sha256:p.markdownSha256,page_count:p.pageCount,derived_at:derivedAt,access_scope:p.accessScope,extraction_note:`Caller-asserted PDF/text association; converter execution not observed. Supplied label: ${p.extractionLabel}. Input text SHA256: ${p.textSha256}.`},body:p.markdown};
}
function matches(actual,wanted){return actual.type===wanted.type&&actual.body===wanted.body&&Object.entries(wanted.fields).every(([k,v])=>actual[k]===v);}
export function nativeCli(cli,bundle){
 const call=(args)=>{
  const r=spawnSync(cli,[...args,'--dir',bundle,'--json'],{encoding:'utf8',timeout:30000,maxBuffer:2*1024*1024,shell:false});
  if(r.error||r.signal)fail('CIVIC_NATIVE_OUTCOME_UNKNOWN');
  if(r.status!==0)return {status:r.status,data:null};
  let data;try{data=JSON.parse(r.stdout);}catch{fail('CIVIC_NATIVE_RECEIPT_UNKNOWN');}
  return {status:r.status,data};
 };
 const ok=args=>{const r=call(args);if(r.status!==0)fail('CIVIC_NATIVE_REFUSED');return r.data;};
 return {ok,call,async read(id,expected){
  const r=call(['doc','read',id,'--offset','0','--max-bytes','983040',...(expected?['--expected-version',expected]:[])]);
  if(r.status===6)return null; // Public CLI exit 6 is NOT_FOUND; no diagnostic prose parsing.
  if(r.status!==0)fail('CIVIC_NATIVE_READ_REFUSED');
  const d=r.data;if(d.body_truncated||!d.range?.complete||d.range.next_offset!==undefined||typeof d.body!=='string'||!d.head_version)fail('CIVIC_INCOMPLETE_READ');
  return d;
 }};
}
export async function importPrepared({cli='superbee',bundle,files,derivedAt,actor,apply=false}){
 const receipt={schema:'civic-local-import/v2',scope:'local-only; no sync or publication',apply,results:[],created:0,unchanged:0};
 let temp;
 try{
  if(!path.isAbsolute(bundle)||!Array.isArray(files)||files.length<1||files.length>10||!string(actor,200)||!/^process:[a-zA-Z0-9._-]+$/.test(actor))fail('CIVIC_IMPORT_SELECTION');
  const root=await realpath(bundle),native=nativeCli(cli,root),selectedRoot=await lstat(root,{bigint:true});
  if(!selectedRoot.isDirectory())fail('CIVIC_TARGET_DIRECTORY');
  const local=async()=>{
   if(await realpath(bundle)!==root)fail('CIVIC_TARGET_MOVED');
   const currentRoot=await lstat(root,{bigint:true});
   if(!currentRoot.isDirectory()||currentRoot.dev!==selectedRoot.dev||currentRoot.ino!==selectedRoot.ino)fail('CIVIC_TARGET_REPLACED');
   const s=native.ok(['bundle','locate']);if(s.home!=='local'||s.locator?.kind!=='local-path'||s.locator.path!==root)fail('CIVIC_LOCAL_ONLY');
  };
  await local();
  const kind=await native.read('conventions/civic-text');if(kind?.governs!=='Civic Text'||kind.path!=='civic-texts/')fail('CIVIC_KIND_REQUIRED');
  const declared=new Set([...(kind.fields?.required??[]),...(kind.fields?.optional??[])]);
  if(!['formatter_version','input_text_sha256','extraction_association','extractor_execution'].every(k=>declared.has(k)))fail('CIVIC_RECIPE_UPGRADE_REQUIRED');
  const proposals=[],seen=new Set();
  for(const file of files){
   const stat=await lstat(file);if(!stat.isFile()||stat.nlink!==1||stat.size>70000)fail('CIVIC_INPUT_FILE');
   const bytes=await readFile(file);if(bytes.length>70000)fail('CIVIC_INPUT_FILE');
   let p;try{p=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{fail('CIVIC_INPUT_JSON');}
   if(!p||typeof p.recordId!=='string'||!/^civic-records\/[a-z0-9][a-z0-9._-]{0,200}$/.test(p.recordId))fail('CIVIC_RECORD_ID');
   const source=await native.read(p.recordId);if(!source)fail('CIVIC_SOURCE_REQUIRED');
   const wanted=projection(p,source,derivedAt);if(seen.has(wanted.id))fail('CIVIC_DUPLICATE');seen.add(wanted.id);
   const actual=await native.read(wanted.id);if(actual&&!matches(actual,wanted))fail('CIVIC_EXISTING_CONFLICT');
   proposals.push({wanted,source,existing:actual});
  }
  // Preflight is read-only, bounded and complete. Native 'new' remains the atomic expected-absent boundary.
  if(!apply){receipt.results=proposals.map(({wanted,existing})=>({id:wanted.id,outcome:existing?'up-to-date':'would-create'}));return receipt;}
  temp=await mkdtemp(path.join(tmpdir(),'civic-import-body-'));
  for(const {wanted,source} of proposals){
   await local();if(!await native.read(kind.id,kind.head_version)||!await native.read(source.id,source.head_version))fail('CIVIC_PREREQUISITE_CHANGED');
   const current=await native.read(wanted.id);
   if(current){if(!matches(current,wanted))fail('CIVIC_EXISTING_CONFLICT');receipt.results.push({id:wanted.id,outcome:'up-to-date',version:current.head_version});receipt.unchanged++;continue;}
   const bodyFile=path.join(temp,'body.md');await writeFile(bodyFile,wanted.body,{mode:0o600});
   const args=['new',wanted.type,wanted.id,...Object.entries(wanted.fields).map(([k,v])=>`--${k}=${v}`),'--body-file',bodyFile,'--actor',actor];
   await local();
   receipt.results.push({id:wanted.id,outcome:'create-outcome-unknown'});
   const result=native.call(args);
   if(result.status!==0){Object.assign(receipt.results.at(-1),{outcome:'refused-or-unknown',nativeStatus:result.status});fail('CIVIC_CREATE_STOPPED');}
   const ack=result.data;if(!object(ack)||ack.new!=='written'||ack.id!==wanted.id||ack.type!==wanted.type||!string(ack.version,200))fail('CIVIC_NATIVE_RECEIPT_UNKNOWN');
   Object.assign(receipt.results.at(-1),{outcome:'created-unconfirmed',nativeReceipt:ack});
   const actual=await native.read(wanted.id);if(!actual||actual.head_version!==ack.version||!matches(actual,wanted))fail('CIVIC_READBACK_CONFLICT');
   if(!await native.read(source.id,source.head_version))fail('CIVIC_PREREQUISITE_CHANGED');
   receipt.results.at(-1).outcome='created';receipt.results.at(-1).version=actual.head_version;receipt.created++;
  }
  return receipt;
 }catch(error){error.receipt={...receipt,error:error.message,complete:false};throw error;}
 finally{if(temp)await rm(temp,{recursive:true,force:true});}
}
const isMain=process.argv[1]&&(await realpath(process.argv[1]).catch(()=>null))===await realpath(fileURLToPath(import.meta.url));
if(isMain){
 try{
  const config={files:[],apply:false};const names={'--cli':'cli','--bundle':'bundle','--actor':'actor','--derived-at':'derivedAt'};
  for(let i=2;i<process.argv.length;i++){const flag=process.argv[i];if(flag==='--apply'){if(config.apply)fail('CIVIC_ARGUMENTS');config.apply=true;}else if(flag==='--prepared'){config.files.push(process.argv[++i]);}else if(names[flag]&&!config[names[flag]]){config[names[flag]]=process.argv[++i];}else fail('CIVIC_ARGUMENTS');}
  console.log(JSON.stringify(await importPrepared(config)));
 }catch(error){console.log(JSON.stringify(error.receipt??{error:error.message}));process.exitCode=1;}
}
