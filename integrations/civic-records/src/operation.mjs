/** Experimental captured-PDF/text preparation. No network, tool execution or bundle mutation. */
import {readFile,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
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
 const text=utf8(textBytes).replace(/\r\n?/g,'\n');const pages=text.split('\f');
 if(pages.length&&!pages.at(-1).trim())pages.pop();
 if(pages.length!==basis.expectedPages||pages.some(p=>p.replace(/\s/g,'').length<40||/[\u0000\ufffd]/.test(p)))refuse('CIVIC_TEXT_REVIEW_REQUIRED');
  const markdown=['# Complete supplied extracted text\n',
  'Local/private research. Original wording and source errors retained. This is caller-associated extracted text, not independently verified PDF transcription.\n',
  `[Original PDF](<${basis.sourceUrl}>)\n`,`[extracted from](../${basis.recordId}.md)\n`,
  ...pages.map((page,index)=>{const length=[...page.matchAll(/`+/g)].reduce((max,x)=>Math.max(max,x[0].length+1),3),fence='`'.repeat(length);return `## Page ${index+1}\n\n[Official source page](<${basis.sourceUrl}#page=${index+1}>)\n\n${fence}text\n${page}${page.endsWith('\n')?'':'\n'}${fence}\n`;})
 ].join('\n');
 signal?.throwIfAborted();
 return {schema:'civic-prepared-text/v1',formatVersion:FORMAT,jurisdictionKey:basis.jurisdictionKey,documentId:basis.documentId,recordId:basis.recordId,sourceUrl:basis.sourceUrl,pdfSha256:basis.pdfSha256,textSha256:basis.textSha256,markdownSha256:sha(markdown),pageCount:pages.length,extractionLabel:basis.extractionLabel,extractionAssociation:'caller_asserted',extractorExecution:'not_observed',accessScope:'local-private-research',markdown};
}
export function createLocalCapabilities({port,resources}){
 return [{...descriptor,execute:async(input,context)=>{
  const prepared=await prepareCapturedText(resources,input,context);await port.writeJson('prepared-civic-text.json',prepared);
  return {formatVersion:FORMAT,pageCount:prepared.pageCount,pdfSha256:prepared.pdfSha256,textSha256:prepared.textSha256,markdownSha256:prepared.markdownSha256,extractionAssociation:prepared.extractionAssociation,extractorExecution:prepared.extractorExecution,outputs:[{role:'prepared',path:'prepared-civic-text.json',mimeType:'application/json'}]};
 }}];
}
