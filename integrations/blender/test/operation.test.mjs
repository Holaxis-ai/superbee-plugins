import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {siteCapabilityDescriptor} from '@superbee/core/site-capabilities';
import {createLocalCapabilities,descriptor} from '../dist/operation.mjs';
const settings={camera:'Camera',width:32,height:32,samples:1,unitSystem:'METRIC',scaleLength:1};
test('manifest matches bundled factory; one explicit action with captured tools and assets',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
 assert.deepEqual(manifest.superbeeLocalOperations.operations[0].capability,descriptor);
 const calls=[],writes=[];
 const [cap]=createLocalCapabilities({resources:{scene:{path:'/captured/model.blend'},reference:{path:'/captured/frame.png'}},invocation:{id:'fixture',outputDirectory:'/outputs',assetDirectory:'/snapshot'},port:{writeJson:async(...v)=>writes.push(v),readJson:async()=>({}),runTool:async v=>{calls.push(v);return {exitCode:0,stdout:'',stderr:''};}}});
 const result=await cap.execute(settings,{signal:new AbortController().signal});
 assert.equal(siteCapabilityDescriptor(cap).name,'blender_compare_view');
 assert.equal(calls.length,3);assert.deepEqual(calls.map(c=>c.tool),['python','blender','python']);
 assert.ok(calls[1].argv.includes('--factory-startup'));assert.ok(calls[1].argv.includes('--disable-autoexec'));
 assert.ok(calls[1].argv.includes('--python-exit-code'));assert.equal(writes[0][1].model,'/captured/model.blend');
 assert.equal(result.outputs.length,11);assert.equal(result.sourceFrame.actualPtsSeconds,null);
});
test('invalid settings refuse before tool execution',async()=>{
 let calls=0;const [cap]=createLocalCapabilities({port:{runTool:()=>calls++},resources:{},invocation:{}});
 await assert.rejects(()=>cap.execute({...settings,samples:NaN},{}),/Invalid samples/);
 await assert.rejects(()=>cap.execute({...settings,command:'bad'},{}),/Expected only/);assert.equal(calls,0);
});
test('actual full-frame image comparison creates self-contained diagnostic report and refuses mismatched aspect',async(t)=>{
 const out=await mkdtemp(path.join(tmpdir(),'blender-comparison-'));
 const script=new URL('../assets/compare.py',import.meta.url).pathname;
 const python=process.env.SUPERBEE_TEST_PYTHON||'python3';
 try{
 if(!process.env.SUPERBEE_TEST_PYTHON){try{execFileSync(python,['-I','-c','from PIL import Image'],{stdio:'pipe'});}catch{t.skip('Set SUPERBEE_TEST_PYTHON to an isolated Python runtime with Pillow');return;}}
 await writeFile(path.join(out,'render-job.json'),JSON.stringify({invocationId:'synthetic-invocation'}));
 execFileSync(python,['-c',"from PIL import Image; import sys; p=sys.argv[1]; Image.new('RGB',(32,32),'red').save(p+'/reference.png'); Image.new('RGB',(32,32),'blue').save(p+'/render.png')",out]);
 const before=await readFile(path.join(out,'reference.png'));
 execFileSync(python,['-I',script,path.join(out,'reference.png'),out]);
 assert.deepEqual(await readFile(path.join(out,'reference.png')),before);
 const html=await readFile(path.join(out,'review.html'),'utf8');assert.match(html,/data:image\/png;base64/);assert.match(html,/no geometric accuracy score/);assert.doesNotMatch(html,/<script|https?:/);
 const transform=JSON.parse(await readFile(path.join(out,'comparison.json'),'utf8'));assert.deepEqual(transform.comparisonSize,[32,32]);
 execFileSync(python,['-c',"from PIL import Image; import sys; Image.new('RGB',(32,16)).save(sys.argv[1]+'/reference.png')",out]);
 assert.throws(()=>execFileSync(python,['-I',script,path.join(out,'reference.png'),out],{stdio:'pipe'}),/Command failed/);
 }finally{await rm(out,{recursive:true,force:true});}
});
test('repository package contains finite runnable factory and declared assets without source-tree imports',async()=>{
 const out=await mkdtemp(path.join(tmpdir(),'blender-package-'));
 try{
  const directory=new URL('../',import.meta.url).pathname;
  const packed=JSON.parse(execFileSync('npm',['pack','--ignore-scripts','--json','--pack-destination',out],{cwd:directory,encoding:'utf8'}))[0];
  execFileSync('tar',['-xzf',path.join(out,packed.filename),'-C',out]);
  const manifest=JSON.parse(await readFile(path.join(out,'package/package.json'),'utf8'));
  const contract=manifest.superbeeLocalOperations;
  assert.equal(contract.assets.length,2);
  for(const asset of contract.assets)assert.ok((await readFile(path.join(out,'package',asset))).length>0);
  const entry=path.join(out,'package',contract.entry);
  const {createLocalCapabilities:factory}=await import(new URL('file://'+entry));
  const caps=factory({port:{},resources:{},invocation:{}});
  assert.equal(caps.length,1);assert.equal(siteCapabilityDescriptor(caps[0]).name,descriptor.name);
  const bundled=await readFile(entry,'utf8');assert.doesNotMatch(bundled,/house|filkins|node_modules|\.\.\/src/);
 }finally{await rm(out,{recursive:true,force:true});}
});
