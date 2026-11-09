import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../recipes/decision/', import.meta.url));
const text = name => readFile(path.join(root, name), 'utf8');
const contains = (text, value) => assert.ok(text.includes(value), `Expected ${JSON.stringify(value)}`);

test('decision recipe is inert, definitions-only and self-contained', async () => {
  const manifest = await text('recipe.md');
  contains(manifest, 'content_policy: definitions-only');
  contains(manifest, 'id: decision');
  contains(manifest, 'references/decision-model.md');
  contains(manifest, 'references/adopting-existing-decisions.md');
  const names = (await readdir(path.join(root, 'conventions'))).sort();
  assert.deepEqual(names, ['decision-case.md', 'decision-option.md', 'decision.md']);
  const all = await Promise.all(names.map(n => text('conventions/' + n)));
  assert.deepEqual(all.map(s => /^governs: (.+)$/m.exec(s)?.[1]).sort(),
    ['Decision', 'Decision Case', 'Decision Option']);
  for (const source of all) {
    contains(source, 'type: Convention');
    assert.doesNotMatch(source, /^governs: (?:Task|Research Claim|Research Question)$/m);
    assert.doesNotMatch(source, /^requires:|^composes:/m);
  }
});

test('decision semantics separate authority, deliberation and work', async () => {
  const decision = await text('conventions/decision.md');
  const caseDoc = await text('conventions/decision-case.md');
  const option = await text('conventions/decision-option.md');
  for (const field of ['decision_status', 'decider', 'decision_date', 'decision_scope', 'authority_basis'])
    contains(decision, field);
  contains(decision, 'decision_status: [proposed, recorded, superseded, withdrawn]');
  contains(decision, 'follow-up: Task');
  contains(decision, 'superseded decision: Decision');
  contains(decision, 'resolves case: Decision Case');
  contains(decision, 'selects: Decision Option');
  contains(caseDoc, 'considers: Decision Option');
  contains(caseDoc, 'needs research: Research Question');
  contains(caseDoc, 'investigated by: Task');
  contains(option, 'tested by: Task');
  contains(option, 'supported by: Research Claim');
  const policy = await text('references/adopting-existing-decisions.md');
  contains(policy, 'recipe evolve');
  contains(policy, 'Never');
  contains(await text('references/decision-model.md'), 'not authenticated');
});
