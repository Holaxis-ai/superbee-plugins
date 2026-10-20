import {build} from 'esbuild';
import {mkdir,rm} from 'node:fs/promises';
await rm(new URL('./dist',import.meta.url),{recursive:true,force:true});
await mkdir(new URL('./dist',import.meta.url),{recursive:true});
await build({entryPoints:[new URL('./src/operation.mjs',import.meta.url).pathname],outfile:new URL('./dist/operation.mjs',import.meta.url).pathname,bundle:true,platform:'node',format:'esm',target:'node22'});
