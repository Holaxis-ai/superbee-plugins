import {mkdir,copyFile} from 'node:fs/promises';
await mkdir(new URL('./dist/',import.meta.url),{recursive:true});
await copyFile(new URL('./src/operation.mjs',import.meta.url),new URL('./dist/operation.mjs',import.meta.url));
