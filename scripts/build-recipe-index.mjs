#!/usr/bin/env node
// Generates recipe-index.json from recipe-index.source.json and the recipe folders.
//
//   node scripts/build-recipe-index.mjs                  write recipe-index.json
//   node scripts/build-recipe-index.mjs --check          fail when the committed index has drifted
//   node scripts/build-recipe-index.mjs --compare <ref>  fail when this index breaks immutability against <ref>
//
// --root <dir> selects another checkout. Digests and parsing come from Core's public APIs only.
import {execFileSync} from 'node:child_process';
import {lstat, readFile, readdir, realpath, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseMarkdown} from '@superbee/core';
import {recipeSourceDigest} from '@superbee/core/recipe-lifecycle';
import {parseRecipeFiles} from '@superbee/core/recipes';
import {
  RECIPE_DISPLAY_LIMITS,
  parseRecipeIndex,
  readRecipeDiscovery,
  recipeDisplayText,
  recipeFilesDigest,
  resolveCookbook,
  resolveIndexRecipe,
} from '@superbee/core/recipe-sources';

export const SOURCE_FILE = 'recipe-index.source.json';
export const INDEX_FILE = 'recipe-index.json';
const RECIPES_DIR = 'recipes';
const FORMAT = 'recipe-index/v1';
// Resolvers parse under this edition, so the generator must too.
const OKF_VERSION = '0.2';
// Gitignored local noise. Any other unexpected file is left for Core to refuse.
const IGNORED_FILES = new Set(['.DS_Store']);
// Same bounds Core applies to the index; line and format controls could forge log lines or hide text.
const LIMITS = {id: 128, version: 64, maintainer: 200, title: 200, summary: 1000, reason: 1000, offer: RECIPE_DISPLAY_LIMITS.offer};
// Core's display text rule: controls, format characters and line separators, except the zero-width
// non-joiner and joiner that Persian, Indic scripts and emoji need.
const UNSAFE_TEXT = /(?![\u200C\u200D])[\p{Cc}\p{Cf}\u2028\u2029]/gu;

export class RecipeIndexRefusal extends Error {
  constructor(problems) {
    super(problems.join('\n'));
    this.problems = problems;
  }
}

const refuse = message => {
  throw new RecipeIndexRefusal([message]);
};
const isObject = value => typeof value === 'object' && value !== null && !Array.isArray(value);

function exactKeys(value, keys, where, optional = []) {
  if (!isObject(value)) refuse(`${where} must be an object`);
  for (const key of keys) if (!Object.hasOwn(value, key)) refuse(`${where} is missing '${key}'`);
  for (const key of Object.keys(value)) if (!keys.includes(key) && !optional.includes(key)) refuse(`${where} has unknown key '${key}'`);
}

/**
 * Readers drop what they cannot use in `discovery`; the generator refuses it, through Core's own
 * reader, so the published object is exactly what every current reader keeps.
 */
function strictDiscovery(entry, level, where) {
  if (!Object.hasOwn(entry, 'discovery')) return;
  const {discovery, problems} = readRecipeDiscovery(entry.discovery, level, `${where}.discovery`);
  if (problems.length > 0) throw new RecipeIndexRefusal(problems);
  if (discovery === null) refuse(`${where}.discovery is empty; leave it out instead`);
  for (const [key, value] of Object.entries(discovery)) {
    if (typeof value === 'string') freeText(value, `${where}.discovery.${key}`, LIMITS.offer);
  }
}

function arrayOf(value, where) {
  if (!Array.isArray(value)) refuse(`${where} must be an array`);
  return value;
}

function freeText(value, where, max) {
  if (typeof value !== 'string' || value.trim() === '' || value.length > max) refuse(`${where} must be a nonempty string of at most ${max} characters`);
  if (value.search(UNSAFE_TEXT) !== -1) refuse(`${where} contains a control or format character`);
}

function plainId(value, where) {
  if (typeof value !== 'string' || value.length > LIMITS.id || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value)) refuse(`${where} is not a plain id`);
}

/** Case-insensitive hosts see `Alpha` and `alpha` as one folder, so no two spellings may coexist. */
function refuseCaseVariants(ids) {
  const spellings = new Map();
  for (const id of ids) {
    const first = spellings.get(id.toLowerCase());
    if (first !== undefined && first !== id) refuse(`ids '${first}' and '${id}' differ only by case`);
    spellings.set(id.toLowerCase(), id);
  }
}

/** Checks the curated input. Core checks the generated index; only the input's own rules live here. */
export function parseSource(text) {
  let source;
  try {
    source = JSON.parse(text);
  } catch (error) {
    refuse(`${SOURCE_FILE} is not valid JSON: ${error.message}`);
  }
  exactKeys(source, ['source', 'title', 'recipes', 'cookbooks', 'removed', 'removed_cookbooks'], SOURCE_FILE);
  plainId(source.source, 'source');
  freeText(source.title, 'title', LIMITS.title);
  arrayOf(source.recipes, 'recipes').forEach((entry, i) => {
    exactKeys(entry, ['id', 'designation', 'maintainer'], `recipes[${i}]`, ['discovery']);
    plainId(entry.id, `recipes[${i}].id`);
    strictDiscovery(entry, 'recipe', `recipes[${i}]`);
    freeText(entry.designation, `recipes[${i}].designation`, LIMITS.maintainer);
    freeText(entry.maintainer, `recipes[${i}].maintainer`, LIMITS.maintainer);
  });
  arrayOf(source.cookbooks, 'cookbooks').forEach((entry, i) => {
    exactKeys(entry, ['id', 'title', 'summary', 'designation', 'maintainer', 'recipes'], `cookbooks[${i}]`, ['discovery']);
    plainId(entry.id, `cookbooks[${i}].id`);
    strictDiscovery(entry, 'cookbook', `cookbooks[${i}]`);
    freeText(entry.title, `cookbooks[${i}].title`, LIMITS.title);
    freeText(entry.summary, `cookbooks[${i}].summary`, LIMITS.summary);
    freeText(entry.designation, `cookbooks[${i}].designation`, LIMITS.maintainer);
    freeText(entry.maintainer, `cookbooks[${i}].maintainer`, LIMITS.maintainer);
    arrayOf(entry.recipes, `cookbooks[${i}].recipes`).forEach((member, j) => plainId(member, `cookbooks[${i}].recipes[${j}]`));
  });
  arrayOf(source.removed, 'removed').forEach((entry, i) => {
    exactKeys(entry, ['id', 'last_version', 'reason'], `removed[${i}]`);
    plainId(entry.id, `removed[${i}].id`);
    freeText(entry.last_version, `removed[${i}].last_version`, LIMITS.version);
    freeText(entry.reason, `removed[${i}].reason`, LIMITS.reason);
  });
  arrayOf(source.removed_cookbooks, 'removed_cookbooks').forEach((entry, i) => {
    exactKeys(entry, ['id', 'reason'], `removed_cookbooks[${i}]`);
    plainId(entry.id, `removed_cookbooks[${i}].id`);
    freeText(entry.reason, `removed_cookbooks[${i}].reason`, LIMITS.reason);
  });
  refuseCaseVariants([...source.recipes, ...source.cookbooks, ...source.removed, ...source.removed_cookbooks].map(entry => entry.id));
  for (const [kind, markers, listed] of [['recipe', source.removed, source.recipes], ['cookbook', source.removed_cookbooks, source.cookbooks]]) {
    const ids = new Set();
    for (const {id} of markers) {
      if (ids.has(id)) refuse(`removal markers list ${kind} '${id}' more than once`);
      ids.add(id);
    }
    for (const {id} of listed) {
      if (ids.has(id)) refuse(`${kind} '${id}' is marked removed and cannot be listed again; publish it under a new id`);
    }
  }
  return source;
}

async function listFiles(root, dir, prefix = '') {
  const found = [];
  for (const entry of await readdir(path.join(root, dir, prefix), {withFileTypes: true})) {
    const name = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) found.push(...await listFiles(root, dir, name));
    else if (entry.isFile()) {
      if (!IGNORED_FILES.has(entry.name)) found.push(name);
    } else refuse(`${dir}/${name} is not a regular file`);
  }
  return found;
}

function compareCodeUnits(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

async function buildEntry(root, {id, designation, maintainer, discovery}, sourceId) {
  const dir = `${RECIPES_DIR}/${id}`;
  let names;
  try {
    for (const location of [RECIPES_DIR, dir]) {
      if (!(await lstat(path.join(root, location))).isDirectory()) refuse(`${location} must be a real directory, not a symlink or file`);
    }
    names = (await listFiles(root, dir)).sort(compareCodeUnits);
  } catch (error) {
    if (error instanceof RecipeIndexRefusal) throw error;
    refuse(`recipe '${id}' cannot be read from ${dir}: ${error.message}`);
  }
  const raw = await Promise.all(names.map(async name => ({path: name, bytes: await readFile(path.join(root, dir, name))})));
  const decoder = new TextDecoder('utf-8', {fatal: true});
  let files;
  try {
    files = raw.map(file => ({path: file.path, bytes: decoder.decode(file.bytes)}));
  } catch {
    refuse(`recipe '${id}' has a file that is not valid UTF-8`);
  }
  let parsed;
  try {
    parsed = parseRecipeFiles(files, `index:${sourceId}`, {okfVersion: OKF_VERSION});
  } catch (error) {
    refuse(`recipe '${id}' does not parse: ${error.message}`);
  }
  if (!parsed.ok) refuse(`recipe '${id}' does not parse: ${parsed.error.code}: ${parsed.error.message}`);
  const {recipe} = parsed;
  if (recipe.id !== id) refuse(`folder ${dir} declares recipe id '${recipe.id}'`);
  if (recipe.warnings?.length) refuse(`recipe '${id}' parses with warnings: ${recipe.warnings.join('; ')}`);
  parseVersion(recipe.version, `recipe '${id}'`);
  requireOffer(files, id);
  return {
    id,
    version: recipe.version,
    designation,
    maintainer,
    source_digest: recipeSourceDigest(recipe),
    files_digest: recipeFilesDigest(raw),
    root: dir,
    files: names,
    ...(discovery === undefined ? {} : {discovery: readRecipeDiscovery(discovery, 'recipe').discovery}),
  };
}

/** Core falls back to the title when `offer` is absent, so the requirement reads the raw manifest. */
function requireOffer(files, id) {
  const manifest = files.find(file => file.path === 'recipe.md');
  const {offer} = parseMarkdown(manifest?.bytes ?? '', `recipes/${id}/recipe.md`).frontmatter;
  if (typeof offer !== 'string' || offer.length > LIMITS.offer || recipeDisplayText(offer, LIMITS.offer) === null) {
    refuse(`recipe '${id}' must declare an 'offer' in recipe.md: one line of display text, at most ${LIMITS.offer} characters, saying what a person gets`);
  }
  freeText(offer, `recipe '${id}' offer`, LIMITS.offer);
}

/** Builds the index bytes from a checkout and proves Core accepts and verifies what was built. */
export async function buildRecipeIndex(root) {
  const source = parseSource(await readFile(path.join(root, SOURCE_FILE), 'utf8').catch(error => refuse(`cannot read ${SOURCE_FILE}: ${error.message}`)));
  const recipes = [];
  for (const entry of source.recipes) recipes.push(await buildEntry(root, entry, source.source));
  recipes.sort((a, b) => compareCodeUnits(a.id, b.id));
  const cookbooks = source.cookbooks
    .map(({id, title, summary, designation, maintainer, recipes: members, discovery}) => ({
      id,
      title,
      summary,
      designation,
      maintainer,
      recipes: members,
      ...(discovery === undefined ? {} : {discovery: readRecipeDiscovery(discovery, 'cookbook').discovery}),
    }))
    .sort((a, b) => compareCodeUnits(a.id, b.id));
  const bytes = Buffer.from(`${JSON.stringify({format: FORMAT, source: source.source, title: source.title, recipes, cookbooks}, null, 2)}\n`);

  const parsed = parseRecipeIndex(bytes);
  if (!parsed.ok) refuse(`Core refuses the generated index: ${parsed.error.code}: ${parsed.error.message}`);
  // Readers drop what they do not understand, so prove this Core keeps every discovery value emitted.
  for (const [kind, emitted, read] of [['recipe', recipes, parsed.index.recipes], ['cookbook', cookbooks, parsed.index.cookbooks]]) {
    emitted.forEach((entry, i) => {
      if (JSON.stringify(entry.discovery ?? null) !== JSON.stringify(read[i].discovery ?? null)) {
        refuse(`Core does not keep the discovery of ${kind} '${entry.id}' as generated; check it against this Core's rules`);
      }
    });
  }
  const read = location => readFile(path.join(root, location));
  for (const {id} of parsed.index.recipes) {
    const result = await resolveIndexRecipe(parsed.index, id, read);
    if (!result.ok) refuse(`Core cannot verify recipe '${id}': ${result.error.code}: ${result.error.message}`);
  }
  for (const {id} of parsed.index.cookbooks) {
    const result = await resolveCookbook(parsed.index, id, read);
    if (!result.ok) refuse(`Core refuses cookbook '${id}': ${result.error.code}: ${result.error.message}`);
  }
  return {bytes, index: parsed.index, source};
}

function parseVersion(version, where) {
  const match = /^(\d+(?:\.\d+)*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.exec(version);
  if (!match) refuse(`${where} has version '${version}'; the index needs dotted numbers with an optional -prerelease so versions can be ordered`);
  return {release: match[1].split('.').map(BigInt), pre: match[2]?.split('.') ?? null};
}

function compareBig(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Semver precedence, with missing release parts read as zero so '1' and '1.0.0' are equal. */
export function compareVersions(left, right) {
  const a = parseVersion(left, 'version');
  const b = parseVersion(right, 'version');
  for (let i = 0; i < Math.max(a.release.length, b.release.length); i += 1) {
    const order = compareBig(a.release[i] ?? 0n, b.release[i] ?? 0n);
    if (order !== 0) return order;
  }
  if (!a.pre || !b.pre) return a.pre ? -1 : b.pre ? 1 : 0;
  for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i += 1) {
    if (a.pre[i] === undefined) return -1;
    if (b.pre[i] === undefined) return 1;
    const aNumeric = /^\d+$/.test(a.pre[i]);
    const bNumeric = /^\d+$/.test(b.pre[i]);
    if (aNumeric && bNumeric) {
      const order = compareBig(BigInt(a.pre[i]), BigInt(b.pre[i]));
      if (order !== 0) return order;
    } else if (aNumeric !== bNumeric) return aNumeric ? -1 : 1;
    else {
      const order = compareCodeUnits(a.pre[i], b.pre[i]);
      if (order !== 0) return order;
    }
  }
  return 0;
}

/**
 * Compares a new index against the previous one. `refusals` break the publishing contract. `notices`
 * are statements only maintainers may make, surfaced so review cannot miss them.
 */
export function compareIndexes(previous, next) {
  const refusals = [];
  const notices = [];
  if (previous.index.source !== undefined && previous.index.source !== next.index.source) {
    refusals.push(`index source id changed from '${previous.index.source}' to '${next.index.source}'`);
  }
  const nextById = new Map(next.index.recipes.map(entry => [entry.id, entry]));
  const markers = new Map(next.source.removed.map(entry => [entry.id, entry]));

  for (const before of previous.index.recipes) {
    const after = nextById.get(before.id);
    if (!after) {
      const marker = markers.get(before.id);
      if (!marker) refusals.push(`recipe '${before.id}' was removed without a marker in ${SOURCE_FILE} 'removed'`);
      else if (marker.last_version !== before.version) refusals.push(`removed marker for '${before.id}' says last_version '${marker.last_version}', the previous index lists '${before.version}'`);
      else notices.push(`recipe '${before.id}' version ${before.version} is removed from the index: ${marker.reason}`);
      continue;
    }
    if (after.version === before.version) {
      for (const key of ['source_digest', 'files_digest', 'root']) {
        if (after[key] !== before[key]) refusals.push(`recipe '${before.id}' version ${before.version} is immutable, but its ${key} changed; bump the version`);
      }
      if (JSON.stringify([...after.files].sort()) !== JSON.stringify([...before.files].sort())) {
        refusals.push(`recipe '${before.id}' version ${before.version} is immutable, but its file list changed; bump the version`);
      }
    } else if (compareVersions(after.version, before.version) <= 0) {
      refusals.push(`recipe '${before.id}' version must move forward, but went from ${before.version} to ${after.version}`);
    }
    for (const key of ['designation', 'maintainer']) {
      if (after[key] !== before[key]) notices.push(`recipe '${before.id}' ${key} changes from '${before[key]}' to '${after[key]}'`);
    }
    discoveryNotice(notices, 'recipe', before.id, previous.source.recipes, next.source.recipes);
  }
  const previousIds = new Set(previous.index.recipes.map(entry => entry.id));
  for (const after of next.index.recipes) {
    if (!previousIds.has(after.id)) notices.push(`recipe '${after.id}' is newly listed as ${after.designation}, maintained by '${after.maintainer}'`);
  }

  // A deleted marker would let a removed id return with old bytes at an old version.
  for (const marker of previous.source.removed) {
    const kept = markers.get(marker.id);
    if (!kept || kept.last_version !== marker.last_version) refusals.push(`removed marker for '${marker.id}' must stay as it is; removed ids are not reused`);
  }

  // Same reasoning as recipe markers: a removed cookbook id never comes back with other members.
  const cookbookMarkers = new Map(next.source.removed_cookbooks.map(entry => [entry.id, entry]));
  for (const {id} of previous.source.removed_cookbooks) {
    if (!cookbookMarkers.has(id)) refusals.push(`removed marker for cookbook '${id}' must stay; removed ids are not reused`);
  }

  const nextCookbooks = new Map(next.index.cookbooks.map(entry => [entry.id, entry]));
  for (const before of previous.index.cookbooks) {
    const after = nextCookbooks.get(before.id);
    if (!after) {
      const marker = cookbookMarkers.get(before.id);
      if (marker) notices.push(`cookbook '${before.id}' is removed from the index: ${marker.reason}`);
      else refusals.push(`cookbook '${before.id}' was removed without a marker in ${SOURCE_FILE} 'removed_cookbooks'`);
      continue;
    }
    for (const key of ['designation', 'maintainer']) {
      if (after[key] !== before[key]) notices.push(`cookbook '${before.id}' ${key} changes from '${before[key]}' to '${after[key]}'`);
    }
    if (JSON.stringify(after.recipes) !== JSON.stringify(before.recipes)) {
      notices.push(`cookbook '${before.id}' members change from [${before.recipes.join(', ')}] to [${after.recipes.join(', ')}]`);
    }
    discoveryNotice(notices, 'cookbook', before.id, previous.source.cookbooks, next.source.cookbooks);
  }
  const previousCookbooks = new Set(previous.index.cookbooks.map(entry => entry.id));
  for (const after of next.index.cookbooks) {
    if (!previousCookbooks.has(after.id)) notices.push(`cookbook '${after.id}' is newly listed as ${after.designation}, maintained by '${after.maintainer}'`);
  }
  return {refusals, notices};
}

/**
 * Categories and audience are maintainer decisions, so a change is a notice. It reads the source
 * files, because a parsed index from an older Core may have dropped a value it does not know.
 */
function discoveryNotice(notices, kind, id, before, after) {
  const of = entries => entries?.find(entry => entry.id === id)?.discovery ?? {};
  const [was, now] = [of(before), of(after)];
  for (const key of ['categories', 'audience']) {
    if (JSON.stringify(was[key] ?? null) !== JSON.stringify(now[key] ?? null)) {
      notices.push(`${kind} '${id}' discovery ${key} changes from ${JSON.stringify(was[key] ?? null)} to ${JSON.stringify(now[key] ?? null)}`);
    }
  }
}

function readAtRef(root, commit, file) {
  try {
    execFileSync('git', ['-C', root, 'cat-file', '-e', `${commit}:${file}`], {stdio: 'ignore'});
  } catch {
    return null;
  }
  return execFileSync('git', ['-C', root, 'show', `${commit}:${file}`], {maxBuffer: 16 * 1024 * 1024});
}

/** Reads the previous index and input from git. Null means the ref predates the index. */
export function readPrevious(root, ref) {
  if (ref.startsWith('-')) refuse(`'${ref}' is not a git ref`);
  let commit;
  try {
    commit = execFileSync('git', ['-C', root, 'rev-parse', '--verify', '--quiet', `${ref}^{commit}`], {encoding: 'utf8'}).trim();
  } catch {
    refuse(`cannot resolve base ref '${ref}'; immutability was not checked`);
  }
  const indexBytes = readAtRef(root, commit, INDEX_FILE);
  const sourceBytes = readAtRef(root, commit, SOURCE_FILE);
  if (!indexBytes && !sourceBytes) return null;
  if (!indexBytes || !sourceBytes) refuse(`${ref} has only one of ${INDEX_FILE} and ${SOURCE_FILE}`);
  const parsed = parseRecipeIndex(new Uint8Array(indexBytes));
  if (!parsed.ok) refuse(`the index at ${ref} does not parse: ${parsed.error.code}: ${parsed.error.message}`);
  return {index: parsed.index, source: parseSource(sourceBytes.toString('utf8'))};
}

function parseArguments(argv) {
  const options = {root: fileURLToPath(new URL('../', import.meta.url)), check: false, compare: null};
  for (let i = 0; i < argv.length; i += 1) {
    const argument = argv[i];
    if (argument === '--check') options.check = true;
    else if ((argument === '--root' || argument === '--compare') && argv[i + 1] !== undefined) {
      options[argument.slice(2)] = argv[i += 1];
    } else return null;
  }
  return options;
}

/** GitHub's encoding for a workflow command's data, so a value cannot end the line and start a command. */
export function escapeWorkflowData(text) {
  return text.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
}

/** Runners read commands from stderr too, so messages built from file content must stay on one line. */
const oneLine = text => text.replace(UNSAFE_TEXT, ' ');

function reportNotice(message) {
  const decision = `maintainer decision: ${message}`;
  console.log(process.env.GITHUB_ACTIONS ? `::warning file=${SOURCE_FILE}::${escapeWorkflowData(decision)}` : `notice: ${oneLine(decision)}`);
}

async function main(argv) {
  const options = parseArguments(argv);
  if (!options) {
    console.error('usage: build-recipe-index.mjs [--root <dir>] [--check] [--compare <git-ref>]');
    return 2;
  }
  const built = await buildRecipeIndex(options.root);
  const target = path.join(options.root, INDEX_FILE);
  if (options.check) {
    const committed = await readFile(target).catch(() => null);
    if (!committed || !committed.equals(built.bytes)) {
      refuse(`${INDEX_FILE} does not match the recipes and ${SOURCE_FILE}; run node scripts/build-recipe-index.mjs and review the diff`);
    }
    console.log(`${INDEX_FILE} matches: ${built.index.recipes.length} recipes, ${built.index.cookbooks.length} cookbooks`);
  }
  if (options.compare !== null) {
    const previous = readPrevious(options.root, options.compare);
    if (previous === null) console.log(`${options.compare} has no index, so every listing below is new`);
    const {refusals, notices} = compareIndexes(previous ?? {index: {recipes: [], cookbooks: []}, source: {removed: [], removed_cookbooks: []}}, built);
    notices.forEach(reportNotice);
    if (refusals.length > 0) throw new RecipeIndexRefusal(refusals);
    console.log(`immutability holds against ${options.compare}`);
  }
  if (!options.check && options.compare === null) {
    await writeFile(target, built.bytes);
    console.log(`wrote ${INDEX_FILE}: ${built.index.recipes.length} recipes, ${built.index.cookbooks.length} cookbooks`);
  }
  return 0;
}

if (process.argv[1] && await realpath(process.argv[1]).catch(() => null) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2)).catch(error => {
    if (!(error instanceof RecipeIndexRefusal)) throw error;
    for (const problem of error.problems) console.error(`refused: ${oneLine(problem)}`);
    return 1;
  });
}
