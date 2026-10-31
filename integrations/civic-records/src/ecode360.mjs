/** eCode360's observed public document-list representation. Pure captured-data projection. */
import {createHash} from 'node:crypto';
import {readCapturedBytes,readCapturedBasis,capturedUtf8} from './capture.mjs';
const fail=code=>{throw Error(code);};
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const positive=x=>Number.isSafeInteger(x)&&x>0;
const text=(x,n)=>typeof x==='string'&&x.length>0&&x.length<=n&&!/[\x00-\x1f\x7f]/.test(x);
const exact=(x,keys)=>obj(x)&&Object.keys(x).sort().join('|')===[...keys].sort().join('|');
export const ecodeDescriptor={name:'civic_discover_ecode360',implementationId:'civic-discover-ecode360.v1',description:'Project a captured eCode360 public document-list response into finite selected PDF candidates. No network, identifier enumeration, private records, archive completeness or approval claim.',inputSchema:{type:'object',additionalProperties:false,required:[],properties:{}},annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:false},maximumOutputBytes:65536};
export async function discoverEcode360(resources,input,{signal}={}){
 if(!exact(input,[])||!exact(resources,['listing','basis']))fail('CIVIC_ECODE_ARGUMENTS');signal?.throwIfAborted();
 const b=await readCapturedBasis(resources.basis);
 if(!exact(b,['v','registryUrl','listingUrl','jurisdictionCode','typeTitle','typeId','categoryId','year','maxDocuments'])||b.v!==1||!text(b.jurisdictionCode,6)||!/^([A-Z]{2}[0-9]{4})$/.test(b.jurisdictionCode)||!text(b.typeTitle,100)||/[\/\\?#]/.test(b.typeTitle)||!positive(b.typeId)||!positive(b.categoryId)||!Number.isSafeInteger(b.year)||b.year<1800||b.year>9999||!positive(b.maxDocuments)||b.maxDocuments>100)fail('CIVIC_ECODE_BASIS');
 // URL forms were observed in the official page/client. IDs must also exist in the captured response.
 if(b.registryUrl!==`https://ecode360.com/${b.jurisdictionCode}/documents/${encodeURIComponent(b.typeTitle.replace(/ /g,'_'))}`||b.listingUrl!==`https://ecode360.com/api/${b.jurisdictionCode}/pub-doc/type/${b.typeId}`)fail('CIVIC_ECODE_SOURCE_SCOPE');
 const raw=await readCapturedBytes(resources.listing,4*1024*1024);let list;
 try{list=JSON.parse(capturedUtf8(raw));}catch(e){if(e.message?.startsWith('CIVIC_'))throw e;fail('CIVIC_ECODE_JSON');}
 if(!obj(list)||!Array.isArray(list.documents)||list.documents.length>10000||!obj(list.type)||list.type.id!==b.typeId||list.type.custId!==b.jurisdictionCode||list.type.title!==b.typeTitle)fail('CIVIC_ECODE_RESPONSE');
 const selected=new Map(),observed=new Map();let observedPublicPdfs=0;
 const selectedIds=new Set(list.documents.filter(row=>obj(row)&&row.categoryId===b.categoryId).map(row=>row.id));
 for(const row of list.documents){
  if(!obj(row)||!selectedIds.has(row.id))continue;
  // Compare source-relevant metadata before filtering: a private or out-of-year repeat
  // must not silently leave an earlier public row eligible. Never project private fields.
  if(!positive(row.id))fail('CIVIC_ECODE_RECORD');
  const identity=JSON.stringify([row.title,row.date,row.private,row.categoryId,row.category?.id,row.category?.custId,row.category?.typeId,row.category?.typeTitle,row.category?.private,row.corrupt,row.type,row.origExtension,row.extension,row.url,row.category?.title]);
  if(observed.has(row.id)&&observed.get(row.id)!==identity)fail('CIVIC_ECODE_DUPLICATE_CONFLICT');
  observed.set(row.id,identity);
  if(row.categoryId!==b.categoryId)continue;
  if(!obj(row.category)||row.category.id!==b.categoryId||row.category.custId!==b.jurisdictionCode||row.category.typeId!==b.typeId||row.category.typeTitle!==b.typeTitle||!text(row.category.title,200))fail('CIVIC_ECODE_CATEGORY_SCOPE');
  if(row.private!==false||row.category.private!==false||row.corrupt!==false||row.type!=='DOCUMENT'||row.origExtension!=='pdf'||row.extension!=='pdf'||row.url!==null)continue;
  if(!positive(row.id)||!text(row.title,500))fail('CIVIC_ECODE_RECORD');
  if(typeof row.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||!Number.isFinite(Date.parse(row.date+'T00:00:00.000Z'))||new Date(row.date+'T00:00:00.000Z').toISOString().slice(0,10)!==row.date)continue;
  observedPublicPdfs++;
  if(Number(row.date.slice(0,4))!==b.year)continue;
  const candidate={sourceUrl:`https://ecode360.com/${b.jurisdictionCode}/document/${row.id}.pdf`,documentId:String(row.id),label:row.title,providerDate:row.date,dateRole:'unknown',categoryId:b.categoryId,categoryTitle:row.category.title};
  if(selected.has(row.id)&&JSON.stringify(selected.get(row.id))!==JSON.stringify(candidate))fail('CIVIC_ECODE_DUPLICATE_CONFLICT');selected.set(row.id,candidate);
 }
 const candidates=[...selected.values()].sort((a,b)=>b.providerDate.localeCompare(a.providerDate,'en')||a.documentId.localeCompare(b.documentId,'en'));
 signal?.throwIfAborted();
 return {schema:'civic-discovered-pdfs/v1',provider:'ecode360',registryUrl:b.registryUrl,listingUrl:b.listingUrl,listingSha256:createHash('sha256').update(raw).digest('hex'),selection:{jurisdictionCode:b.jurisdictionCode,typeId:b.typeId,categoryId:b.categoryId,year:b.year},coverage:'selected-only-unknown-tail',httpObservation:'not_observed',observedRows:list.documents.length,observedPublicPdfs,observedCandidates:candidates.length,truncated:candidates.length>b.maxDocuments,candidates:candidates.slice(0,b.maxDocuments),deletionInference:false};
}
