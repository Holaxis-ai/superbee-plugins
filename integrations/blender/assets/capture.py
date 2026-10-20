"""Read-only saved-camera capture from a packed, code-free scene.
Adapted from the local comparison pilot's capture primitive; no domain lights or registry.
"""
import json, math, sys
from pathlib import Path
import bpy
def has_compositor_or_sequence(scene):
    # Blender 5 uses compositing_node_group; legacy use_nodes may always be True.
    # Inspect actual trees on both APIs, conservatively refusing either one.
    return (getattr(scene, 'compositing_node_group', None) is not None
            or getattr(scene, 'node_tree', None) is not None
            or getattr(scene, 'sequence_editor', None) is not None)

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
