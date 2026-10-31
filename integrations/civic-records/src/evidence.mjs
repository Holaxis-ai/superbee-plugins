/** Undated civic evidence preparation. No fetch, tool execution, record/blob writes or sync. */
import {createHash} from 'node:crypto';
import {readCapturedBytes,readCapturedBasis,capturedUtf8} from './capture.mjs';
import {layoutMarkdown} from './layout.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const fail=code=>{throw Error(code);};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const exact=(x,keys)=>object(x)&&Object.keys(x).sort().join('|')===[...keys].sort().join('|');
const text=(x,max)=>typeof x==='string'&&x.length>0&&x.length<=max&&!/[\x00-\x1f\x7f]/.test(x);
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export const EVIDENCE_FORMAT='civic-evidence-layout-v1';
export const originalBlobKey=pdfSha256=>`evidence/source-bytes/${pdfSha256}.pdf`;
export const originalEvidenceId=p=>'civic-evidence/original-v1-'+hash(['civic-evidence-original-v1',p.sourceId,p.jurisdictionKey,p.documentId,p.sourceUrl,p.pdfSha256].join('\n'));
export const textEvidenceId=(originalId,formatVersion,textSha256,markdownSha256)=>'civic-evidence/text-v1-'+hash(['civic-evidence-text-v1',originalId,formatVersion,textSha256,markdownSha256].join('\n'));
export const evidenceDescriptor={name:'civic_prepare_evidence',implementationId:'civic-prepare-evidence.v1',description:'Prepare source-linked original-byte metadata and complete page-linked Markdown for existing Civic Evidence. Dates remain absent. Supplied associations only; no network, conversion, record/blob writes or publication.',inputSchema:{type:'object',additionalProperties:false,required:[],properties:{}},annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:false},maximumOutputBytes:65536};
export async function prepareCapturedEvidence(resources,input,{signal}={}){
 if(!exact(input,[])||!exact(resources,['pdf','text','basis']))fail('CIVIC_EVIDENCE_ARGUMENTS');signal?.throwIfAborted();
 const b=await readCapturedBasis(resources.basis);
 if(!exact(b,['v','jurisdictionKey','documentId','sourceId','sourceUrl','title','documentKind','pdfSha256','textSha256','expectedPages'])||b.v!==1||!text(b.jurisdictionKey,128)||!text(b.documentId,128)||!text(b.title,500)||!/^civic-sources\/[a-z0-9][a-z0-9._-]{0,200}$/.test(b.sourceId??'')||!['minutes','agenda','resolution','budget','plan','presentation','project-page','news','code-history','transcript','other'].includes(b.documentKind)||!hex(b.pdfSha256)||!hex(b.textSha256)||!Number.isSafeInteger(b.expectedPages)||b.expectedPages<1||b.expectedPages>250)fail('CIVIC_EVIDENCE_BASIS');
 let u;try{u=new URL(b.sourceUrl);}catch{fail('CIVIC_EVIDENCE_URL');}
 if(!text(b.sourceUrl,2000)||u.protocol!=='https:'||u.username||u.password||u.hash||/[<>\s]/.test(b.sourceUrl)||u.href!==b.sourceUrl)fail('CIVIC_EVIDENCE_URL');
 const pdf=await readCapturedBytes(resources.pdf,8*1024*1024),rawText=await readCapturedBytes(resources.text,256*1024);
 if(!pdf.subarray(0,5).equals(Buffer.from('%PDF-'))||hash(pdf)!==b.pdfSha256||hash(rawText)!==b.textSha256)fail('CIVIC_EVIDENCE_IDENTITIES');
 const originalId=originalEvidenceId(b);
 const blobKey=originalBlobKey(b.pdfSha256);
 const originalBody=`# Supplied original representation\n\nOriginal PDF bytes are retained separately under the checked bundle key below. This metadata does not establish official authenticity, approval or a meeting date. Source URL and original-file association are caller assertions; HTTP observations and native custody receipts remain separate.\n\nSHA256: ${b.pdfSha256}\n\n[Original source](<${b.sourceUrl}>)\n\n[Retained original](../${blobKey})\n\n[from source](../${b.sourceId}.md)\n`;
 const {markdown,pageCount}=layoutMarkdown(capturedUtf8(rawText),b.expectedPages,b.sourceUrl,[`[from source](../${b.sourceId}.md)`,`[Original representation](../${originalId}.md)`]);
 const markdownSha256=hash(markdown);
 if(Buffer.byteLength(markdown)>55000)fail('CIVIC_EVIDENCE_REVIEW_REQUIRED');
 const textId=textEvidenceId(originalId,EVIDENCE_FORMAT,b.textSha256,markdownSha256);
 signal?.throwIfAborted();
 const prepared={schema:'civic-prepared-evidence/v1',formatVersion:EVIDENCE_FORMAT,jurisdictionKey:b.jurisdictionKey,documentId:b.documentId,sourceId:b.sourceId,sourceUrl:b.sourceUrl,title:b.title,documentKind:b.documentKind,pdfSha256:b.pdfSha256,textSha256:b.textSha256,pageCount,association:'caller_asserted',extractorExecution:'not_observed',accessScope:'private-research',representations:[{role:'original',id:originalId,blobKey,contentType:'application/pdf',representationSha256:b.pdfSha256,bodySha256:hash(originalBody),body:originalBody},{role:'text',id:textId,contentType:'text/markdown',representationSha256:markdownSha256,bodySha256:markdownSha256,body:markdown}]};
 if(Buffer.byteLength(JSON.stringify(prepared))>65000)fail('CIVIC_EVIDENCE_REVIEW_REQUIRED');
 return prepared;
}
