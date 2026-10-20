import test from 'node:test';
import {createHash} from 'node:crypto';
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
 assert.equal(result.outputs.length,12);assert.equal(result.sourceFrame.actualPtsSeconds,null);
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
 const html=await readFile(path.join(out,'review.html'),'utf8');assert.match(html,/data:image\/png;base64/);assert.match(html,/no geometric accuracy score/);assert.doesNotMatch(html,/https?:|<script[^>]+src=/);
 const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];assert.equal(scripts.length,1);
 const hash=createHash('sha256').update(scripts[0][1]).digest('base64');assert.ok(html.includes('sha256-'+hash));
 for(const mode of ['side','overlay','wipe','blink','edges','difference'])assert.ok(html.includes('data-mode="'+mode+'"'));
 assert.match(html,/prefers-reduced-motion/);assert.match(html,/id="fallback"/);
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
test('closure checks actual current and legacy compositor owners rather than deprecated use_nodes',()=>{
 const python=process.env.SUPERBEE_TEST_PYTHON||'python3';
 const capture=new URL('../assets/capture.py',import.meta.url).pathname;
 execFileSync(python,['-I','-c',`
import ast, sys
from pathlib import Path
from types import SimpleNamespace
module=ast.parse(Path(sys.argv[1]).read_text())
function=next(node for node in module.body if isinstance(node,ast.FunctionDef) and node.name=='has_compositor_or_sequence')
namespace={}
exec(compile(ast.Module(body=[function],type_ignores=[]),'<capture-closure>','exec'),namespace)
check=namespace['has_compositor_or_sequence']
assert not check(SimpleNamespace(use_nodes=True,compositing_node_group=None,node_tree=None,sequence_editor=None))
assert check(SimpleNamespace(use_nodes=False,compositing_node_group=object(),node_tree=None,sequence_editor=None))
assert check(SimpleNamespace(use_nodes=False,node_tree=object(),sequence_editor=None))
assert not check(SimpleNamespace(use_nodes=False,node_tree=None,sequence_editor=None))
assert check(SimpleNamespace(compositing_node_group=None,node_tree=object(),sequence_editor=None))
assert check(SimpleNamespace(compositing_node_group=None,node_tree=None,sequence_editor=object()))
`,capture]);
});
test('closed video branch rejects ambiguous settings/resources before any native call',async()=>{
 let calls=0;const [cap]=createLocalCapabilities({port:{runTool:()=>calls++},resources:{scene:{path:'/scene'},reference:{path:'/reference'}},invocation:{}});
 for(const value of [{...settings,referenceKind:'video'},{...settings,referenceTimeSeconds:1},{...settings,referenceKind:'image'},{...settings,referenceKind:'video',referenceTimeSeconds:NaN},{...settings,referenceKind:'video',referenceTimeSeconds:1}])await assert.rejects(()=>cap.execute(value,{}));
 assert.equal(calls,0);
 const [unknown]=createLocalCapabilities({port:{runTool:()=>calls++},resources:{scene:{path:'/scene'},reference:{path:'/reference'},video:{path:'/video'}},invocation:{}});
 await assert.rejects(()=>unknown.execute(settings,{}));assert.equal(calls,0);
});
