/** Experimental captured-PDF/text preparation. No network, tool execution or bundle mutation. */
import {readFile,lstat} from 'node:fs/promises';
import {discoveryDescriptor,extractionDescriptor,discoverCapturedPdfs,extractCapturedPdf} from './capture.mjs';
import {ecodeDescriptor,discoverEcode360} from './ecode360.mjs';
import {createHash} from 'node:crypto';
import {layoutMarkdown} from './layout.mjs';
import {evidenceDescriptor,prepareCapturedEvidence} from './evidence.mjs';
export const FORMAT='civic-layout-markdown-v1';
const sha=b=>createHash('sha256').update(b).digest('hex');
const refuse=code=>{throw Error(code);};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
function closed(x,keys,code){if(!object(x)||Object.keys(x).sort().join('|')!==[...keys].sort().join('|'))refuse(code);}
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
function boundedString(x,max){return typeof x==='string'&&x.length>0&&x.length<=max&&!/[\x00-\x1f\x7f]/.test(x);}
async function bytes(resource,limit){
 if(!object(resource)||typeof resource.path!=='string'||!/^sha256:[a-f0-9]{64}$/.test(resource.sha256??''))refuse('CIVIC_RESOURCE');
 const stat=await lstat(resource.path);
 if(!stat.isFile()||stat.nlink!==1||stat.size>limit)refuse('CIVIC_RESOURCE');
 const data=await readFile(resource.path);
 if(data.length>limit||'sha256:'+sha(data)!==resource.sha256)refuse('CIVIC_RESOURCE_CHANGED');
 return data;
}
function utf8(data){try{return new TextDecoder('utf-8',{fatal:true}).decode(data);}catch{refuse('CIVIC_UTF8');}}
function basisValue(x){
 closed(x,['v','jurisdictionKey','documentId','recordId','sourceUrl','pdfSha256','textSha256','expectedPages','extractionLabel'],'CIVIC_BASIS');
 if(x.v!==1||!boundedString(x.jurisdictionKey,128)||!boundedString(x.documentId,128)||!boundedString(x.extractionLabel,200)||!hex(x.pdfSha256)||!hex(x.textSha256)||!Number.isSafeInteger(x.expectedPages)||x.expectedPages<1||x.expectedPages>250)refuse('CIVIC_BASIS');
 if(typeof x.recordId!=='string'||!/^civic-records\/[a-z0-9][a-z0-9._-]{0,200}$/.test(x.recordId))refuse('CIVIC_RECORD_ID');
 let url;try{url=new URL(x.sourceUrl);}catch{refuse('CIVIC_SOURCE_URL');}
 if(!boundedString(x.sourceUrl,2000)||url.protocol!=='https:'||url.username||url.password||url.hash||/[<>\s]/.test(x.sourceUrl))refuse('CIVIC_SOURCE_URL');
 return {...x,sourceUrl:url.href};
}
export const descriptor=Object.freeze({
 name:'civic_prepare_text',implementationId:'civic-prepare-text.v1',
 description:'Prepare page-linked Markdown from explicitly captured PDF and extracted text. Caller-associated extraction only; no PDF conversion, official-authenticity claim or publication.',
 inputSchema:{type:'object',additionalProperties:false,required:[],properties:{}},
 annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:false},maximumOutputBytes:65536
});
export async function prepareCapturedText(resources,input,{signal}={}){
 closed(input,[],'CIVIC_SETTINGS');closed(resources,['pdf','text','basis'],'CIVIC_RESOURCE_ROLES');signal?.throwIfAborted();
 let basis;try{basis=basisValue(JSON.parse(utf8(await bytes(resources.basis,16384))));}catch(e){if(e.message?.startsWith('CIVIC_'))throw e;refuse('CIVIC_BASIS_JSON');}
 const pdf=await bytes(resources.pdf,8*1024*1024),textBytes=await bytes(resources.text,256*1024);
 if(!pdf.subarray(0,5).equals(Buffer.from('%PDF-')))refuse('CIVIC_PDF_HEADER');
 if(sha(pdf)!==basis.pdfSha256||sha(textBytes)!==basis.textSha256)refuse('CIVIC_ASSOCIATION_IDENTITIES');
 const {markdown,pageCount}=layoutMarkdown(utf8(textBytes),basis.expectedPages,basis.sourceUrl,[`[extracted from](../${basis.recordId}.md)`]);
 signal?.throwIfAborted();
 return {schema:'civic-prepared-text/v1',formatVersion:FORMAT,jurisdictionKey:basis.jurisdictionKey,documentId:basis.documentId,recordId:basis.recordId,sourceUrl:basis.sourceUrl,pdfSha256:basis.pdfSha256,textSha256:basis.textSha256,markdownSha256:sha(markdown),pageCount,extractionLabel:basis.extractionLabel,extractionAssociation:'caller_asserted',extractorExecution:'not_observed',accessScope:'local-private-research',markdown};
}
export function createLocalCapabilities({port,resources,invocation}){
 return [{...descriptor,execute:async(input,context)=>{
  const prepared=await prepareCapturedText(resources,input,context);await port.writeJson('prepared-civic-text.json',prepared);
  return {formatVersion:FORMAT,pageCount:prepared.pageCount,pdfSha256:prepared.pdfSha256,textSha256:prepared.textSha256,markdownSha256:prepared.markdownSha256,extractionAssociation:prepared.extractionAssociation,extractorExecution:prepared.extractorExecution,outputs:[{role:'prepared',path:'prepared-civic-text.json',mimeType:'application/json'}]};
 }}, {...discoveryDescriptor,execute:async(input,context)=>{const value=await discoverCapturedPdfs(resources,input,context);await port.writeJson('discovered-pdfs.json',value);return {observedCandidates:value.observedCandidates,coverage:value.coverage,outputs:[{role:'discovery',path:'discovered-pdfs.json',mimeType:'application/json'}]};}}, {...extractionDescriptor,execute:(input,context)=>extractCapturedPdf({port,resources,invocation},input,context)}, {...ecodeDescriptor,execute:async(input,context)=>{const value=await discoverEcode360(resources,input,context);await port.writeJson('discovered-ecode360-pdfs.json',value);return {observedCandidates:value.observedCandidates,coverage:value.coverage,outputs:[{role:'discovery',path:'discovered-ecode360-pdfs.json',mimeType:'application/json'}]};}}, {...evidenceDescriptor,execute:async(input,context)=>{const value=await prepareCapturedEvidence(resources,input,context);await port.writeJson('prepared-civic-evidence.json',value);return {pageCount:value.pageCount,outputs:[{role:'evidence',path:'prepared-civic-evidence.json',mimeType:'application/json'}]};}}];
}
