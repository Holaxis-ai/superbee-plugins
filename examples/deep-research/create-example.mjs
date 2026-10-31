#!/usr/bin/env node
// Explicit synthetic starter; never imported or run by recipe installation.
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const args = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i += 2) {
  const key = args[i];
  if (!['--case', '--bundle', '--cli'].includes(key) || !args[i + 1] || options[key]) {
    throw new Error('Usage: node create-example.mjs --case house-history|technical|interview --bundle ABSENT_DIRECTORY [--cli EXECUTABLE]');
  }
  options[key] = args[i + 1];
}
if (!options['--case'] || !options['--bundle']) throw new Error('--case and --bundle are required');
const cases = JSON.parse(await readFile(path.join(here, 'cases.json'), 'utf8'));
if (!Object.hasOwn(cases, options['--case'])) throw new Error('Unknown synthetic case');
const selected = cases[options['--case']];
const bundle = path.resolve(options['--bundle']);
const cli = options['--cli'] ?? 'superbee';
const actor = 'process:deep-research-example';
const completed = [];
function run(argv) {
  const command = /\.(?:mjs|js)$/.test(cli) ? process.execPath : cli;
  const prefix = command === process.execPath ? [cli] : [];
  const result = spawnSync(command, [...prefix, ...argv, '--dir', bundle, '--json'], {encoding: 'utf8', shell: false, timeout: 60_000, maxBuffer: 4 * 1024 * 1024});
  if (result.error || result.status !== 0) {
    throw new Error(JSON.stringify({message: 'Stopped; retain the partial bundle and inspect. No automatic retry or rollback.', completed, failure: result.error?.message || result.stderr || result.stdout}));
  }
  return JSON.parse(result.stdout);
}

// Native init owns absent-target/enclosing-bundle checks. Never adopt an existing bundle.
run(['init', '--create-only', '--recipe', 'none']);
completed.push('initialized');
run(['recipe', 'add', path.join(root, 'recipes/deep-research'), '--actor', actor]);
completed.push('core installed');
if (selected.extension) {
  run(['recipe', 'add', path.join(here, 'extensions/place-history'), '--actor', actor]);
  completed.push('example extension installed');
}
for (const record of selected.records) {
  const argv = ['new', record.kind, record.id, '--body', record.body, '--actor', actor];
  for (const [key, value] of Object.entries(record.fields)) argv.push(`--${key}`, String(value));
  run(argv);
  completed.push(record.id);
}
const status = run(['status']);
console.log(JSON.stringify({synthetic: true, case: options['--case'], bundle, completed, status, limits: 'Fictional supplied inputs; no archive capture, interview, benchmark execution or semantic verification occurred.'}, null, 2));
