# "The Road Home" - Werner Forssmann, 1929. Cinematic documentary build (voiceover-to-video v5, cinema kit).
# One set per process (lesson L043).  Usage:
#   python film.py --set or --stills 1A,4C,...      (renders the mid frame of each listed shot)
#   python film.py --set or --render [--range a-b]   (renders every frame of the set's shots into frames/)
#   python film.py --set prepass                     (renders tex/xray_raw.png + tex/heart_illus.png from the anatomy model)
# Options: --res 720x1280 --samples 24 --out DIR
import sys, os, json, math, time
HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.environ.get('CINEMA_KIT', os.path.join(HERE, '..', '..', 'blender', 'cinema'))
sys.path.insert(0, KIT)
import bpy
from mathutils import Vector, Euler
bpy.ops.wm.read_factory_settings(use_empty=True)
import ck
ck.set_fps(24)
from ck import *
import human, anatomy, props29 as P

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
def arg(n, d=None): return argv[argv.index(n) + 1] if n in argv else d
SET = arg('--set', 'or'); RES = tuple(int(x) for x in arg('--res', '720x1280').split('x')); SAMPLES = int(arg('--samples', '24'))
SB = json.load(open(os.path.join(HERE, 'storyboard.json'))); WORDS = json.load(open(os.path.join(HERE, 'align', 'words.json')))
SHOTS = {s['id']: s for s in SB['shots']}; TEX = os.path.join(HERE, 'tex'); os.makedirs(TEX, exist_ok=True)
TIPUV = os.path.join(TEX, 'xray_tip.json')
sc = bpy.context.scene; sc.name = SET; C = sc.collection
setup_render(sc, RES, SAMPLES, mblur=False, noise=0.03)
def shots_of(s): return [x for x in SB['shots'] if x['set'] == s]
def T(sid): return SHOTS[sid]['t0'], SHOTS[sid]['t1']
def face(frm, to): d = Vector(tuple(to)[:2]) - Vector(tuple(frm)[:2]); return math.atan2(d.x, -d.y)
def snap(o, path, t, value):
    """Teleport a property exactly at a cut: hold the previous value up to f-1 (constant), jump to value at f."""
    f = F(t); sc.frame_set(f - 1); cur = getattr(o, path); cur = cur.copy() if hasattr(cur, 'copy') else cur
    setattr(o, path, cur); o.keyframe_insert(path, frame=f - 1); setattr(o, path, value); o.keyframe_insert(path, frame=f)
    for fc in ck._fcurves(o.animation_data.action):
        if fc.data_path == path:
            for kp in fc.keyframe_points:
                if abs(kp.co[0] - (f - 1)) < 0.5: kp.interpolation = 'CONSTANT'
def constant_before(o, path, t):
    if not o.animation_data: return
    f = F(t)
    for fc in ck._fcurves(o.animation_data.action):
        if fc.data_path == path:
            for kp in fc.keyframe_points:
                if abs(kp.co[0] - (f - 1)) < 0.5: kp.interpolation = 'CONSTANT'
def light_cut(l, t0, t1, energy, before=0.0):
    """Light that exists only inside [t0, t1) (for per-shot lighting in a shared set)."""
    l.data.energy = before; l.data.keyframe_insert('energy', frame=F(t0) - 1)
    l.data.energy = energy; l.data.keyframe_insert('energy', frame=F(t0)); l.data.keyframe_insert('energy', frame=F(t1) - 1)
    l.data.energy = before; l.data.keyframe_insert('energy', frame=F(t1))
    for fc in ck._fcurves(l.data.animation_data.action):
        for kp in fc.keyframe_points: kp.interpolation = 'CONSTANT'
def shot_lights(spec):
    """spec: list of (light_obj, {shot_id: energy})."""
    for l, d in spec:
        for sid, e in d.items(): a, b = T(sid); light_cut(l, a, b, e)
def exposure(spec, base=0.0):
    """Per-shot exposure (stops), stepped at the cuts: spec = {shot_id: ev}."""
    vs = sc.view_settings; vs.exposure = base; vs.keyframe_insert('exposure', frame=0)
    for sid, ev in spec.items():
        a, b = T(sid); vs.exposure = ev; vs.keyframe_insert('exposure', frame=F(a)); vs.exposure = base; vs.keyframe_insert('exposure', frame=F(b))
    for fc in ck._fcurves(sc.animation_data.action):
        for kp in fc.keyframe_points: kp.interpolation = 'CONSTANT'
def wt(word, after=0.0, nth=0):
    hits = [w for w in WORDS if w[0].split('(')[0] == word and w[1] >= after]; return hits[nth][1] if hits else None
M = {}   # shared materials

# ====================================================================== PREPASS: X-ray film + heart illustration
def build_anatomy(arm_ab=-0.5, solid_skin=False):
    gm = anatomy.m_ghost_skin()
    h = human.Human(C, 'ghost', 'ghost', ghost_mat=gm)
    h.pose(1, {'upper_arm.L': (0.15, 0, arm_ab), 'forearm.L': (-0.12, 0, 0.05), 'upper_arm.R': (0.05, 0, 0.18), 'forearm.R': (-0.1, 0, 0), 'head': (0.05, 0, 0.0)})
    sc.frame_set(1); bpy.context.view_layer.update()
    A = anatomy.Anatomy(C, h); A.skeleton(); A.heart(); A.veins('L'); A.veins('R', 0.0038); A.catheter('L')
    return h, A, gm
if SET == 'prepass':
    world(sc, '#000000', 0.0)
    h, A, gm = build_anatomy(-0.42)
    A.grow(0, 1.0); sc.frame_set(1)
    ghost_objs = [o for o in C.objects if o.name.startswith('ghost_') and o.type == 'MESH']
    A.xray_mode(ghost_objs)
    cd = bpy.data.cameras.new('xcam'); cd.type = 'ORTHO'; cd.ortho_scale = 0.78; cam = bpy.data.objects.new('xcam', cd); C.objects.link(cam)
    cam.location = (0.13, -3, 1.27); cam.rotation_euler = (math.pi / 2, 0, 0); sc.camera = cam
    sc.render.resolution_x, sc.render.resolution_y = 1000, 1200; sc.cycles.samples = 16; sc.render.use_motion_blur = False
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
    sc.render.filepath = os.path.join(TEX, 'xray_raw.png'); bpy.ops.render.render(write_still=True)
    # tip position on the film (normalised, origin top-left) for the reveal marker
    from bpy_extras.object_utils import world_to_camera_view
    tip = A.tip_pos(1.0); uv = world_to_camera_view(sc, cam, tip); json.dump({'u': uv.x, 'v': 1 - uv.y}, open(TIPUV, 'w'))
    print('PREPASS xray done', uv)
    # heart illustration for the 1929 chart: heart alone, soft light, paper background
    for o in list(C.objects):
        if o not in A.parts['heart'] and o != A.heart_root and o.type != 'CAMERA': o.hide_render = True
    for o in A.parts['heart']: o.data.materials.clear(); o.data.materials.append(anatomy.m_heart() if o.name.startswith('heart') else anatomy.m_vessel('#7a2a3a', 0.0, 'v'))
    world(sc, '#efe6cf', 1.0); sc.view_settings.view_transform = 'Standard'
    area(C, (0.5, -1.2, 1.9), tuple(A.heart_root.location), 1.2, '#fff4e0', 120); area(C, (-0.6, -0.8, 1.2), tuple(A.heart_root.location), 1.0, '#ffffff', 40, shadow=False)
    hc = A.heart_root.location; cd2 = bpy.data.cameras.new('hcam'); cd2.type = 'ORTHO'; cd2.ortho_scale = 0.3
    cam2 = bpy.data.objects.new('hcam', cd2); C.objects.link(cam2); cam2.location = (hc.x, hc.y - 2, hc.z + 0.03); cam2.rotation_euler = (math.pi / 2, 0, 0); sc.camera = cam2
    sc.render.resolution_x, sc.render.resolution_y = 900, 1000; sc.render.filepath = os.path.join(TEX, 'heart_illus.png'); bpy.ops.render.render(write_still=True)
    print('PREPASS heart done'); sys.exit(0)

def tex(name): return os.path.join(TEX, name)

# ====================================================================== SET: anatomy
def set_anatomy():
    world(sc, '#010204', 1.0)
    h, A, gm = build_anatomy()
    A.glow_road('L', 78.25, 81.55, '#a8d0ff', 7.0, 0.0046)
    # catheter timeline (snaps at cuts): fully in for the hook, enters 33.9-40, hidden 76.2-81.9, final glide 81.95-83.6
    o1, o2, tip, inner = A.cath
    for o in (o1, o2, tip): key_vis(o, 0, True)
    A.grow(0.0, 1.0); A.grow(5.0, 1.0)
    A.grow(32.0, 0.0); A.grow(34.05, 0.0); A.grow(36.0, 0.06); A.grow(38.2, 0.42); A.grow(40.0, 0.74)
    for o in (o1, o2, tip): key_vis(o, F(76.2), False); key_vis(o, F(81.95), True)
    A.grow(81.95, 0.8); A.grow(83.55, 1.0); A.grow(85.9, 1.0)
    for fc in ck._fcurves(o2.data.animation_data.action):
        for kp in fc.keyframe_points:
            if int(kp.co[0]) in (F(32.0),): kp.interpolation = 'CONSTANT'
    for fc in ck._fcurves(tip.animation_data.action):
        for kp in fc.keyframe_points:
            if int(kp.co[0]) in (F(5.0), F(32.0)): kp.interpolation = 'CONSTANT'
    # skin: opaque at 32.0 (match cut from his real arm), dissolves to the ghost by 33.3; ghost otherwise
    anatomy.ghost_solid(gm, 0, 0.0); anatomy.ghost_solid(gm, F(30.5), 0.0); anatomy.ghost_solid(gm, F(30.57), 1.0); anatomy.ghost_solid(gm, F(32.45), 1.0); anatomy.ghost_solid(gm, F(33.4), 0.0)
    for fc in ck._fcurves(gm.node_tree.animation_data.action):
        for kp in fc.keyframe_points:
            if abs(kp.co[0] - F(30.5)) < 0.5: kp.interpolation = 'CONSTANT'
    key_vis(o1, F(30.57), False); key_vis(o1, F(32.0), True)
    E0 = A.roads['L'][1]['entry']; scal = P.scalpel(C, (0, 0, 0), 0)
    for o in [scal] + list(scal.children): key_vis(o, 0, False); key_vis(o, F(30.57), True); key_vis(o, F(32.0), False)
    key(scal, 'location', F(30.57), E0 + Vector((-0.16, -0.12, 0.1))); key(scal, 'location', F(31.75), E0 + Vector((-0.125, -0.025, 0.012)))
    key(scal, 'rotation_euler', F(30.57), Vector((0, math.radians(30), math.radians(25))))
    Shot(sc, C, '5E', 30.57, [(30.57, tuple(E0 + Vector((0.16, -0.3, 0.13))), tuple(E0 + Vector((-0.02, 0, 0.02)))), (32.0, tuple(E0 + Vector((0.12, -0.25, 0.1))), tuple(E0))], lens=65, fstop=2.8)
    # heart beats on the words
    A.beat([2.58, 3.3, 3.86, 4.62, 76.4, 77.3, 78.2, 79.1, 80.0, 80.9, 81.34, 82.3, 83.2, 84.1, 85.0, 85.33], 0.06)
    hc = A.heart_root.location; L = A.roads['L'][1]
    # lighting: void studio, cool rim + warm key; per-shot accents
    area(C, (-1.3, 1.2, 2.2), (0.1, 0, 1.25), 2.0, '#7ea6ff', 260, 'rim_cool', spread=90)
    area(C, (1.2, -1.4, 1.9), (0.15, 0, 1.25), 1.5, '#ffd2a0', 140, 'key_warm')
    hk = spot(C, tuple(hc + Vector((-0.35, -0.5, 0.45))), tuple(hc), '#ffb070', 60, 30, 0.6, 0.08, 'heart_key')
    ek = area(C, tuple(L['entry'] + Vector((-0.1, -0.4, 0.35))), tuple(L['entry']), 0.4, '#ffd8b0', 40, 'elbow_key')
    shot_lights([(hk, {'1B': 60, '1C': 90, '13C': 80, '13D': 40}), (ek, {'5E': 70, '6A': 40, '6B': 20})])
    # cameras
    E = L['entry']; sh = A.J('upper_arm.L'); a1 = L['axilla']; tip = lambda f: A.tip_pos(f)
    Shot(sc, C, '1B', 2.1, [(2.1, tuple(sh + Vector((0.12, -0.75, 0.25))), tuple(sh.lerp(hc, 0.3))), (3.6, tuple(hc + Vector((0.05, -0.55, 0.08))), tuple(hc + Vector((-0.01, 0, 0.02))))], lens=50, fstop=4.0)
    Shot(sc, C, '1C', 3.6, [(3.6, tuple(hc + Vector((-0.1, -0.33, 0.08))), tuple(hc + Vector((-0.03, -0.02, 0.04)))), (5.0, tuple(hc + Vector((-0.08, -0.25, 0.07))), tuple(hc + Vector((-0.035, -0.02, 0.045))))], lens=85, fstop=2.8, ease='out')
    Shot(sc, C, '6A', 32.0, [(32.0, tuple(E + Vector((0.12, -0.24, 0.1))), tuple(E)), (36.0, tuple(E + Vector((-0.06, -0.26, 0.12))), tuple(E + Vector((-0.02, 0, 0.01))))], lens=65, fstop=2.8, ease='smooth')
    Shot(sc, C, '6B', 36.0, [(36.0, tuple(tip(0.06) + Vector((-0.07, -0.2, -0.03))), tuple(tip(0.06))), (38.2, tuple(tip(0.42) + Vector((-0.08, -0.22, -0.02))), tuple(tip(0.42)))], lens=50, fstop=2.8, ease='linear')
    Shot(sc, C, '6C', 38.2, [(38.2, tuple(tip(0.42) + Vector((0.0, -0.4, 0.1))), tuple(tip(0.5))), (40.0, tuple(Vector((0.25, -1.35, 1.42))), tuple(Vector((0.2, 0, 1.28))))], lens=35, fstop=5.6)
    W = L['hand']
    WR = L['wrist']
    FA = WR.lerp(E, 0.55)
    Shot(sc, C, '13A', 76.2, [(76.2, tuple(FA + Vector((-0.05, -0.36, 0.06))), tuple(FA)), (78.2, tuple(FA + Vector((-0.04, -0.3, 0.07))), tuple(FA.lerp(E, 0.3)))], lens=50, fstop=2.8)
    road = A.roads['L'][0]
    Shot(sc, C, '13B', 78.2, [(78.2, tuple(W + Vector((0.1, -0.42, 0.1))), tuple(W)), (79.8, tuple(E + Vector((0.1, -0.5, 0.15))), tuple(E)), (81.0, tuple(L['subclavian'] + Vector((0.12, -0.55, 0.12))), tuple(L['subclavian'])),
                              (81.95, tuple(hc + Vector((0.12, -0.6, 0.15))), tuple(hc))], lens=40, fstop=4.0, ease='linear')
    Shot(sc, C, '13C', 81.95, [(81.95, tuple(hc + Vector((-0.28, -0.3, 0.16))), tuple(L['svc'])), (84.1, tuple(hc + Vector((-0.12, -0.38, 0.12))), tuple(hc + Vector((-0.03, 0, 0.04))))], lens=85, fstop=2.8)
    Shot(sc, C, '13D', 84.1, [(84.1, tuple(hc + Vector((0.05, -0.5, 0.08))), tuple(hc)), (85.9, tuple(Vector((0.28, -1.2, 1.4))), tuple(Vector((0.2, 0, 1.3))))], lens=35, fstop=5.6, ease='out')

# ====================================================================== shared characters
def forssmann(loc=(0, 0, 0), rot=0.0, outfit='doctor', old=False, name='forssmann'):
    if old: return human.Human(C, name, outfit, height=1.78, skin='#d6a48a', hair='#a8a6a0', hair_style='side_part', glasses=True, age=52, eyes='#4a5a6a', loc=loc, rot=rot)
    return human.Human(C, name, outfit, height=1.78, skin='#dcab8f', hair='#1d130d', hair_style='side_part', age=25, eyes='#4a5a6a', loc=loc, rot=rot)
def nurse(loc=(0, 0, 0), rot=0.0):
    n = human.Human(C, 'nurse', 'nurse', height=1.64, female=True, skin='#e2b69c', hair='#4a2e1c', hair_style='bun', eyes='#5a4a3a', loc=loc, rot=rot)
    cap = lathe(C, [(0.0, 0.0), (0.085, 0.0), (0.09, 0.03), (0.075, 0.07), (0.0, 0.075)], ck.m_fabric('#fbfaf6', 0.8, 300.0), tuple(n.head_world() + Vector((0, 0.03, 0.06))), name='nursecap')
    cap.rotation_euler = (math.radians(-20), 0, 0); n._bonepart(cap, 'head'); return n

# ====================================================================== SET: operating room
def set_or():
    world(sc, '#0b0c0e', 1.0)
    tiles = ck.m_tiles('#eceee8', '#a8a69c', 0.15, 1.0, 0.1, 0.25); paint = ck.m_plaster('#b9c2b4', '#6e7464', 0.3)
    floor = ck.m_tiles('#8c8a82', '#4a4842', 0.3, 1.0, 0.35, 0.4, plane='floor')
    P.room(C, 7.0, 6.0, 3.6, paint, floor, ck.m_plaster('#e6e2d6', '#8a8470', 0.15), dado=tiles, dado_h=1.8,
           openings=[('back', -0.9, 1.5, 1.0, 3.0), ('left', -2.2, -1.2, 0.0, 2.15)])
    P.window(C, (0.3, 3.0, 2.0), 0, 2.4, 2.0, glass='frosted', mullions=(3, 3))
    P.door(C, (-3.5, -2.2, 0), math.pi / 2, 0.95, 2.15, '#d8d4c8')
    sky, _ = window_light(C, (0.3, 3.0, 2.0), (0, 1, 0), 2.4, 2.0, '#cdd9ea', 350)
    table = P.operating_table(C, (0.2, 0.3, 0), 0)
    lamp_parts, lamp = P.surgical_lamp(C, (0.2, 0.3, 2.15), power=380)
    P.instrument_cabinet(C, (3.22, 0.6, 0), -math.pi / 2)
    P.radiator(C, (-1.8, 2.82, 0), math.pi)
    # sterilizer + sink on the back wall
    st = box(C, (-2.3, 2.6, 1.0), (0.6, 0.4, 0.35), ck.m_metal('#c8ccd0', 0.25), 0.03, name='sterilizer'); box(C, (-2.3, 2.6, 0.4), (0.62, 0.42, 0.8), ck.m_enamel('#e8e6de', 0.2, chips=0.2), 0.01)
    sink = lathe(C, [(0.0, 0.0), (0.28, 0.0), (0.3, 0.15), (0.32, 0.17), (0.0, 0.17)], ck.m_enamel('#f2f0ea', 0.12), (2.2, 2.7, 0.75), name='sink'); sink.scale = (1, 0.6, 1)
    tube(C, [(2.2, 2.95, 1.25), (2.2, 2.8, 1.25), (2.2, 2.72, 1.12)], 0.012, ck.m_chrome(), 'tap')
    # instrument trolley (side table) with tray, towel, coil, scalpel, syringe
    TR = Vector((-0.95, -0.55, 0.0)); tm = ck.m_enamel('#ecebe4', 0.2, chips=0.3)
    for sx in (-1, 1):
        for sy in (-1, 1): tube(C, [tuple(TR + Vector((sx * 0.33, sy * 0.21, 0.05))), tuple(TR + Vector((sx * 0.33, sy * 0.21, 0.86)))], 0.012, tm, 'trolleyleg'); sphere(C, tuple(TR + Vector((sx * 0.33, sy * 0.21, 0.035))), 0.03, ck.m_enamel('#202020', 0.4))
    box(C, tuple(TR + Vector((0, 0, 0.87))), (0.72, 0.48, 0.025), ck.m_glass('#eaf4f2'), 0.004, name='trolleytop'); box(C, tuple(TR + Vector((0, 0, 0.3))), (0.68, 0.44, 0.02), tm, 0.005)
    towel = box(C, tuple(TR + Vector((0.12, 0.05, 0.89))), (0.4, 0.34, 0.012), ck.m_fabric('#f2f0e8', 0.9, 240.0), 0.004, name='towel'); ck.subsurf(towel, 2); P._wrinkle(towel, 0.004)
    tray = P.enamel_tray(C, tuple(TR + Vector((-0.17, -0.06, 0.885))), 0.32, 0.24, 0.1)
    coilo = P.coil(C, tuple(TR + Vector((-0.17, -0.06, 0.895))), 0.065, 3.2, 0.0028)
    lead = tube(C, [tuple(TR + Vector((-0.1, -0.12, 0.898))), tuple(TR + Vector((0.0, -0.17, 0.9))), tuple(TR + Vector((0.14, -0.19, 0.9)))], 0.0028, ck.m_rubber_catheter(), 'catheter_lead')
    sc_ = P.scalpel(C, tuple(TR + Vector((-0.05, 0.16, 0.89))), 0.3); sy_ = P.syringe(C, tuple(TR + Vector((-0.27, 0.15, 0.897))), -0.2)[0]
    P.kidney_dish(C, tuple(TR + Vector((0.24, -0.14, 0.887))), 0.4, 0.8)
    # hook 1A: the catheter end slides forward (fed by an unseen hand)
    key(lead, 'location', F(0.0), Vector((0, 0, 0))); key(lead, 'location', F(2.1), Vector((0.06, -0.01, 0)))
    # ---- characters
    fo = forssmann((1.95, 0.25, 0), face((1.95, 0.25), (2.85, 0.55)))
    nu = nurse((2.82, 0.6, 0), face((2.82, 0.6), (1.95, 0.25)))
    fo.blinks(0, 44); nu.blinks(0, 31, 2.7); nu.visible(0, False); nu.visible(F(19.1), True)
    # 4C: nurse with keys raises one finger on "one"
    t_one = wt('one', 20.0) or 20.52
    nu.emote(F(19.2), 'wary'); fo.emote(F(19.2), 'earnest')
    nu.hand('L', F(19.1), tuple(nu.bone_world('hand.L', 0.0)), 0.0)
    rh = Vector((2.62, 0.38, 1.18)); nu.hand('R', F(19.1), tuple(rh + Vector((0.08, 0.05, -0.2))), 0.6); nu.hand('R', F(t_one - 0.25), tuple(rh), 1.0); nu.hand('R', F(21.4), tuple(rh), 1.0)
    nu.fingers(F(t_one - 0.3), 'R', 'relaxed'); nu.fingers(F(t_one), 'R', 'point'); nu.fingers(F(21.45), 'R', 'point')
    nu.look(F(19.1), 0.0, 0.05); nu.look(F(20.2), -0.05, 0.08)
    # 4D: she offers her forearm
    nu.fingers(F(21.6), 'R', 'open'); nu.hand('R', F(21.6), tuple(rh), 1.0); nu.hand('R', F(22.4), (2.4, 0.5, 1.08), 1.0); nu.hand('R', F(23.3), (2.38, 0.5, 1.08), 1.0)
    nu.emote(F(21.8), 'determined'); nu.look(F(22.3), 0.0, 0.25)
    # 5A-5D: she lies on the table; he works beside her
    lie_loc = Vector((0.2, -0.72, 1.035))
    snap(nu.arm, 'location', 23.3, lie_loc); snap(nu.arm, 'rotation_euler', 23.3, Euler((-math.pi / 2, 0, 0)))
    for sd in ('L', 'R'): nu.hand(sd, F(23.3), tuple(nu.bone_world('hand.' + sd)), 0.0)
    nu.pose(F(23.3), {'upper_arm.L': (0, 0, 0.12), 'upper_arm.R': (0, 0, -0.12), 'forearm.L': (0, 0, 0), 'forearm.R': (0, 0, 0)})
    nu.look(F(23.3), 0.0, -0.1); nu.emote(F(23.4), 'neutral'); nu.emote(F(28.2), 'wary')
    sc.frame_set(F(24)); bpy.context.view_layer.update()
    arm_r = nu.bone_world('forearm.R', 0.55)   # her right forearm, lying (strap + needle target)
    # Forssmann beside the table, then at the trolley
    snap(fo.arm, 'location', 23.3, Vector((-0.42, 0.05, 0))); snap(fo.arm, 'rotation_euler', 23.3, Euler((0, 0, face((-0.42, 0.05), (0.2, 0.2)))))
    fo.pose(F(23.3), {'spine': (0.25, 0, 0), 'chest': (0.12, 0, 0), 'head': (0.25, 0, 0)})
    fo.hand('R', F(25.2), tuple(arm_r + Vector((-0.08, -0.05, 0.06))), 1.0); fo.hand('R', F(25.9), tuple(arm_r + Vector((0.1, 0.0, 0.05))), 1.0)
    fo.hand('L', F(25.2), tuple(arm_r + Vector((-0.12, 0.08, 0.05))), 1.0); fo.hand('L', F(26.5), tuple(arm_r + Vector((-0.12, 0.08, 0.05))), 1.0)
    strap = box(C, tuple(arm_r + Vector((0.0, 0.0, 0.0))), (0.22, 0.045, 0.012), ck.m_leather('#3a2216', 0.4), 0.004, name='strap')
    buckle = torus(C, tuple(arm_r + Vector((-0.11, 0, 0.0))), 0.016, 0.003, ck.m_brass(), rot=(0, math.pi / 2, 0), name='buckle')
    key(strap, 'location', F(25.2), arm_r + Vector((0.07, 0, 0.05))); key(strap, 'location', F(26.0), arm_r + Vector((0.0, 0, 0.035)))
    key(strap, 'scale', F(25.2), Vector((0.6, 1, 1))); key(strap, 'scale', F(26.0), Vector((1, 1, 1)))
    # 5C: syringe to her forearm (iodine stain)
    stain = sphere(C, tuple(arm_r + Vector((0.03, -0.02, 0.032))), 0.03, ck.m_skin('#c8702a', 0.35, 0.1), (1.0, 1.0, 0.08), name='iodine')
    syr = P.syringe(C, (0, 0, 0), 0)[0]
    key(syr, 'location', F(26.5), arm_r + Vector((0.2, -0.12, 0.12))); key(syr, 'location', F(27.9), arm_r + Vector((0.11, -0.05, 0.06)))
    key(syr, 'rotation_euler', F(26.5), Vector((0, math.radians(18), math.radians(150)))); key(syr, 'rotation_euler', F(27.9), Vector((0, math.radians(15), math.radians(152))))
    for o in [syr] + list(syr.children): key_vis(o, F(26.4), False); key_vis(o, F(26.5), True); key_vis(o, F(28.0), False)
    # 5D-5E-7A: at the trolley, his own left arm on the towel
    trolley_spot = Vector((-0.98, -0.02, 0)); snap(fo.arm, 'location', 28.0, trolley_spot); snap(fo.arm, 'rotation_euler', 28.0, Euler((0, 0, face(trolley_spot, (-0.95, -0.6)))))
    fo.pose(F(28.0), {'spine': (0.18, 0, 0), 'chest': (0.08, 0, 0), 'head': (0.35, 0, 0), 'neck': (0.1, 0, 0)})
    lh = Vector((-0.8, -0.62, 0.92))
    fo.hand('L', F(28.0), tuple(Vector((-0.82, -0.25, 0.95))), 0.6); fo.hand('L', F(29.6), tuple(lh), 1.0); fo.hand('L', F(44.0), tuple(lh), 1.0)
    fo.hand('R', F(28.0), tuple(Vector((-1.1, -0.3, 0.95))), 0.6); fo.hand('R', F(29.4), tuple(Vector((-0.85, -0.42, 1.02))), 1.0)
    sca = P.scalpel(C, (0, 0, 0), 0)
    sc.frame_set(F(30.6)); bpy.context.view_layer.update(); el = fo.bone_world('forearm.L', 0.08)
    key(sca, 'location', F(30.45), el + Vector((-0.1, -0.14, 0.14))); key(sca, 'location', F(31.6), el + Vector((-0.03, -0.04, 0.035)))
    key(sca, 'rotation_euler', F(30.45), Vector((0, math.radians(35), math.radians(60))))
    for o in [sca] + list(sca.children): key_vis(o, F(30.4), False); key_vis(o, F(30.45), True); key_vis(o, F(32.0), False)
    fo.hand('R', F(30.45), tuple(el + Vector((-0.13, -0.16, 0.12))), 1.0); fo.hand('R', F(31.6), tuple(el + Vector((-0.06, -0.06, 0.03))), 1.0)
    fo.emote(F(28.4), 'focused'); fo.emote(F(30.5), 'determined')
    # 7A: the catheter enters his elbow; he looks at it, then toward his chest
    sc.frame_set(F(41)); bpy.context.view_layer.update(); el = fo.bone_world('forearm.L', 0.06) + Vector((0, 0, 0.035))
    cath = tube(C, [tuple(el), tuple(el + Vector((0.03, -0.06, -0.01))), tuple(el + Vector((0.12, -0.12, -0.02))), tuple(TR + Vector((-0.1, -0.12, 0.898)))], 0.0028, ck.m_rubber_catheter(), 'cath_arm')
    tape = box(C, tuple(el + Vector((0.0, 0.0, 0.005))), (0.05, 0.03, 0.004), ck.m_fabric('#eeeae0', 0.9), 0.002, name='tape')
    for o in (cath, tape): key_vis(o, 0, False); key_vis(o, F(40.0), True)
    fo.hand('R', F(40.0), tuple(el + Vector((0.11, -0.12, 0.0))), 1.0); fo.fingers(F(40.0), 'R', 'pinch')
    t_where = wt('where', 41.5) or 42.29
    fo.look(F(40.0), 0.0, 0.5); fo.look(F(t_where - 0.2), 0.0, 0.5); fo.look(F(t_where + 0.5), -0.15, 0.15, eyes_pitch=0.25); fo.emote(F(40.3), 'worried')
    # ---- lighting per shot (the surgical lamp is the motivated key)
    rim = area(C, (2.6, 2.4, 2.4), (1.2, 0, 1.2), 1.2, '#a8c4ff', 0, 'rim_window', spread=80)
    side = spot(C, (-2.2, -1.2, 1.9), (-0.95, -0.6, 1.0), '#ffcf96', 0, 35, 0.5, 0.15, 'side_key')
    tray_spot = spot(C, tuple(TR + Vector((0.1, 0.25, 1.15))), tuple(TR + Vector((-0.05, -0.1, 0.89))), '#fff0d8', 0, 28, 0.35, 0.06, 'tray_spot')
    cab = area(C, (2.3, 0.6, 2.3), (3.1, 0.6, 1.2), 0.8, '#fff6e6', 0, 'cab_top')
    shot_lights([(tray_spot, {'1A': 55}), (rim, {'4B': 120, '4C': 180, '4D': 140, '5A': 90, '5D': 80, '7A': 150}),
                 (cab, {'4B': 70, '4C': 90, '4D': 60}), (side, {'5D': 140, '5E': 260, '7A': 160})])
    exposure({'5B': -2.9, '4B': -2.0, '1A': 0.3})
    for l, d in ((lamp, {'1A': 0, '5B': 45, '5C': 60, '5D': 160, '5E': 60, '7A': 90}),):
        l.data.energy = 380
        for sid, e in d.items(): a, b = T(sid); light_cut(l, a, b, e, 380)
    sky.data.energy = 350; light_cut(sky, *T('1A'), 60, 350); light_cut(sky, *T('5E'), 80, 350); light_cut(sky, *T('7A'), 120, 350)
    # ---- cameras
    trayc = TR + Vector((0.02, -0.15, 0.9))
    leadtip = TR + Vector((0.14, -0.19, 0.9))
    Shot(sc, C, '1A', 0.0, [(0.0, tuple(leadtip + Vector((0.42, -0.3, 0.16))), tuple(leadtip + Vector((-0.16, 0.08, 0.0)))), (2.1, tuple(leadtip + Vector((0.32, -0.26, 0.13))), tuple(leadtip + Vector((-0.02, 0.01, 0.0))))], lens=65, fstop=4.0, ease='smooth')
    cab0 = Vector((3.0, 0.6, 1.0))
    Shot(sc, C, '4B', 17.2, [(17.2, (2.45, 0.05, 1.05), (3.1, 0.25, 0.98)), (19.1, (2.45, 0.85, 1.12), (3.1, 0.95, 1.0))], lens=85, fstop=2.8, ease='linear')
    Shot(sc, C, '4C', 19.1, [(19.1, (1.42, -0.2, 1.63), (2.75, 0.64, 1.42)), (21.55, (1.5, -0.05, 1.62), (2.75, 0.66, 1.42))], lens=50, fstop=2.2, focus=None)
    Shot(sc, C, '4D', 21.55, [(21.55, (2.2, -0.5, 1.55), (2.75, 0.6, 1.45)), (23.3, (2.25, -0.25, 1.3), (2.42, 0.5, 1.1))], lens=50, fstop=2.8)
    Shot(sc, C, '5A', 23.3, [(23.3, (1.3, -1.2, 3.0), (0.2, 0.2, 1.4)), (25.2, (1.5, -1.8, 2.45), (0.15, 0.2, 0.95))], lens=24, fstop=5.6)
    Shot(sc, C, '5B', 25.2, [(25.2, tuple(arm_r + Vector((-0.05, -0.08, 0.42))), tuple(arm_r)), (26.56, tuple(arm_r + Vector((-0.03, -0.05, 0.36))), tuple(arm_r))], lens=50, fstop=2.8)
    amp = lathe(C, [(0.0, 0.0), (0.009, 0.0), (0.009, 0.04), (0.004, 0.05), (0.004, 0.058), (0.006, 0.064), (0.0, 0.068)], ck.m_glass('#f0f6ff', 0.02), tuple(TR + Vector((-0.2, 0.2, 0.885))), name='ampoule')
    syp = TR + Vector((-0.27, 0.15, 0.9))
    Shot(sc, C, '5C', 26.56, [(26.56, tuple(syp + Vector((0.3, -0.22, 0.1))), tuple(syp + Vector((0.02, 0.0, 0.0)))), (28.0, tuple(syp + Vector((0.22, -0.18, 0.08))), tuple(syp + Vector((0.09, 0.0, 0.0))))], lens=85, fstop=2.8)
    Shot(sc, C, '5Cx', 99.0, [(26.56, tuple(arm_r + Vector((0.32, -0.25, 0.15))), tuple(arm_r + Vector((0.15, -0.09, 0.08)))), (28.0, tuple(arm_r + Vector((0.24, -0.24, 0.12))), tuple(arm_r + Vector((0.06, -0.03, 0.05))))], lens=100, fstop=2.0)
    sc.frame_set(F(28.5)); bpy.context.view_layer.update(); nf = nu.head_world()
    fwd = Vector((-0.65, -0.35, 1.28)); dd = (nf - fwd); dd.z = 0; dd.normalize(); sd = dd.cross(Vector((0, 0, 1))) * float(os.environ.get('SD5', '1')); c0 = nf + dd * 0.32 + sd * 0.42 + Vector((0, 0, 0.14))
    d_n = (nf - c0).length; d_f = (fwd - c0).length
    aim0 = nf.lerp(fwd, 0.35); aim1 = nf.lerp(fwd, 0.55)
    Shot(sc, C, '5D', 28.0, [(28.0, tuple(c0), tuple(aim0), None, d_n), (29.6, tuple(c0 + Vector((0, 0, 0.02))), tuple(aim0.lerp(aim1, 0.5)), None, d_n), (30.5, tuple(c0 + Vector((0, 0, 0.04))), tuple(aim1), None, d_f)], lens=65, fstop=2.0)
    Shot(sc, C, '5Ex', 99.5, [(30.57, tuple(el + Vector((0.32, -0.3, 0.22))), tuple(el)), (32.0, tuple(el + Vector((0.22, -0.22, 0.16))), tuple(el))], lens=85, fstop=2.8)
    hw = Vector((-0.98, -0.08, 1.58))
    Shot(sc, C, '7A', 40.0, [(40.0, tuple(hw + Vector((0.75, -1.05, -0.3))), tuple(hw + Vector((0.05, -0.2, -0.38)))), (43.6, tuple(hw + Vector((0.55, -0.6, -0.08))), tuple(hw + Vector((0, -0.04, -0.06))))], lens=65, fstop=2.0)

# ====================================================================== SET: ward (1929 belief)
def set_ward():
    world(sc, '#0a0b0d', 1.0)
    wall = ck.m_plaster('#cbc7b2', '#7a7560', 0.35); dado = ck.m_plaster('#5e7062', '#2e3a30', 0.2)
    P.room(C, 14.0, 7.0, 4.2, wall, ck.m_floor_planks('#6a4a2c', '#3a2616', 0.14), ck.m_plaster('#e6e0d0', '#9a9278', 0.15), dado=dado, dado_h=1.5,
           openings=[('back', -6.0 + i * 2.6, -4.9 + i * 2.6, 1.3, 3.7) for i in range(5)])
    for i in range(5):
        cx = -5.45 + i * 2.6; P.window(C, (cx, 3.5, 2.5), 0, 1.1, 2.4, glass='clear', mullions=(2, 4)); P.radiator(C, (cx, 3.3, 0), math.pi, 10, 0.6)
    for i in range(4): P.iron_bed(C, (-4.7 + i * 2.6, 2.0, 0), math.pi, blanket=['#7a8a7c', '#8a9284', '#7c8a86'][i % 3])
    for i in range(4): P.iron_bed(C, (-5.2 + i * 2.8, -2.4, 0), 0.0, blanket='#7c867a')
    for i in range(4):
        px, _ = None, None; parts, l = P.pendant_lamp(C, (-4.5 + i * 3.0, 0.0, 3.3), 0.85, power=0)
    for x in (-4.0, -2.2): box(C, (x, -0.35, 0.45), (0.45, 0.4, 0.9), ck.m_enamel('#e6e2d6', 0.25, chips=0.3), 0.01, name='bedside')
    # sun shafts through the windows, haze
    sun(C, (0.35, -1.0, -0.55), '#ffe2b8', 6.0, 0.6, 'sun')
    window_light(C, (0, 3.6, 2.5), (0, 1, 0), 13.0, 2.4, '#bcd0ec', 900)
    haze(C, (0, 0.5, 2.0), (14, 6.5, 4.0), 0.014, '#fff6ea', 0.55)
    # nurse's table with a lamp (practical)
    P.desk(C, (-1.2, -1.2, 0), 0.0, 1.1, 0.6, 0.76, '#5a3a22'); lp, ll = P.bankers_lamp(C, (-1.45, -1.2, 0.76), 0.2, 30)
    # chart easel with the anatomical heart chart at the end of the ward
    E0 = Vector((5.0, 1.0, 0))
    em = ck.m_wood('#3a2416', '#1a0e06', 1, 0.4, 0.4)
    for sx in (-1, 1): tube(C, [tuple(E0 + Vector((sx * 0.45, 0.15, 0))), tuple(E0 + Vector((sx * 0.3, 0.0, 2.1)))], 0.02, em, 'easelleg')
    tube(C, [tuple(E0 + Vector((0, 0.5, 0))), tuple(E0 + Vector((0, 0.05, 1.9)))], 0.02, em, 'easelleg')
    chart = plane(C, tuple(E0 + Vector((0, -0.03, 1.45))), (0.95, 1.2), m_image(tex('chart.png'), 0.75, name='chart'), rot=(math.radians(84), 0, 0), name='chart')
    box(C, tuple(E0 + Vector((0, 0.0, 0.83))), (1.0, 0.08, 0.04), em, 0.008)
    chart_light = spot(C, tuple(E0 + Vector((1.2, -1.2, 2.4))), tuple(E0 + Vector((0, 0, 1.45))), '#ffe8c8', 0, 30, 0.5, 0.2, 'chart_light')
    light_cut(chart_light, *T('2B'), 220, 0)
    d1 = human.Human(C, 'docA', 'doctor', height=1.76, skin='#d8a68c', hair='#8a8680', hair_style='bald_crown', moustache=True, glasses=True, age=58, loc=(4.55, 0.25, 0), rot=face((4.55, 0.25), (4.95, 1.0)))
    d2 = human.Human(C, 'docB', 'doctor', height=1.8, skin='#d2a088', hair='#3a3430', hair_style='side_part', moustache=True, age=50, loc=(5.55, 0.2, 0), rot=face((5.55, 0.2), (5.05, 1.0)))
    d1.emote(F(7.0), 'stern'); d2.emote(F(7.0), 'stern'); d1.blinks(6.5, 10.4); d2.blinks(6.5, 10.4, 2.6)
    t_heart = wt('heart', 8.5) or 8.83; t_death = wt('death', 9.0) or 9.62
    pointer = tube(C, [(0, 0, 0), (0.0, 0.62, 0.0)], 0.005, ck.m_wood('#2a1a0e', '#100804', 3), 'pointer')
    pt0 = E0 + Vector((-0.08, -0.05, 1.42)); hand0 = Vector((4.75, 0.45, 1.12))
    for t, hp in ((6.7, hand0), (t_heart - 0.25, Vector((4.8, 0.55, 1.24))), (t_heart, Vector((4.82, 0.58, 1.26))), (t_heart + 0.2, Vector((4.81, 0.56, 1.24))), (10.3, Vector((4.81, 0.56, 1.24)))):
        d1.hand('R', F(t), tuple(hp), 1.0)
        pointer.location = hp; pointer.rotation_euler = (Vector(pt0) - hp).to_track_quat('Y', 'Z').to_euler(); pointer.keyframe_insert('location', frame=F(t)); pointer.keyframe_insert('rotation_euler', frame=F(t))
    d1.fingers(F(6.7), 'R', 'grip')
    d2.look(F(t_death - 0.4), 0.0, 0.05); d2.look(F(t_death - 0.1), 0.22, 0.08); d2.look(F(t_death + 0.25), -0.22, 0.08); d2.look(F(t_death + 0.6), 0.1, 0.08); d2.look(F(t_death + 0.9), 0.0, 0.05)
    # cameras: 2A lateral track along the aisle (beds pass in the foreground), 2B push between the two doctors to the chart
    Shot(sc, C, '2A', 0.0, [(5.0, (-4.8, -1.0, 1.35), (-4.0, 2.4, 1.9)), (6.7, (-2.8, -1.0, 1.35), (-2.0, 2.4, 1.9))], lens=35, fstop=5.6, ease='linear')
    Shot(sc, C, '2B', 6.7, [(6.7, (5.05, -1.6, 1.72), (5.0, 1.0, 1.45), None, 3.0), (8.6, (5.05, -0.6, 1.66), (5.0, 1.0, 1.45), None, 1.9), (10.3, (5.02, -0.25, 1.62), (5.0, 1.0, 1.45), None, 1.45)], lens=50, fstop=2.8)

# ====================================================================== SET: chief's office (the refusal)
def set_office():
    world(sc, '#07080a', 1.0)
    wall = ck.m_plaster('#6a5a44', '#3a3022', 0.3); pan = ck.m_wood('#3a2214', '#160c06', 1.5, 0.4, 0.5, 'Z')
    P.room(C, 5.5, 5.0, 3.3, wall, ck.m_floor_planks('#4a3020', '#2a1a10', 0.12), ck.m_plaster('#d8d0bc', '#8a8068', 0.2), dado=pan, dado_h=1.1,
           openings=[('front', 0.6, 1.6, 0.0, 2.2), ('left', -0.8, 0.6, 1.0, 2.7)], front=True)
    P.door(C, (0.6, -2.5, 0), 0.0, 1.0, 2.2, '#4a2a18', open_angle=math.radians(-80))
    P.window(C, (-2.75, -0.1, 1.85), math.pi / 2, 1.4, 1.7, glass='clear', mullions=(2, 3))
    curtain = plane(C, (-2.68, -0.1, 1.85), (1.3, 1.6), ck.m_fabric('#e8e0cc', 0.9, 200), rot=(math.pi / 2, 0, math.pi / 2), name='netcurtain')
    window_light(C, (-2.75, -0.1, 1.85), (-1, 0, 0), 1.4, 1.7, '#9fb6d8', 300)
    corridor = area(C, (1.1, -3.6, 1.4), (1.1, 0, 1.2), 1.4, '#f2e6cc', 380, 'corridor_light')
    desk_loc = Vector((0.0, 1.0, 0)); P.desk(C, tuple(desk_loc), math.pi, 1.7, 0.85)
    lp, ll = P.bankers_lamp(C, (-0.55, 1.15, 0.77), math.pi, 45)
    P.bookshelf(C, (1.6, 2.3, 0), 0.0); P.bookshelf(C, (-1.4, 2.3, 0), 0.0, 1.1)
    for i, x in enumerate((-0.4, 0.4)): P.frame_picture(C, (x, 2.43, 2.0), 0.0, 0.4, 0.3, m_image(tex('diploma.png'), 0.6, name='dip'))
    P.chair(C, (0, 1.6, 0), 0.0)
    folder = box(C, (0.25, 0.9, 0.79), (0.3, 0.38, 0.012), ck.m_leather('#3a1a10', 0.45), 0.004, name='folder')
    flap = box(C, (0.25, 0.9, 0.8), (0.3, 0.38, 0.008), ck.m_leather('#3a1a10', 0.45), 0.003, name='folderflap')
    for b in range(3): box(C, (0.3, 0.9 + b * 0.02, 0.8 + b * 0.006), (0.21, 0.29, 0.004), ck.m_paper(), 0.0, name='papers')
    P.books(C, (-0.75, 0.75, 0.77), 1.4, 0.25, (0.2, 0.26), 0.16)
    ink = lathe(C, [(0.0, 0.0), (0.03, 0.0), (0.032, 0.04), (0.012, 0.05), (0.0, 0.05)], ck.m_glass('#1a1a2a', 0.05), (0.55, 0.8, 0.77), name='inkwell')
    chief = human.Human(C, 'chief', 'doctor', height=1.75, skin='#d4a088', hair='#a6a29a', hair_style='side_part', glasses=True, moustache=True, age=62, loc=(0.0, 1.55, 0.0), rot=0.0)
    chief.sit(1); chief.place(1, (0.0, 1.62, -0.44), 0.0)
    chief.hand('R', 1, (0.15, 0.95, 0.85), 1.0); chief.hand('L', 1, (-0.25, 0.95, 0.83), 1.0); chief.emote(1, 'neutral'); chief.blinks(10, 16)
    fo = forssmann((0.9, -2.9, 0), 0.0)
    fo.walk(10.3, 11.6, (1.05, -2.9), (0.55, -1.1)); fo.place(F(11.6) + 9, (0.55, -1.1, 0), face((0.55, -1.1), (0.0, 1.0)))
    fo.emote(F(12.0), 'earnest'); fo.talk(WORDS, 12.0, 14.2, 0.45); fo.blinks(10.5, 15.8)
    sketch = plane(C, (0, 0, 0), (0.24, 0.3), m_image(tex('sketch.png'), 0.7, name='sk'), name='sketch')
    fo.hand('R', F(12.0), (0.35, -0.85, 1.12), 1.0); fo.hand('R', F(13.2), (0.32, -0.75, 1.2), 1.0); fo.hand('L', F(12.0), (0.7, -0.85, 1.08), 0.8)
    key(sketch, 'location', F(12.0), Vector((0.34, -0.79, 1.2))); key(sketch, 'location', F(13.2), Vector((0.3, -0.69, 1.28)))
    key(sketch, 'rotation_euler', F(12.0), Vector((math.radians(70), 0, math.pi + 0.2)))
    for o in (sketch,): key_vis(o, 0, False); key_vis(o, F(11.9), True)
    t_no = wt('no', 15.0) or 15.20
    chief.emote(F(14.4), 'stern'); chief.look(F(14.3), 0.0, -0.05); chief.look(F(t_no - 0.15), 0.12, -0.02); chief.look(F(t_no + 0.15), -0.12, -0.02); chief.look(F(t_no + 0.45), 0.0, -0.02)
    key(flap, 'rotation_euler', F(14.5), Vector((0, math.radians(-55), 0))); key(flap, 'rotation_euler', F(t_no), Vector((0, 0, 0)))
    flap.location = (0.25 - 0.15, 0.9, 0.8)
    chief.hand('R', F(14.5), (0.18, 0.95, 0.98), 1.0); chief.hand('R', F(t_no), (0.2, 0.92, 0.82), 1.0)
    chief.talk(WORDS, 15.0, 15.5, 0.35)
    # lights: lamp key (practical), cool window rim, doorway backlight for the entrance
    k3c = spot(C, (-0.4, 0.4, 0.55), (0.0, 1.55, 1.35), '#ffcf90', 0, 50, 0.6, 0.1, 'underlight')
    k3b = area(C, (-0.9, 0.2, 2.0), (0.55, -1.1, 1.6), 0.8, '#ffd8a8', 0, 'k3b')
    shot_lights([(k3c, {'3C': 90}), (k3b, {'3B': 110})])
    haze(C, (0, 0, 1.6), (5.4, 4.9, 3.2), 0.008)
    Shot(sc, C, '3A', 10.3, [(10.3, (-0.25, 2.0, 1.32), (0.85, -2.3, 1.3)), (12.0, (-0.2, 1.85, 1.34), (0.6, -1.4, 1.35))], lens=40, fstop=2.8)
    Shot(sc, C, '3B', 12.0, [(12.0, (0.05, 0.3, 1.82), (0.55, -1.1, 1.6)), (14.3, (0.15, -0.1, 1.8), (0.55, -1.1, 1.6))], lens=65, fstop=2.0)
    Shot(sc, C, '3C', 14.3, [(14.3, (0.3, 0.35, 0.9), (0.0, 1.6, 1.3)), (15.2, (0.28, 0.42, 0.9), (0.0, 1.6, 1.3)), (15.85, (0.28, 0.42, 0.9), (0.0, 1.6, 1.3))], lens=35, fstop=4.0, ease='out')

# ====================================================================== SET: corridor (4A walk away, 7B walk to the X-ray room, 11A memory)
def set_corridor():
    world(sc, '#06070a', 1.0)
    tiles = ck.m_tiles('#4f6a5a', '#2a3a30', 0.15, 0.5, 0.12, 0.3); wall = ck.m_plaster('#d6cfb8', '#8a826a', 0.35)
    L = 24.0
    P.room(C, L, 2.6, 3.4, wall, ck.m_tiles('#9a8a74', '#5a5044', 0.25, 1.0, 0.35, 0.5, plane='floor'), ck.m_plaster('#e8e2d2', '#9a9278', 0.15), dado=tiles, dado_h=1.4,
           openings=[('back', -10 + i * 3.4, -8.8 + i * 3.4, 1.0, 2.9) for i in range(6)] + [('right', -0.5, 0.5, 0.0, 2.2)], front=True)
    for i in range(6):
        cx = -9.4 + i * 3.4; P.window(C, (cx, 1.3, 1.95), 0, 1.2, 1.9, glass='clear', mullions=(2, 3)); P.radiator(C, (cx, 1.12, 0), math.pi, 9, 0.55)
    sun(C, (0.3, -1.0, -0.6), '#ffe0b0', 5.0, 0.7, 'sun')
    sky = window_light(C, (0, 1.45, 1.95), (0, 1, 0), 22, 1.9, '#b8cce8', 600)[0]
    lamps = []
    for i in range(7): parts, l = P.pendant_lamp(C, (-10.5 + i * 3.4, 0.0, 3.0), 0.4, '#f4efe0', 70, '#ffd8a0', 0.15); lamps.append(l)
    door = P.door(C, (L / 2, 0.5, 0), -math.pi / 2, 1.0, 2.2, '#d8d2c2', glass_panel=True, sign='RÖNTGEN', glow=0.0)
    glow_plane = plane(C, (L / 2 + 0.08, 0.0, 1.45), (0.7, 0.85), ck.m_emit('#fff0d6', 6.0), rot=(math.pi / 2, 0, math.pi / 2), name='doorglow')
    door_light = area(C, (L / 2 + 0.3, 0.0, 1.5), (L / 2 - 3, 0, 1.4), 0.7, '#fff0d6', 120, 'door_glow', size_y=0.85)
    for i in range(3): P.chair(C, (-6.0 + i * 0.55, 0.95, 0), math.pi, '#4a2c18', '#3a2a20')
    plant = lathe(C, [(0.0, 0.0), (0.16, 0.0), (0.2, 0.35), (0.0, 0.35)], ck.m_enamel('#6a3a22', 0.4), (3.5, 1.0, 0), name='pot')
    for k in range(9): sphere(C, (3.5 + 0.12 * math.cos(k), 1.0 + 0.1 * math.sin(k * 1.7), 0.55 + 0.06 * (k % 3)), 0.12, ck.m_fabric('#3a5a2a', 0.6, 40), (0.5, 0.5, 1.4))
    haze(C, (0, 0, 1.7), (L, 2.5, 3.3), 0.009, '#fff4e4', 0.55)
    fo = forssmann((-8.0, -0.2, 0), -math.pi / 2)
    # 4A: brisk walk away down the corridor (toward +x)
    fo.walk(15.85, 17.2, (-8.0, -0.25), (-5.7, -0.25), stride=0.8, arm=0.45); fo.emote(F(15.9), 'determined')
    # 7B: walking toward the X-ray room holding the left arm (tube inside)
    a7, b7 = Vector((2.6, -0.25)), Vector((8.4, -0.25))
    snap(fo.arm, 'location', 43.6, Vector((2.6, -0.25, 0)))
    fo.walk(43.6, 47.6, tuple(a7), tuple(b7), stride=0.72, arm=0.0, settle=False)
    fo.hand('L', F(43.6), (0, 0, 0), 0.0)
    for t in [43.6 + 0.4 * i for i in range(10)] + [47.6]:   # dense keys: the hands must track the chest while he walks (2 keys let them drift out)
        sc.frame_set(F(t)); bpy.context.view_layer.update(); ch = fo.bone_world('chest')
        fo.hand('L', F(t), tuple(ch + Vector((0.08, -0.17, -0.12))), 1.0); fo.hand('R', F(t), tuple(ch + Vector((0.12, -0.2, -0.2))), 1.0)
    fo.emote(F(43.8), 'worried')
    # 11A: memory walk toward the glowing door
    snap(fo.arm, 'location', 66.7, Vector((7.8, -0.15, 0)))
    fo.walk(66.7, 69.95, (7.8, -0.15), (10.9, -0.05), stride=0.62, arm=0.25, settle=False)
    door_light.data.energy = 120; door_light.data.keyframe_insert('energy', frame=F(66.7)); door_light.data.energy = 3000; door_light.data.keyframe_insert('energy', frame=F(69.95))
    gm = glow_plane.data.materials[0].node_tree.nodes['Emission']; gm.inputs['Strength'].default_value = 6; gm.inputs['Strength'].keyframe_insert('default_value', frame=F(66.7))
    gm.inputs['Strength'].default_value = 120; gm.inputs['Strength'].keyframe_insert('default_value', frame=F(69.95))
    # lights per shot: evening for 7B (fewer pools), soft memory for 11A
    s_ = bpy.data.objects['sun']; s_.data.energy = 5.0; light_cut(s_, *T('7B'), 2.5, 5.0); light_cut(s_, *T('11A'), 3.0, 5.0)
    light_cut(sky, *T('7B'), 300, 600)
    exposure({'7B': 1.5, '11A': 1.8})
    # 7B: the RÖNTGEN door must read as the destination: brighter glow while he walks to it
    gm.inputs['Strength'].default_value = 30; gm.inputs['Strength'].keyframe_insert('default_value', frame=F(43.6)); gm.inputs['Strength'].keyframe_insert('default_value', frame=F(47.55))
    gm.inputs['Strength'].default_value = 6; gm.inputs['Strength'].keyframe_insert('default_value', frame=F(47.6))
    sign_key = spot(C, (L / 2 - 2.5, -0.9, 2.6), (L / 2, 0.5, 1.6), '#ffe2b0', 0, 30, 0.4, 0.1, 'sign_key'); shot_lights([(sign_key, {'7B': 260})])
    Shot(sc, C, '4A', 15.85, [(15.85, (-9.7, -0.1, 1.6), (-7.0, -0.3, 1.35)), (17.2, (-7.5, -0.1, 1.6), (-4.6, -0.3, 1.35))], lens=35, fstop=4.0, ease='linear', shake=0.004)
    Shot(sc, C, '7B', 43.6, [(43.6, (4.8, 0.35, 1.5), (2.7, -0.25, 1.4)), (45.6, (6.6, 0.4, 1.45), (5.4, -0.25, 1.4)), (46.6, (7.2, 0.45, 1.45), (7.0, -0.2, 1.4)), (47.6, (7.0, 0.45, 1.5), (12.0, 0.0, 1.55))], lens=32, fstop=4.0)
    light_cut(door_light, *T('7B'), 700, 120)
    Shot(sc, C, '11A', 66.7, [(66.7, (6.1, -0.1, 1.62), (9.3, -0.15, 1.35)), (69.95, (9.2, -0.05, 1.62), (12.0, 0.0, 1.45))], lens=35, fstop=4.0, ease='linear', shake=0.003)

# ====================================================================== SET: X-ray room (the reveal)
def set_xray():
    world(sc, '#030405', 1.0)
    wall = ck.m_plaster('#5a645a', '#2a302a', 0.4)
    P.room(C, 5.0, 5.0, 3.2, wall, ck.m_tiles('#6a645a', '#3a3630', 0.3, 1.0, 0.4, 0.5, plane='floor'), ck.m_plaster('#cfcab8', '#7a7460', 0.2),
           dado=ck.m_paint_metal('#3a423c', 0.5, 0.3), dado_h=1.2, front=True)
    P.xray_apparatus(C, (-0.6, 0.9, 0), 0.4); P.control_desk(C, (-1.9, -1.0, 0), math.pi / 2 + 0.3)
    filmm = m_backlit_film(tex('xray_film.png'), 2.6)
    LB = Vector((2.36, 0.4, 1.45)); lbg, panel, film = P.light_box(C, tuple(LB), -math.pi / 2, 0.62, 0.75, 4.0, filmm)
    # film slides up onto the viewer
    key(film, 'location', F(47.6), Vector((0, -0.006, -0.55))); key(film, 'location', F(48.7), Vector((0, -0.006, 0.0)))
    tipd = json.load(open(TIPUV)) if os.path.exists(TIPUV) else {'u': 0.45, 'v': 0.6}
    tip_local = Vector(((tipd['u'] - 0.5) * 0.62 * 0.92, -0.009, (0.5 - tipd['v']) * 0.75 * 0.94))
    ring = torus(C, (0, 0, 0), 0.03, 0.0016, ck.m_emit('#ffcf8a', 12.0), rot=(math.pi / 2, 0, 0), name='tipring'); ring.parent = lbg; ring.location = tip_local
    t_in = wt('inside', 51.0) or 51.26
    key_vis(ring, 0, False); key_vis(ring, F(t_in), True); key(ring, 'scale', F(t_in), Vector((0.4,) * 3)); key(ring, 'scale', F(t_in + 0.4), Vector((1,) * 3))
    cables = tube(C, [(-0.6, 0.3, 2.4), (0.5, 1.5, 3.1)], 0.02, ck.m_enamel('#111111', 0.4), 'cable')
    door_p = P.door(C, (-1.0, -2.5, 0), 0.0, 1.0, 2.15, '#4a4a46')
    fo = forssmann((1.6, 0.45, 0), face((1.6, 0.45), (2.4, 0.4)))
    fo.hand('R', F(47.6), tuple(LB + Vector((-0.1, -0.1, -0.75))), 1.0); fo.hand('R', F(48.7), tuple(LB + Vector((-0.1, -0.08, -0.25))), 1.0); fo.hand('R', F(49.2), (1.75, 0.2, 0.95), 0.0)
    fo.hand('L', F(47.6), tuple(fo.bone_world('chest') + Vector((0.1, -0.15, -0.15))), 1.0)
    fo.emote(F(47.7), 'focused'); fo.emote(F(53.3), 'amazed'); fo.emote(F(54.2), 'relief'); fo.blinks(52.95, 55.0, 1.9)
    fo.look(F(52.95), -0.05, 0.0); fo.look(F(54.0), -0.03, 0.03)
    fo.breathe(52.9, 55.0, 0.5, 0.04)
    # lighting: the light box is the key; a warm doorway rim for separation
    rimw = area(C, (-0.6, -2.3, 2.0), (1.6, 0.45, 1.55), 0.6, '#ffb878', 0, 'door_rim', spread=60)
    shot_lights([(rimw, {'8A': 60, '8C': 90})])
    spot(C, (-0.6, 1.6, 3.0), (-0.6, 0.6, 1.3), '#a8b8c8', 30, 40, 0.5, 0.1, 'apparatus_top')
    haze(C, (0.5, 0, 1.6), (4.8, 4.8, 3.1), 0.012, '#ffffff', 0.4)
    Shot(sc, C, '8A', 47.6, [(47.6, (0.2, -0.9, 0.75), (2.36, 0.4, 1.25)), (49.3, (0.8, -0.5, 0.85), (2.36, 0.4, 1.35))], lens=35, fstop=2.8)
    fl = LB
    tipw = fl + Vector((tip_local.y, -tip_local.x, tip_local.z))
    Shot(sc, C, '8B', 49.3, [(49.3, tuple(fl + Vector((-0.9, -0.42, 0.03))), tuple(fl)), (52.95, tuple(tipw + Vector((-0.36, 0.0, 0.0))), tuple(tipw))], lens=50, fstop=4.0, ease='out')
    hf = Vector((1.6, 0.45, 1.66))
    exposure({'8C': -0.9})
    Shot(sc, C, '8C', 52.95, [(52.95, (1.3, -0.75, 1.58), tuple(hf + Vector((0.25, 0.0, -0.08)))), (55.0, (1.38, -0.5, 1.62), tuple(hf + Vector((0.18, 0.0, -0.04))))], lens=65, fstop=2.0, ease='out')

# ====================================================================== SET: Berlin office (the famous surgeon)
def set_berlin():
    world(sc, '#050608', 1.0)
    wall = ck.m_plaster('#8a7a62', '#4a3e2e', 0.3)
    P.room(C, 7.0, 6.0, 4.4, wall, ck.m_floor_planks('#5a3a22', '#2a180c', 0.1), ck.m_plaster('#e2dccb', '#9a9278', 0.15), dado=ck.m_wood('#3a2214', '#140a04', 1.5, 0.4, 0.5, 'Z'), dado_h=1.2,
           openings=[('back', -2.6, -1.0, 0.9, 3.9), ('back', 1.0, 2.6, 0.9, 3.9)], front=True)
    for cx in (-1.8, 1.8): P.window(C, (cx, 3.0, 2.4), 0, 1.6, 3.0, glass='clear', mullions=(2, 4))
    sun(C, (0.25, -1.0, -0.5), '#ffe8c8', 7.0, 0.6, 'sun'); window_light(C, (0, 3.1, 2.4), (0, 1, 0), 6.0, 3.0, '#d8e4f4', 1400)
    P.desk(C, (0.0, 0.8, 0), 0.0, 2.0, 0.95)
    P.bookshelf(C, (-3.2, 0.0, 0), math.pi / 2, 2.4, 2.6); P.bookshelf(C, (3.2, 0.0, 0), -math.pi / 2, 2.4, 2.6)
    P.frame_picture(C, (0, 2.85, 2.6), 0.0, 0.7, 0.9, m_image(tex('portrait.png'), 0.6, name='portrait'))
    lp, ll = P.bankers_lamp(C, (0.7, 0.9, 0.77), 0.0, 20)
    journal = plane(C, (0, 0, 0), (0.42, 0.3), m_image(tex('journal.png'), 0.75, name='journal'), name='journal'); ck.solidify(journal, 0.004)
    sur = human.Human(C, 'surgeon', 'suit', height=1.76, build=1.12, skin='#d8a28a', hair='#6a5a4a', hair_style='bald_crown', moustache=True, age=54, loc=(-0.3, 2.15, 0), rot=face((-0.3, 2.15), (0.0, 0.8)))
    t_toss = 58.55
    hp = Vector((-0.25, 1.85, 1.22))
    sur.hand('R', F(56.85), tuple(hp), 1.0); sur.hand('L', F(56.85), tuple(hp + Vector((0.2, 0.02, 0.0))), 1.0)
    sur.hand('R', F(t_toss - 0.3), tuple(hp + Vector((0.08, -0.08, 0.1))), 1.0); sur.hand('R', F(t_toss + 0.15), (0.0, 1.45, 0.98), 1.0)
    sur.hand('L', F(t_toss - 0.4), tuple(hp + Vector((0.2, 0.02, 0.0))), 0.0)
    sur.emote(F(56.9), 'contempt'); sur.look(F(56.85), 0.0, 0.45); sur.look(F(t_toss), 0.1, 0.1)
    # journal: open on the desk for 9A, then in his hands, then tossed onto the desk
    key(journal, 'location', F(55.0), Vector((0.05, 0.75, 0.775))); key(journal, 'rotation_euler', F(55.0), Vector((0, 0, 0.12)))
    snap(journal, 'location', 56.85, hp + Vector((0.1, -0.06, 0.08))); snap(journal, 'rotation_euler', 56.85, Euler((math.radians(70), 0, 0.2)))
    key(journal, 'location', F(t_toss - 0.3), hp + Vector((0.16, -0.12, 0.18))); key(journal, 'location', F(t_toss + 0.35), Vector((0.1, 0.85, 0.79)))
    key(journal, 'rotation_euler', F(t_toss + 0.35), Vector((0, 0, -0.35)))
    haze(C, (0, 1, 2.0), (6.8, 5.8, 4.2), 0.01, '#fff4e6', 0.6)
    fill = area(C, (1.5, -1.0, 1.8), (-0.3, 2.1, 1.5), 1.0, '#c8d4e8', 0, 'fill9b', shadow=False)
    shot_lights([(fill, {'9B': 25})])
    Shot(sc, C, '9A', 55.0, [(55.0, (0.0, 0.62, 1.4), (0.05, 0.76, 0.77)), (56.85, (0.04, 0.68, 1.2), (0.05, 0.76, 0.77))], lens=50, fstop=4.0)
    Shot(sc, C, '9B', 56.85, [(56.85, (0.9, 0.2, 0.75), (-0.3, 2.1, 1.55)), (59.27, (0.45, -0.05, 0.75), (-0.2, 2.0, 1.5))], lens=40, fstop=2.8)

# ====================================================================== SET: amphitheatre (the circus)
def set_amphi():
    world(sc, '#010101', 1.0)
    P.amphitheatre(C, (0, 0, 0), 2.2, 6, 0.45, 0.75)
    fo = forssmann((0, 0, 0), math.pi * 0.95)
    fo.emote(F(59.3), 'sad'); fo.look(F(59.3), 0.0, 0.05); fo.look(F(60.4), 0.0, 0.45)
    fo.pose(F(59.3), {'chest': (0.0, 0, 0)}); fo.pose(F(60.6), {'chest': (0.12, 0, 0), 'spine': (0.06, 0, 0)})
    sp = spot(C, (0.0, -0.6, 11.0), (0, 0, 0.8), '#fff0d8', 9000, 9, 0.12, 0.05, 'circus_spot')
    spot(C, (0.0, 6.5, 6.0), (0, 0, 1.2), '#7890b8', 600, 18, 0.5, 0.2, 'rim_spot')
    area(C, (0, -3, 9), (0, 0, 2), 6.0, '#c89868', 900, 'tier_bounce', shadow=False)
    haze(C, (0, 0, 4.0), (12, 12, 8.0), 0.02, '#ffffff', 0.65)
    Shot(sc, C, '9C', 59.27, [(59.27, (0.6, -3.2, 2.4), (0, 0, 1.0)), (61.3, (0.5, -2.2, 8.0), (0, 0, 0.5))], lens=24, fstop=8.0, ease='smooth')

# ====================================================================== SET: small-town practice (years later)
def set_town():
    world(sc, '#05060a', 1.0)
    P.room(C, 4.2, 4.0, 3.0, ck.m_plaster('#b6ae98', '#6a6450', 0.35), ck.m_floor_planks('#5a4028', '#2a1a0e', 0.12), ck.m_plaster('#ded8c8', '#8a8470', 0.2),
           dado=ck.m_plaster('#7a8a80', '#3a4440', 0.2), dado_h=1.0, openings=[('back', -0.9, 0.5, 0.9, 2.5)], front=True)
    win = P.window(C, (-0.2, 2.0, 1.7), 0, 1.4, 1.6, glass='clear', mullions=(2, 2))
    rain = plane(C, (-0.2, 1.97, 1.7), (1.3, 1.5), _rain_mat(), rot=(math.pi / 2, 0, 0), name='rainglass')
    window_light(C, (-0.2, 2.0, 1.7), (0, 1, 0), 1.4, 1.6, '#9aa8bc', 110)
    exposure({'10A': -0.4})
    plane(C, (-0.2, 6.0, 2.0), (12, 6), m_image(tex('town.png'), 0.9, emit=0.35, name='townview'), rot=(math.pi / 2, 0, 0), name='townbg')
    P.desk(C, (0.6, 0.6, 0), math.pi, 1.3, 0.7, 0.76, '#4a3020'); lp, ll = P.bankers_lamp(C, (1.05, 0.75, 0.76), 0.0, 28)
    book = box(C, (0.45, 0.5, 0.79), (0.3, 0.22, 0.02), ck.m_paper('#ece2c8'), 0.003, name='patientbook')
    P.chair(C, (0.6, 1.15, 0), 0.0)
    couch = box(C, (-1.4, -0.4, 0.45), (0.7, 1.9, 0.18), ck.m_leather('#2a2a24', 0.5), 0.05, name='exam_couch'); ck.subsurf(couch, 1)
    for sx in (-1, 1):
        for sy in (-1, 1): tube(C, [(-1.4 + sx * 0.3, -0.4 + sy * 0.85, 0), (-1.4 + sx * 0.3, -0.4 + sy * 0.85, 0.37)], 0.02, ck.m_chrome(), 'couchleg')
    cab = P.instrument_cabinet(C, (1.75, -0.6, 0), -math.pi / 2, 0.8, 1.6, 0.38, fill=True)
    # cystoscope + kidney dish on a shelf in front of the cabinet
    shelf = box(C, (1.25, -0.6, 1.0), (0.35, 0.7, 0.03), ck.m_enamel('#e8e6de', 0.2), 0.008, name='sidetable')
    tube(C, [(1.25, -0.82, 1.03), (1.25, -0.6, 1.03), (1.26, -0.38, 1.035)], 0.006, ck.m_chrome(0.1), 'cystoscope')
    lathe(C, [(0.0, 0.0), (0.012, 0.0), (0.016, 0.03), (0.02, 0.05), (0.0, 0.05)], ck.m_brass(), (1.26, -0.36, 1.035), (math.pi / 2, 0, math.pi), name='eyepiece')
    P.kidney_dish(C, (1.22, -0.75, 1.02), 0.3, 0.8)
    old = forssmann((0.6, 1.15, 0), 0.0, outfit='suit', old=True, name='oldf')
    old.sit(1); old.place(1, (0.6, 1.2, -0.44), 0.0); old.hand('R', 1, (0.5, 0.52, 0.85), 1.0); old.hand('L', 1, (0.78, 0.62, 0.82), 1.0)
    pen = tube(C, [(0, 0, 0), (0, 0, 0.13)], 0.004, ck.m_enamel('#141414', 0.2), 'pen')
    for i, t in enumerate([61.3 + 0.25 * k for k in range(22)]):
        p = Vector((0.5 + 0.03 * math.sin(i * 1.7), 0.52 + 0.01 * (i % 3), 0.82)); old.hand('R', F(t), tuple(p + Vector((0.02, -0.03, 0.05))), 1.0)
        pen.location = p; pen.rotation_euler = (math.radians(-30), math.radians(15), 0); pen.keyframe_insert('location', frame=F(t))
    old.look(1, 0.0, 0.5); old.emote(F(61.3), 'sad'); old.blinks(61.3, 66.7, 2.8, 0.4, 0.45)
    t_bl = wt('bladders', 64.5) or 65.0
    old.look(F(t_bl + 0.4), 0.15, 0.2)
    haze(C, (0, 0, 1.5), (4.1, 3.9, 2.9), 0.008)
    Shot(sc, C, '10A', 61.3, [(61.3, (0.35, 1.45, 1.6), (-0.45, 2.0, 1.55)), (62.6, (0.0, 0.9, 1.6), (0.3, 1.5, 1.35)), (64.45, (-0.75, -0.5, 1.55), (0.6, 1.15, 1.2))], lens=40, fstop=2.8)
    Shot(sc, C, '10B', 64.45, [(64.45, (1.0, -1.25, 1.18), (1.25, -0.6, 1.04), None, 0.68), (65.2, (0.98, -1.22, 1.18), (1.2, -0.55, 1.04), None, 0.68), (66.0, (0.96, -1.2, 1.2), (0.8, 0.6, 1.2), None, 2.3), (66.7, (0.95, -1.18, 1.2), (0.75, 0.7, 1.2), None, 2.3)], lens=85, fstop=2.0)
def _rain_mat():
    """Rain on glass: transparent glass whose normal is perturbed by animated drops and streaks."""
    m, n, b = ck._base('rain', '#f2f6fa', 0.0); b.inputs['Transmission Weight'].default_value = 1.0
    tc = n.new('ShaderNodeTexCoord'); mp = n.new('ShaderNodeMapping'); n.link(tc, 'Object', mp, 'Vector'); mp.inputs['Scale'].default_value = (1, 1, 0.25)
    mp.inputs['Location'].default_value = (0, 0, 0); mp.inputs['Location'].keyframe_insert('default_value', frame=F(61.0))
    mp.inputs['Location'].default_value = (0, 0, 1.5); mp.inputs['Location'].keyframe_insert('default_value', frame=F(67.0))
    vo = n.new('ShaderNodeTexVoronoi', Scale=60.0); n.link(mp, 0, vo, 'Vector')
    th = n.new('ShaderNodeMapRange', From_Min=0.0, From_Max=0.25, To_Min=1.0, To_Max=0.0); n.link(vo, 'Distance', th, 'Value')
    bp = ck._bump(n, th.outputs[0], 0.6, 0.004); n.link(bp, 0, b, 'Normal'); return m

# ====================================================================== SET: Nobel stage (the payoff)
def set_nobel():
    world(sc, '#020306', 1.0)
    stage = box(C, (0, 1.0, 0.5), (12, 6, 1.0), ck.m_floor_planks('#4a2a16', '#20120a', 0.1), 0.01, name='stage')
    box(C, (0, -2.5, -0.01), (14, 6, 0.02), ck.m_fabric('#3a0c10', 0.95, 150), 0.0, name='hallcarpet')
    for x in (-4.5, -2.5, 2.5, 4.5): lathe(C, [(0.0, 0.0), (0.32, 0.0), (0.32, 0.25), (0.24, 0.35), (0.22, 5.4), (0.32, 5.6), (0.32, 5.8), (0.0, 5.8)], ck.m_plaster('#e8e0d0', '#a09880', 0.1), (x, 3.6, 1.0), name='column')
    P.curtain(C, (0, 3.9, 1.0), 12, 6.0, '#1a2a5a', 22)
    for k in range(5):
        x = -3 + k * 1.5; vase = lathe(C, [(0.0, 0.0), (0.18, 0.0), (0.22, 0.4), (0.15, 0.7), (0.0, 0.7)], ck.m_enamel('#d8c8a0', 0.2), (x, 3.2, 1.0), name='vase')
        for j in range(14): sphere(C, (x + 0.25 * math.cos(j * 2.4), 3.2 + 0.15 * math.sin(j * 1.9), 1.85 + 0.25 * math.sin(j * 0.7)), 0.09, ck.m_fabric(['#e8e0c8', '#d8a040', '#f2eee0'][j % 3], 0.6, 60), (1, 1, 0.8))
    lec = box(C, (2.2, 1.4, 1.55), (0.6, 0.45, 1.1), ck.m_wood('#5a3a22', '#2a180c', 1, 0.3, 0.6), 0.02, name='lectern')
    for r in range(5):
        for k in range(16):
            x = -7 + k * 0.9; y = -2.0 - r * 1.1; z = 0.0
            ch = box(C, (x, y, 0.45), (0.5, 0.5, 0.9), ck.m_fabric('#5a1018', 0.85, 120), 0.04, name='seat')
            if (k + r) % 3 != 0:
                sphere(C, (x, y + 0.05, 1.25), 0.11, ck.m_wool('#141414'), (1, 1, 1.15), name='aud_head'); sphere(C, (x, y + 0.08, 0.95), 0.22, ck.m_wool('#101012'), (1.1, 0.6, 1.0), name='aud_body')
    tbl = box(C, (-0.6, -0.3, 1.38), (0.5, 0.5, 0.04), ck.m_wood('#4a2a16', '#20120a', 1, 0.3, 0.6), 0.01, name='medaltable')
    for sx in (-1, 1):
        for sy in (-1, 1): tube(C, [(-0.6 + sx * 0.2, -0.3 + sy * 0.2, 1.0), (-0.6 + sx * 0.2, -0.3 + sy * 0.2, 1.36)], 0.015, ck.m_brass(), 'tblleg')
    case = P.medal_case(C, (-0.6, -0.3, 1.40), 0.3)
    old = forssmann((0.4, 1.3, 1.0), face((0.4, 1.3), (0.0, -3.0)), outfit='tails', old=True, name='laureate')
    old.emote(F(70.0), 'proud'); old.blinks(69.95, 72.3, 2.0, 0.3, 0.4)
    t_won = wt('won', 70.3) or 70.62
    old.pose(F(t_won), {'chest': (0.0, 0, 0), 'neck': (0, 0, 0)}); old.pose(F(t_won + 0.5), {'chest': (0.18, 0, 0), 'neck': (0.1, 0, 0)}); old.pose(F(t_won + 1.3), {'chest': (0.0, 0, 0), 'neck': (0, 0, 0)})
    spot(C, (-2.5, -4.0, 6.0), (0.4, 1.3, 2.4), '#ffe0b0', 2600, 14, 0.4, 0.15, 'stage_key')
    spot(C, (1.5, 6.0, 6.5), (0.4, 1.3, 2.4), '#6a8ad8', 1800, 20, 0.5, 0.2, 'stage_back')
    spot(C, (-0.6, -1.4, 3.0), (-0.6, -0.3, 1.4), '#ffe8c0', 240, 18, 0.5, 0.05, 'medal_key')
    area(C, (0, -6, 4), (0, 2, 2), 6, '#3a4a7a', 200, 'hall_fill', shadow=False)
    haze(C, (0, 0, 3.0), (14, 12, 6.0), 0.012, '#ffffff', 0.6)
    Shot(sc, C, '11B', 69.95, [(69.95, (-0.55, -0.7, 1.55), (-0.6, -0.3, 1.42), None, 0.42), (70.9, (-0.4, -1.05, 1.75), (-0.2, 0.3, 1.8), None, 1.6), (72.3, (0.05, -0.55, 2.15), (0.4, 1.3, 2.35), None, 1.9)], lens=50, fstop=2.8)

# ====================================================================== SET: modern cath lab (today)
def set_cathlab():
    world(sc, '#05070a', 1.0)
    P.room(C, 8.0, 7.0, 3.2, ck.m_plaster('#cfd6da', '#8a9298', 0.1), ck.m_tiles('#a8b2b6', '#8a9498', 0.6, 1.0, 0.3, 0.1, plane='floor'), ck.m_plaster('#eef0f2', '#a0a8ae', 0.05))
    for i in range(3):
        for j in range(2): plane(C, (-1.5 + i * 1.5, -1 + j * 2, 3.19), (1.2, 0.6), ck.m_emit('#eef4ff', 3.0), rot=(math.pi, 0, 0), name='ceilpanel'); area(C, (-1.5 + i * 1.5, -1 + j * 2, 3.1), (-1.5 + i * 1.5, -1 + j * 2, 0), 1.0, '#eef4ff', 90, 'panel', size_y=0.5)
    tbl = box(C, (0, 0, 0.95), (0.6, 2.2, 0.08), ck.m_enamel('#2a2e34', 0.3), 0.02, name='cathtable'); cyl(C, (0, -0.6, 0.45), 0.18, 0.9, ck.m_enamel('#e8ecef', 0.2))
    pt = box(C, (0, 0.1, 1.08), (0.55, 1.85, 0.2), ck.m_fabric('#5a86b8', 0.85, 220), 0.08, name='drape'); ck.subsurf(pt, 2); P._wrinkle(pt, 0.02)
    P.c_arm(C, (0, 0.2, 0), 0.0)
    xr = m_image(tex('xray_monitor.png'), 0.3, emit=1.6, name='mon')
    P.monitor_bank(C, (1.4, -0.4, 1.9), -0.6, [xr, xr], 2)
    glass = box(C, (3.9, 0.0, 1.6), (0.05, 4.0, 1.4), ck.m_glass('#e8f0e8'), 0.0, name='leadglass')
    d1 = human.Human(C, 'scrubA', 'scrubs', height=1.78, skin='#c89878', hair='#2a1a10', hair_style='side_part', loc=(0.7, -0.2, 0), rot=face((0.7, -0.2), (0.1, 0.0)))
    d2 = human.Human(C, 'scrubB', 'scrubs', height=1.68, female=True, skin='#e0b49c', hair='#3a2416', hair_style='bun', loc=(-0.75, 0.6, 0), rot=face((-0.75, 0.6), (0.0, 0.3)))
    for d in (d1, d2):
        cap = sphere(C, tuple(d.head_world() + Vector((0, 0.02, 0.06))), 0.11, ck.m_fabric('#4a76a8', 0.8, 300), (1, 1.05, 0.72), name='cap'); d._bonepart(cap, 'head')
        mask = sphere(C, tuple(d.head_world() + Vector((0, -0.07, -0.05))), 0.07, ck.m_fabric('#8ab4d8', 0.8, 400), (1.05, 0.45, 0.8), name='mask'); d._bonepart(mask, 'head')
    d1.hand('R', F(72.3), (0.3, -0.2, 1.15), 1.0); d1.hand('L', F(72.3), (0.35, 0.0, 1.12), 1.0); d1.look(F(72.3), 0.6, 0.1)
    d2.hand('L', F(72.3), (-0.4, 0.5, 1.15), 1.0); d2.look(F(72.3), 0.0, 0.4)
    area(C, (2.5, -2.5, 2.2), (0, 0, 1.2), 1.6, '#ffffff', 160, 'key'); area(C, (-2.5, 2.0, 2.5), (0, 0, 1.3), 1.4, '#a8c8ff', 200, 'rim')
    exposure({'12A': -2.0})
    Shot(sc, C, '12A', 72.3, [(72.3, (2.3, -2.3, 1.75), (0.1, 0.1, 1.25)), (74.3, (2.9, -0.6, 1.8), (0.1, 0.1, 1.25)), (76.2, (2.6, 1.1, 1.85), (0.1, 0.1, 1.25))], lens=32, fstop=4.0, ease='linear')

BUILD = {'anatomy': set_anatomy, 'or': set_or, 'ward': set_ward, 'office': set_office, 'corridor': set_corridor, 'xray': set_xray, 'berlin': set_berlin,
         'amphi': set_amphi, 'town': set_town, 'nobel': set_nobel, 'cathlab': set_cathlab}
t0 = time.time(); BUILD[SET](); print(f'BUILD {SET} {time.time() - t0:.1f}s')
sc.frame_start = 0; sc.frame_end = F(SB['duration'])

def render_frame(f, path):
    sc.frame_set(f); cam = shot_at(sc, f); sc.camera = cam
    sc.render.filepath = path; bpy.ops.render.render(write_still=True)
for _o in list(bpy.data.objects):   # debug: HIDE=name1,name2 hides objects whose names start with these (QC isolation)
    if any(_o.name.startswith(h) for h in filter(None, os.environ.get('HIDE', '').split(','))): _o.hide_render = True
if '--stills' in argv:
    out = arg('--out', os.path.join(HERE, 'stills')); os.makedirs(out, exist_ok=True)
    ids = arg('--stills').split(',')
    for spec in ids:
        sid, _, frac = spec.partition('@'); a, b = T(sid); t = a + (b - a) * (float(frac) if frac else 0.5)
        t1 = time.time(); render_frame(F(t), os.path.join(out, f'{sid}_{t:05.2f}.png')); print(f'STILL {sid} {t:.2f} {time.time() - t1:.1f}s', flush=True)
if '--render' in argv:
    out = arg('--out', os.path.join(HERE, 'frames')); os.makedirs(out, exist_ok=True)
    only = arg('--shots'); ids = only.split(',') if only else [s['id'] for s in shots_of(SET)]
    for sid in ids:
        a, b = T(sid); fa, fb = F(a), F(b) - 1 if b < SB['duration'] - 0.01 else F(b)
        if '--range' in argv: lo, hi = (int(x) for x in arg('--range').split('-')); fa, fb = max(fa, lo), min(fb, hi)
        step = int(arg('--step', '1'))
        for f in range(fa, fb + 1):
            if f % step and f != fa: continue   # render on twos (+ every shot's first frame); post interpolates the rest
            p = os.path.join(out, f'{f:05d}.png')
            if os.path.exists(p): continue
            t1 = time.time(); render_frame(f, p); print(f'FRAME {sid} {f} {time.time() - t1:.1f}s', flush=True)
