/** Input-file planning only. No network, conversion, trust acceptance or bundle writes. */
import {createHash} from 'node:crypto';
import {constants} from 'node:fs';
import {open,lstat,realpath,mkdir,writeFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildKindRegistry,validateAgainstKind} from '@superbee/core/kinds';
import {captureProjection} from './register-captured.mjs';
import {nativeCli} from './import-prepared.mjs';
const fail=code=>{throw Error(code);};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const string=(x,max=4000)=>typeof x==='string'&&x.length>0&&x.length<=max&&!/[\x00-\x1f\x7f]/.test(x);
const within=(root,file)=>{const relative=path.relative(root,file);return relative===''||(relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative));};
const json=x=>JSON.stringify(x,null,2)+'\n';
async function bounded(file,max){
 let handle;try{
  if(!string(file)||!path.isAbsolute(file))fail('CIVIC_PLAN_FILE');
  handle=await open(file,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
  const stat=await handle.stat();if(!stat.isFile()||stat.nlink!==1||stat.size<1||stat.size>max)fail('CIVIC_PLAN_FILE');
  const buffer=Buffer.alloc(max+1);let size=0;
  while(size<buffer.length){const read=await handle.read(buffer,size,buffer.length-size,null);if(!read.bytesRead)break;size+=read.bytesRead;}
  if(size>max)fail('CIVIC_PLAN_FILE');return buffer.subarray(0,size);
 }catch(error){if(error.message==='CIVIC_PLAN_FILE')throw error;fail('CIVIC_PLAN_FILE');}
 finally{if(handle)await handle.close();}
}
function utf8(bytes){try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{fail('CIVIC_PLAN_UTF8');}}
async function selected(cli,bundle){
 if(!string(cli)||!string(bundle)||!path.isAbsolute(bundle))fail('CIVIC_PLAN_SELECTION');
 const root=await realpath(bundle),stat=await lstat(root,{bigint:true}),native=nativeCli(cli,root);
 if(!stat.isDirectory())fail('CIVIC_PLAN_SELECTION');
 const check=async()=>{
  if(await realpath(bundle)!==root)fail('CIVIC_TARGET_MOVED');
  const current=await lstat(root,{bigint:true});if(!current.isDirectory()||current.dev!==stat.dev||current.ino!==stat.ino)fail('CIVIC_TARGET_REPLACED');
  const located=native.ok(['bundle','locate']);if(located.home!=='local'||located.locator?.kind!=='local-path'||located.locator.path!==root)fail('CIVIC_LOCAL_ONLY');
 };
 await check();return {root,native,check};
}
async function destination(file,root){
 if(!string(file)||!path.isAbsolute(file))fail('CIVIC_PLAN_DESTINATION');
 const parent=await realpath(path.dirname(file)),stat=await lstat(parent,{bigint:true});
 if(!stat.isDirectory())fail('CIVIC_PLAN_DESTINATION');
 const target=path.join(parent,path.basename(file));
 const state=path.join(await realpath(homedir()),'.superbee-state');
 const physicalState=await realpath(state).catch(()=>state);
 if(within(root,target)||within(state,target)||within(physicalState,target))fail('CIVIC_PLAN_DESTINATION');
 if(await lstat(target).then(()=>true,error=>{if(error.code==='ENOENT')return false;throw error;}))fail('CIVIC_PLAN_DESTINATION_EXISTS');
 const check=async()=>{const current=await lstat(parent,{bigint:true});if(await realpath(path.dirname(file))!==parent||!current.isDirectory()||current.dev!==stat.dev||current.ino!==stat.ino)fail('CIVIC_PLAN_PARENT_CHANGED');};
 return {target,check};
}
export function runInput(receipt){
 if(!object(receipt)||receipt.status!=='bound'||receipt.operation!=='local.civic.prepare-text.v1'||!string(receipt.binding,200)||(typeof receipt.digest!=='string'||!/^sha256:[a-f0-9]{64}$/.test(receipt.digest))||!object(receipt.expectedInputs)||Object.keys(receipt.expectedInputs).sort().join('|')!=='basis|pdf|text'||Object.values(receipt.expectedInputs).some(x=>typeof x!=='string'||!/^sha256:[a-f0-9]{64}$/.test(x)))fail('CIVIC_PLAN_BINDING_RECEIPT');
 // Caller-supplied receipt projection, not receipt authentication or authority to execute.
 return {expectedInputs:receipt.expectedInputs,settings:{}};
}
export async function fromBinding({cli='superbee',bundle,bindingFile,runFile}){
 const selection=await selected(cli,bundle),dest=await destination(runFile,selection.root);
 let receipt;try{receipt=JSON.parse(utf8(await bounded(bindingFile,65536)));}catch(error){if(error.message?.startsWith('CIVIC_'))throw error;fail('CIVIC_PLAN_BINDING_RECEIPT');}
 const input=runInput(receipt);await selection.check();await dest.check();
 await writeFile(dest.target,json(input),{flag:'wx',mode:0o600});
 return {schema:'civic-run-input-plan/v1',runInput:dest.target,authority:'caller-supplied binding receipt; native execution still admits exact inputs',bundleWrites:0};
}
export async function planSupplied(config){
 const {cli='superbee',bundle,sourceId,pdfFile,textFile,documentId,sourceUrl,capturedAt,meetingDate,title,recordKind,sessionKind,extractionStatus,pageCount,extractionLabel,outDir,sourceLabel,statusNote}=config;
 if(!string(sourceId,220)||!/^civic-sources\/[a-z0-9][a-z0-9._-]{0,200}$/.test(sourceId)||!string(extractionLabel,200)||!string(extractionStatus,100))fail('CIVIC_PLAN_SELECTION');
 const selection=await selected(cli,bundle),{native}=selection,dest=await destination(outDir,selection.root);
 const source=await native.read(sourceId),kind=await native.read('conventions/civic-record');
 if(!source||kind?.governs!=='Civic Record'||kind.path!=='civic-records/')fail('CIVIC_PLAN_PREREQUISITE');
 const registry=buildKindRegistry([{id:kind.id,frontmatter:kind,body:kind.body}]),definition=registry.kinds.get('Civic Record');
 if(!definition||registry.warnings.length)fail('CIVIC_PLAN_PREREQUISITE');
 const pdf=await bounded(pdfFile,8*1024*1024),text=await bounded(textFile,256*1024);utf8(text);
 if(!pdf.subarray(0,5).equals(Buffer.from('%PDF-')))fail('CIVIC_PLAN_PDF_HEADER');
 const entry={documentId,pdfFile:await realpath(pdfFile),pdfSha256:hash(pdf),sourceUrl,capturedAt,title,bodyName:source.body_name,meetingDate,recordKind,sessionKind,extractionStatus,pageCount};
 if(sourceLabel!==undefined)entry.sourceLabel=sourceLabel;if(statusNote!==undefined)entry.statusNote=statusNote;
 const wanted=captureProjection(entry,source);
 if(validateAgainstKind({id:wanted.id,frontmatter:{type:wanted.type,...wanted.fields},body:wanted.body},definition).length)fail('CIVIC_PLAN_METADATA');
 const basis={v:1,jurisdictionKey:source.jurisdiction_key,documentId,recordId:wanted.id,sourceUrl,pdfSha256:entry.pdfSha256,textSha256:hash(text),expectedPages:pageCount,extractionLabel};
 const files={capture:path.join(dest.target,'captures.json'),basis:path.join(dest.target,'basis.json'),resources:path.join(dest.target,'resources.json'),evidence:path.join(dest.target,'supplied-evidence.json')};
 const operationOutput=path.join(dest.target,'operation-output');
 const resources={resources:{pdf:{path:entry.pdfFile,logicalRef:documentId+'/pdf'},text:{path:await realpath(textFile),logicalRef:documentId+'/text'},basis:{path:files.basis,logicalRef:documentId+'/basis'}},tools:{},outputRoot:operationOutput,profile:'synthetic-v1'};
 const evidence={schema:'civic-supplied-file-evidence/v1',recordId:wanted.id,source:{id:source.id,version:source.head_version},kind:{id:kind.id,version:kind.head_version},pdf:{path:entry.pdfFile,bytes:pdf.length,sha256:entry.pdfSha256},text:{path:resources.resources.text.path,bytes:text.length,sha256:basis.textSha256},callerAssertions:{sourceUrl,capturedAt,meetingDate,pageCount,recordKind,sessionKind,extractionStatus,extractionLabel},httpObservation:'not_observed',extractionAssociation:'caller_asserted',extractorExecution:'not_observed',coverage:'selected-only-unknown-tail'};
 const outputs=[[files.capture,{schema:'civic-captured-records/v1',sourceId,captureBasis:'operator-supplied-files',coverage:'selected-only-unknown-tail',entries:[entry]}],[files.basis,basis],[files.resources,resources],[files.evidence,evidence]];
 await selection.check();if(!await native.read(source.id,source.head_version)||!await native.read(kind.id,kind.head_version))fail('CIVIC_PREREQUISITE_CHANGED');await dest.check();
 const emitted=[];
 try{await mkdir(dest.target,{mode:0o700});await mkdir(operationOutput,{mode:0o700});for(const [file,value]of outputs){await writeFile(file,json(value),{flag:'wx',mode:0o600});emitted.push(file);}}
 catch{const error=Error('CIVIC_PLAN_OUTPUT_INCOMPLETE');error.receipt={schema:'civic-supplied-plan/v1',complete:false,emitted,bundleWrites:0,error:error.message};throw error;}
 return {schema:'civic-supplied-plan/v1',complete:true,recordId:wanted.id,files,operationOutput,preparedDestination:path.join(operationOutput,'prepared.json'),bundleWrites:0,scope:'supplied files only; no capture, conversion, trust acceptance, bundle writes, sync or publication'};
}
export function parseArguments(argv){
 const names={'--cli':'cli','--bundle':'bundle','--source-id':'sourceId','--pdf':'pdfFile','--text':'textFile','--document-id':'documentId','--source-url':'sourceUrl','--captured-at':'capturedAt','--meeting-date':'meetingDate','--title':'title','--record-kind':'recordKind','--session-kind':'sessionKind','--extraction-status':'extractionStatus','--page-count':'pageCount','--extraction-label':'extractionLabel','--out-dir':'outDir','--source-label':'sourceLabel','--status-note':'statusNote','--from-binding':'bindingFile','--run-input':'runFile'},config={};
 for(let i=0;i<argv.length;i++){const name=names[argv[i]],value=argv[++i];if(!name||Object.hasOwn(config,name)||!string(value)||value.startsWith('--'))fail('CIVIC_PLAN_ARGUMENTS');config[name]=value;}
 if(!config.bundle)fail('CIVIC_PLAN_ARGUMENTS');
 if(config.bindingFile){if(!config.runFile||Object.keys(config).some(k=>!['cli','bundle','bindingFile','runFile'].includes(k)))fail('CIVIC_PLAN_ARGUMENTS');}
 else{if(config.runFile||!['sourceId','pdfFile','textFile','documentId','sourceUrl','capturedAt','meetingDate','title','recordKind','sessionKind','extractionStatus','pageCount','extractionLabel','outDir'].every(k=>config[k]))fail('CIVIC_PLAN_ARGUMENTS');if(!/^[1-9]\d{0,2}$/.test(config.pageCount))fail('CIVIC_PLAN_ARGUMENTS');config.pageCount=Number(config.pageCount);}
 return config;
}
const isMain=process.argv[1]&&(await realpath(process.argv[1]).catch(()=>null))===await realpath(fileURLToPath(import.meta.url));
if(isMain){try{const config=parseArguments(process.argv.slice(2));console.log(JSON.stringify(await (config.bindingFile?fromBinding(config):planSupplied(config))));}catch(error){console.log(JSON.stringify(error.receipt??{error:/^CIVIC_[A-Z0-9_]+$/.test(error.message)?error.message:'CIVIC_PLAN_FAILED'}));process.exitCode=1;}}
