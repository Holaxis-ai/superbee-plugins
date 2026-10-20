import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
const helper=new URL('../assets/capture.py',import.meta.url).pathname,python=process.env.SUPERBEE_TEST_PYTHON||'python3';
const frame=pts=>({pts,stream_index:0,width:32,height:32,interlaced_frame:0,crop_top:0,crop_bottom:0,crop_left:0,crop_right:0,sample_aspect_ratio:'1:1'});
const metadata=(ticks=['9007199254740993','9007199254741003','9007199254741023'])=>({streams:[{index:0,codec_type:'video',width:32,height:32,time_base:'1/10',nb_read_frames:String(ticks.length),sample_aspect_ratio:'1:1',field_order:'progressive',disposition:{attached_pic:0}}],frames:ticks.map(frame)});
async function fixture(body){const out=await mkdtemp(path.join(tmpdir(),'video-metadata-'));try{await body(out);}finally{await rm(out,{recursive:true,force:true});}}
async function select(out,m,time=1){await writeFile(path.join(out,'metadata.json'),JSON.stringify(m));await writeFile(path.join(out,'job.json'),JSON.stringify({referenceTimeSeconds:time,sourceVideo:{sha256:'sha256:'+'a'.repeat(64),logicalRef:'synthetic/video'}}));execFileSync(python,['-I',helper,'--select-video',path.join(out,'metadata.json'),path.join(out,'job.json'),path.join(out,'selection.json')],{stdio:'pipe'});return JSON.parse(await readFile(path.join(out,'selection.json'),'utf8'));}
test('raw integer PTS stays exact; elapsed first-frame origin, nearest/tie and duplicate policy use rational seconds',()=>fixture(async out=>{
 const selected=await select(out,metadata(),2);assert.equal(selected.selectedPts,'9007199254741003');assert.equal(selected.decodedFrameIndex,1);assert.deepEqual(selected.errorSeconds,{numerator:'-1',denominator:'1'});
 assert.equal((await select(out,metadata(['10','10','20']),0)).decodedFrameIndex,0);
 assert.equal((await select(out,metadata(['10','20']),.5)).decodedFrameIndex,0);
}));
test('metadata refuses missing raw PTS, incomplete/nonmonotonic frames, bounds, invalid timebase and unsupported rotation',()=>fixture(async out=>{
 const mutations=[m=>delete m.frames[0].pts,m=>m.frames[0].pts='N/A',m=>m.streams[0].nb_read_frames='9',m=>m.frames.reverse(),m=>m.streams[0].time_base='0/1',m=>m.streams[0].side_data_list=[{rotation:90}],m=>m.streams[0].disposition.attached_pic=1,m=>m.frames[0].interlaced_frame=1,m=>m.frames[0].crop_left=1,m=>m.streams[0].width=16000001,m=>m.frames=Array(100001).fill({})];
 for(const mutate of mutations){const m=metadata();mutate(m);await assert.rejects(select(out,m));}
 for(const time of [-1,4])await assert.rejects(select(out,metadata(),time));
 await writeFile(path.join(out,'metadata.json'),' '.repeat(8*1024*1024+1));
 assert.throws(()=>execFileSync(python,['-I',helper,'--select-video',path.join(out,'metadata.json'),path.join(out,'job.json'),path.join(out,'selection.json')],{stdio:'pipe'}),/Metadata byte limit/);
}));
test('actual extraction integer/timebase must agree, not rounded pts_time or another filter label',()=>fixture(async out=>{
 await select(out,metadata(['100','110']),1);
 const evidence=path.join(out,'evidence.json');
 const verify=()=>execFileSync(python,['-I',helper,'--verify-extraction',path.join(out,'selection.json'),evidence,'capture_fixture',path.join(out,'selection.json')],{stdio:'pipe'});
 await writeFile(evidence,JSON.stringify({stderr:'[showinfo@capture_fixture @ 0x1] config in time_base: 1/20, frame_rate: 1/1\n[showinfo@capture_fixture @ 0x1] n: 0 pts: 220 pts_time: 11.00000'}));verify();const result=JSON.parse(await readFile(path.join(out,'selection.json'),'utf8'));assert.equal(result.extractionVerified,true);assert.equal(result.extraction.pts,'220');
 for(const stderr of ['[showinfo@other @ 0x1] n: 0 pts: 110 pts_time: 11','[showinfo@capture_fixture @ 0x1] config in time_base: 1/20\n[showinfo@capture_fixture @ 0x1] n: 0 pts: 219 pts_time: 11.00000']){await writeFile(evidence,JSON.stringify({stderr}));assert.throws(verify);}
}));
test('first non-attached stream is mapped by actual stream index rather than default resolution',()=>fixture(async out=>{
 const m=metadata(['100','110']);m.streams=[{...m.streams[0],index:0,disposition:{attached_pic:1}},{...m.streams[0],index:4}];m.frames=m.frames.map(f=>({...f,stream_index:4}));
 assert.equal((await select(out,m,.5)).streamIndex,4);
}));
