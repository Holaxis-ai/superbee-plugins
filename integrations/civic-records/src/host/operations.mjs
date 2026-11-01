// Explicit native operation composition for a trusted civic package. No hosted auth/sync.
import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const need=(ok,code)=>{if(!ok)throw Error(code);};
const json=value=>JSON.stringify(value,null,2)+'\n';
const roles=Object.freeze({'local.civic.discover-pdfs.v1':'discovery','local.civic.discover-ecode360.v1':'discovery','local.civic.extract-pdf.v1':'extraction','local.civic.prepare-text.v1':'prepared','local.civic.prepare-evidence.v1':'evidence'});
export async function createCivicOperations({ cli, packageRoot, outDir }) {
  need([cli, packageRoot, outDir].every(p => typeof p === 'string' && path.isAbsolute(p)), 'CIVIC_CAPTURE_PATH');
  const command = args => JSON.parse(execFileSync(cli, [...args, '--json'], {
    encoding: 'utf8', timeout: 120_000, maxBuffer: 2 << 20,
  }));
  need(command(['version']).identity?.package?.version === '0.4.4-pre.11', 'CIVIC_CAPTURE_CLI_VERSION');
  const bundle = path.join(outDir, 'operations');
  command(['init', '--create-only', '--recipe', 'none', '--dir', bundle]);
  const native = args => command([...args, '--dir', bundle]);
  const plugin = packageRoot;
  const preview = native(['op', 'register', plugin, '--local']);
  need(preview.accepted === false && /^sha256:[a-f0-9]{64}$/.test(preview.digest), 'CIVIC_CAPTURE_REGISTRATION');
  native(['op', 'register', plugin, '--local', '--accept', preview.digest]);
  let index = 0;
  return async (operation, resources, tools = {}) => {
    need(Object.hasOwn(roles, operation), 'CIVIC_CAPTURE_OPERATION');
    const prefix = path.join(outDir, `operation-${++index}`);
    const outputRoot = prefix + '-output'; await mkdir(outputRoot);
    const config = { resources, tools, outputRoot, profile: 'synthetic-v1' };
    await writeFile(prefix + '-resources.json', json(config), { flag: 'wx', mode: 0o600 });
    const args = ['op', 'bind', operation, '--local', '--resources-file', prefix + '-resources.json'];
    const preview = native(args);
    need(/^sha256:[a-f0-9]{64}$/.test(preview.digest), 'CIVIC_CAPTURE_BINDING');
    const bound = native([...args, '--accept', preview.digest]);
    need(bound.status === 'bound' && bound.operation === operation && bound.expectedInputs && typeof bound.binding === 'string', 'CIVIC_CAPTURE_BINDING');
    await writeFile(prefix + '-input.json', json({ expectedInputs: bound.expectedInputs, settings: {} }), { flag: 'wx', mode: 0o600 });
    const role = roles[operation];
    const exported = path.join(outputRoot, role + '.json');
    const receipt = native(['op', 'run', operation, '--local', '--binding', bound.binding, '--input-file', prefix + '-input.json', '--export-output', `${role}=${exported}`]);
    await writeFile(prefix + '-receipt.json', json(receipt), { flag: 'wx', mode: 0o600 });
    need(receipt.status === 'succeeded' && receipt.outputExport?.status === 'exported', 'CIVIC_CAPTURE_OPERATION_REFUSED');
    return JSON.parse(await readFile(exported, 'utf8'));
  };
}

