import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
await build({entryPoints:[fileURLToPath(new URL('./src/operation.mjs',import.meta.url))],outfile:fileURLToPath(new URL('./dist/operation.mjs',import.meta.url)),bundle:true,platform:'node',format:'esm',target:'node22',legalComments:'eof'});

// Host callers consume installed public Core; do not bundle its engine/parser into this helper.
await build({entryPoints:[fileURLToPath(new URL('./src/host.mjs',import.meta.url))],outfile:fileURLToPath(new URL('./dist/host.mjs',import.meta.url)),bundle:true,external:['@superbee/core','@superbee/core/*'],platform:'node',format:'esm',target:'node22',legalComments:'eof'});
