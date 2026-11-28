# Look-dev check for the stylized cartoon 3D cast (run before any production, and after every change to human.py / the skin shader).
# Renders a portrait sheet: close-up (face shading: SSS, satin highlights on forehead/nose/cheeks/chin, eye catchlights,
# self-shadowing), medium (hands + fingers, clothing shadows) and full body (contact shadow, AO, silhouette) for each character,
# lit with the stylized-cinematic rig (large soft key, fill, rim, bounce) on a dressed backdrop with soft volumetric haze.
#   python scripts/toon_lookdev.py --out /tmp/lookdev [--res 540x960] [--samples 32] [--style toon|realistic] [--cast doctor,nurse,old]
import sys, os, math
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, '..', 'blender', 'cinema'))
import bpy
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
import ck; ck.set_fps(24)
from ck import *
import human
argv = sys.argv[1:]
def arg(n, d=None): return argv[argv.index(n) + 1] if n in argv else d
OUT = arg('--out', '/tmp/lookdev'); os.makedirs(OUT, exist_ok=True)
RES = tuple(int(x) for x in arg('--res', '540x960').split('x')); SAMPLES = int(arg('--samples', '32'))
human.set_style(arg('--style', 'toon')); CAST = arg('--cast', 'doctor,nurse').split(',')
sc = bpy.context.scene; C = sc.collection
setup_render(sc, RES, SAMPLES, mblur=False, noise=0.03)
world(sc, '#0d0f14', 1.0)
# backdrop: tiled wall + wood floor + a cabinet and a window glow, so materials have something to reflect and separate from
floor = ck.m_floor_planks('#7a5536', '#3e2a1a'); wall = ck.m_plaster('#9fb0a6', '#5f6a60', 0.3)
box(C, (0, 0, -0.05), (14, 14, 0.1), floor, 0)
w = plane(C, (0, 1.6, 2.5), (12, 5), wall, rot=(math.pi / 2, 0, 0))
box(C, (1.4, 1.35, 0.6), (0.7, 0.4, 1.2), ck.m_wood('#6a3d22', '#33190c'), 0.02)
box(C, (-1.5, 1.4, 0.45), (0.9, 0.35, 0.9), ck.m_enamel('#e6e2d6', 0.2, chips=0.2), 0.02)
for i, x in enumerate((-0.4, 0.4)): sphere(C, (x - 1.5, 1.35, 0.95), 0.09, ck.m_glass('#cfe6f0'))
hz = haze(C, (0, 0.8, 1.5), (6, 1.4, 3), 0.008, '#fff2e0', 0.45)
people = []
def make(kind, x):
    if kind == 'doctor': return human.Human(C, 'doc', 'doctor', 1.78, skin='#e2ad8c', hair='#2a1a10', hair_style='side_part', age=25, eyes='#4a6a8a', loc=(x, 0, 0))
    if kind == 'old': return human.Human(C, 'old', 'doctor', 1.76, skin='#dca88c', hair='#b8b4ac', hair_style='bald_crown', glasses=True, moustache=True, age=60, loc=(x, 0, 0))
    if kind == 'nurse': return human.Human(C, 'nurse', 'nurse', 1.64, female=True, skin='#eab89c', hair='#5a3420', hair_style='bun', eyes='#5a7a4a', loc=(x, 0, 0))
    if kind == 'scrubs': return human.Human(C, 'scrub', 'scrubs', 1.7, skin='#b88464', hair='#1a120c', hair_style='side_part', loc=(x, 0, 0))
xs = [(-0.42 + 0.84 * i / max(1, len(CAST) - 1)) if len(CAST) > 1 else 0.0 for i in range(len(CAST))]
for k_, x in zip(CAST, xs):
    h = make(k_, x); people.append(h)
    h.pose(1, {'upper_arm.L': (0.35, 0, 0.12), 'forearm.L': (-1.1, 0, 0.1), 'hand.L': (0, -0.3, 0)}); h.fingers(1, 'L', 'relaxed'); h.fingers(1, 'R', 'open')
    h.emote(1, 'earnest'); h.look(1, 0.0, -0.05)
sc.frame_set(1); bpy.context.view_layer.update()
head = people[0].head_world()
# stylized-cinematic rig: big soft warm key 40 deg, cool soft fill 1:4, warm-white rim, floor bounce
key_ = area(C, tuple(head + Vector((2.0, -1.3, 1.1))), tuple(head), 1.6, '#ffe0c0', 300, 'key')
fill = area(C, tuple(head + Vector((-2.0, -1.6, 0.2))), tuple(head), 3.0, '#cfdcff', 28, 'fill', shadow=False)
rim = area(C, tuple(head + Vector((-1.0, 1.4, 0.9))), tuple(head), 0.8, '#fff1dc', 260, 'rim', spread=70)
bounce = area(C, (0, -0.8, 0.05), (0, 0, 1.0), 2.0, '#ffcf9a', 25, 'bounce', shadow=False)
cam_d = bpy.data.cameras.new('cam'); cam = bpy.data.objects.new('cam', cam_d); C.objects.link(cam); sc.camera = cam
cam_d.dof.use_dof = True
def shoot(name, target, dist, lens, fstop, h=0.0):
    t = Vector(target); cam.location = t + Vector((0.25 * dist, -dist, h)); d = t - cam.location
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler(); cam_d.lens = lens; cam_d.dof.aperture_fstop = fstop; cam_d.dof.focus_distance = d.length
    sc.render.filepath = os.path.join(OUT, name + '.png'); bpy.ops.render.render(write_still=True); print('wrote', sc.render.filepath)
for p in people:
    hw = p.head_world(); nm = p.name
    shoot(nm + '_closeup', hw + Vector((0, 0, -0.03)), 1.1, 85, 4.0)
shoot('group_medium', Vector((0, 0, 1.25)), 2.6, 50, 4.0, 0.1)
shoot('group_full', Vector((0, 0, 0.95)), 4.6, 40, 5.6, 0.2)
