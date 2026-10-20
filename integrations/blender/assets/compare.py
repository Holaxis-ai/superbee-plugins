"""Generic full-frame diagnostic comparison, adapted from pilot normalize/compare.
Runtime dependency: Pillow, checked before rendering. No subprocess or network access.
"""
import base64, html, json, sys
from pathlib import Path
try:
    from PIL import __version__ as pillow_version
    from PIL import Image, ImageChops, ImageFilter, ImageOps, ImageDraw
except ImportError:
    raise SystemExit('Python runtime requires Pillow')
Image.MAX_IMAGE_PIXELS = 16000000

VIEWER_SCRIPT = r"""'use strict';
const data=JSON.parse(document.getElementById('payload').textContent);
const canvas=document.getElementById('comparison'),ctx=canvas.getContext('2d'),viewport=document.getElementById('viewport');
const status=document.getElementById('status'),alpha=document.getElementById('alpha'),zoom=document.getElementById('zoom');
const buttons=[...document.querySelectorAll('[data-mode]')],motion=matchMedia('(prefers-reduced-motion: reduce)');
const images={};let mode='side',phase=false,timer=null,ready=false;
const [width,height]=data.size;
function stop(){if(timer!==null){clearInterval(timer);timer=null;}phase=false;}
function draw(){
 if(!ready)return;
 const side=mode==='side',w=width*(side?2:1),fraction=Number(alpha.value)/100;
 canvas.width=w;canvas.height=height;
 const scale=zoom.value==='fit'?Math.min(1,viewport.clientWidth/w):Number(zoom.value);
 canvas.style.width=w*scale+'px';canvas.style.height=height*scale+'px';
 ctx.drawImage(images.reference,0,0);
 if(side)ctx.drawImage(images.render,width,0);
 else if(mode==='edges'||mode==='difference')ctx.drawImage(images[mode],0,0);
 else if(mode==='overlay'){ctx.globalAlpha=fraction;ctx.drawImage(images.render,0,0);ctx.globalAlpha=1;}
 else if(mode==='wipe'){ctx.save();ctx.beginPath();ctx.rect(width*fraction,0,width*(1-fraction),height);ctx.clip();ctx.drawImage(images.render,0,0);ctx.restore();ctx.strokeStyle='white';ctx.beginPath();ctx.moveTo(width*fraction,0);ctx.lineTo(width*fraction,height);ctx.stroke();}
 else if(mode==='blink'&&phase)ctx.drawImage(images.render,0,0);
 document.getElementById('labels').textContent=side?'SOURCE (left) / MODEL (right)':mode==='blink'?(phase?'MODEL':'SOURCE'):'SOURCE / MODEL — '+mode;
}
function choose(value){
 stop();if(value==='blink'&&(motion.matches||document.hidden))value='side';mode=value;
 buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===mode)));
 document.getElementById('alpha-label').textContent=mode==='wipe'?'Wipe position':'Model opacity';
 alpha.disabled=!['wipe','overlay'].includes(mode);
 status.textContent=mode==='blink'?'Blinking source/model every 650 ms. Change mode to stop.':'Mode: '+mode+'. Full frames; diagnostic evidence only.';
 if(mode==='blink')timer=setInterval(()=>{phase=!phase;draw();},650);
 draw();
}
buttons.forEach(button=>button.addEventListener('click',()=>choose(button.dataset.mode)));
alpha.addEventListener('input',draw);zoom.addEventListener('change',draw);window.addEventListener('resize',draw);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='blink')choose('side');});
window.addEventListener('pagehide',()=>choose('side'));
function reduced(){const blink=buttons.find(button=>button.dataset.mode==='blink');blink.disabled=motion.matches;blink.title=motion.matches?'Blink disabled by reduced-motion preference':'Alternate source and model';if(motion.matches&&mode==='blink')choose('side');}
motion.addEventListener('change',reduced);reduced();
Promise.all(Object.entries(data.images).map(([key,url])=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{images[key]=image;resolve();};image.onerror=reject;image.src=url;}))).then(()=>{
 ready=true;document.getElementById('fallback').hidden=true;canvas.hidden=false;document.getElementById('controls').hidden=false;choose('side');
}).catch(()=>{status.textContent='Interactive images unavailable. Static full-frame evidence remains below.';});
"""

def normalize(reference, rendered):
    with Image.open(reference) as image:
        if image.width*image.height > 16000000: raise ValueError('Reference image exceeds pixel bound')
        a = ImageOps.exif_transpose(image).convert('RGB')
    with Image.open(rendered) as image:
        b = image.convert('RGB')
    if abs((a.width/a.height)/(b.width/b.height)-1) > .002:
        raise ValueError('Aspect ratios differ; cropping, stretching and registration are refused')
    size = (min(b.width,1600),round(min(b.width,1600)*b.height/b.width))
    return a.resize(size,Image.Resampling.LANCZOS), b.resize(size,Image.Resampling.LANCZOS), {'referenceOriginalSize':list(a.size),'renderOriginalSize':list(b.size),'comparisonSize':list(size),'registration':'uniform full-frame resize only; no crop, warp or translation','exifOrientation':'applied to reference','pillowVersion':pillow_version}

def compare(reference, out):
    a,b,transform=normalize(reference,out/'render.png')
    a.save(out/'reference-display.png');b.save(out/'render-display.png')
    Image.blend(a,b,.5).save(out/'overlay.png')
    ImageChops.difference(a,b).save(out/'difference.png')
    ea=ImageOps.grayscale(a).filter(ImageFilter.FIND_EDGES)
    eb=ImageOps.grayscale(b).filter(ImageFilter.FIND_EDGES)
    Image.merge('RGB',(eb,ea,ImageChops.lighter(ea,eb))).save(out/'edges.png')
    board=Image.new('RGB',(a.width*2,a.height+32),'#172126')
    board.paste(a,(0,32));board.paste(b,(a.width,32))
    draw=ImageDraw.Draw(board);draw.text((10,10),'SOURCE',fill='white');draw.text((a.width+10,10),'MODEL',fill='white')
    board.save(out/'side-by-side.jpg',quality=92)
    invocation_id=json.loads((out/'render-job.json').read_text()).get('invocationId','')
    lineage_path=out/'lineage.json'
    lineage=json.loads(lineage_path.read_text()) if lineage_path.exists() else {'policy':'explicit predecoded image; video PTS unavailable','actualPtsSeconds':None}
    if lineage.get('extractionVerified') is True and transform['referenceOriginalSize'] != lineage.get('outputSize'):
        raise ValueError('Extracted frame geometry disagrees with selection')
    transform['sourceFrame']=lineage
    images={key:'data:image/png;base64,'+base64.b64encode((out/name).read_bytes()).decode('ascii') for key,name in [('reference','reference-display.png'),('render','render-display.png'),('edges','edges.png'),('difference','difference.png')]}
    payload=json.dumps({'size':list(a.size),'images':images},allow_nan=False).replace('<','\\u003c').replace('>','\\u003e').replace('&','\\u0026')
    import hashlib
    script_hash=base64.b64encode(hashlib.sha256(VIEWER_SCRIPT.encode()).digest()).decode('ascii')
    csp="default-src 'none'; script-src 'sha256-"+script_hash+"'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; frame-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'"
    controls=''.join('<button type="button" data-mode="'+mode+'" aria-pressed="'+('true' if mode=='side' else 'false')+'">'+label+'</button>' for mode,label in [('side','Side by side'),('overlay','Overlay'),('wipe','Wipe'),('blink','Blink'),('edges','Edges'),('difference','Difference')])
    report='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="'+html.escape(csp,quote=True)+'"><title>View comparison</title><style>html{color-scheme:dark}body{font:16px system-ui;background:#172126;color:white;margin:0;padding:16px;box-sizing:border-box;max-width:1640px}*{box-sizing:border-box}button,input,select{font:inherit;min-height:44px}button,select{background:#24373d;color:white;border:1px solid #92b9c1;border-radius:5px;padding:8px}button[aria-pressed=true]{background:#376571}button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #ffe084}button:disabled{opacity:.55}nav,.settings{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:12px 0}label{display:flex;gap:6px;align-items:center;flex-wrap:wrap}#viewport{width:100%;max-width:100%;max-height:75vh;overflow:auto;background:#060c0e}canvas{display:block}img{max-width:100%;height:auto}pre{white-space:pre-wrap;overflow-wrap:anywhere}p{overflow-wrap:anywhere}[hidden]{display:none!important}</style><h1>View comparison</h1><p>Invocation: '+html.escape(invocation_id)+'</p><p>Diagnostic pixels; no geometric accuracy score or acceptance. Full frames uniformly resized. Cyan edges are source; magenta edges are model. Pixel differences include lighting and materials.</p><div id="controls" hidden><nav aria-label="Comparison mode">'+controls+'</nav><div class="settings"><label><span id="alpha-label">Model opacity</span><input id="alpha" aria-labelledby="alpha-label" type="range" min="0" max="100" value="50"></label><label>Zoom<select id="zoom" aria-label="Comparison zoom"><option value="fit">Fit</option><option value="1">100%</option><option value="2">200%</option><option value="3">300%</option></select></label></div></div><p id="status" role="status">Static full-frame comparison. Interactive controls require the trusted local script.</p><p id="labels">SOURCE / MODEL</p><div id="viewport"><canvas id="comparison" aria-label="Source and model comparison" hidden></canvas></div><section id="fallback"><h2>Source — full frame</h2><img alt="Source full frame" src="'+images['reference']+'"><h2>Model — saved camera</h2><img alt="Model full frame" src="'+images['render']+'"><h2>Cyan source / magenta model edges</h2><img alt="Diagnostic edge comparison" src="'+images['edges']+'"></section><details><summary>Frame lineage and normalization</summary><pre>'+html.escape(json.dumps({'invocationId':invocation_id,'normalization':transform},indent=2,allow_nan=False))+'</pre></details><script id="payload" type="application/json">'+payload+'</script><script>'+VIEWER_SCRIPT+'</script></html>'
    (out/'review.html').write_text(report)
    (out/'comparison.json').write_text(json.dumps(transform,indent=2,allow_nan=False)+'\n')
    return transform
if __name__=='__main__':
    if sys.argv[1:] == ['--check']:
        print('Pillow available')
    else:
        compare(Path(sys.argv[1]),Path(sys.argv[2]))
