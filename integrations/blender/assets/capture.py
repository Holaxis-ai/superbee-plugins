"""Read-only saved-camera capture from a packed, code-free scene.
Adapted from the local comparison pilot's capture primitive; no domain lights or registry.
"""
import json, math, sys
from pathlib import Path
def has_compositor_or_sequence(scene):
    # Blender 5 uses compositing_node_group; legacy use_nodes may always be True.
    # Inspect actual trees on both APIs, conservatively refusing either one.
    return (getattr(scene, 'compositing_node_group', None) is not None
            or getattr(scene, 'node_tree', None) is not None
            or getattr(scene, 'sequence_editor', None) is not None)

def capture_blender():
    import bpy
    job_path, output = sys.argv[sys.argv.index('--') + 1:]
    job = json.loads(Path(job_path).read_text())
    out = Path(output)
    bpy.ops.wm.open_mainfile(filepath=job['model'], load_ui=False, use_scripts=False)
    # Refuse runtime-resolved dependencies. Packed scene is the only admitted closure.
    if bpy.data.libraries or bpy.data.texts:
        raise ValueError('Export a scene without linked libraries or embedded scripts')
    for collection in (getattr(bpy.data, prop.identifier) for prop in bpy.data.bl_rna.properties if prop.type == 'COLLECTION'):
        for item in collection:
            if getattr(getattr(item, 'animation_data', None), 'drivers', None):
                raise ValueError('Export a scene without drivers')
    for image in bpy.data.images:
        if image.source not in {'GENERATED', 'VIEWER'} and (image.source != 'FILE' or not (image.packed_file or len(image.packed_files))):
            raise ValueError('Export images as packed single files')
    for font in bpy.data.fonts:
        if font.filepath != '<builtin>' and not font.packed_file:
            raise ValueError('Export packed fonts')
    trees = list(bpy.data.node_groups) + [item.node_tree for collection in (bpy.data.materials, bpy.data.worlds, bpy.data.lights, bpy.data.scenes) for item in collection if getattr(item, 'node_tree', None)]
    for tree in trees:
        if getattr(getattr(tree, 'animation_data', None), 'drivers', None):
            raise ValueError('Node drivers unsupported')
        if any(node.bl_idname in {'ShaderNodeScript', 'ShaderNodeTexIES'} for node in tree.nodes):
            raise ValueError('External shader code/light profiles unsupported')
    if bpy.data.textures or bpy.data.movieclips or bpy.data.sounds or bpy.data.volumes or bpy.data.cache_files:
        raise ValueError('External movie, audio, volume or cache dependencies unsupported')
    for obj in bpy.data.objects:
        if obj.particle_systems or obj.rigid_body or obj.rigid_body_constraint:
            raise ValueError('Simulations unsupported; export evaluated geometry')
        if any(mod.type in {'NODES','FLUID','CLOTH','SOFT_BODY','OCEAN','MESH_CACHE','MESH_SEQUENCE_CACHE','PARTICLE_SYSTEM','DYNAMIC_PAINT'} for mod in obj.modifiers):
            raise ValueError('Runtime modifiers unsupported; export evaluated geometry')
    s = bpy.context.scene
    if has_compositor_or_sequence(s):
        raise ValueError('Compositor and sequence dependencies unsupported')
    if s.unit_settings.system != job['unitSystem'] or not math.isclose(s.unit_settings.scale_length, job['scaleLength'], rel_tol=1e-7, abs_tol=1e-9):
        raise ValueError('Selected units do not match scene')
    camera = s.objects.get(job['camera'])
    if camera is None or camera.type != 'CAMERA':
        raise ValueError('Selected saved camera absent')
    s.camera = camera
    s.render.engine = 'CYCLES'
    s.cycles.device = 'CPU'
    s.cycles.shading_system = False
    s.cycles.samples = job['samples']
    s.cycles.seed = 0
    s.cycles.use_animated_seed = False
    s.render.resolution_x, s.render.resolution_y = job['width'], job['height']
    s.render.resolution_percentage = 100
    s.render.pixel_aspect_x = s.render.pixel_aspect_y = 1
    s.render.use_border = False
    s.render.use_compositing = False
    s.render.use_sequencer = False
    s.render.image_settings.file_format = 'PNG'
    s.render.image_settings.color_mode = 'RGB'
    s.render.filepath = str(out / 'render.png')
    receipt = {'blenderVersion':bpy.app.version_string,'scene':s.name,'camera':camera.name,'matrixWorld':[list(row) for row in camera.matrix_world], 'lensMm':camera.data.lens,'cameraType':camera.data.type,'sensorWidthMm':camera.data.sensor_width,'sensorFit':camera.data.sensor_fit,'shiftX':camera.data.shift_x,'shiftY':camera.data.shift_y,'clipStart':camera.data.clip_start,'clipEnd':camera.data.clip_end,'unitSystem':s.unit_settings.system,'scaleLength':s.unit_settings.scale_length,'frame':s.frame_current,'engine':s.render.engine,'device':'CPU','samples':job['samples'],'seed':0,'size':[job['width'],job['height']],'viewTransform':s.view_settings.view_transform,'look':s.view_settings.look,'exposure':s.view_settings.exposure,'gamma':s.view_settings.gamma,'architectureHiddenByAdapter':False,'modelSaved':False,'closure':'packed scene; no scripts, drivers, external media or simulation caches'}
    (out / 'camera.json').write_text(json.dumps(receipt, indent=2)+'\n')
    bpy.ops.render.render(write_still=True)

# Metadata helpers run in isolated Python, with no Blender import, subprocess or network.
METADATA_BYTES = 8 * 1024 * 1024
MAX_FRAMES = 100000
MAX_PIXELS = 16000000

def bounded_json(file):
    from decimal import Decimal
    with Path(file).open('rb') as handle:
        import os, stat
        size = os.fstat(handle.fileno())
        if not stat.S_ISREG(size.st_mode) or size.st_size > METADATA_BYTES:
            raise ValueError('Metadata byte limit')
        raw = handle.read(METADATA_BYTES + 1)
        if len(raw) > METADATA_BYTES:
            raise ValueError('Metadata byte limit')
    return json.loads(raw, parse_float=Decimal)

def integer(value):
    import re
    if isinstance(value, bool) or not isinstance(value, (str, int)) or not re.fullmatch(r'-?(?:0|[1-9][0-9]*)', str(value)) or len(str(value)) > 32:
        raise ValueError('Missing or invalid integer timestamp/stream metadata')
    return int(value)

def rational(value):
    from fractions import Fraction
    import re
    if not isinstance(value, str) or not re.fullmatch(r'[1-9][0-9]{0,15}/[1-9][0-9]{0,15}', value):
        raise ValueError('Invalid positive time base')
    return Fraction(value)

def exact(value):
    return {'numerator': str(value.numerator), 'denominator': str(value.denominator)}

def save(file, value):
    from decimal import Decimal
    def display_number(item):
        if isinstance(item, Decimal):
            return float(item)
        raise TypeError('Unsupported receipt value')
    Path(file).write_text(json.dumps(value, indent=2, allow_nan=False, default=display_number) + '\n')

def select_video(metadata, job_file, output):
    from fractions import Fraction
    from decimal import Decimal
    data = bounded_json(metadata)
    job = bounded_json(job_file)
    if data.get('error') is not None:
        raise ValueError('Incomplete video probe')
    streams, frames = data.get('streams'), data.get('frames')
    if not isinstance(streams, list) or not 1 <= len(streams) <= 64 or not isinstance(frames, list) or not 1 <= len(frames) <= MAX_FRAMES:
        raise ValueError('Missing or excessive streams/frames')
    candidates = [s for s in streams if s.get('codec_type') == 'video' and s.get('disposition', {}).get('attached_pic') == 0]
    if not candidates:
        raise ValueError('No non-attached video stream')
    stream = candidates[0]
    stream_index = integer(stream.get('index'))
    if stream_index < 0 or len({integer(s.get('index')) for s in streams}) != len(streams):
        raise ValueError('Invalid stream identity')
    time_base = rational(stream.get('time_base'))
    width, height = integer(stream.get('width')), integer(stream.get('height'))
    if width <= 0 or height <= 0 or width * height > MAX_PIXELS or stream.get('sample_aspect_ratio') != '1:1' or stream.get('field_order') not in ('progressive', 'unknown'):
        raise ValueError('Unsupported video geometry')
    # Rotation metadata is conservatively refused; decode never silently autorotates.
    for item in stream.get('side_data_list', []):
        if 'rotation' in item or 'displaymatrix' in item:
            raise ValueError('Display rotation is unsupported; export an upright standalone video')
    if 'rotate' in stream.get('tags', {}):
        raise ValueError('Display rotation is unsupported; export an upright standalone video')
    selected = [f for f in frames if integer(f.get('stream_index')) == stream_index]
    if not selected or integer(stream.get('nb_read_frames')) != len(selected):
        raise ValueError('Incomplete frame enumeration')
    if any(integer(f.get('interlaced_frame')) != 0 or f.get('sample_aspect_ratio') != '1:1' or any(integer(f.get(k, 0)) != 0 for k in ['crop_top','crop_bottom','crop_left','crop_right']) for f in selected):
        raise ValueError('Interlaced, cropped or non-square frames unsupported')
    ticks = [integer(f.get('pts')) for f in selected]
    if any(a > b for a, b in zip(ticks, ticks[1:])):
        raise ValueError('Nonmonotonic presentation timestamps')
    if any(integer(f.get('width')) != width or integer(f.get('height')) != height for f in selected):
        raise ValueError('Changing video geometry unsupported')
    requested = job.get('referenceTimeSeconds')
    if isinstance(requested, bool) or not isinstance(requested, (int, Decimal)):
        raise ValueError('Invalid requested presentation time')
    requested = Fraction(requested)
    origin = ticks[0] * time_base
    duration = (ticks[-1] - ticks[0]) * time_base
    if not 0 <= requested <= duration:
        raise ValueError('Requested time outside decoded presentation range')
    absolute = origin + requested
    index = min(range(len(ticks)), key=lambda i: abs(ticks[i] * time_base - absolute))
    actual = ticks[index] * time_base
    receipt = {'version': 1, 'policy': 'nearest raw presentation timestamp; first decoded index wins ties', 'origin': 'first-decoded-frame', 'streamIndex': stream_index, 'decodedFrameIndex': index, 'frameCount': len(ticks), 'firstPts': str(ticks[0]), 'selectedPts': str(ticks[index]), 'timeBase': {'numerator': str(time_base.numerator), 'denominator': str(time_base.denominator)}, 'requestedRelativeSeconds': exact(requested), 'originSeconds': exact(origin), 'durationSeconds': exact(duration), 'requestedAbsoluteSeconds': exact(absolute), 'selectedAbsoluteSeconds': exact(actual), 'errorSeconds': exact(actual - absolute), 'actualPtsSeconds': float(actual), 'requestedRelativeDisplaySeconds': float(requested), 'codedSize': [width, height], 'outputSize': [width, height], 'orientation': 'upright square pixels; rotation metadata refused; autorotation disabled', 'source': job['sourceVideo'], 'extractionVerified': False}
    save(output, receipt)

def verify_extraction(selection_file, evidence_file, label, output):
    from fractions import Fraction
    import re
    selection = bounded_json(selection_file)
    evidence = bounded_json(evidence_file)
    # Only our named showinfo instance can provide equality authority; pts_time is ignored.
    text = evidence.get('stderr')
    if not isinstance(text, str) or len(text.encode()) > 65536 or not re.fullmatch(r'[A-Za-z0-9_-]{1,80}', label):
        raise ValueError('Invalid extraction evidence')
    lines = [line for line in text.splitlines() if '[showinfo@' + label + ' @' in line]
    bases = [re.search(r'config in time_base:\s*([0-9]+/[0-9]+)', line).group(1) for line in lines if re.search(r'config in time_base:\s*([0-9]+/[0-9]+)', line)]
    observed = [re.search(r'\bn:\s*([0-9]+)\s+pts:\s*(-?[0-9]+)', line) for line in lines]
    observed = [m for m in observed if m]
    if len(bases) != 1 or len(observed) != 1 or observed[0].group(1) != '0':
        raise ValueError('Missing or ambiguous extraction PTS')
    base = rational(bases[0]); pts = integer(observed[0].group(2))
    expected_base = Fraction(int(selection['timeBase']['numerator']), int(selection['timeBase']['denominator']))
    if pts * base != int(selection['selectedPts']) * expected_base:
        raise ValueError('Extracted PTS disagrees with probe selection')
    selection['extraction'] = {'pts': str(pts), 'timeBase': {'numerator': str(base.numerator), 'denominator': str(base.denominator)}, 'filterLabel': label}
    selection['extractionVerified'] = True
    save(output, selection)

if __name__ == '__main__':
    if sys.argv[1:2] == ['--select-video']:
        select_video(*sys.argv[2:])
    elif sys.argv[1:2] == ['--verify-extraction']:
        verify_extraction(*sys.argv[2:])
    else:
        capture_blender()
