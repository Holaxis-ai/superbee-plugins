import {build} from 'esbuild';
await build({entryPoints:[new URL('./src/operation.mjs',import.meta.url).pathname],outfile:new URL('./dist/operation.mjs',import.meta.url).pathname,bundle:true,platform:'node',format:'esm',target:'node22',legalComments:'eof'});
