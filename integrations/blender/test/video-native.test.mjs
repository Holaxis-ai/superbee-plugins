import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {createLocalCapabilities} from '../dist/operation.mjs';
const python=process.env.SUPERBEE_TEST_PYTHON||'python3';
const assetDirectory=new URL('../',import.meta.url).pathname;
const settings={camera:'Camera',width:32,height:32,samples:1,unitSystem:'METRIC',scaleLength:1,referenceKind:'video',referenceTimeSeconds:.2};
const digest=b=>'sha256:'+createHash('sha256').update(b).digest('hex');
async function fixture(body){const out=await mkdtemp(path.join(tmpdir(),'video-native-'));try{await body(out);}finally{await rm(out,{recursive:true,force:true});}}
async function makeVideo(out){
 const video=path.join(out,'synthetic.mp4');
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i','color=red:size=32x32:rate=10:duration=0.1','-f','lavfi','-i','color=lime:size=32x32:rate=10:duration=0.1','-f','lavfi','-i','color=blue:size=32x32:rate=10:duration=0.1','-f','lavfi','-i','color=yellow:size=64x64:rate=10:duration=0.3','-filter_complex','[0:v][1:v][2:v]concat=n=3:v=1:a=0,settb=1/10,setpts=if(eq(N\\,0)\\,50\\,if(eq(N\\,1)\\,52\\,57))[first]','-map','[first]','-map','3:v','-c:v','libx264','-pix_fmt','yuv420p','-fps_mode','passthrough','-copyts','-avoid_negative_ts','disabled',video],{stdio:'pipe'});
 return video;
}
function nativePort(out,calls){return {
 writeJson:async(name,value)=>writeFile(path.join(out,name),JSON.stringify(value)),
 readJson:async name=>JSON.parse(await readFile(path.join(out,name),'utf8')),
 runTool:async request=>{
  calls.push(request);
  if(request.tool==='blender'){
   execFileSync(python,['-I','-c',"from PIL import Image;import sys,json;from pathlib import Path;p=Path(sys.argv[1]);Image.new('RGB',(32,32),'lime').save(p/'render.png');(p/'camera.json').write_text(json.dumps({'syntheticRenderDouble':True}))",out],{stdio:'pipe'});
   return {exitCode:0,stdout:'',stderr:''};
  }
  const r=spawnSync(request.tool==='python'?python:request.tool,request.argv,{encoding:'utf8',maxBuffer:65536});
  return {exitCode:r.status??1,stdout:r.stdout??'',stderr:r.stderr??''};
 }
};}
import {spawnSync} from 'node:child_process';
test('native VFR/nonzero-start and multiple streams select actual green pixels with matching integer extraction PTS',()=>fixture(async out=>{
 const video=await makeVideo(out),before=await readFile(video),calls=[];
 const [cap]=createLocalCapabilities({port:nativePort(out,calls),resources:{scene:{path:path.join(out,'synthetic.blend')},video:{path:video,sha256:digest(before),logicalRef:'fixture/video'}},invocation:{id:'synthetic-native',outputDirectory:out,assetDirectory}});
 const result=await cap.execute(settings,{signal:new AbortController().signal});
 const selection=JSON.parse(await readFile(path.join(out,'selection.json'),'utf8'));
 assert.equal(selection.streamIndex,0);assert.equal(selection.decodedFrameIndex,1);assert.equal(selection.extractionVerified,true);
 assert.notEqual(selection.firstPts,'0');assert.deepEqual(selection.errorSeconds,{numerator:'0',denominator:'1'});
 assert.deepEqual(selection.outputSize,[32,32]);assert.equal(result.comparison.sourceFrame.selectedPts,selection.selectedPts);
 execFileSync(python,['-I','-c',"from PIL import Image;import sys;im=Image.open(sys.argv[1]);r,g,b=im.getpixel((16,16));assert g>240 and r<10 and b<10,(r,g,b)",path.join(out,'reference.png')],{stdio:'pipe'});
 const tieOut=path.join(out,'tie');await mkdir(tieOut);
 const [tie]=createLocalCapabilities({port:nativePort(tieOut,[]),resources:{scene:{path:'synthetic.blend'},video:{path:video,sha256:digest(before),logicalRef:'fixture/video'}},invocation:{id:'synthetic-tie',outputDirectory:tieOut,assetDirectory}});
 const tied=await tie.execute({...settings,referenceTimeSeconds:.1},{signal:new AbortController().signal});assert.equal(tied.sourceFrame.decodedFrameIndex,0);
 execFileSync(python,['-I','-c',"from PIL import Image;import sys;r,g,b=Image.open(sys.argv[1]).getpixel((16,16));assert r>240 and g<10 and b<10,(r,g,b)",path.join(tieOut,'reference.png')],{stdio:'pipe'});
 assert.deepEqual(await readFile(video),before);assert.deepEqual(calls.slice(0,2).map(c=>c.tool),['ffprobe','python']);
 const extraction=calls.find(c=>c.tool==='ffmpeg');assert.ok(extraction.argv.includes('-copyts'));assert.equal(extraction.argv[extraction.argv.indexOf('-map')+1],'0:0');assert.ok(extraction.argv.includes('-noautorotate'));
 const html=await readFile(path.join(out,'review.html'),'utf8');assert.ok(html.includes(selection.selectedPts));assert.ok(html.includes(digest(before)));assert.ok(!html.includes(out));
}));
test('native rotated media conservatively refuses before extraction/render',()=>fixture(async out=>{
 const original=await makeVideo(out),video=path.join(out,'rotated.mp4');execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-display_rotation:v:0','90','-i',original,'-map','0','-c','copy',video],{stdio:'pipe'});
 const calls=[];const [cap]=createLocalCapabilities({port:nativePort(out,calls),resources:{scene:{path:'synthetic.blend'},video:{path:video,sha256:digest(await readFile(video)),logicalRef:'fixture/rotation'}},invocation:{id:'synthetic-rotation',outputDirectory:out,assetDirectory}});
 await assert.rejects(cap.execute(settings,{signal:new AbortController().signal}));assert.deepEqual(calls.map(c=>c.tool),['ffprobe','python']);
}));
test('playlist input refuses under forced MOV/file-only admission without fallback',()=>fixture(async out=>{
 const video=path.join(out,'unsupported.m3u8');await writeFile(video,'#EXTM3U\n#EXTINF:1,\nhttps://example.invalid/no-network.ts\n');
 const calls=[];const [cap]=createLocalCapabilities({port:nativePort(out,calls),resources:{scene:{path:'synthetic.blend'},video:{path:video,sha256:digest(await readFile(video)),logicalRef:'fixture/unsupported'}},invocation:{id:'synthetic-unsupported',outputDirectory:out,assetDirectory}});
 await assert.rejects(cap.execute(settings,{signal:new AbortController().signal}));assert.deepEqual(calls.map(c=>c.tool),['ffprobe']);
 const args=calls[0].argv;
 for(const [flag,value] of [['-f','mov'],['-protocol_whitelist','file'],['-format_whitelist','mov'],['-enable_drefs','0'],['-use_absolute_path','0']])assert.equal(args[args.indexOf(flag)+1],value);
}));
