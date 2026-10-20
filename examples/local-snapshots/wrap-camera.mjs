// Data transformation only. No tool execution, bundle writes or snapshot-selected file access.
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { open, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { canonicalJson } from '@superbee/core/site-capabilities';

const JSON_LIMIT = 2 * 1024 * 1024;
const FILE_LIMIT = 64 * 1024 * 1024;
const MAX_SELECTIONS = 16;
const label = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = () => { throw new Error('EXAMPLE_INPUT_INVALID'); };
export const sha256 = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;

async function readOrdinary(path, limit) {
  if (typeof path !== 'string' || path.length === 0) fail();
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const before = await file.stat();
    if (!before.isFile() || before.nlink !== 1 || before.size > limit) fail();
    const buffer = Buffer.alloc(before.size + 1);
    let length = 0;
    while (length < buffer.length) {
      const { bytesRead } = await file.read(buffer, length, buffer.length - length, null);
      if (bytesRead === 0) break;
      length += bytesRead;
    }
    const after = await file.stat();
    if (length !== before.size || after.size !== before.size || after.mtimeMs !== before.mtimeMs
      || after.ctimeMs !== before.ctimeMs || after.nlink !== 1) fail();
    return buffer.subarray(0, length);
  } finally {
    await file.close();
  }
}

async function readJson(path) {
  const raw = await readOrdinary(path, JSON_LIMIT);
  const data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw));
  // Producer bounds only; public Core remains the authoritative snapshot decoder/binder.
  const check = (value, depth) => {
    if (depth > 32 || typeof value === 'number' && !Number.isFinite(value)) fail();
    if (value !== null && typeof value === 'object') {
      for (const item of Object.values(value)) check(item, depth + 1);
    }
  };
  check(data, 0);
  return data;
}

async function identities(selected) {
  if (!object(selected) || Object.keys(selected).length > MAX_SELECTIONS) fail();
  const rows = [];
  for (const id of Object.keys(selected).sort()) {
    if (!label.test(id)) fail();
    rows.push({ id, sha256: sha256(await readOrdinary(selected[id], FILE_LIMIT)) });
  }
  return rows;
}

/** Paths come only from explicit invocation arguments and the caller's selection map. */
export async function cameraSnapshot({ cameraFile, settingsFile, inputsFile, key, resource, generation }) {
  if (typeof key !== 'string' || !label.test(key)
    || typeof resource !== 'string' || resource.length > 256 || !/^urn:[a-z0-9-]+:[A-Za-z0-9][A-Za-z0-9:._-]*$/.test(resource)
    || !Number.isSafeInteger(generation) || generation < 1) fail();
  const camera = await readJson(cameraFile);
  const settings = await readJson(settingsFile);
  const selected = await readJson(inputsFile);
  if (!object(camera) || !object(settings) || !object(selected)
    || Object.keys(selected).some(name => !['inputs', 'required_identities'].includes(name))) fail();
  const inputs = await identities(selected.inputs);
  if (inputs.length === 0) fail();
  const required = selected.required_identities === undefined ? undefined : await identities(selected.required_identities);
  const snapshot = {
    v: 1, resource, generation, complete: false, records: [{ key, camera }],
    evidence: {
      v: 1, association: 'caller_asserted', inputs,
      settings_digest: sha256(canonicalJson(settings)),
      ...(required === undefined ? {} : { required_identities: required }),
    },
  };
  const bytes = Buffer.from(`${JSON.stringify(snapshot, null, 2)}\n`);
  if (bytes.length > JSON_LIMIT) fail();
  return bytes;
}

async function main() {
  const { values } = parseArgs({ options: Object.fromEntries(
    ['camera-file', 'settings-file', 'inputs-file', 'key', 'resource', 'generation', 'out']
      .map(name => [name, { type: 'string' }]),
  ) });
  if (Object.keys(values).length !== 7 || !/^[1-9][0-9]*$/.test(values.generation)) fail();
  const bytes = await cameraSnapshot({ cameraFile: values['camera-file'], settingsFile: values['settings-file'],
    inputsFile: values['inputs-file'], key: values.key, resource: values.resource, generation: Number(values.generation) });
  await writeFile(values.out, bytes, { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ sha256: sha256(bytes), generation: Number(values.generation), records: 1, complete: false }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(() => { console.error('EXAMPLE_INPUT_INVALID_OR_IO_FAILURE'); process.exitCode = 1; });
}
