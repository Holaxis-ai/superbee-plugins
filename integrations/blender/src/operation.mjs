import path from 'node:path';
const imageProperties={camera:{type:'string',minLength:1,maxLength:200},width:{type:'integer',minimum:16,maximum:1600},height:{type:'integer',minimum:16,maximum:1600},samples:{type:'integer',minimum:1,maximum:128},unitSystem:{type:'string',enum:['NONE','METRIC','IMPERIAL']},scaleLength:{type:'number',exclusiveMinimum:0,maximum:1000000}};
const imageKeys=Object.keys(imageProperties);
export const descriptor = {
  name:'blender_compare_view',implementationId:'blender-compare-view.v2',
  description:'Render a saved camera in a closed scene and compare a selected full image or an exact decoded video frame. Diagnostic evidence, not geometric acceptance.',
  inputSchema:{type:'object',oneOf:[{type:'object',additionalProperties:false,required:imageKeys,properties:imageProperties},{type:'object',additionalProperties:false,required:[...imageKeys,'referenceKind','referenceTimeSeconds'],properties:{...imageProperties,referenceKind:{const:'video'},referenceTimeSeconds:{type:'number',minimum:0}}}]},
  annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:false},maximumOutputBytes:65536
};
function settings(input) {
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Expected closed image or video settings');
  const video=input.referenceKind==='video';
  const keys=video?[...imageKeys,'referenceKind','referenceTimeSeconds']:imageKeys;
  if(Object.keys(input).sort().join(',')!==[...keys].sort().join(','))throw Error('Expected only camera, width, height, samples, unitSystem, scaleLength; video also requires referenceKind and referenceTimeSeconds');
  if(typeof input.camera!=='string'||input.camera.length<1||input.camera.length>200)throw Error('Invalid camera');
  for(const key of ['width','height','samples'])if(!Number.isInteger(input[key])||input[key]<(key==='samples'?1:16)||input[key]>(key==='samples'?128:1600))throw Error('Invalid '+key);
  if(!['NONE','METRIC','IMPERIAL'].includes(input.unitSystem)||!Number.isFinite(input.scaleLength)||input.scaleLength<=0||input.scaleLength>1e6)throw Error('Invalid units');
  if(video&&(!Number.isFinite(input.referenceTimeSeconds)||input.referenceTimeSeconds<0))throw Error('Invalid requested video time');
  return {...input};
}
export function createLocalCapabilities({port,resources,invocation}) {
  return [{...descriptor,execute:async(input,{signal})=>{
    const normalized=settings(input),video=normalized.referenceKind==='video',roles=video?['scene','video']:['scene','reference'];
    if(!resources||Object.keys(resources).sort().join(',')!==roles.sort().join(',')||roles.some(role=>!resources[role]||typeof resources[role].path!=='string'))throw Error('Bind exactly scene and '+(video?'video':'reference')+' resources');
    const out=name=>path.join(invocation.outputDirectory,name),asset=name=>path.join(invocation.assetDirectory,'assets',name);
    const run=async(tool,argv)=>{const r=await port.runTool({tool,argv,signal});if(r.exitCode!==0)throw Error(tool+' comparison stage failed');return r;};
    let reference=video?out('reference.png'):resources.reference.path;
    const job={...normalized,invocationId:invocation.id,model:resources.scene.path,reference};
    const outputs=[];
    if(video){
      if(typeof resources.video.logicalRef!=='string'||!resources.video.logicalRef||resources.video.logicalRef.length>256||path.isAbsolute(resources.video.logicalRef)||typeof resources.video.sha256!=='string'||!/^sha256:[a-f0-9]{64}$/.test(resources.video.sha256))throw Error('Captured video identity required');
      job.sourceVideo={sha256:resources.video.sha256,logicalRef:resources.video.logicalRef};
    }
    await port.writeJson('render-job.json',job);
    let sourceFrame={policy:'explicit predecoded full image; original video/frame PTS lineage unavailable',actualPtsSeconds:null};
    if(video){
      const mediaInput=['-protocol_whitelist','file','-format_whitelist','mov','-f','mov','-enable_drefs','0','-use_absolute_path','0'];
      const probed=await run('ffprobe',['-v','error','-show_error',...mediaInput,'-select_streams','v','-show_streams','-show_frames','-count_frames','-show_entries','stream=index,codec_type,width,height,time_base,nb_read_frames,sample_aspect_ratio,field_order:stream_disposition=attached_pic:stream_side_data=rotation,displaymatrix:stream_tags=rotate:frame=pts,stream_index,width,height,interlaced_frame,crop_top,crop_bottom,crop_left,crop_right,sample_aspect_ratio','-of','json','-o',out('video-metadata.json'),resources.video.path]);
      if(probed.stderr?.trim())throw Error('Video probe reported incomplete or invalid media');
      await run('python',['-I',asset('capture.py'),'--select-video',out('video-metadata.json'),out('render-job.json'),out('selection.json')]);
      const selection=await port.readJson('selection.json');
      if(!Number.isSafeInteger(selection.streamIndex)||selection.streamIndex<0||!Number.isSafeInteger(selection.decodedFrameIndex)||selection.decodedFrameIndex<0||selection.decodedFrameIndex>=100000)throw Error('Invalid selected video frame');
      const label='capture_'+invocation.id.replace(/[^A-Za-z0-9_-]/g,'');
      const extracted=await run('ffmpeg',['-hide_banner','-loglevel','info','-nostdin','-xerror','-copyts','-noautorotate',...mediaInput,'-i',resources.video.path,'-map','0:'+selection.streamIndex,'-an','-sn','-dn','-vf',`select=eq(n\\,${selection.decodedFrameIndex}),showinfo@${label}`,'-fps_mode','passthrough','-frames:v','1','-map_metadata','-1','-threads','1','-f','image2','-update','1',reference]);
      await port.writeJson('extraction-evidence.json',{stderr:extracted.stderr});
      await run('python',['-I',asset('capture.py'),'--verify-extraction',out('selection.json'),out('extraction-evidence.json'),label,out('selection.json')]);
      sourceFrame=await port.readJson('selection.json');
      if(sourceFrame.extractionVerified!==true)throw Error('Unverified extracted video frame');
      outputs.push(['video-metadata','video-metadata.json','application/json'],['extraction-evidence','extraction-evidence.json','application/json'],['selection','selection.json','application/json'],['reference','reference.png','image/png']);
    }
    await run('python',['-I',asset('compare.py'),'--check']);
    await run('blender',['--background','--factory-startup','--disable-autoexec','--python-exit-code','1','--python',asset('capture.py'),'--',out('render-job.json'),invocation.outputDirectory]);
    await port.writeJson('lineage.json',sourceFrame);
    await run('python',['-I',asset('compare.py'),reference,invocation.outputDirectory]);
    const camera=await port.readJson('camera.json'),comparison=await port.readJson('comparison.json');
    return {settings:normalized,camera,comparison,sourceFrame,outputs:[...outputs,['lineage','lineage.json','application/json'],['render-job','render-job.json','application/json'],['render','render.png','image/png'],['camera','camera.json','application/json'],['comparison','comparison.json','application/json'],['reference-display','reference-display.png','image/png'],['render-display','render-display.png','image/png'],['overlay','overlay.png','image/png'],['difference','difference.png','image/png'],['edges','edges.png','image/png'],['side-by-side','side-by-side.jpg','image/jpeg'],['comparison-html','review.html','text/html']].map(([role,path,mimeType])=>({role,path,mimeType}))};
  }}];
}
