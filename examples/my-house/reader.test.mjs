import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {relativeHref} from '@superbee/core';
import {assessMaintenance,assessMoney} from './reader.mjs';
const fixture=JSON.parse(await readFile(new URL('./fixture.json',import.meta.url),'utf8'));
const policy=JSON.parse(await readFile(new URL('./currency-policy.json',import.meta.url),'utf8'));
const copy=()=>structuredClone(fixture.documents);
const money=(docs,scope=fixture.scope)=>assessMoney(docs,{scope,policy});
const find=(docs,id)=>docs.find(d=>d.id.endsWith('/'+id));
const link=(d,label,id)=>{d.body+=`\n\n[${label}](${relativeHref(d.id,id)})`;};
const group=r=>r.groups.find(g=>g.currency==='USD');
const stage=name=>copy().filter(d=>d.frontmatter.type!=='My House Money Record'||fixture.stages[name].includes(d.id));

test('staged financial fact families preserve quote/order/invoice/cash distinctions',()=>{
 const expected={quotes:['0','0','0',null],authorized:['110000','0','0',null],invoiced:['112000','112000','0','112000'],partial:['112000','112000','40000','72000'],mistyped:['112000','112000','110000','2000'],corrected:['112000','112000','112000','0'],refunded:['112000','107000','107000','0']};
 for(const[name,values]of Object.entries(expected)){const r=money(stage(name));assert.equal(r.status,'assessed',JSON.stringify(r.unresolved));const g=group(r);assert.deepEqual([g.totals.committed,g.totals.net_invoiced,g.totals.net_spent,g.invoices[0]?.outstanding??null],values);assert.equal(g.totals.budget,'150000');}
});
test('unallocated deposit changes cash but cannot settle another invoice',()=>{
 const docs=stage('partial'), deposit=structuredClone(find(docs,'p1'));deposit.id='my-house/money/deposit';deposit.frontmatter.amount_minor=10000;deposit.frontmatter.source_fact_key='fictional-deposit';deposit.frontmatter.allocation_status='unallocated';deposit.body=deposit.body.replace(/\[settles invoice\]\([^)]*\)/,'');docs.push(deposit);
 const g=group(money(docs));assert.equal(g.totals.gross_paid,'50000');assert.equal(g.totals.unallocated_paid,'10000');assert.equal(g.invoices[0].outstanding,'72000');
});
test('refund cash and invoice effects are independent and unknown effect withholds balance',()=>{
 const docs=copy();delete find(docs,'rf1').frontmatter.refund_allocation_effect;
 const r=money(docs),g=group(r);assert.equal(g.totals.net_spent,'107000');assert.equal(g.invoices[0].outstanding,null);assert.ok(r.unresolved.some(x=>x.code==='REFUND_EFFECT_UNKNOWN'));
});
test('malformed payment is an unresolved dependent fact, not proof of no payment',()=>{
 const docs=stage('partial');find(docs,'p1').frontmatter.amount_minor=-1;
 const r=money(docs);assert.equal(r.status,'partial');assert.equal(group(r).invoices[0].outstanding,null);
});
test('zero, three-decimal precision and BigInt aggregation never assume cents',()=>{
 const docs=stage('quotes');for(const d of docs.filter(d=>d.frontmatter.type==='My House Money Record')){d.frontmatter.currency='KWD';d.frontmatter.currency_scale=3;d.frontmatter.amount_minor=0;delete d.frontmatter.line_items;}
 const r=money(docs);assert.equal(r.groups[0].currency,'KWD');assert.equal(r.groups[0].totals.budget,'0');assert.equal(r.status,'assessed');
 const usd=stage('authorized');find(usd,'c1').frontmatter.amount_minor=Number.MAX_SAFE_INTEGER;const second=structuredClone(find(usd,'c1'));second.id='my-house/money/order2';second.frontmatter.source_fact_key='fictional-second-order';usd.push(second);
 assert.equal(group(money(usd)).totals.committed,'18014398509481982');
});
test('wrong currency policy and duplicate independent fact keys do not enter totals',()=>{
 const docs=copy();find(docs,'p1').frontmatter.currency_scale=0;
 assert.ok(money(docs).unresolved.some(x=>x.id.endsWith('/p1')));
 const dupe=copy(),newDoc=structuredClone(find(dupe,'i1'));newDoc.id='my-house/money/duplicate-invoice';dupe.push(newDoc);const r=money(dupe);assert.ok(r.unresolved.some(x=>x.code==='DUPLICATE_MONEY_FACT'));assert.equal(group(r).totals.net_invoiced,'0');
});
test('replacement forks never choose a later timestamp as winner',()=>{
 const docs=copy(),fork=structuredClone(find(docs,'p2r'));fork.id='my-house/money/p2fork';docs.push(fork);const r=money(docs);assert.ok(r.unresolved.some(x=>x.code==='REPLACEMENT_FORK'));assert.equal(group(r).invoices[0].outstanding,null);
});
test('Home membership uses stable project attribution, dedupes family, excludes project budgets',()=>{
 const r=money(copy(),fixture.home_scope),g=group(r);assert.equal(g.totals.net_spent,'107000');assert.equal(g.totals.budget,null);assert.equal(g.budgets.length,1);
 const docs=copy();link(find(docs,'pr02'),'home','my-house/homes/h01');const bad=money(docs,fixture.home_scope);assert.equal(bad.status,'partial');assert.equal(bad.groups.length,0);
});
test('line rows are inspected but header counted only once',()=>{
 const docs=copy();find(docs,'i1').frontmatter.line_items[0].amount_minor=1;const r=money(docs);assert.ok(r.warnings.some(x=>x.code==='BREAKDOWN_INCOMPLETE'));assert.equal(group(r).totals.net_invoiced,'107000');
});
test('maintenance records historical location and explicit manual date without scheduling',()=>{
 const docs=copy(),r=assessMaintenance(docs,fixture.plan_id);assert.equal(r.status,'assessed');assert.equal(r.last_completion.id,'my-house/services/s01');assert.equal(r.next_recorded_date.date,'2026-12-01');assert.equal(r.last_completion.location.id,'my-house/homes/h01');
 find(docs,'a01').body='[at home](../homes/h02.md)';assert.equal(assessMaintenance(docs,fixture.plan_id).last_completion.location.id,'my-house/homes/h01');
});
test('Plan-specific work, subject agreement and unknown dates restrict derived answers',()=>{
 const docs=copy();find(docs,'s01').frontmatter.plan_result='not_satisfied';assert.equal(assessMaintenance(docs,fixture.plan_id).last_completion,null);
 const unknown=copy();delete find(unknown,'s01').frontmatter.occurred_on;const r=assessMaintenance(unknown,fixture.plan_id);assert.equal(r.last_completion,null);assert.equal(r.qualifying.length,1);assert.ok(r.unresolved.some(x=>x.code==='UNDATED_COMPLETION'));
 const wrong=copy();find(wrong,'s01').body=find(wrong,'s01').body.replace('../assets/a01.md','../assets/a02.md');assert.ok(assessMaintenance(wrong,fixture.plan_id).unresolved.some(x=>x.code==='SERVICE_PLAN_SUBJECT'));
});
test('incomplete override is unresolved and never silently falls back',()=>{
 const docs=copy();find(docs,'p01').frontmatter.override_due_on='2026-12-02';const r=assessMaintenance(docs,fixture.plan_id);assert.equal(r.next_recorded_date,null);assert.ok(r.unresolved.some(x=>x.code==='OVERRIDE_UNRESOLVED'));
});

test('disputed payment and ambiguous primary subject cannot yield an apparently clean balance',()=>{
 const disputed=stage('partial');find(disputed,'p1').frontmatter.entry_status='disputed';
 const r=money(disputed);assert.equal(r.status,'partial');assert.equal(group(r).invoices[0].outstanding,null);
 const ambiguous=copy();link(find(ambiguous,'p1'),'home','my-house/homes/h02');
 const a=money(ambiguous);assert.equal(a.status,'partial');assert.ok(a.unresolved.some(x=>x.id.endsWith('/p1')&&x.code==='SCOPE_UNRESOLVED'));assert.equal(group(a).invoices[0].outstanding,null);
});

test('void needs an explicit reason rather than silently removing an asserted payment',()=>{
 const docs=stage('partial');find(docs,'p1').frontmatter.entry_status='void';
 const r=money(docs);assert.equal(r.status,'partial');assert.ok(r.unresolved.some(x=>x.code==='VOID_REASON_UNKNOWN'));assert.equal(group(r).invoices[0].outstanding,null);
});
