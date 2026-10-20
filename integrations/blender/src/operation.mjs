import path from 'node:path';
export const descriptor = {
  name: 'blender_compare_view', implementationId: 'blender-compare-view.v1',
  description: 'Render a saved camera in a closed scene and compare an explicitly selected full reference frame. Diagnostic evidence, not geometric acceptance.',
  inputSchema: {type:'object',additionalProperties:false,required:['camera','width','height','samples','unitSystem','scaleLength'],properties:{camera:{type:'string',minLength:1,maxLength:200},width:{type:'integer',minimum:16,maximum:1600},height:{type:'integer',minimum:16,maximum:1600},samples:{type:'integer',minimum:1,maximum:128},unitSystem:{type:'string',enum:['NONE','METRIC','IMPERIAL']},scaleLength:{type:'number',exclusiveMinimum:0,maximum:1000000}}},
  annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:false}, maximumOutputBytes:65536
};
function settings(input) {
  if (!input || typeof input!=='object' || Array.isArray(input) || Object.keys(input).sort().join(',')!=='camera,height,samples,scaleLength,unitSystem,width') throw new Error('Expected only camera, width, height, samples, unitSystem, scaleLength');
  if(typeof input.camera!=='string'||input.camera.length<1||input.camera.length>200) throw new Error('Invalid camera');
  for(const key of ['width','height','samples']) if(!Number.isInteger(input[key])||input[key]<(key==='samples'?1:16)||input[key]>(key==='samples'?128:1600)) throw new Error('Invalid '+key);
  if(!['NONE','METRIC','IMPERIAL'].includes(input.unitSystem)||!Number.isFinite(input.scaleLength)||input.scaleLength<=0||input.scaleLength>1e6)throw new Error('Invalid units');
  return {...input};
}
export function createLocalCapabilities({port,resources,invocation}) {
  return [{...descriptor,execute:async(input,{signal})=>{
    const normalized=settings(input);
    if(!resources.scene||!resources.reference||Object.keys(resources).some(k=>!['scene','reference'].includes(k))) throw new Error('Bind exactly scene and reference resources');
    const job={...normalized,invocationId:invocation.id,model:resources.scene.path,reference:resources.reference.path};
    await port.writeJson('render-job.json',job);
    const run=async(tool,argv)=>{const r=await port.runTool({tool,argv,signal});if(r.exitCode!==0)throw new Error(tool+' comparison stage failed');};
    await run('python',['-I',path.join(invocation.assetDirectory,'assets/compare.py'),'--check']);
    await run('blender',['--background','--factory-startup','--disable-autoexec','--python-exit-code','1','--python',path.join(invocation.assetDirectory,'assets/capture.py'),'--',path.join(invocation.outputDirectory,'render-job.json'),invocation.outputDirectory]);
    await run('python',['-I',path.join(invocation.assetDirectory,'assets/compare.py'),resources.reference.path,invocation.outputDirectory]);
    const camera=await port.readJson('camera.json');
    const comparison=await port.readJson('comparison.json');
    return {settings:normalized,camera,comparison,sourceFrame:{policy:'explicit predecoded full image; original video/frame PTS lineage unavailable',actualPtsSeconds:null},outputs:[['render-job','render-job.json','application/json'],['render','render.png','image/png'],['camera','camera.json','application/json'],['comparison','comparison.json','application/json'],['reference-display','reference-display.png','image/png'],['render-display','render-display.png','image/png'],['overlay','overlay.png','image/png'],['difference','difference.png','image/png'],['edges','edges.png','image/png'],['side-by-side','side-by-side.jpg','image/jpeg'],['comparison-html','review.html','text/html']].map(([role,path,mimeType])=>({role,path,mimeType}))};
  }}];
}
