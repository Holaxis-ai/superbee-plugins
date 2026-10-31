/** Civic projections staged through native verbs in an explicitly selected hosted checkout.
 * This caller never syncs or confirms a remote commit. Native reads may refresh the checkout.
 */
import {createHash} from 'node:crypto';
import {constants} from 'node:fs';
import {open,lstat,realpath,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildKindRegistry,validateAgainstKind} from '@superbee/core/kinds';
import {projection,nativeCli,existingTextMatches} from './import-prepared.mjs';
import {captureProjection,existingCaptureMatches} from './register-captured.mjs';
const fail=code=>{throw Error(code);};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const string=(x,max=4000)=>typeof x==='string'&&x.length>0&&x.length<=max&&!/[\x00-\x1f\x7f]/.test(x);
const exact=(x,keys)=>object(x)&&Object.keys(x).sort().join('|')===[...keys].sort().join('|');
const same=(actual,wanted)=>actual.type===wanted.type&&actual.body===wanted.body&&Object.entries(wanted.fields).every(([key,value])=>actual[key]===value);
async function bounded(file,max){
 let handle;try{
  if(!string(file)||!path.isAbsolute(file))fail('CIVIC_HOSTED_INPUT_FILE');
  handle=await open(file,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
  const stat=await handle.stat();if(!stat.isFile()||stat.nlink!==1||stat.size<1||stat.size>max)fail('CIVIC_HOSTED_INPUT_FILE');
  const buffer=Buffer.alloc(max+1);let size=0;
  while(size<buffer.length){const read=await handle.read(buffer,size,buffer.length-size,null);if(!read.bytesRead)break;size+=read.bytesRead;}
  if(size>max)fail('CIVIC_HOSTED_INPUT_FILE');return buffer.subarray(0,size);
 }catch(error){if(error.message==='CIVIC_HOSTED_INPUT_FILE')throw error;fail('CIVIC_HOSTED_INPUT_FILE');}
 finally{if(handle)await handle.close();}
}
export async function readHostedCivicJson(file,max){
 const bytes=await bounded(file,max);
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{fail('CIVIC_HOSTED_INPUT_JSON');}
}
export function hostedProjection(prepared,record,derivedAt){
 // RegExp and newline framing must never coerce array/object digest values.
 for(const key of ['pdfSha256','textSha256','markdownSha256'])if(typeof prepared?.[key]!=='string'||!/^[a-f0-9]{64}$/.test(prepared[key]))fail('CIVIC_DIGEST');
 const local=projection(prepared,record,derivedAt);
 const identity=['civic-hosted-import-v1',prepared.recordId,prepared.pdfSha256,prepared.textSha256,prepared.markdownSha256,prepared.extractionLabel,'private-research'];
 return {...local,id:'civic-texts/import-hosted-v1-'+hash(identity.join('\n')),fields:{...local.fields,access_scope:'private-research',extraction_note:local.fields.extraction_note+' Prepared source scope: local-private-research. Final audience intent: private-research; not an access-control or confidentiality guarantee.'}};
}
export async function selectHostedCivicTarget(config){
 const {cli,bundle,expectedHost,expectedWorkspace,expectedBundle,expectedPrincipal}=config;
 if(!string(cli)||!path.isAbsolute(cli)||!string(bundle)||!path.isAbsolute(bundle)||![expectedHost,expectedWorkspace,expectedBundle,expectedPrincipal].every(x=>string(x,500)))fail('CIVIC_HOSTED_SELECTION');
 let url;try{url=new URL(expectedHost);}catch{fail('CIVIC_HOSTED_SELECTION');}
 if(url.protocol!=='https:'||url.origin!==expectedHost||url.username||url.password)fail('CIVIC_HOSTED_SELECTION');
 const root=await realpath(bundle),selected=await lstat(root,{bigint:true}),native=nativeCli(cli,root);
 if(!selected.isDirectory())fail('CIVIC_TARGET_DIRECTORY');
 const scope={host:expectedHost,bundle_id:expectedBundle,workspace:expectedWorkspace,principal:expectedPrincipal};
 const check=async()=>{
  if(await realpath(bundle)!==root)fail('CIVIC_TARGET_MOVED');
  const current=await lstat(root,{bigint:true});if(!current.isDirectory()||current.dev!==selected.dev||current.ino!==selected.ino)fail('CIVIC_TARGET_REPLACED');
  const located=native.ok(['bundle','locate']);
  if(located.schema_version!==1||located.available!==true||located.home!=='hosted'||located.locator?.kind!=='local-path'||located.locator.path!==root||!object(located.hosted)||Object.entries(scope).some(([key,value])=>located.hosted[key]!==value))fail('CIVIC_HOSTED_SCOPE_MISMATCH');
 };
 const read=async(id,version)=>{
  const doc=await native.read(id,version);
  if(doc&&(doc.id!==id||!string(doc.head_version,200)))fail('CIVIC_INCOMPLETE_READ');
  return doc;
 };
 await check();return {root,native,scope,check,read};
}
function kindDefinition(kind,type,prefix){
 if(kind?.governs!==type||kind.path!==prefix)fail('CIVIC_KIND_REQUIRED');
 const registry=buildKindRegistry([{id:kind.id,frontmatter:kind,body:kind.body}]),definition=registry.kinds.get(type);
 if(!definition||registry.warnings.length)fail('CIVIC_KIND_REQUIRED');return definition;
}
export async function stageHosted(config){
 const {mode,actor,apply=false}=config;
 const receipt={schema:'civic-hosted-stage/v1',mode,apply,results:[],stagedLocal:0,matchingLocal:0,hostedConfirmed:0,needsNativeSync:true,scope:'local staging only; native sync and independent hosted readback remain separate',preparedSourceScope:mode==='text'?'local-private-research':undefined};
 let temp;
 try{
  if(!['capture','text'].includes(mode)||!string(actor,200)||!/^process:[a-zA-Z0-9._-]+$/.test(actor)||typeof apply!=='boolean')fail('CIVIC_HOSTED_ARGUMENTS');
  const target=await selectHostedCivicTarget(config),{native,read}=target;receipt.target={folder:target.root,...target.scope};
  const kind=await read(mode==='capture'?'conventions/civic-record':'conventions/civic-text');
  const definition=kindDefinition(kind,mode==='capture'?'Civic Record':'Civic Text',mode==='capture'?'civic-records/':'civic-texts/');
  if(mode==='text'&&(!Array.isArray(kind.fields?.values?.access_scope)||!kind.fields.values.access_scope.includes('private-research')))fail('CIVIC_HOSTED_RECIPE_UPGRADE_REQUIRED');
  const proposals=[],seen=new Set();
  const existingMatches=mode==='capture'?existingCaptureMatches:existingTextMatches;
  const add=async(wanted,source)=>{
   if(seen.has(wanted.id))fail('CIVIC_DUPLICATE');seen.add(wanted.id);
   if(validateAgainstKind({id:wanted.id,frontmatter:{type:wanted.type,...wanted.fields},body:wanted.body},definition).length)fail('CIVIC_HOSTED_KIND_INVALID');
   const existing=await read(wanted.id);if(existing&&!existingMatches(existing,wanted))fail('CIVIC_EXISTING_CONFLICT');
   proposals.push({wanted,source,existing});
  };
  if(mode==='capture'){
   const manifest=await readHostedCivicJson(config.manifest,65536);
   if(!exact(manifest,['schema','sourceId','captureBasis','coverage','entries'])||manifest.schema!=='civic-captured-records/v1'||manifest.captureBasis!=='operator-supplied-files'||manifest.coverage!=='selected-only-unknown-tail'||!string(manifest.sourceId,220)||!/^civic-sources\/[a-z0-9][a-z0-9._-]{0,200}$/.test(manifest.sourceId)||!Array.isArray(manifest.entries)||manifest.entries.length<1||manifest.entries.length>10)fail('CIVIC_CAPTURE_MANIFEST');
   const source=await read(manifest.sourceId);if(!source)fail('CIVIC_CAPTURE_SOURCE');
   for(const entry of manifest.entries){
    const wanted=captureProjection(entry,source),pdf=await bounded(entry.pdfFile,8*1024*1024);
    if(!pdf.subarray(0,5).equals(Buffer.from('%PDF-'))||hash(pdf)!==entry.pdfSha256)fail('CIVIC_CAPTURE_PDF_IDENTITY');
    await add(wanted,source);
   }
  }else{
   if(!Array.isArray(config.files)||config.files.length<1||config.files.length>10)fail('CIVIC_HOSTED_ARGUMENTS');
   for(const file of config.files){
    const prepared=await readHostedCivicJson(file,70000);
    if(!object(prepared)||!string(prepared.recordId,220)||!/^civic-records\/[a-z0-9][a-z0-9._-]{0,200}$/.test(prepared.recordId))fail('CIVIC_RECORD_ID');
    const source=await read(prepared.recordId);if(!source)fail('CIVIC_SOURCE_REQUIRED');
    await add(hostedProjection(prepared,source,config.derivedAt),source);
   }
  }
  await target.check();
  for(const {source}of proposals)if(!await read(source.id,source.head_version))fail('CIVIC_PREREQUISITE_CHANGED');
  if(!await read(kind.id,kind.head_version))fail('CIVIC_PREREQUISITE_CHANGED');
  if(!apply){receipt.results=proposals.map(({wanted,existing})=>({id:wanted.id,outcome:existing?'locally-matching':'would-stage',...(existing?{localVersion:existing.head_version}:{})}));receipt.matchingLocal=proposals.filter(p=>p.existing).length;receipt.complete=true;return receipt;}
  temp=await mkdtemp(path.join(tmpdir(),'civic-hosted-stage-'));
  for(const {wanted,source}of proposals){
   await target.check();if(!await read(source.id,source.head_version)||!await read(kind.id,kind.head_version))fail('CIVIC_PREREQUISITE_CHANGED');
   const current=await read(wanted.id);
   if(current){if(!existingMatches(current,wanted))fail('CIVIC_EXISTING_CONFLICT');receipt.results.push({id:wanted.id,outcome:'locally-matching',localVersion:current.head_version});receipt.matchingLocal++;continue;}
   const bodyFile=path.join(temp,'body.md');await writeFile(bodyFile,wanted.body,{mode:0o600});
   await target.check();receipt.results.push({id:wanted.id,outcome:'stage-outcome-unknown'});
   const result=native.call(['new',wanted.type,wanted.id,...Object.entries(wanted.fields).map(([key,value])=>`--${key}=${value}`),'--body-file',bodyFile,'--actor',actor]);
   if(result.status!==0){Object.assign(receipt.results.at(-1),{outcome:'refused-or-unknown',nativeStatus:result.status});fail('CIVIC_CREATE_STOPPED');}
   const ack=result.data;if(!object(ack)||ack.new!=='written'||ack.id!==wanted.id||ack.type!==wanted.type||!string(ack.version,200))fail('CIVIC_NATIVE_RECEIPT_UNKNOWN');
   receipt.results.at(-1).outcome='staged-unconfirmed';
   const actual=await read(wanted.id);if(!actual||actual.head_version!==ack.version||!same(actual,wanted))fail('CIVIC_READBACK_CONFLICT');
   await target.check();if(!await read(source.id,source.head_version)||!await read(kind.id,kind.head_version))fail('CIVIC_PREREQUISITE_CHANGED');
   Object.assign(receipt.results.at(-1),{outcome:'staged-local',localVersion:actual.head_version});receipt.stagedLocal++;
  }
  receipt.complete=true;return receipt;
 }catch(error){const code=/^CIVIC_[A-Z0-9_]+$/.test(error.message)?error.message:'CIVIC_HOSTED_STAGE_FAILED';const stopped=Error(code);stopped.receipt={...receipt,error:code,complete:false};throw stopped;}
 finally{if(temp)await rm(temp,{recursive:true,force:true});}
}
export function parseArguments(argv){
 const config={mode:argv[0],files:[],apply:false},names={'--cli':'cli','--bundle':'bundle','--expected-host':'expectedHost','--expected-workspace':'expectedWorkspace','--expected-bundle':'expectedBundle','--expected-principal':'expectedPrincipal','--actor':'actor','--manifest':'manifest','--derived-at':'derivedAt'};
 for(let i=1;i<argv.length;i++){const flag=argv[i];if(flag==='--apply'&&!config.apply){config.apply=true;continue;}const value=argv[++i];if(!string(value)||value.startsWith('--'))fail('CIVIC_HOSTED_ARGUMENTS');if(flag==='--prepared')config.files.push(value);else if(names[flag]&&!Object.hasOwn(config,names[flag]))config[names[flag]]=value;else fail('CIVIC_HOSTED_ARGUMENTS');}
 if(!['capture','text'].includes(config.mode)||!['cli','bundle','expectedHost','expectedWorkspace','expectedBundle','expectedPrincipal','actor'].every(key=>config[key]))fail('CIVIC_HOSTED_ARGUMENTS');
 if(config.mode==='capture'&&(!config.manifest||config.files.length||config.derivedAt)||config.mode==='text'&&(config.manifest||!config.files.length||!config.derivedAt))fail('CIVIC_HOSTED_ARGUMENTS');
 return config;
}
const isMain=process.argv[1]&&(await realpath(process.argv[1]).catch(()=>null))===await realpath(fileURLToPath(import.meta.url));
if(isMain){try{console.log(JSON.stringify(await stageHosted(parseArguments(process.argv.slice(2)))));}catch(error){console.log(JSON.stringify(error.receipt??{error:/^CIVIC_[A-Z0-9_]+$/.test(error.message)?error.message:'CIVIC_HOSTED_STAGE_FAILED'}));process.exitCode=1;}}
