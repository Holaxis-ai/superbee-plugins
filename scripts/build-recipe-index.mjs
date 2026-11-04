#!/usr/bin/env node
// Generates recipe-index.json from recipe-index.source.json and the recipe folders.
//
//   node scripts/build-recipe-index.mjs                  write recipe-index.json
//   node scripts/build-recipe-index.mjs --check          fail when the committed index has drifted
//   node scripts/build-recipe-index.mjs --compare <ref>  fail when this index breaks immutability against <ref>
//
// --root <dir> selects another checkout. Digests and parsing come from Core's public APIs only.
import {execFileSync} from 'node:child_process';
import {readFile, readdir, realpath, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {recipeSourceDigest} from '@superbee/core/recipe-lifecycle';
import {parseRecipeFiles} from '@superbee/core/recipes';
import {parseRecipeIndex, recipeFilesDigest, resolveCookbook, resolveIndexRecipe} from '@superbee/core/recipe-sources';

export const SOURCE_FILE = 'recipe-index.source.json';
export const INDEX_FILE = 'recipe-index.json';
const RECIPES_DIR = 'recipes';
const FORMAT = 'recipe-index/v1';
// Resolvers parse under this edition, so the generator must too.
const OKF_VERSION = '0.2';
// Gitignored local noise. Any other unexpected file is left for Core to refuse.
const IGNORED_FILES = new Set(['.DS_Store']);

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

function exactKeys(value, keys, where) {
  if (!isObject(value)) refuse(`${where} must be an object`);
  for (const key of keys) if (!Object.hasOwn(value, key)) refuse(`${where} is missing '${key}'`);
  for (const key of Object.keys(value)) if (!keys.includes(key)) refuse(`${where} has unknown key '${key}'`);
}

function arrayOf(value, where) {
  if (!Array.isArray(value)) refuse(`${where} must be an array`);
  return value;
}

/** Checks the curated input. Core checks the generated index; only the input's own rules live here. */
export function parseSource(text) {
  let source;
  try {
    source = JSON.parse(text);
  } catch (error) {
    refuse(`${SOURCE_FILE} is not valid JSON: ${error.message}`);
  }
  exactKeys(source, ['source', 'title', 'recipes', 'cookbooks', 'removed'], SOURCE_FILE);
  arrayOf(source.recipes, 'recipes').forEach((entry, i) => {
    exactKeys(entry, ['id', 'designation', 'maintainer'], `recipes[${i}]`);
    if (typeof entry.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(entry.id)) refuse(`recipes[${i}].id is not a plain folder name`);
  });
  arrayOf(source.cookbooks, 'cookbooks').forEach((entry, i) => {
    exactKeys(entry, ['id', 'title', 'summary', 'designation', 'maintainer', 'recipes'], `cookbooks[${i}]`);
  });
  const markers = new Set();
  arrayOf(source.removed, 'removed').forEach((entry, i) => {
    exactKeys(entry, ['id', 'last_version', 'reason'], `removed[${i}]`);
    if (typeof entry.reason !== 'string' || entry.reason.trim() === '') refuse(`removed[${i}].reason must say why the recipe was removed`);
    if (markers.has(entry.id)) refuse(`removed lists '${entry.id}' more than once`);
    markers.add(entry.id);
  });
  for (const {id} of source.recipes) {
    if (markers.has(id)) refuse(`recipe '${id}' is marked removed and cannot be listed again; publish it under a new id`);
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

async function buildEntry(root, {id, designation, maintainer}, sourceId) {
  const dir = `${RECIPES_DIR}/${id}`;
  let names;
  try {
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
  return {
    id,
    version: recipe.version,
    designation,
    maintainer,
    source_digest: recipeSourceDigest(recipe),
    files_digest: recipeFilesDigest(raw),
    root: dir,
    files: names,
  };
}

/** Builds the index bytes from a checkout and proves Core accepts and verifies what was built. */
export async function buildRecipeIndex(root) {
  const source = parseSource(await readFile(path.join(root, SOURCE_FILE), 'utf8').catch(error => refuse(`cannot read ${SOURCE_FILE}: ${error.message}`)));
  const recipes = [];
  for (const entry of source.recipes) recipes.push(await buildEntry(root, entry, source.source));
  recipes.sort((a, b) => compareCodeUnits(a.id, b.id));
  const cookbooks = source.cookbooks
    .map(({id, title, summary, designation, maintainer, recipes: members}) => ({id, title, summary, designation, maintainer, recipes: members}))
    .sort((a, b) => compareCodeUnits(a.id, b.id));
  const bytes = Buffer.from(`${JSON.stringify({format: FORMAT, source: source.source, title: source.title, recipes, cookbooks}, null, 2)}\n`);

  const parsed = parseRecipeIndex(bytes);
  if (!parsed.ok) refuse(`Core refuses the generated index: ${parsed.error.code}: ${parsed.error.message}`);
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

  const nextCookbooks = new Map(next.index.cookbooks.map(entry => [entry.id, entry]));
  for (const before of previous.index.cookbooks) {
    const after = nextCookbooks.get(before.id);
    if (!after) {
      notices.push(`cookbook '${before.id}' is removed from the index`);
      continue;
    }
    for (const key of ['designation', 'maintainer']) {
      if (after[key] !== before[key]) notices.push(`cookbook '${before.id}' ${key} changes from '${before[key]}' to '${after[key]}'`);
    }
    if (JSON.stringify(after.recipes) !== JSON.stringify(before.recipes)) {
      notices.push(`cookbook '${before.id}' members change from [${before.recipes.join(', ')}] to [${after.recipes.join(', ')}]`);
    }
  }
  const previousCookbooks = new Set(previous.index.cookbooks.map(entry => entry.id));
  for (const after of next.index.cookbooks) {
    if (!previousCookbooks.has(after.id)) notices.push(`cookbook '${after.id}' is newly listed as ${after.designation}, maintained by '${after.maintainer}'`);
  }
  return {refusals, notices};
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

function reportNotice(message) {
  const decision = `maintainer decision: ${message}`;
  console.log(process.env.GITHUB_ACTIONS ? `::warning file=${SOURCE_FILE}::${decision}` : `notice: ${decision}`);
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
    const {refusals, notices} = compareIndexes(previous ?? {index: {recipes: [], cookbooks: []}, source: {removed: []}}, built);
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
    for (const problem of error.problems) console.error(`refused: ${problem}`);
    return 1;
  });
}
