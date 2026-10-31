#!/usr/bin/env node
import {lstat, readFile, readdir, realpath, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseRecipeFiles} from '@superbee/core/recipes';
import {parseMarkdown} from '@superbee/core/document-codec';
import {preflightRecipeSet, recipePreflightDigest, explainRecipePreflightIssue} from '@superbee/core/recipe-set-preflight';

const schema = 'local-recipe-preflight-plan/v1';
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const decoder = new TextDecoder('utf-8', {fatal: true});
const fail = message => { throw new Error(message); };
function keys(value, allowed, where) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${where}: expected object`);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(`${where}: unknown field '${key}'`);
}
async function directory(root) {
  if (!(await lstat(root)).isDirectory()) fail(`Expected non-symlink directory: ${root}`);
  return realpath(root);
}
async function text(file, budget) {
  const info = await lstat(file);
  if (!info.isFile()) fail(`Expected regular non-symlink file: ${file}`);
  if (info.size > 1024 * 1024) fail(`File exceeds 1 MiB collection limit: ${file}`);
  const bytes = await readFile(file);
  if (bytes.length > 1024 * 1024) fail(`File exceeds 1 MiB collection limit: ${file}`);
  budget.files++;
  budget.bytes += bytes.length;
  if (budget.files > 2000 || budget.bytes > 16 * 1024 * 1024) fail('Collection exceeds 2000 files or 16 MiB');
  return decoder.decode(bytes);
}
async function tree(root, budget, prefix = '', optional = false) {
  const dir = path.join(root, prefix);
  let info;
  try { info = await lstat(dir); } catch (error) {
    if (optional && error.code === 'ENOENT') return [];
    throw error;
  }
  if (!info.isDirectory()) fail(`Expected non-symlink directory: ${dir}`);
  const files = [];
  for (const entry of (await readdir(dir)).sort(compare)) {
    const relative = prefix + entry;
    const file = path.join(root, relative);
    const stat = await lstat(file);
    if (stat.isDirectory()) files.push(...await tree(root, budget, relative + '/'));
    else files.push({path: relative, bytes: await text(file, budget)});
  }
  return files;
}
function validatePlan(plan) {
  keys(plan, ['schema', 'recipes', 'consumers'], 'plan');
  if (plan.schema !== schema) fail(`Expected schema ${schema}`);
  if (!Array.isArray(plan.recipes) || plan.recipes.length === 0) fail('Choose at least one recipe');
  if (!Array.isArray(plan.consumers)) fail('Declare consumers explicitly (an empty list remains unknown to Core)');
  for (const recipe of plan.recipes) {
    keys(recipe, ['key', 'publisher', 'role', 'path'], 'recipe');
    for (const key of ['key', 'publisher', 'path']) if (typeof recipe[key] !== 'string' || !recipe[key].trim()) fail(`recipe.${key}: expected nonempty string`);
    if (!['base', 'extension'].includes(recipe.role)) fail('recipe.role: expected base or extension');
  }
  for (const consumer of plan.consumers) {
    keys(consumer, ['id', 'owner', 'requirements'], 'consumer');
    if (!Array.isArray(consumer.requirements)) fail('consumer.requirements: expected explicit array');
    // Core owns requirement syntax, semantics, unsupported operators and diagnostics.
  }
}
async function capture(planPath, bundlePath) {
  const budget = {files: 0, bytes: 0};
  const planBytes = await text(planPath, budget);
  const plan = JSON.parse(planBytes);
  validatePlan(plan);
  const bundleRoot = await directory(bundlePath);
  const index = await text(path.join(bundleRoot, 'index.md'), budget);
  if (parseMarkdown(index).frontmatter.okf_version !== '0.2') fail('This example supports explicit OKF 0.2 folders only');
  const recipeRoots = [];
  const selected = [];
  const observations = [];
  for (const chosen of plan.recipes) {
    const root = await directory(path.resolve(path.dirname(planPath), chosen.path));
    recipeRoots.push(root);
    const files = await tree(root, budget);
    const parsed = parseRecipeFiles(files, root, {okfVersion: '0.2'});
    if (!parsed.ok) fail(`${parsed.error.code}: ${parsed.error.message}`);
    const recipe = parsed.recipe;
    if (recipe.contentPolicy !== 'definitions-only' || recipe.pages.length || (recipe.connectors?.length ?? 0)) fail('This example accepts definitions-only convention/reference recipes; Views and Connectors are outside scope');
    const artifact = {
      identity: {publisher: chosen.publisher, recipeId: recipe.id, release: recipe.version},
      files: files.map(file => ({...file, digest: recipePreflightDigest(file.bytes)})),
    };
    selected.push({key: chosen.key, ...artifact.identity, role: chosen.role, artifact, artifactDigest: recipePreflightDigest(artifact)});
    observations.push({id: `${chosen.key}-local`, provider: chosen.key, scope: 'local', availability: 'available', complete: true, definitions: [], ids: [...recipe.docs, ...recipe.references.map(r => r.doc)].map(doc => doc.id)});
  }
  // All local conventions, including unselected competing definitions, enter the inventory.
  // References are collected to establish selected asset agreement. Instance folders are not read.
  const inventory = [...await tree(bundleRoot, budget, 'conventions/', true), ...await tree(bundleRoot, budget, 'references/', true)].sort((a, b) => compare(a.path, b.path));
  const byPath = new Map(inventory.map(file => [file.path, file.bytes]));
  for (const observation of observations) {
    observation.definitions = observation.ids.filter(id => byPath.has(id + '.md')).map(id => ({id, bytes: byPath.get(id + '.md')}));
    delete observation.ids;
    observation.observedVersion = recipePreflightDigest(observation.definitions);
  }
  const consumers = plan.consumers.map(c => ({...c, descriptorDigest: recipePreflightDigest(c)}));
  const endpoints = consumers.flatMap(c => c.requirements.map((r, i) => ({id: `${c.id}-${i}-local`, consumer: c.id, requirement: r.id, placement: 'local'})));
  const input = {
    schema: 'recipe-set-preflight/v1', selected, consumers, endpoints, observations,
    placementInventories: [{id: 'local-definitions', scope: 'local', availability: 'available', complete: true, observedVersion: recipePreflightDigest(inventory), files: inventory}],
  };
  return {input, budget, roots: [bundleRoot, ...recipeRoots], captured: {planBytes, index}};
}
export async function checkLocal(planPath, bundlePath) {
  const first = await capture(path.resolve(planPath), path.resolve(bundlePath));
  const second = await capture(path.resolve(planPath), path.resolve(bundlePath));
  if (JSON.stringify(first) !== JSON.stringify(second)) fail('Selected local files changed between collection passes; collect again');
  const result = await preflightRecipeSet(first.input);
  return {...first, result};
}
async function main(argv) {
  if (argv.length === 1 && argv[0] === '--help') {
    console.log('node check.mjs --plan <explicit.json> --bundle <OKF-0.2-folder> [--evidence <absent-file>]\nRead-only local convention/reference snapshots; no installation or dependency resolution. Exit: valid=0, refused=2, partial=3, collection/input failure=1. Evidence contains selected source/definition bytes.');
    return;
  }
  const options = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!['--plan', '--bundle', '--evidence'].includes(argv[i]) || Object.hasOwn(options, argv[i]) || !argv[i + 1] || argv[i + 1].startsWith('--')) fail('Use --help for explicit arguments');
    options[argv[i]] = argv[i + 1];
  }
  if (!options['--plan'] || !options['--bundle']) fail('Both --plan and --bundle are required');
  const proof = await checkLocal(options['--plan'], options['--bundle']);
  const report = {
    adapter: 'local-recipe-preflight/v1', core: '@superbee/core@0.2.0-pre.41',
    result: proof.result,
    guidance: proof.result.issues.map(issue => ({...issue, ...explainRecipePreflightIssue(issue.code)})),
    collection: {files: proof.budget.files, bytes: proof.budget.bytes, passesCompared: 2},
    limits: 'Local supplied structural snapshot only. Two equal passes are not an atomic snapshot or future-state guarantee. No instances, runtime usability, publisher authentication, permissions, installation, resolution or migration checked.',
  };
  if (options['--evidence']) {
    const output = path.resolve(options['--evidence']);
    const parent = await realpath(path.dirname(output));
    const resolved = path.join(parent, path.basename(output));
    for (const root of proof.roots) if (resolved === root || resolved.startsWith(root + path.sep)) fail('Evidence output must be outside the bundle and selected recipe directories');
    await writeFile(resolved, JSON.stringify({report, input: proof.input}, null, 2) + '\n', {flag: 'wx'});
  }
  console.log(JSON.stringify(report));
  process.exitCode = proof.result.verdict === 'valid' ? 0 : proof.result.verdict === 'refused' ? 2 : 3;
}
if (process.argv[1] && await realpath(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => { console.error(JSON.stringify({error: {code: 'LOCAL_PREFLIGHT_INPUT', message: error.message}})); process.exitCode = 1; });
}
