/**
 * Fictional consumer demonstrator. Pure scoped assessment of caller-supplied parsed documents.
 * Not a mutation gate, bank reconciliation service, currency source or global integrity engine.
 * Core owns Markdown/link parsing and primitive field-type predicates.
 */
import {parseLinksFromDoc, kindFieldTypeProblem, isPresent as present} from '@superbee/core';

const PREFIX = 'My House ';
const MONEY = PREFIX + 'Money Record';
const SERVICE = PREFIX + 'Service Record';
const PRIMARY = ['project', 'home', 'asset'];
const SUBJECT = ['home', 'space', 'asset'];
const ROLE = new Set(['budget', 'estimate', 'quote', 'commitment', 'invoice', 'payment', 'credit', 'refund']);
const text = value => typeof value === 'string' && value.trim().length > 0;
const typed = (type, value) => kindFieldTypeProblem(type, value) === undefined;
const sorted = values => [...values].sort();
const fm = doc => doc.frontmatter;
const targets = (doc, label) => [...new Set(parseLinksFromDoc(doc).filter(link => link.text === label).map(link => link.to))];
const issue = (id, code, detail) => ({id, code, detail});
const tuple = doc => `${fm(doc).currency}:${fm(doc).currency_scale}`;
const equalTuple = (a, b) => tuple(a) === tuple(b);
const proof = docs => docs.map(doc => ({id:doc.id, ...(doc.version ? {version:doc.version} : {})}));

function inputIndex(documents) {
  if (!Array.isArray(documents)) throw new TypeError('documents must be an array of Core parsed documents');
  const index = new Map();
  for (const doc of documents) {
    if (!doc || !text(doc.id) || !doc.frontmatter || typeof doc.body !== 'string') throw new TypeError('expected id/frontmatter/body on each document');
    if (index.has(doc.id)) throw new TypeError(`duplicate document id: ${doc.id}`);
    index.set(doc.id, doc);
  }
  return index;
}
function scopeOf(doc, labels = PRIMARY) {
  const links = labels.flatMap(kind => targets(doc, kind).map(id => ({kind, id})));
  return links.length === 1 ? links[0] : null;
}
const sameScope = (a,b) => a && b && a.kind === b.kind && a.id === b.id;
function scopeTargetProblem(scope, index) {
  if (!scope) return 'one distinct primary subject is required';
  const target = index.get(scope.id);
  const type = PREFIX + ({project:'Project',home:'Home',asset:'Asset',space:'Space'}[scope.kind]);
  return target && fm(target).type === type ? null : `subject target must be an inspected ${type}`;
}

/** Resolve explicit replacement chains; never choose a branch by a timestamp. */
function families(documents, labels, candidate, validateReplacement) {
  const docs = documents.filter(candidate), index = new Map(docs.map(d => [d.id,d]));
  const adjacency = new Map(docs.map(d => [d.id,new Set()])), edges = new Map(), problems = new Map();
  for (const doc of docs) {
    const references = labels.flatMap(label => targets(doc,label).map(id => ({label,id})));
    edges.set(doc.id,references);
    if (references.length > 1) problems.set(doc.id,'replacement must have at most one corrects/revises target');
    for (const ref of references) {
      if (!index.has(ref.id)) {problems.set(doc.id,'replacement target is missing or not a recorded fact');continue;}
      adjacency.get(doc.id).add(ref.id);adjacency.get(ref.id).add(doc.id);
      const why = validateReplacement(doc,index.get(ref.id),ref.label);
      if (why) problems.set(doc.id,why);
    }
  }
  const seen = new Set(), result = [], byMember = new Map();
  for (const doc of docs) {
    if (seen.has(doc.id)) continue;
    const ids=[], queue=[doc.id];
    while (queue.length) {const id=queue.pop();if(seen.has(id))continue;seen.add(id);ids.push(id);queue.push(...adjacency.get(id));}
    const members=ids.map(id=>index.get(id)), reasons=ids.filter(id=>problems.has(id)).map(id=>issue(id,'REPLACEMENT_INVALID',problems.get(id)));
    const replaced = new Map();
    for (const member of members) for (const ref of edges.get(member.id)) if(index.has(ref.id)) replaced.set(ref.id,(replaced.get(ref.id)??0)+1);
    if ([...replaced.values()].some(count=>count>1)) reasons.push(issue(doc.id,'REPLACEMENT_FORK','competing corrections/revisions are unresolved'));
    const tips=members.filter(d=>!replaced.has(d.id));
    if (tips.length!==1) reasons.push(issue(doc.id,'REPLACEMENT_CYCLE','a family must have one unambiguous effective record'));
    const family={id:sorted(ids)[0],members, effective:reasons.length?null:tips[0],issues:reasons};
    result.push(family);for(const member of members)byMember.set(member.id,family);
  }
  return {families:result,byMember};
}

export function assessMaintenance(documents, planId) {
  const index=inputIndex(documents), plan=index.get(planId), unresolved=[], excluded=[], qualifying=[];
  const report={assurance:'scoped-read-time-example',plan:planId,assessed:proof(documents),qualifying,excluded,unresolved,last_completion:null,next_recorded_date:null};
  if (!plan || fm(plan).type!==PREFIX+'Maintenance Plan') {unresolved.push(issue(planId,'PLAN_MISSING','inspect the Maintenance Plan first'));return report;}
  const subject=scopeOf(plan,SUBJECT), subjectProblem=scopeTargetProblem(subject,index);
  if(subjectProblem)unresolved.push(issue(planId,'PLAN_SUBJECT',subjectProblem));
  if(!text(fm(plan).procedure))unresolved.push(issue(planId,'PROCEDURE_UNKNOWN','procedure is required for a qualifying-completion conclusion'));
  const services=documents.filter(d=>fm(d).type===SERVICE);
  const resolved=families(services,['corrects'],()=>true,(a,b)=>{
    if(!text(fm(a).correction_reason))return 'a service correction needs an explicit correction_reason';
    if(!text(fm(a).work_performed))return 'a correction must describe the work';
    if(text(fm(a).source_event_key)&&text(fm(b).source_event_key)&&fm(a).source_event_key!==fm(b).source_event_key)return 'correction identity unresolved: known source_event_key values differ';
    return null;
  });
  for(const family of resolved.families){
    const relevant=family.members.some(d=>targets(d,'plan').includes(planId));if(!relevant)continue;
    if(family.issues.length){unresolved.push(...family.issues);continue;}
    const service=family.effective, fields=fm(service), plans=targets(service,'plan');
    if(plans.length!==1 || plans[0]!==planId || !sameScope(subject,scopeOf(service,SUBJECT))) {unresolved.push(issue(service.id,'SERVICE_PLAN_SUBJECT','service and linked plan must target the same single inspected subject'));continue;}
    if(subjectProblem || !text(fm(plan).procedure)) {excluded.push(issue(service.id,'PLAN_INCOMPLETE','plan cannot support a qualifying-completion conclusion'));continue;}
    if(!text(fields.work_performed) || fields.result!=='completed' || fields.plan_result!=='satisfied'){excluded.push(issue(service.id,'NOT_QUALIFYING','work must explicitly complete and satisfy this Plan procedure'));continue;}
    if(present(fields.occurred_on)&&present(fields.occurred_at)){unresolved.push(issue(service.id,'DATE_PRECISION_CONFLICT','use one occurrence date or instant'));continue;}
    if(present(fields.occurred_on)&&!typed('date',fields.occurred_on) || present(fields.occurred_at)&&!typed('datetime',fields.occurred_at)){unresolved.push(issue(service.id,'DATE_INVALID','Core rejects the supplied occurrence date/instant'));continue;}
    const where=['performed at home','performed in space'].flatMap(label=>targets(service,label).map(id=>({label,id})));
    if(where.length>1 || where.some(w=>fm(index.get(w.id)??{frontmatter:{}}).type!==PREFIX+(w.label==='performed at home'?'Home':'Space'))){unresolved.push(issue(service.id,'OCCURRENCE_LOCATION','historical occurrence location is ambiguous or target is not inspected'));continue;}
    qualifying.push({id:service.id,occurred_on:fields.occurred_on??null,occurred_at:fields.occurred_at??null,location:where[0]??null,reported_by:fields.reported_by??null,basis:fields.basis??'unknown',source_event_key:fields.source_event_key??null});
  }
  const keys=new Map();for(const q of qualifying)if(q.source_event_key){const ids=keys.get(q.source_event_key)??[];ids.push(q.id);keys.set(q.source_event_key,ids);}
  const duplicate=new Set([...keys.values()].filter(ids=>ids.length>1).flat());
  for(let i=qualifying.length-1;i>=0;i--)if(duplicate.has(qualifying[i].id)){unresolved.push(issue(qualifying[i].id,'DUPLICATE_SERVICE','unresolved source event key duplicates'));qualifying.splice(i,1);}
  const dated=qualifying.filter(q=>q.occurred_on||q.occurred_at),undated=qualifying.filter(q=>!q.occurred_on&&!q.occurred_at);
  if(undated.length)unresolved.push(issue(planId,'UNDATED_COMPLETION','completion reported with unknown date; dated latest is not established'));
  if(dated.length&&!unresolved.length){
    // Comparing date-only local calendar values with arbitrary-offset instants invents ordering.
    if(dated.some(q=>q.occurred_on)&&dated.some(q=>q.occurred_at))unresolved.push(issue(planId,'MIXED_PRECISION','date-only and instant ordering is not inferred'));
    else {const order=dated.slice().sort((a,b)=>a.occurred_on?b.occurred_on.localeCompare(a.occurred_on):Date.parse(b.occurred_at)-Date.parse(a.occurred_at));const first=order[0], ties=order.filter(q=>(q.occurred_on??Date.parse(q.occurred_at))===(first.occurred_on??Date.parse(first.occurred_at)));report.last_completion=ties.length===1?first:{date:first.occurred_on??first.occurred_at,records:ties.map(q=>q.id),order:'same supplied precision'};}
  }
  const f=fm(plan), overrideDate=present(f.override_due_on), overrideBasis=present(f.override_basis);
  if(f.plan_status==='enabled'&&f.schedule_mode==='manual_date'){
    if(overrideDate||overrideBasis){if(overrideDate&&typed('date',f.override_due_on)&&text(f.override_basis))report.next_recorded_date={date:f.override_due_on,basis:f.override_basis,source:'override',plan:planId};else unresolved.push(issue(planId,'OVERRIDE_UNRESOLVED','incomplete/invalid override is not silently ignored'));}
    else if(present(f.next_due_on)){if(typed('date',f.next_due_on))report.next_recorded_date={date:f.next_due_on,basis:f.schedule_basis??'unspecified',source:'manual_date',plan:planId};else unresolved.push(issue(planId,'DUE_DATE_INVALID','Core rejects the supplied date'));}
  }else excluded.push(issue(planId,'SCHEDULE_NOT_COMPUTED','only enabled manual-date display is supported; no reminder or cadence arithmetic'));
  report.status=unresolved.length?'partial':'assessed';return report;
}

export function assessMoney(documents,options={}) {
  if(Object.hasOwn(options,'asOf'))throw new TypeError('Historical cutoff/asOf reports are unsupported; supply the explicit selected snapshot instead.');
  const {scope,policy}=options;
  const index=inputIndex(documents);
  if(!scope || !PRIMARY.includes(scope.kind)||!text(scope.id))throw new TypeError('an explicit project/home/asset scope is required');
  const all=documents.filter(d=>fm(d).type===MONEY), unresolved=[], excluded=[], included=[], warnings=[];
  const report={assurance:'scoped-read-time-example',scope:{...scope},policy:policy?.id??null,assessed:proof(documents),included,excluded,unresolved,warnings,groups:[]};
  const requestedScopeProblem=scopeTargetProblem(scope,index);
  if(requestedScopeProblem){report.status='partial';unresolved.push(issue(scope.id,'SCOPE_TARGET_MISSING',requestedScopeProblem));return report;}
  function membership(doc) {
    const primary=scopeOf(doc);if(!primary)return {match:true,problem:'missing/ambiguous primary scope in the supplied snapshot'};
    const explicit=targets(doc,'incurred for home');
    if(explicit.length>1)return {match:true,problem:'historical Home attribution is ambiguous'};
    if(explicit.some(id=>scopeTargetProblem({kind:'home',id},index)))return {match:true,problem:'historical Home attribution target must be an inspected My House Home'};
    if(primary.kind==='home'){
      const problem=scopeTargetProblem(primary,index);
      if(problem)return {match:true,problem};
      if(explicit.length&&explicit[0]!==primary.id)return {match:true,problem:'direct Home scope conflicts with incurred for home'};
      return {match:sameScope(primary,scope)};
    }
    if(sameScope(primary,scope))return {match:true};
    if(scope.kind!=='home')return {match:false};
    if(primary.kind==='project'){
      const project=index.get(primary.id), homes=project?targets(project,'home'):[];
      if(project&&fm(project).type===PREFIX+'Project'&&homes.length===1){
        if(scopeTargetProblem({kind:'home',id:homes[0]},index))return {match:true,problem:'Project Home attribution target must be an inspected My House Home'};
        return {match:homes[0]===scope.id,problem:explicit.length&&explicit[0]!==homes[0]?'conflicting historical Home attribution':null};
      }
      return {match:true,problem:'Project Home attribution is missing/ambiguous in the selected Home assessment'};
    }
    if(primary.kind==='asset')return {match:explicit.length!==1||explicit[0]===scope.id,problem:explicit.length!==1?'historical Asset cost Home attribution is missing/ambiguous':null};
    return {match:false};
  }
  const recorded=d=>['recorded','disputed'].includes(fm(d).entry_status);
  const resolved=families(all,['corrects','revises'],recorded,(a,b,label)=>{
    if(!text(fm(a).revision_reason))return 'a replacement needs an explicit reason';
    if(label==='revises' && (['payment','refund'].includes(fm(a).record_kind)||fm(a).record_kind!==fm(b).record_kind||!equalTuple(a,b)||!sameScope(scopeOf(a),scopeOf(b))))return 'revision must retain document family role/currency/scope; payment/refund occurrence is not a revision';
    return null;
  });
  const effective=new Map(), relevant=[];
  for(const family of resolved.families){
    const memberships=family.members.map(membership), touched=memberships.some(m=>m.match);
    if(family.issues.length){if(touched)unresolved.push(...family.issues);continue;}
    const doc=family.effective;effective.set(doc.id,doc);
    const m=membership(doc);if(m.problem){unresolved.push(issue(doc.id,'SCOPE_UNRESOLVED',m.problem));continue;}
    if(!m.match){if(touched)excluded.push(issue(doc.id,'OUTSIDE_SCOPE','effective fact belongs to another primary scope'));continue;}
    relevant.push(doc);
  }
  // Draft/void captures never hide a recorded ancestor by themselves.
  for(const doc of all)if(!recorded(doc)&&membership(doc).match){if(fm(doc).entry_status==='void'&&!text(fm(doc).revision_reason))unresolved.push(issue(doc.id,'VOID_REASON_UNKNOWN','void does not silently erase a fact; record why it was erroneous/canceled'));else excluded.push(issue(doc.id,'NOT_RECORDED',`status ${fm(doc).entry_status??'unknown'} is not recorded`));}
  function resolve(id){return resolved.byMember.get(id)?.effective??null;}
  const valid=new Map();
  for(const doc of relevant){
    const f=fm(doc), why=[];
    if(f.entry_status!=='recorded')why.push('disputed fact');
    if(!ROLE.has(f.record_kind))why.push('unclassified record role');
    if(scopeTargetProblem(scopeOf(doc),index))why.push('primary scope target missing/wrong type');
    if(!typed('integer',f.amount_minor)||f.amount_minor<0)why.push('amount must be a nonnegative safe integer');
    const scale=policy?.currencies?.[f.currency], expected=typeof scale==='number'?scale:scale?.scale;
    if(!text(policy?.id)||f.currency_basis!==policy.id||!typed('integer',f.currency_scale)||f.currency_scale!==expected)why.push('currency/scale/policy tuple is not supported');
    if(present(f.effective_on)&&!typed('date',f.effective_on))why.push('invalid effective date');
    if(f.record_kind==='commitment'&&(!text(f.authorization_basis)||!text(f.authorized_by)))why.push('authorization basis and reported authorizer required for committed conclusion');
    if(why.length){unresolved.push(issue(doc.id,'MONEY_UNRESOLVED',why.join('; ')));continue;}
    valid.set(doc.id,doc);
  }
  // Known import keys identify a fact family, not a second copy of the same invoice/payment.
  const byKey=new Map();for(const doc of valid.values())if(text(fm(doc).source_fact_key)){const key=JSON.stringify([fm(doc).counterparty_key??fm(doc).counterparty_name??null,fm(doc).record_kind,fm(doc).source_fact_key]);const ids=byKey.get(key)??[];ids.push(doc.id);byKey.set(key,ids);}
  for(const ids of byKey.values())if(ids.length>1)for(const id of ids){valid.delete(id);unresolved.push(issue(id,'DUPLICATE_MONEY_FACT','same scoped source key has multiple effective families'));}
  const groupMap=new Map();
  for(const doc of valid.values()){
    const f=fm(doc), key=tuple(doc);let group=groupMap.get(key);
    if(!group){group={currency:f.currency,currency_scale:f.currency_scale,records:[],totals:{budget:null,committed:0n,net_invoiced:0n,gross_paid:0n,refunded:0n,net_spent:0n,unallocated_paid:0n},invoices:[],quotes:[],estimates:[],budgets:[],line_items:[]};groupMap.set(key,group);}
    group.records.push(doc);included.push(doc.id);
    if(Array.isArray(f.line_items)){
      const ids=new Set(),notes=[];let total=0n;
      for(const line of f.line_items){if(!line||!text(line.line_id)||ids.has(line.line_id)||!text(line.description)||!typed('integer',line.amount_minor)||!['included','excluded','optional','allowance'].includes(line.inclusion)){notes.push('incomplete/malformed/duplicate line');continue;}ids.add(line.line_id);if(line.inclusion==='included')total+=BigInt(line.amount_minor);}
      if(total!==BigInt(f.amount_minor))notes.push('included breakdown does not reconcile with canonical source header');
      group.line_items.push({id:doc.id,complete:notes.length===0,included_sum_minor:total.toString(),issues:notes});
      if(notes.length)warnings.push(issue(doc.id,'BREAKDOWN_INCOMPLETE',notes.join('; ')));
    }else if(present(f.line_items))warnings.push(issue(doc.id,'BREAKDOWN_INVALID','header retained; non-list breakdown is not machine-assessed'));
  }
  function relation(doc,label,role) {
    const ids=targets(doc,label);if(ids.length!==1)return {error:`one ${label} target required`};
    const target=resolve(ids[0]);if(!target||fm(target).record_kind!==role||!valid.has(target.id))return {error:`${label} target must be an eligible inspected ${role}`};
    if(!equalTuple(doc,target)||!sameScope(scopeOf(doc),scopeOf(target)))return {error:'monetary relationship currency/scale/primary-scope mismatch'};
    return {target};
  }
  for(const group of groupMap.values()){
    const invoices=new Map(group.records.filter(d=>fm(d).record_kind==='invoice').map(d=>[d.id,{id:d.id,invoiced:BigInt(fm(d).amount_minor),credited:0n,allocated_paid:0n,allocation_reversals:0n,issues:[]}])) , paymentInvoice=new Map(), refundedByPayment=new Map();
    for(const doc of group.records){const f=fm(doc),amount=BigInt(f.amount_minor);
      if(f.record_kind==='budget'){group.budgets.push({id:doc.id,amount_minor:amount.toString(),primary_scope:scopeOf(doc)});if(sameScope(scopeOf(doc),scope)){if(group.totals.budget!==null){group.totals.budget=null;unresolved.push(issue(doc.id,'BUDGET_AMBIGUOUS','multiple current budget families for exact primary scope'));}else group.totals.budget=amount;}}
      if(f.record_kind==='estimate')group.estimates.push({id:doc.id,amount_minor:amount.toString()});
      if(f.record_kind==='quote')group.quotes.push({id:doc.id,amount_minor:amount.toString(),selection:f.selection??'unknown',counterparty_name:f.counterparty_name??null,valid_until:f.valid_until??null,scope_note:f.scope_note??null,tax_basis:f.tax_basis??'unknown'});
      if(f.record_kind==='commitment')group.totals.committed+=amount;
      if(f.record_kind==='invoice')group.totals.net_invoiced+=amount;
      if(f.record_kind==='payment'){
        group.totals.gross_paid+=amount;const refs=targets(doc,'settles invoice');
        if(refs.length===0){group.totals.unallocated_paid+=amount;continue;}
        const related=relation(doc,'settles invoice','invoice');
        if(related.error||f.allocation_status!=='direct'){
          unresolved.push(issue(doc.id,'PAYMENT_ALLOCATION',related.error??'non-direct payment allocation is unsupported'));group.totals.unallocated_paid+=amount;
          for(const id of refs){const target=resolve(id);if(target&&invoices.has(target.id))invoices.get(target.id).issues.push('payment allocation unresolved');}continue;
        }
        invoices.get(related.target.id).allocated_paid+=amount;paymentInvoice.set(doc.id,related.target.id);
      }
    }
    // Multiple budgets remain unresolved regardless of traversal order.
    const exactBudgets=group.budgets.filter(b=>sameScope(b.primary_scope,scope));if(exactBudgets.length>1)group.totals.budget=null;
    for(const doc of group.records){const f=fm(doc),amount=BigInt(f.amount_minor);
      if(f.record_kind==='credit'){
        const related=relation(doc,'credits invoice','invoice');if(related.error){unresolved.push(issue(doc.id,'CREDIT_ALLOCATION',related.error));continue;}
        group.totals.net_invoiced-=amount;invoices.get(related.target.id).credited+=amount;
      }
      if(f.record_kind==='refund'){
        const related=relation(doc,'refunds payment','payment');if(related.error){unresolved.push(issue(doc.id,'REFUND_ALLOCATION',related.error));continue;}
        group.totals.refunded+=amount;refundedByPayment.set(related.target.id,(refundedByPayment.get(related.target.id)??0n)+amount);
        const invoiceId=paymentInvoice.get(related.target.id);
        if(invoiceId){const inv=invoices.get(invoiceId);if(f.refund_allocation_effect==='reverses_payment_allocation')inv.allocation_reversals+=amount;else if(f.refund_allocation_effect!=='does_not_reverse'){inv.issues.push('refund effect unknown');unresolved.push(issue(doc.id,'REFUND_EFFECT_UNKNOWN','cash refund reported; invoice allocation effect unknown'));}}
      }
    }
    for(const [paymentId,amount]of refundedByPayment)if(amount>BigInt(fm(valid.get(paymentId)).amount_minor)){unresolved.push(issue(paymentId,'REFUND_EXCEEDS_PAYMENT','review refund classification/allocations'));const id=paymentInvoice.get(paymentId);if(id)invoices.get(id).issues.push('refund exceeds referenced payment');}
    group.totals.net_spent=group.totals.gross_paid-group.totals.refunded;
    group.invoices=[...invoices.values()].map(inv=>{const balance=inv.invoiced-inv.credited-inv.allocated_paid+inv.allocation_reversals;return {id:inv.id,invoiced:inv.invoiced.toString(),credited:inv.credited.toString(),allocated_paid:inv.allocated_paid.toString(),allocation_reversals:inv.allocation_reversals.toString(),outstanding:inv.issues.length?null:balance.toString(),issues:inv.issues,overpaid_or_credit:!inv.issues.length&&balance<0n};});
    group.totals=Object.fromEntries(Object.entries(group.totals).map(([k,v])=>[k,v===null?null:v.toString()]));
    delete group.records;report.groups.push(group);
  }
  // Resolve dependency uncertainty only after every currency group has been assessed.
  // A wrong-currency payment can affect a previously visited invoice group; document order
  // must never turn the absence of an eligible allocation into a definite balance.
  const allInvoices=new Map(report.groups.flatMap(group=>group.invoices.map(invoice=>[invoice.id,invoice])));
  for(const problem of unresolved){
    const source=index.get(problem.id);if(!source)continue;
    const family=resolved.byMember.get(source.id), members=family?.members??[source];
    for(const member of members){
      const references=[...targets(member,'settles invoice'),...targets(member,'credits invoice')];
      for(const paymentId of targets(member,'refunds payment')){
        const paymentFamily=resolved.byMember.get(paymentId);
        for(const payment of paymentFamily?.members??(index.has(paymentId)?[index.get(paymentId)]:[]))references.push(...targets(payment,'settles invoice'));
      }
      for(const id of references){
        const target=resolve(id), invoice=target&&allInvoices.get(target.id);
        if(invoice){const detail=`dependent fact unresolved: ${problem.id}`;if(!invoice.issues.includes(detail))invoice.issues.push(detail);invoice.outstanding=null;invoice.overpaid_or_credit=false;}
      }
    }
  }
  report.groups.sort((a,b)=>a.currency.localeCompare(b.currency));
  report.included.sort();report.status=unresolved.length?'partial':'assessed';
  report.note='Scoped reported subtotals over the inspected records; not bank verification, complete household history or a universally enforced invariant.';
  return report;
}
