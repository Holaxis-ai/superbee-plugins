import test from 'node:test';import assert from 'node:assert/strict';import {createHash}from'node:crypto';
import {projection}from'../../../examples/civic-records/import-prepared.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const p={schema:'civic-prepared-text/v1',formatVersion:'civic-layout-markdown-v1',jurisdictionKey:'synthetic-town',documentId:'1',recordId:'civic-records/synthetic-1',sourceUrl:'https://example.org/1.pdf',pdfSha256:'a'.repeat(64),textSha256:'b'.repeat(64),markdownSha256:hash('Synthetic complete supplied text.\n'),pageCount:1,extractionLabel:'caller supplied, no converter ran',extractionAssociation:'caller_asserted',extractorExecution:'not_observed',accessScope:'local-private-research',markdown:'Synthetic complete supplied text.\n'};
const record={id:p.recordId,type:'Civic Record',title:'Synthetic minutes',jurisdiction_key:p.jurisdictionKey,provider_document_id:p.documentId,content_sha256:p.pdfSha256,source_url:p.sourceUrl,page_count:1};
const at='2026-01-03T00:00:00.000Z';
test('projection is stable, exact-source-bound and keeps interpretation out of text writes',()=>{
 const a=projection(p,record,at);assert.deepEqual(a,projection({...p},record,at));assert.equal(a.fields.text_sha256,hash(a.body));assert.match(a.fields.extraction_note,/converter execution not observed/);assert.equal(a.fields.approval_status,undefined);assert.equal(a.fields.formatter_version,p.formatVersion);assert.equal(a.fields.input_text_sha256,p.textSha256);assert.equal(a.fields.extraction_association,'caller_asserted');assert.equal(a.fields.extractor_execution,'not_observed');
 const other={...p,recordId:'civic-records/other-town'};assert.notEqual(projection(other,{...record,id:other.recordId},at).id,a.id);
 assert.notEqual(projection({...p,extractionLabel:'another caller label'},record,at).id,a.id);
});
for(const [label,change]of Object.entries({extra:{privilege:'write'},digest:{markdownSha256:'c'.repeat(64)},execution:{extractorExecution:'observed'},association:{extractionAssociation:'host_observed'},scope:{accessScope:'public'},format:{formatVersion:'unknown'},root:{recordId:'docs/bundle'},url:{sourceUrl:'https://user:password@example.org/1.pdf'},page:{pageCount:0},controls:{extractionLabel:'a\nb'},body:{markdown:'changed\n'},null:{markdown:null}}))test('refuses '+label,()=>assert.throws(()=>projection({...p,...change},record,at)));
test('source mismatch, absent source and ambiguous date refuse',()=>{assert.throws(()=>projection(p,{...record,content_sha256:'d'.repeat(64)},at));assert.throws(()=>projection(p,record,'2026-01-03'));});
