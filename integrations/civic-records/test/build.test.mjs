import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,cp,copyFile,readFile,rm} from 'node:fs/promises';import {fileURLToPath} from 'node:url';import path from 'node:path';import {execFileSync} from 'node:child_process';
test('standalone bundle builds from a checkout path containing spaces and non-ASCII',async()=>{
 // Inside this ordinary-installed worktree: normal ancestor resolution, no borrowed dependencies.
 const root=await mkdtemp(fileURLToPath(new URL('../.build café ',import.meta.url)));
 try{
  await cp(new URL('../src/',import.meta.url),path.join(root,'src'),{recursive:true});await copyFile(new URL('../build.mjs',import.meta.url),path.join(root,'build.mjs'));
  execFileSync(process.execPath,[path.join(root,'build.mjs')],{cwd:root,stdio:'pipe'});
  const output=await readFile(path.join(root,'dist/operation.mjs'),'utf8');assert.match(output,/civic_extract_pdf/);assert.doesNotMatch(output,/from ["']parse5["']/);
 }finally{await rm(root,{recursive:true,force:true});}
});
