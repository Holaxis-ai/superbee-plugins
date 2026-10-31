// Compatibility command; supported implementation lives in the civic host package.
import {realpath} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {runImportCli} from '../../integrations/civic-records/src/host/import-prepared.mjs';
export * from '../../integrations/civic-records/src/host/import-prepared.mjs';
const main=process.argv[1]&&(await realpath(process.argv[1]).catch(()=>null))===await realpath(fileURLToPath(import.meta.url));
if(main)await runImportCli();
