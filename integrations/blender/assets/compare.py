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
    sections=[]
    for name,label in [('side-by-side.jpg','Source and model'),('overlay.png','50% opacity overlay'),('edges.png','Cyan source / magenta model edges'),('difference.png','Pixel difference')]:
        mime='image/jpeg' if name.endswith('.jpg') else 'image/png'
        data=base64.b64encode((out/name).read_bytes()).decode('ascii')
        sections.append('<h2>'+html.escape(label)+'</h2><img alt="'+html.escape(label,quote=True)+'" src="data:'+mime+';base64,'+data+'">')
    report='<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:; style-src \'unsafe-inline\'"><title>View comparison</title><style>body{font:16px system-ui;background:#172126;color:white;margin:24px}img{max-width:100%}</style><h1>View comparison</h1><p>Invocation: '+html.escape(invocation_id)+'</p><p>Diagnostic pixels; no geometric accuracy score or acceptance. Full frames uniformly resized. Original video PTS is unavailable for this selected image.</p>'+''.join(sections)
    (out/'review.html').write_text(report)
    (out/'comparison.json').write_text(json.dumps(transform,indent=2)+'\n')
    return transform
if __name__=='__main__':
    if sys.argv[1:] == ['--check']:
        print('Pillow available')
    else:
        compare(Path(sys.argv[1]),Path(sys.argv[2]))
