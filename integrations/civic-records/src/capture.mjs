/** Portable captured-input processing. Network, tool identity and persistence remain host-owned. */
import {parse} from 'parse5';
import {open} from 'node:fs/promises';
import {constants} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
const fail=code=>{throw Error(code);};
const sha=x=>createHash('sha256').update(x).digest('hex');
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const closed=(x,keys,code)=>{if(!obj(x)||Object.keys(x).sort().join('|')!==[...keys].sort().join('|'))fail(code);};
const text=(x,n=200)=>typeof x==='string'&&x.length>0&&x.length<=n&&!/[\x00-\x1f\x7f]/.test(x);
function url(value){
 let u;try{u=new URL(value);}catch{fail('CIVIC_CAPTURE_URL');}
 if(!text(value,2000)||u.protocol!=='https:'||u.username||u.password||u.hash||u.href!==value)fail('CIVIC_CAPTURE_URL');
 return u;
}
async function captured(resource,max){
 if(!obj(resource)||!path.isAbsolute(resource.path??'')||!/^sha256:[a-f0-9]{64}$/.test(resource.sha256??''))fail('CIVIC_CAPTURE_RESOURCE');
 let f;try{
  f=await open(resource.path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
  const s=await f.stat();if(!s.isFile()||s.nlink!==1||s.size<1||s.size>max)fail('CIVIC_CAPTURE_RESOURCE');
  const b=Buffer.alloc(max+1);let n=0;while(n<b.length){const r=await f.read(b,n,b.length-n,null);if(!r.bytesRead)break;n+=r.bytesRead;}
  const bytes=b.subarray(0,n);if(n>max||'sha256:'+sha(bytes)!==resource.sha256)fail('CIVIC_CAPTURE_CHANGED');return bytes;
 }finally{await f?.close();}
}
const utf8=b=>{try{return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(b);}catch{fail('CIVIC_CAPTURE_UTF8');}};
async function basis(resource){try{return JSON.parse(utf8(await captured(resource,16384)));}catch(e){if(e.message?.startsWith('CIVIC_'))throw e;fail('CIVIC_CAPTURE_BASIS_JSON');}}
const empty=input=>closed(input,[],'CIVIC_CAPTURE_SETTINGS');
function capability(name,id,description){return {name,implementationId:id,description,inputSchema:{type:'object',additionalProperties:false,required:[],properties:{}},annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:false},maximumOutputBytes:65536};}
export const discoveryDescriptor=capability('civic_discover_pdfs','civic-discover-pdfs.v1','Discover bounded same-origin PDF candidates from a captured listing. No network fetch, archive completeness, deletion inference or source authenticity claim.');
export const extractionDescriptor=capability('civic_extract_pdf','civic-extract-pdf.v1','Extract a captured PDF through an explicitly bound pdftotext tool. No direct process spawn, OCR, bundle writes or publication.');

export async function discoverCapturedPdfs(resources,input,{signal}={}){
 empty(input);closed(resources,['listing','basis'],'CIVIC_CAPTURE_ROLES');signal?.throwIfAborted();
 const b=await basis(resources.basis);closed(b,['v','registryUrl','documentPathPrefix','maxDocuments'],'CIVIC_DISCOVERY_BASIS');
 const registry=url(b.registryUrl);
 if(b.v!==1||!text(b.documentPathPrefix,500)||!/^\/(?:[A-Za-z0-9_-]+\/)+$/.test(b.documentPathPrefix)||!Number.isSafeInteger(b.maxDocuments)||b.maxDocuments<1||b.maxDocuments>100)fail('CIVIC_DISCOVERY_BASIS');
 const html=await captured(resources.listing,1024*1024),tree=parse(utf8(html)),seen=new Map(),nodes=[tree];
 while(nodes.length){
  const n=nodes.pop();if(n.childNodes)nodes.push(...n.childNodes);
  if(n.tagName!=='a')continue;const href=n.attrs?.find(a=>a.name==='href')?.value;if(!href||href.length>2000||/[\x00-\x20\x7f]/.test(href))continue;
  let u;try{u=new URL(href,registry);}catch{continue;}
  if(!u.pathname.startsWith(b.documentPathPrefix)||!u.pathname.toLowerCase().endsWith('.pdf'))continue;
  if(u.origin!==registry.origin||u.username||u.password||u.search||u.hash||u.pathname.includes('%')||u.pathname.includes('//'))fail('CIVIC_DISCOVERY_OUTSIDE_SCOPE');
  // Only real anchor hrefs count: scripts, comments, base elements and embedded template content do not.
  const labelNodes=[n],words=[];while(labelNodes.length){const child=labelNodes.pop();if(child.nodeName==='#text')words.push(child.value);else if(!['script','style'].includes(child.tagName)&&child.childNodes)labelNodes.push(...[...child.childNodes].reverse());}
  const label=words.join(' ').replace(/\s+/g,' ').trim().slice(0,500);
  const candidate={sourceUrl:u.href,documentId:u.pathname.slice(b.documentPathPrefix.length),label:label||null};
  const old=seen.get(u.href);if(!old||String(candidate.label??'')<String(old.label??''))seen.set(u.href,candidate);
 }
 signal?.throwIfAborted();const all=[...seen.values()].sort((a,b)=>a.sourceUrl.localeCompare(b.sourceUrl,'en'));
 return {schema:'civic-discovered-pdfs/v1',registryUrl:registry.href,listingSha256:sha(html),documentPathPrefix:b.documentPathPrefix,coverage:'selected-only-unknown-tail',httpObservation:'not_observed',observedCandidates:all.length,truncated:all.length>b.maxDocuments,candidates:all.slice(0,b.maxDocuments),deletionInference:false};
}

export async function extractCapturedPdf({port,resources,invocation},input,{signal}={}){
 empty(input);closed(resources,['pdf','basis'],'CIVIC_CAPTURE_ROLES');signal?.throwIfAborted();
 const b=await basis(resources.basis);closed(b,['v','jurisdictionKey','documentId','recordId','sourceUrl'],'CIVIC_EXTRACTION_BASIS');
 if(b.v!==1||!text(b.jurisdictionKey,128)||!text(b.documentId,128)||!/^civic-records\/[a-z0-9][a-z0-9._-]{0,200}$/.test(b.recordId??''))fail('CIVIC_EXTRACTION_BASIS');url(b.sourceUrl);
 if(!text(invocation?.id,200)||!path.isAbsolute(invocation?.outputDirectory??''))fail('CIVIC_EXTRACTION_INVOCATION');
 const pdf=await captured(resources.pdf,8*1024*1024);if(!pdf.subarray(0,5).equals(Buffer.from('%PDF-')))fail('CIVIC_PDF_HEADER');
 const output=path.join(invocation.outputDirectory,'extracted.txt');
 // No caller arguments, executable paths or alternate converter: the native port admits the bound tool.
 const result=await port.runTool({tool:'pdftotext',argv:['-layout','-enc','UTF-8',resources.pdf.path,output],signal});
 if(!obj(result)||result.exitCode!==0)fail('CIVIC_CONVERTER_FAILED');
 if(typeof result.stderr!=='string'||result.stderr.trim())fail('CIVIC_CONVERTER_DIAGNOSTIC');
 // The native host owns output containment/limits. Recheck regular bytes and retain the observed digest.
 let f;let raw;try{f=await open(output,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);const s=await f.stat();if(!s.isFile()||s.nlink!==1||s.size<1||s.size>256*1024)fail('CIVIC_TEXT_REVIEW_REQUIRED');const bytes=Buffer.alloc(256*1024+1);let n=0;while(n<bytes.length){const r=await f.read(bytes,n,bytes.length-n,null);if(!r.bytesRead)break;n+=r.bytesRead;}if(n>256*1024)fail('CIVIC_TEXT_REVIEW_REQUIRED');raw=bytes.subarray(0,n);}finally{await f?.close();}
 const content=utf8(raw),pages=content.replace(/\r\n?/g,'\n').split('\f');
 if(pages.at(-1)?.trim()==='')pages.pop();
 if(pages.length<1||pages.length>250||pages.some(p=>p.replace(/\s/g,'').length<40||/[\x00\ufffd]/.test(p)))fail('CIVIC_TEXT_REVIEW_REQUIRED');
 await captured(resources.pdf,8*1024*1024);await captured(resources.basis,16384);signal?.throwIfAborted();
 const receipt={schema:'civic-extracted-text/v1',...b,text:content,pdfSha256:sha(pdf),textSha256:sha(raw),pageCount:pages.length,invocationId:invocation.id,extractorExecution:'observed_native_tool_call',extractionAssociation:'tool_input_output',tool:'pdftotext',arguments:['-layout','-enc','UTF-8','<captured-pdf>','<invocation-output>/extracted.txt'],toolIdentityAuthority:'native accepted tool binding and invocation receipt; this JSON is not authentication',httpObservation:'not_observed',sourceUrlAuthority:'caller_asserted',transcriptionVerified:false,ocr:'not_attempted'};
 await port.writeJson('extraction.json',receipt);
 return {pdfSha256:receipt.pdfSha256,textSha256:receipt.textSha256,pageCount:receipt.pageCount,extractorExecution:receipt.extractorExecution,outputs:[{role:'text',path:'extracted.txt',mimeType:'text/plain'},{role:'extraction',path:'extraction.json',mimeType:'application/json'}]};
}
