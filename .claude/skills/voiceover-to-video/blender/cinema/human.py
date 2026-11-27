# Cinema kit (v5) - realistic-proportion humans for documentary reconstructions.
# Body = skin-modifier "garment" meshes grown on a shared armature (so clothes ARE the silhouette: coats, dresses, suits),
# sculpted head (procedural anatomy: skull, jaw, brow ridge, eye sockets, nose, lips, chin) with shape keys for expressions,
# real eyeballs (iris/pupil/cornea) with blinking upper lids, ears, sculpted hair, glasses, moustache; hands with fingers.
# Rig: root, hips, spine, chest, neck, head, shoulder/upper_arm/forearm/hand + 2-bone fingers, thigh/shin/foot/toe.
# Facing -Y. Units metres. Proportions: ~7.5 heads; height scales everything.
import bpy, bmesh, math
from mathutils import Vector, Euler, Matrix
from mathutils.bvhtree import BVHTree
import ck
from ck import F, hexc, key, _fcurves

# ---------------------------------------------------------------- rest skeleton (male, 1.78 m)
J = {
    'root': (0, 0, 0), 'hips': (0, 0.0, 0.95), 'spine': (0, 0.0, 1.10), 'chest': (0, 0.005, 1.30), 'neck': (0, 0.015, 1.49), 'head': (0, 0.02, 1.585), 'top': (0, 0.02, 1.80),
    'clav.L': (0.02, 0.01, 1.455), 'shoulder.L': (0.180, 0.02, 1.445), 'elbow.L': (0.215, 0.04, 1.165), 'wrist.L': (0.235, 0.0, 0.915), 'knuck.L': (0.245, -0.012, 0.825),
    'hip.L': (0.092, 0.0, 0.925), 'knee.L': (0.098, -0.012, 0.515), 'ankle.L': (0.1, 0.025, 0.085), 'ball.L': (0.1, -0.095, 0.025), 'toe.L': (0.1, -0.165, 0.022),
}
for k in list(J):
    if k.endswith('.L'): x, y, z = J[k]; J[k[:-2] + '.R'] = (-x, y, z)
BONES = [('root', 'root', (0, 0.25, 0), None), ('hips', 'hips', 'spine', 'root'), ('spine', 'spine', 'chest', 'hips'), ('chest', 'chest', 'neck', 'spine'),
         ('neck', 'neck', 'head', 'chest'), ('head', 'head', 'top', 'neck')]
for s in ('L', 'R'):
    BONES += [('shoulder.' + s, 'clav.' + s, 'shoulder.' + s, 'chest'), ('upper_arm.' + s, 'shoulder.' + s, 'elbow.' + s, 'shoulder.' + s),
              ('forearm.' + s, 'elbow.' + s, 'wrist.' + s, 'upper_arm.' + s), ('hand.' + s, 'wrist.' + s, 'knuck.' + s, 'forearm.' + s),
              ('thigh.' + s, 'hip.' + s, 'knee.' + s, 'hips'), ('shin.' + s, 'knee.' + s, 'ankle.' + s, 'thigh.' + s),
              ('foot.' + s, 'ankle.' + s, 'ball.' + s, 'shin.' + s), ('toe.' + s, 'ball.' + s, 'toe.' + s, 'foot.' + s)]
FINGERS = {'thumb': (0.62, -0.02, 0.022, 0.75), 'index': (0.0, -0.012, 0.0, 1.0), 'middle': (0.0, -0.0, 0.0, 1.08), 'ring': (0.0, 0.011, 0.0, 1.0), 'pinky': (0.0, 0.021, 0.0, 0.8)}

def _lerp(a, b, t): return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))

class Human:
    """Human(coll, 'forssmann', outfit='doctor', height=1.78, skin='#d9a587', hair='#1e140e', hair_style='side_part', ...)
    outfits: 'doctor' (long white coat, shirt+tie, trousers), 'suit', 'tails' (white tie), 'nurse' (1920s uniform + cap + apron),
             'scrubs' (modern blue gown + cap + mask), 'ghost' (nude translucent body for anatomy; material passed in)."""
    def __init__(s, coll, name, outfit='doctor', height=1.78, skin='#d9a587', hair='#1e140e', hair_style='side_part', eyes='#4a5a6a',
                 glasses=False, moustache=False, age=25, coat='#f1efe6', suit='#2a2c33', tie='#5a1a22', female=False, ghost_mat=None, build=1.0, loc=(0, 0, 0), rot=0.0):
        s.name, s.coll, s.outfit, s.female, s.skin_hex = name, coll, outfit, female, skin
        s.k = height / 1.78; s.build = build; s.age = age
        s.M = dict(skin=ck.m_skin(skin), hair=ck.m_hair(hair), coat=ck.m_fabric(coat, 0.8, 340.0), shirt=ck.m_fabric('#f4f2ec', 0.7, 500.0),
                   suit=ck.m_wool(suit), tie=ck.m_fabric(tie, 0.55, 600.0, 0.6), shoe=ck.m_leather('#141010', 0.3), trousers=ck.m_wool(suit if outfit != 'doctor' else '#26272c'))
        s._rig()
        s._grow_body(outfit, ghost_mat)
        if outfit != 'ghost': s._head(skin, hair, hair_style, eyes, glasses, moustache)
        s.arm.location = loc; s.arm.rotation_euler = (0, 0, rot)
        s.ik = {}; s._ik_setup()
        for f in ('L', 'R'): s.fingers(1, f, 'relaxed')
        s.rest(1)

    # ------------------------------------------------ rig
    def _p(s, j): x, y, z = J[j]; return Vector((x * s.k * (1.08 if abs(x) > 0.05 and s.build > 1 else 1), y * s.k, z * s.k))
    def _rig(s):
        ad = bpy.data.armatures.new(s.name + '_rig'); s.arm = bpy.data.objects.new(s.name + '_rig', ad); s.coll.objects.link(s.arm)
        vl = bpy.context.view_layer; vl.objects.active = s.arm; s.arm.select_set(True); bpy.ops.object.mode_set(mode='EDIT'); eb = ad.edit_bones
        for n, h, t, par in BONES:
            b = eb.new(n); b.head = s._p(h); b.tail = s._p(t) if isinstance(t, str) else s._p(h) + Vector(t)
            if par: b.parent = eb[par]; b.use_connect = False
        for sd in ('L', 'R'):   # fingers: 2 bones each from the knuckle line
            sx = 1 if sd == 'L' else -1; wr = s._p('wrist.' + sd); kn = s._p('knuck.' + sd)
            for f, (spread, dy, dz, ln) in FINGERS.items():
                base = kn + Vector((0, dy * s.k, dz * s.k)) if f != 'thumb' else wr.lerp(kn, 0.35) + Vector((-sx * 0.012, -0.022, -0.005)) * s.k
                d = (kn - wr).normalized() if f != 'thumb' else Vector((-sx * 0.25, -0.65, -0.72)).normalized()
                l1, l2 = 0.045 * ln * s.k, 0.045 * ln * s.k
                b1 = eb.new(f'{f}1.{sd}'); b1.head = base; b1.tail = base + d * l1; b1.parent = eb['hand.' + sd]
                b2 = eb.new(f'{f}2.{sd}'); b2.head = b1.tail; b2.tail = b1.tail + d * l2; b2.parent = b1
        bpy.ops.object.mode_set(mode='OBJECT')
        for pb in s.arm.pose.bones: pb.rotation_mode = 'XYZ'
        s.arm.show_in_front = False

    # ------------------------------------------------ skin-modifier garments
    def _garment(s, gname, chains, m, sub=2, rootv=0):
        """chains: list of [(joint_or_point, (rx, ry), bone), ...]; consecutive points are connected; a chain may start at
        a point of an earlier chain (same coordinates) to branch. Builds one skinned mesh deformed by the armature."""
        verts, edges, radii, bones = [], [], [], []
        def vid(p, r, b):
            p = Vector(p)
            for i, q in enumerate(verts):
                if (q - p).length < 1e-5: return i
            verts.append(p); radii.append(r); bones.append(b); return len(verts) - 1
        for ch in chains:
            prev = None
            for p, r, b in ch:
                pp = s._p(p) if isinstance(p, str) else Vector(p) * s.k
                i = vid(pp, (r[0] * s.k * s.build, r[1] * s.k * s.build), b)
                if prev is not None and prev != i: edges.append((prev, i))
                prev = i
        me = bpy.data.meshes.new(s.name + '_' + gname); me.from_pydata([tuple(v) for v in verts], edges, []); me.update()
        o = bpy.data.objects.new(s.name + '_' + gname, me); s.coll.objects.link(o)
        sk = o.modifiers.new('skin', 'SKIN'); sk.use_smooth_shade = True; sk.branch_smoothing = 0.6
        for i, r in enumerate(radii): o.data.skin_vertices[0].data[i].radius = r
        o.data.skin_vertices[0].data[rootv].use_root = True
        for b in set(bones): o.vertex_groups.new(name=b)
        for i, b in enumerate(bones): o.vertex_groups[b].add([i], 1.0, 'REPLACE')
        am = o.modifiers.new('arm', 'ARMATURE'); am.object = s.arm
        bpy.context.view_layer.objects.active = o
        while o.modifiers[0].name != 'arm': bpy.ops.object.modifier_move_up(modifier='arm')
        ck.subsurf(o, sub); o.data.materials.append(m); o.parent = s.arm
        return o
    @staticmethod
    def _seg(a, b, ra, rb, bone, n=3, bone_b=None):
        """n points from joint a to joint b (exclusive of a) interpolating radii."""
        out = []
        for i in range(1, n + 1):
            t = i / n; out.append(((a, b, t), (ra[0] + (rb[0] - ra[0]) * t, ra[1] + (rb[1] - ra[1]) * t), bone_b if (bone_b and t > 0.99) else bone))
        return out
    def _pt(s, spec):
        if isinstance(spec, tuple) and len(spec) == 3 and isinstance(spec[0], str): a, b, t = spec; return tuple(Vector(J[a]).lerp(Vector(J[b]), t))
        return J[spec] if isinstance(spec, str) else spec
    def _chain(s, pts):
        return [(s._pt(p), r, b) for p, r, b in pts]

    def _arm_chain(s, sd, sleeve_r=(0.062, 0.058), cuff=(0.045, 0.042), start='shoulder'):
        sh, el, wr = 'shoulder.' + sd, 'elbow.' + sd, 'wrist.' + sd
        pts = [(sh, sleeve_r, 'upper_arm.' + sd), ((sh, el, 0.5), (sleeve_r[0] * 0.92, sleeve_r[1] * 0.9), 'upper_arm.' + sd), (el, (0.052, 0.05), 'forearm.' + sd),
               ((el, wr, 0.5), (0.048, 0.044), 'forearm.' + sd), ((el, wr, 0.97), cuff, 'forearm.' + sd)]
        return pts
    def _grow_body(s, outfit, ghost_mat):
        M = s.M; c = []
        # hands (always skin) : wrist -> palm -> 5 fingers (2-bone)
        for sd in ('L', 'R'):
            sx = 1 if sd == 'L' else -1; wr = Vector(J['wrist.' + sd]); kn = Vector(J['knuck.' + sd]); d = (kn - wr).normalized()
            palm = wr.lerp(kn, 0.5)
            hch = [[(tuple(wr + d * 0.015), (0.03, 0.022), 'hand.' + sd), (tuple(palm), (0.038, 0.016), 'hand.' + sd), (tuple(kn - d * 0.01), (0.036, 0.013), 'hand.' + sd)]]
            for f, (spread, dy, dz, ln) in FINGERS.items():
                if f == 'thumb':
                    b0 = wr.lerp(kn, 0.3) + Vector((-sx * 0.01, -0.016, -0.004)); dd = Vector((-sx * 0.25, -0.65, -0.72)).normalized()
                    hch.append([(tuple(palm), (0.03, 0.015), 'hand.' + sd), (tuple(b0), (0.014, 0.012), 'thumb1.' + sd),
                                (tuple(b0 + dd * 0.034), (0.0105, 0.0095), 'thumb1.' + sd), (tuple(b0 + dd * 0.066), (0.0095, 0.0085), 'thumb2.' + sd)])
                    continue
                b0 = kn + Vector((0, dy, dz)); L1 = 0.045 * ln
                hch.append([(tuple(kn - d * 0.01), (0.036, 0.013), 'hand.' + sd), (tuple(b0), (0.0095, 0.0088), f + '1.' + sd), (tuple(b0 + d * L1), (0.0085, 0.008), f + '1.' + sd),
                            (tuple(b0 + d * (L1 * 1.55)), (0.0078, 0.0072), f + '2.' + sd), (tuple(b0 + d * (L1 * 2.0)), (0.0068, 0.0062), f + '2.' + sd)])
            s.hands = getattr(s, 'hands', []) + [s._garment('hand' + sd, hch, ghost_mat or M['skin'], 1)]
        neck = [[('chest', (0.048, 0.05), 'neck'), ('neck', (0.044, 0.048), 'neck'), ('head', (0.04, 0.044), 'head')]]
        if outfit == 'ghost':
            m = ghost_mat
            torso = [[('hips', (0.15, 0.1), 'hips'), ('spine', (0.135, 0.095), 'spine'), (('spine', 'chest', 0.5), (0.145, 0.1), 'chest'), ('chest', (0.16, 0.105), 'chest'),
                      ((0, 0.01, 1.42), (0.15, 0.1), 'chest'), ('neck', (0.06, 0.06), 'neck'), ('head', (0.052, 0.054), 'head')]]
            for sd in ('L', 'R'):
                torso.append([((0, 0.01, 1.42), (0.15, 0.1), 'chest'), ('shoulder.' + sd, (0.058, 0.056), 'upper_arm.' + sd)] + [(p, (r[0] * 0.75, r[1] * 0.75), b) for p, r, b in s._arm_chain(sd)][1:] + [('wrist.' + sd, (0.03, 0.022), 'hand.' + sd)])
                torso.append([('hips', (0.15, 0.1), 'hips'), ('hip.' + sd, (0.09, 0.085), 'thigh.' + sd), ('knee.' + sd, (0.055, 0.055), 'shin.' + sd), ('ankle.' + sd, (0.035, 0.035), 'foot.' + sd)])
            s.body = s._garment('body', [s._chain(ch) for ch in torso], m, 2)
            s._ghost_head(m); return
        s._garment('neck', [s._chain(ch) for ch in neck], M['skin'], 2)
        long_coat = outfit in ('doctor',); dress = outfit == 'nurse'
        top_m = {'doctor': M['coat'], 'suit': M['suit'], 'tails': M['suit'], 'nurse': ck.m_fabric('#f3f1ea', 0.8, 380.0), 'scrubs': ck.m_fabric('#4b6f9a', 0.85, 300.0)}[outfit]
        hem_z = {'doctor': 0.56, 'suit': 0.86, 'tails': 0.86, 'nurse': 0.36, 'scrubs': 0.62}[outfit]
        fem = 0.92 if s.female else 1.0
        trunk = [('neck', (0.066, 0.064), 'neck'), ((0, 0.012, 1.455), (0.105 * fem, 0.085), 'chest'), ((0, 0.008, 1.40), (0.155 * fem, 0.105), 'chest'), ('chest', (0.158 * fem, 0.112 if not s.female else 0.12), 'chest'),
                 (('spine', 'chest', 0.45), (0.155 * fem, 0.112), 'spine'), ('spine', (0.152 * (0.88 if s.female else 1), 0.108), 'spine'), ('hips', (0.168 * (1.08 if s.female else 1), 0.118), 'hips')]
        z = 0.95
        while z - 0.12 > hem_z - 1e-3:
            z -= 0.12; t = (0.95 - z) / max(0.01, 0.95 - hem_z)
            flare = 0.17 + 0.07 * t if (long_coat or dress) else 0.165
            trunk.append(((0, 0.0, z), (flare * (1.08 if s.female else 1), 0.12 + 0.045 * t if (long_coat or dress) else 0.115), 'hips'))
        trunk.append(((0, 0.0, hem_z), (trunk[-1][1][0] * 1.02, trunk[-1][1][1] * 1.02), 'hips'))
        ch = [s._chain(trunk)]
        for sd in ('L', 'R'):
            sx = 1 if sd == 'L' else -1
            ch.append(s._chain([((0, 0.012, 1.455), (0.105 * fem, 0.085), 'chest'), ((sx * 0.11, 0.015, 1.45), (0.06, 0.058), 'shoulder.' + sd)] + s._arm_chain(sd, (0.056, 0.054) if outfit != 'nurse' else (0.05, 0.048))))
        s.top = s._garment('top', ch, top_m, 2)
        # legs: trousers / stockings, then shoes
        leg_m = M['trousers'] if outfit not in ('nurse',) else ck.m_fabric('#c9b8a8', 0.6, 900.0, 0.2)
        if outfit == 'scrubs': leg_m = top_m
        legs = []
        for sd in ('L', 'R'):
            rr = 0.85 if s.female else 1.0
            legs.append(s._chain([((0, 0.0, 1.0), (0.09, 0.07), 'hips'), ('hip.' + sd, (0.085 * rr, 0.082 * rr), 'thigh.' + sd), (('hip.' + sd, 'knee.' + sd, 0.5), (0.074 * rr, 0.074 * rr), 'thigh.' + sd),
                                  ('knee.' + sd, (0.06 * rr, 0.06 * rr), 'shin.' + sd), (('knee.' + sd, 'ankle.' + sd, 0.45), (0.058 * rr, 0.056 * rr), 'shin.' + sd),
                                  (('knee.' + sd, 'ankle.' + sd, 0.92), (0.048 * rr if outfit != 'nurse' else 0.036, 0.046 * rr if outfit != 'nurse' else 0.036), 'shin.' + sd)]))
        s._garment('legs', legs, leg_m, 2)
        shoes = []
        for sd in ('L', 'R'):
            a = Vector(J['ankle.' + sd]); b = Vector(J['ball.' + sd]); t = Vector(J['toe.' + sd])
            shoes.append([(tuple(a + Vector((0, 0.035, 0.0))), (0.04, 0.036), 'foot.' + sd), (tuple(a + Vector((0, 0.0, -0.02))), (0.045, 0.04), 'foot.' + sd), (tuple(a.lerp(b, 0.55) + Vector((0, 0, -0.02))), (0.045, 0.034), 'foot.' + sd),
                          (tuple(b + Vector((0, 0, 0.0))), (0.044, 0.028), 'toe.' + sd), (tuple(t + Vector((0, 0.02, 0.005))), (0.034, 0.024), 'toe.' + sd)])
        s._garment('shoes', shoes, M['shoe'] if outfit != 'scrubs' else ck.m_fabric('#e8ecef', 0.6), 2)
        s._dress(outfit)

    def _bonepart(s, o, bone):
        """Rigidly attach a mesh to a bone (keeps world transform)."""
        vl = bpy.context.view_layer; vl.update(); mw = o.matrix_world.copy(); o.parent = s.arm; o.parent_type = 'BONE'; o.parent_bone = bone; vl.update(); o.matrix_world = mw; return o
    def _dress(s, outfit):
        C, M, k = s.coll, s.M, s.k
        chest_y = -0.118 * k
        if outfit in ('doctor', 'suit', 'tails'):
            # shirt V, tie, lapels and buttons on the front of the chest
            shirt = ck.mesh_obj(C, s.name + '_shirtv', [(-0.05 * k, chest_y - 0.004, 1.44 * k), (0.05 * k, chest_y - 0.004, 1.44 * k), (0, chest_y - 0.012, 1.24 * k)], [(0, 1, 2)], M['shirt'])
            ck.solidify(shirt, 0.004); s._bonepart(shirt, 'chest')
            collar = ck.torus(C, (0, 0.014 * k, 1.495 * k), 0.056 * k, 0.014 * k, M['shirt'], rot=(math.radians(-8), 0, 0), name=s.name + '_collar'); collar.scale = (1, 1.05, 0.7); s._bonepart(collar, 'neck')
            if outfit == 'tails':
                bow = ck.sphere(C, (0, chest_y - 0.035, 1.452 * k), 0.022 * k, ck.m_fabric('#f8f8f4', 0.5), (1.6, 0.4, 0.55), name=s.name + '_bowtie'); s._bonepart(bow, 'chest')
            else:
                tie = ck.mesh_obj(C, s.name + '_tie', [(-0.011 * k, chest_y - 0.018, 1.44 * k), (0.011 * k, chest_y - 0.018, 1.44 * k), (0.02 * k, chest_y - 0.02, 1.27 * k), (0, chest_y - 0.022, 1.245 * k), (-0.02 * k, chest_y - 0.02, 1.27 * k)], [(0, 1, 2, 3, 4)], M['tie'])
                ck.solidify(tie, 0.006); s._bonepart(tie, 'chest')
            lm = M['coat'] if outfit == 'doctor' else M['suit']
            for sx in (-1, 1):
                lap = ck.mesh_obj(C, s.name + '_lapel', [(sx * 0.052 * k, chest_y - 0.006, 1.45 * k), (sx * 0.1 * k, chest_y + 0.01, 1.39 * k), (sx * 0.004 * k, chest_y - 0.016, 1.2 * k), (sx * 0.03 * k, chest_y - 0.01, 1.43 * k)], [(0, 1, 2, 3)], lm)
                ck.solidify(lap, 0.006); s._bonepart(lap, 'chest')
            btn = ck.m_enamel('#e8e4d8' if outfit == 'doctor' else '#16161a', 0.2)
            for z in ((1.15, 1.02, 0.89, 0.76) if outfit == 'doctor' else (1.12, 1.0)):
                b = ck.cyl(C, (0.006 * k, -0.125 * k if z > 0.95 else -0.135 * k, z * k), 0.008 * k, 0.004 * k, btn, rot=(math.pi / 2, 0, 0), name=s.name + '_btn', steps=16)
                s._bonepart(b, 'spine' if z > 1.0 else 'hips')
            if outfit == 'doctor':
                pk = ck.box(C, (0.09 * k, -0.13 * k, 0.84 * k), (0.12 * k, 0.012, 0.13 * k), M['coat'], 0.004, name=s.name + '_pocket'); s._bonepart(pk, 'hips')
                pen = ck.cyl(C, (-0.075 * k, -0.125 * k, 1.36 * k), 0.005, 0.12, ck.m_enamel('#101010', 0.2), name=s.name + '_pen'); s._bonepart(pen, 'chest')
        if outfit == 'nurse':
            ap = ck.mesh_obj(C, s.name + '_apron', [(-0.13 * k, -0.125 * k, 1.05 * k), (0.13 * k, -0.125 * k, 1.05 * k), (0.18 * k, -0.17 * k, 0.42 * k), (-0.18 * k, -0.17 * k, 0.42 * k)], [(0, 1, 2, 3)], ck.m_fabric('#fbfaf6', 0.85, 300.0))
            ck.solidify(ap, 0.004); ck.subsurf(ap, 1); s._bonepart(ap, 'hips')
            bib = ck.mesh_obj(C, s.name + '_bib', [(-0.09 * k, -0.123 * k, 1.36 * k), (0.09 * k, -0.123 * k, 1.36 * k), (0.11 * k, -0.123 * k, 1.06 * k), (-0.11 * k, -0.123 * k, 1.06 * k)], [(0, 1, 2, 3)], ck.m_fabric('#fbfaf6', 0.85, 300.0))
            ck.solidify(bib, 0.004); s._bonepart(bib, 'chest')
            belt = ck.torus(C, (0, 0, 1.08 * k), 0.15 * k, 0.012 * k, ck.m_fabric('#f8f8f2', 0.7), name=s.name + '_belt'); belt.scale = (1.02, 0.75, 1.0); s._bonepart(belt, 'spine')
            keys = ck.torus(C, (0.14 * k, -0.07 * k, 1.0 * k), 0.022, 0.0025, ck.m_brass(), rot=(0, math.pi / 2, 0), name=s.name + '_keyring'); s._bonepart(keys, 'hips')
            for i in range(3):
                kk = ck.box(C, (0.143 * k, -0.07 * k + (i - 1) * 0.01, 0.97 * k - i * 0.004), (0.003, 0.006, 0.045), ck.m_brass(), 0.001, name=s.name + '_key'); s._bonepart(kk, 'hips')
        if outfit == 'scrubs':
            pass

    # ------------------------------------------------ head
    def _head(s, skin, hair, hair_style, eyes, glasses, moustache):
        C = s.coll; H0 = s._p('head') + Vector((0, -0.005 * s.k, -0.042 * s.k)); k = s.k * 1.05   # chin-level origin; head 5 % over-scale reads better on screen
        o = s._sculpt_head(H0, k); o.data.materials.append(_face_material(s.skin_hex, '#a85a50' if not s.female else '#b0505a', s.age)); ck.subsurf(o, 1, 2)
        s.headmesh = s._bonepart(o, 'head')
        s._eyes(o, H0, k, eyes)
        s._ears(H0, k)
        if hair_style != 'none': s._hair(o, H0, k, hair_style)
        if glasses: s._glasses(H0, k)
        if moustache: s._moustache(H0, k)
    def _sculpt_head(s, H0, k):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=96, ring_count=64, radius=1.0, location=(0, 0, 0)); o = bpy.context.object; ck._link(o, s.coll); o.name = s.name + '_head'
        ax, ay, az = 0.077, 0.1, 0.12; cz = 0.12
        fem = s.female
        def g(x, y, z, cx, cz_, sx, sz): return math.exp(-((x - cx) ** 2) / (2 * sx * sx) - ((z - cz_) ** 2) / (2 * sz * sz))
        me = o.data; base = []
        for v in me.vertices:
            ux, uy, uz = v.co.x, v.co.y, v.co.z
            x, y, z = ux * ax, uy * ay, uz * az + cz
            # skull: wider at the back-top, narrower jaw, chin forward, flatter face, nape tuck
            if uz < 0:
                j = (-uz) ** 1.3; x *= 1 - (0.30 if not fem else 0.36) * j * (0.55 + 0.75 * max(0.0, -uy))
                if uy < 0: y *= 1 - 0.08 * j
                else: y *= 1 - 0.38 * j
            if uy > 0 and uz > -0.2: y *= 1.04
            if uy < -0.55: y = y * 0.95
            if uz > 0.6: x *= 1.0 + 0.03 * (uz - 0.6)
            base.append((x, y, z))
        def front(x, z):   # face-front displacement field (negative = toward the face, i.e. -Y)
            d = 0.0
            for sx_ in (-1, 1):
                d += 0.0075 * g(x, 0, z, sx_ * 0.032, 0.126, 0.0145, 0.011)        # eye socket (pushes in, +)
                d -= 0.0045 * g(x, 0, z, sx_ * 0.031, 0.145, 0.02, 0.006)           # brow ridge
                d -= 0.0055 * g(x, 0, z, sx_ * 0.05, 0.108, 0.012, 0.012)           # cheekbone
                d -= 0.0055 * g(x, 0, z, sx_ * 0.0135, 0.081, 0.0055, 0.0045)       # nostril wings
                d += 0.003 * g(x, 0, z, sx_ * 0.026, 0.07, 0.008, 0.012)            # nasolabial
            # nose: bridge -> tip
            if 0.07 < z < 0.14:
                t = (0.14 - z) / 0.055; prof = 0.022 * min(1.0, t) ** 1.3 if z > 0.083 else 0.022 * max(0, 1 - (0.083 - z) / 0.012)
                d -= prof * math.exp(-(x * x) / (2 * (0.0042 + 0.0035 * min(1, t)) ** 2))
            d -= 0.004 * g(x, 0, z, 0, 0.087, 0.0075, 0.006)                       # nose tip bulb
            d -= 0.0055 * g(x, 0, z, 0, 0.062, 0.017, 0.0045)                      # upper lip
            d -= 0.0065 * g(x, 0, z, 0, 0.047, 0.016, 0.005)                       # lower lip
            d += 0.0035 * g(x, 0, z, 0, 0.0555, 0.022, 0.0016)                     # lip line
            d += 0.004 * g(x, 0, z, 0, 0.036, 0.02, 0.004)                         # chin crease
            d -= 0.007 * g(x, 0, z, 0, 0.018, 0.02, 0.011)                         # chin
            return d
        for v, (x, y, z) in zip(me.vertices, base):
            w = max(0.0, -y / ay)   # only the front
            v.co = Vector((x, y + front(x, z) * min(1.0, w * 1.6) if y < 0 else y, z))
        # shape keys: expressions
        o.shape_key_add(name='Basis')
        def sk(name, fn):
            kb = o.shape_key_add(name=name, from_mix=False)
            for i, v in enumerate(me.vertices):
                x, y, z = v.co; dx, dy, dz = fn(x, y, z); kb.data[i].co = Vector((x + dx, y + dy, z + dz))
        front_w = lambda y: max(0, min(1, -y / 0.05))
        sk('jaw_open', lambda x, y, z: (0, 0.004 * front_w(y), -0.014 * max(0, min(1, (0.055 - z) / 0.02))) if z < 0.055 and y < 0.02 else (0, 0, 0))
        sk('smile', lambda x, y, z: (math.copysign(0.004, x) * g(x, 0, z, math.copysign(0.024, x), 0.056, 0.01, 0.01), 0.002 * g(x, 0, z, math.copysign(0.024, x), 0.056, 0.012, 0.01),
                                    0.0045 * g(x, 0, z, math.copysign(0.024, x), 0.056, 0.011, 0.01) + 0.003 * g(x, 0, z, math.copysign(0.045, x), 0.1, 0.014, 0.012)) if y < 0 else (0, 0, 0))
        sk('frown', lambda x, y, z: (0, 0, -0.004 * g(x, 0, z, math.copysign(0.024, x), 0.054, 0.01, 0.01)) if y < 0 else (0, 0, 0))
        sk('brow_up', lambda x, y, z: (0, 0, 0.005 * g(x, 0, z, math.copysign(0.03, x), 0.15, 0.024, 0.012)) if y < 0 else (0, 0, 0))
        sk('brow_knit', lambda x, y, z: (-math.copysign(0.003, x) * g(x, 0, z, math.copysign(0.018, x), 0.146, 0.012, 0.01), -0.002 * g(x, 0, z, math.copysign(0.018, x), 0.146, 0.012, 0.01),
                                        -0.004 * g(x, 0, z, math.copysign(0.02, x), 0.146, 0.014, 0.01)) if y < 0 else (0, 0, 0))
        sk('lips_press', lambda x, y, z: (0, 0.002 * g(x, 0, z, 0, 0.055, 0.02, 0.008), 0) if y < 0 else (0, 0, 0))
        o.scale = (k, k, k); o.location = H0
        s.bvh_src = o
        return o
    def _surface_y(s, o, x, z):
        bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
        bvh = BVHTree.FromObject(o, dg); mw = o.matrix_world
        hit = bvh.ray_cast(mw.inverted() @ Vector((x, -1.0, z)), (mw.inverted().to_3x3() @ Vector((0, 1, 0))).normalized())
        return (mw @ hit[0]).y if hit[0] else None
    def _eyes(s, head, H0, k, iris):
        C = s.coll; s.eyeballs, s.lids = [], []
        em = _eye_material(iris)
        for sx in (-1, 1):
            ex, ez = H0.x + sx * 0.032 * k, H0.z + 0.126 * k
            sy = s._surface_y(head, ex, ez) or (H0.y - 0.085 * k)
            r = 0.0118 * k; c = Vector((ex, sy + r - 0.0032 * k, ez))
            ball = ck.sphere(C, tuple(c), r, em, name=s.name + '_eye', seg=32); ball.rotation_euler = (0, 0, 0)
            piv = bpy.data.objects.new(s.name + '_eyepiv', None); piv.location = c; C.objects.link(piv); s._bonepart(piv, 'head')
            vl = bpy.context.view_layer; vl.update(); mw = ball.matrix_world.copy(); ball.parent = piv; vl.update(); ball.matrix_world = mw
            # upper lid: a skin shell cut to the upper half, rotating around the eye centre
            lid = ck.sphere(C, tuple(c), r * 1.09, s.M['skin'], name=s.name + '_lid', seg=32)
            bm = bmesh.new(); bm.from_mesh(lid.data); kill = [v for v in bm.verts if v.co.z < -0.15 * r or v.co.y > 0.2 * r]
            bmesh.ops.delete(bm, geom=kill, context='VERTS'); bm.to_mesh(lid.data); bm.free(); ck.solidify(lid, 0.0012 * k, 0)
            lpiv = bpy.data.objects.new(s.name + '_lidpiv', None); lpiv.location = c; C.objects.link(lpiv); s._bonepart(lpiv, 'head')
            vl.update(); mw = lid.matrix_world.copy(); lid.parent = lpiv; vl.update(); lid.matrix_world = mw
            lower = ck.torus(C, tuple(c + Vector((0, -0.002 * k, -0.0035 * k))), r * 0.95, 0.0016 * k, s.M['skin'], rot=(math.radians(70), 0, 0), name=s.name + '_lowlid')
            s._bonepart(lower, 'head')
            for pv in (piv, lpiv): pv['_base'] = [x for row in pv.matrix_basis for x in row]
            s.eyeballs.append(piv); s.lids.append(lpiv)
            # brow hair
            bw = ck.tube(C, [(ex - sx * 0.016 * k, sy - 0.0045 * k, ez + 0.017 * k), (ex, sy - 0.007 * k, ez + 0.022 * k), (ex + sx * 0.018 * k, sy - 0.0035 * k, ez + 0.018 * k)], 0.0026 * k, s.M['hair'], s.name + '_brow')
            bw.data.bevel_resolution = 2; s._bonepart(bw, 'head')
        s.set_lids(1, 0.32)
    def _ears(s, H0, k):
        for sx in (-1, 1):
            e = ck.sphere(s.coll, (H0.x + sx * 0.073 * k, H0.y + 0.008 * k, H0.z + 0.112 * k), 0.012 * k, s.M['skin'], (0.45, 1.25, 2.2), name=s.name + '_ear', seg=24)
            e.rotation_euler = (0, sx * math.radians(-12), math.radians(sx * 8)); s._bonepart(e, 'head')
            rim = ck.torus(s.coll, (H0.x + sx * 0.0755 * k, H0.y + 0.009 * k, H0.z + 0.114 * k), 0.0175 * k, 0.0032 * k, s.M['skin'], rot=(0, math.pi / 2, 0), name=s.name + '_earrim')
            rim.scale = (1.3, 0.8, 1.0); s._bonepart(rim, 'head')
    def _hair(s, head, H0, k, style):
        """Sculpted hair shell from the scalp: hairline varies by style; thickness/volume per region; side part ridge."""
        C = s.coll; me = head.data.copy(); o = bpy.data.objects.new(s.name + '_hair', me); C.objects.link(o); o.matrix_world = head.matrix_world.copy()
        if o.data.shape_keys:
            o.shape_key_clear()
        bm = bmesh.new(); bm.from_mesh(o.data); bm.normal_update()
        def keep(v):
            x, y, z = v.co
            if style in ('bald', 'bald_crown'):
                return z > 0.07 and y > -0.02 and (abs(x) > 0.05 or y > 0.05) and z < 0.19
            front_line = 0.175 if s.age < 45 else 0.185
            if y < -0.03: return z > front_line - 0.02 * (abs(x) / 0.07) and not (abs(x) < 0.06 and y < -0.075 and z < front_line + 0.005)
            if abs(x) > 0.055 and y < 0.03: return z > 0.11 + (0.02 if y < -0.01 else 0)
            return z > 0.06 - 0.02 * max(0, y / 0.09)
        def feather(v):   # 0 outside the hair region, ramps to 1 over ~1.2 cm inside it
            if not keep(v): return 0.0
            c = v.co; ok = 0
            for dz in (-0.004, -0.008, -0.012):
                class P: pass
                p = P(); p.co = Vector((c.x, c.y - (0.004 if c.y < 0 else 0), c.z + dz)); ok += keep(p)
            return (1 + ok) / 4
        W = {v: feather(v) for v in bm.verts}
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if W[v] <= 0], context='VERTS')
        for v in bm.verts:
            x, y, z = v.co; th = 0.006; fw = W.get(v, 1.0)
            if style == 'side_part':
                th = 0.007 + 0.009 * max(0, min(1, (z - 0.12) / 0.06)) + 0.004 * max(0, -y / 0.09) * max(0, (z - 0.15) / 0.04)
                th += 0.0025 * math.exp(-((x + 0.01) ** 2) / 0.0008) * max(0, (z - 0.15) / 0.05)   # soft sweep away from the side part
                if x < 0.02 and y < -0.02: th += 0.004                # swept volume over the forehead
            elif style == 'slick':
                th = 0.006 + 0.004 * max(0, min(1, (z - 0.12) / 0.06))
            elif style in ('bald', 'bald_crown'): th = 0.004
            elif style == 'bun':
                th = 0.005 + 0.004 * max(0, min(1, (z - 0.12) / 0.06))
            v.co = v.co + v.normal * th * fw
        bm.to_mesh(o.data); bm.free(); ck.solidify(o, 0.003, -1); ck.subsurf(o, 1, 2)
        o.data.materials.clear(); o.data.materials.append(s.M['hair'])
        s._bonepart(o, 'head'); s.hairmesh = o
        if style == 'bun':
            b = ck.sphere(C, tuple(H0 + Vector((0, 0.09 * k, 0.16 * k))), 0.034 * k, s.M['hair'], (1, 0.8, 0.8), name=s.name + '_bun'); s._bonepart(b, 'head')
    def _glasses(s, H0, k):
        gm = ck.m_metal('#2a241e', 0.3, False); glass = ck.m_glass('#f6f8fa')
        y = H0.y - 0.098 * k
        for sx in (-1, 1):
            c = (H0.x + sx * 0.032 * k, y, H0.z + 0.126 * k)
            r = ck.torus(s.coll, c, 0.0165 * k, 0.0013 * k, gm, rot=(math.pi / 2, 0, 0), name=s.name + '_rim'); s._bonepart(r, 'head')
            l = ck.cyl(s.coll, c, 0.0162 * k, 0.0015, glass, rot=(math.pi / 2, 0, 0), name=s.name + '_lens', steps=24); s._bonepart(l, 'head')
            t = ck.tube(s.coll, [(H0.x + sx * 0.0485 * k, y + 0.002, H0.z + 0.128 * k), (H0.x + sx * 0.074 * k, H0.y - 0.02 * k, H0.z + 0.13 * k), (H0.x + sx * 0.076 * k, H0.y + 0.03 * k, H0.z + 0.112 * k)], 0.0011 * k, gm, s.name + '_temple')
            s._bonepart(t, 'head')
        b = ck.tube(s.coll, [(H0.x - 0.0155 * k, y, H0.z + 0.128 * k), (H0.x, y - 0.003, H0.z + 0.131 * k), (H0.x + 0.0155 * k, y, H0.z + 0.128 * k)], 0.0011 * k, gm, s.name + '_bridge'); s._bonepart(b, 'head')
    def _moustache(s, H0, k):
        y = s._surface_y(s.headmesh, H0.x, H0.z + 0.068 * k) or (H0.y - 0.1 * k)
        for sx in (-1, 1):
            m_ = ck.sphere(s.coll, (H0.x + sx * 0.012 * k, y - 0.001, H0.z + 0.069 * k), 0.013 * k, s.M['hair'], (1.25, 0.45, 0.5), name=s.name + '_moust', seg=24)
            m_.rotation_euler = (0, sx * math.radians(-14), 0); s._bonepart(m_, 'head')
    def _ghost_head(s, m):
        H0 = s._p('head') + Vector((0, -0.005 * s.k, -0.04 * s.k))
        o = s._sculpt_head(H0, s.k); o.data.materials.append(m); ck.subsurf(o, 1); s.headmesh = s._bonepart(o, 'head')

    # ------------------------------------------------ IK
    def _ik_setup(s):
        for sd in ('L', 'R'):
            t = bpy.data.objects.new(s.name + '_ik' + sd, None); t.location = s.arm.matrix_world @ s._p('wrist.' + sd); s.coll.objects.link(t)
            p = bpy.data.objects.new(s.name + '_pole' + sd, None); s.coll.objects.link(p); p.parent = s.arm
            p.location = s._p('elbow.' + sd) + Vector((0.25 if sd == 'L' else -0.25, 0.45, 0))
            c = s.arm.pose.bones['forearm.' + sd].constraints.new('IK'); c.target = t; c.pole_target = p; c.pole_angle = math.radians(-90); c.chain_count = 2; c.influence = 0
            c.keyframe_insert('influence', frame=0); t.keyframe_insert('location', frame=0)   # later keys must not leak back to frame 0
            s.ik[sd] = (t, p, c)

    # ------------------------------------------------ animation API (frames)
    def visible(s, frame, on):
        """Show/hide every mesh of this character (constant step at `frame`)."""
        for o in s.coll.objects:
            if o.name.startswith(s.name + '_') and o.type in ('MESH', 'CURVE'):
                o.hide_render = not on; o.keyframe_insert('hide_render', frame=frame)
    def pose(s, frame, rots, interp=None, ramp=8):
        for b, r in rots.items():
            s._held(s.arm, 'pose.bones["%s"].rotation_euler' % b, frame, ramp)
            pb = s.arm.pose.bones[b]; pb.rotation_euler = Euler(r); pb.keyframe_insert('rotation_euler', frame=frame)
    def place(s, frame, loc, rot=None):
        s.arm.location = loc; s.arm.keyframe_insert('location', frame=frame)
        if rot is not None: s.arm.rotation_euler = (0, 0, rot); s.arm.keyframe_insert('rotation_euler', frame=frame)
    def _held(s, obj, path, frame, ramp):
        """Insert a hold key `ramp` frames before `frame` with the value the curve has there, so a new pose only blends over the
        ramp instead of drifting across the whole gap since the previous key (lesson: IK influence leaked over 25 s)."""
        ad = obj.animation_data
        if not ad or not ad.action: return
        fcs = [fc for fc in ck._fcurves(ad.action) if fc.data_path == path]
        if not fcs or all(len(fc.keyframe_points) == 0 for fc in fcs): return
        prev = max((kp.co[0] for fc in fcs for kp in fc.keyframe_points if kp.co[0] < frame - 0.5), default=None)
        if prev is None or frame - ramp <= prev + 0.5: return
        for fc in fcs: fc.keyframe_points.insert(frame - ramp, fc.evaluate(frame - ramp), options={'FAST'})
    def hand(s, side, frame, world_pos, influence=1.0, pole=None, ramp=8):
        t, p, c = s.ik[side]
        s._held(t, 'location', frame, ramp); s._held(s.arm, 'pose.bones["forearm.%s"].constraints["IK"].influence' % side, frame, ramp)
        t.location = Vector(world_pos); t.keyframe_insert('location', frame=frame); c.influence = influence; c.keyframe_insert('influence', frame=frame)
        if pole is not None: p.location = Vector(pole); p.keyframe_insert('location', frame=frame)
    FPOSE = {'relaxed': (0.25, 0.35, 0.2), 'grip': (0.95, 1.1, 0.5), 'fist': (1.4, 1.5, 0.7), 'point': (0.05, 0.05, 0.3), 'open': (0.05, 0.08, 0.0), 'pinch': (0.55, 0.7, 0.6)}
    def fingers(s, frame, side, preset='relaxed', point_index=False):
        a, b, th = s.FPOSE[preset]
        for f in FINGERS:
            if f == 'thumb': r1, r2 = th * 0.6, th * 0.8
            else:
                r1, r2 = a, b
                if preset == 'point' or (point_index and f == 'index'): r1, r2 = (0.05, 0.05) if f == 'index' else (1.35, 1.45)
            sx = 1 if side == 'L' else -1
            s.pose(frame, {f'{f}1.{side}': (-r1, 0, 0), f'{f}2.{side}': (-r2, 0, 0)})
    def express(s, frame, smile=0.0, frown=0.0, jaw=0.0, brow_up=0.0, brow_knit=0.0, press=0.0, blend=6):
        if s.outfit == 'ghost': return
        kb = s.headmesh.data.shape_keys.key_blocks
        for n, v in (('smile', smile), ('frown', frown), ('jaw_open', jaw), ('brow_up', brow_up), ('brow_knit', brow_knit), ('lips_press', press)):
            kb[n].keyframe_insert('value', frame=frame - blend); kb[n].value = v; kb[n].keyframe_insert('value', frame=frame)
    EXPR = {'neutral': {}, 'earnest': dict(brow_up=0.5, smile=0.15), 'determined': dict(brow_knit=0.6, press=0.6), 'worried': dict(brow_up=0.7, brow_knit=0.5, frown=0.4),
            'stern': dict(brow_knit=0.9, frown=0.6, press=0.8), 'amazed': dict(brow_up=0.9, jaw=0.35), 'relief': dict(smile=0.45, brow_up=0.3), 'contempt': dict(smile=0.2, brow_knit=0.4, press=0.3),
            'sad': dict(brow_up=0.5, brow_knit=0.6, frown=0.7), 'proud': dict(smile=0.55), 'wary': dict(brow_knit=0.5, press=0.4), 'focused': dict(brow_knit=0.45, press=0.3)}
    def emote(s, frame, name, blend=6):
        d = dict(smile=0, frown=0, jaw=0, brow_up=0, brow_knit=0, press=0); d.update(s.EXPR[name]); s.express(frame, blend=blend, **d)
    def _rot(s, piv, eul, frame):
        """Rotate a bone-parented pivot about WORLD-aligned axes through its centre (its rest basis is stored at parenting time)."""
        base = piv.get('_base')
        if base is None: return
        bm = Matrix([base[0:4], base[4:8], base[8:12], base[12:16]])
        piv.rotation_euler = (bm.to_3x3() @ Euler(eul).to_matrix()).to_euler(); piv.keyframe_insert('rotation_euler', frame=frame)
    def set_lids(s, frame, closed=0.15):
        """0 = wide open, 1 = shut. Lids rotate down around the eye centre."""
        for p in getattr(s, 'lids', []): s._rot(p, (math.radians(-62 + 92 * closed), 0, 0), frame)
    def blink(s, frame, base=0.32):
        s.set_lids(frame - 2, base); s.set_lids(frame, 1.0); s.set_lids(frame + 3, base)
    def blinks(s, t0, t1, every=3.1, phase=0.6, base=0.32):
        t = t0 + phase
        while t < t1 - 0.25: s.blink(F(t), base); t += every * (0.8 + 0.4 * ((int(t * 7) % 5) / 4))
    def look(s, frame, yaw=0.0, pitch=0.0, eyes_yaw=None, eyes_pitch=None, neck_share=0.4):
        """Head turn (radians; yaw + = to the character's left, pitch + = down). Eyes lead slightly."""
        s.pose(frame, {'neck': (pitch * neck_share, 0, yaw * neck_share), 'head': (pitch * (1 - neck_share), 0, yaw * (1 - neck_share))})
        ey = yaw * 0.3 if eyes_yaw is None else eyes_yaw; ep = pitch * 0.3 if eyes_pitch is None else eyes_pitch
        for e in getattr(s, 'eyeballs', []): s._rot(e, (-ep, 0, ey), frame)
    def talk(s, words, t0, t1, amount=0.55):
        kb = s.headmesh.data.shape_keys.key_blocks['jaw_open']
        for w in words:
            if w[1] < t0 or w[2] > t1: continue
            a, b = w[1], w[2]; n = max(1, int((b - a) / 0.16))
            kb.value = 0.05; kb.keyframe_insert('value', frame=F(a) - 1)
            for i in range(n): kb.value = amount * (0.6 + 0.4 * ((i * 5) % 3) / 2); kb.keyframe_insert('value', frame=F(a + (i + 0.5) * (b - a) / n))
            kb.value = 0.05; kb.keyframe_insert('value', frame=F(b) + 1)
    def breathe(s, t0, t1, rate=0.25, amp=0.025):
        t = t0
        while t < t1:
            s.pose(F(t), {'chest': (amp * 0.5, 0, 0)}); s.pose(F(t + 0.5 / rate / 2), {'chest': (-amp * 0.5, 0, 0)}); t += 1 / rate
    def rest(s, frame):
        p = {b: (0, 0, 0) for b in ['hips', 'spine', 'chest', 'neck', 'head', 'thigh.L', 'thigh.R', 'shin.L', 'shin.R', 'foot.L', 'foot.R']}
        p.update({'upper_arm.L': (0.05, 0, math.radians(4)), 'upper_arm.R': (0.05, 0, math.radians(-4)), 'forearm.L': (-0.18, 0, 0), 'forearm.R': (-0.18, 0, 0),
                  'shoulder.L': (0, 0, 0), 'shoulder.R': (0, 0, 0), 'hand.L': (0, 0, 0), 'hand.R': (0, 0, 0)})
        s.pose(frame, p)
    def sit(s, frame, lean=0.1):
        s.pose(frame, {'thigh.L': (math.radians(-88), 0, math.radians(-4)), 'thigh.R': (math.radians(-88), 0, math.radians(4)), 'shin.L': (math.radians(85), 0, 0),
                       'shin.R': (math.radians(85), 0, 0), 'spine': (lean, 0, 0), 'foot.L': (0.05, 0, 0), 'foot.R': (0.05, 0, 0)})
    def lie(s, frame):
        """Lying on the back (rotate the whole rig separately with place(rot) + arm.rotation_euler.x)."""
        s.pose(frame, {'thigh.L': (0, 0, 0), 'thigh.R': (0, 0, 0), 'shin.L': (0.05, 0, 0), 'shin.R': (0.05, 0, 0)})
    def walk(s, t0, t1, a, b, stride=0.72, arm=0.35, settle=True):
        """Natural walk from a to b (world xy): legs from distance travelled (no foot sliding), pelvis bob/sway, counter arm swing."""
        a, b = Vector(a), Vector(b); d = (b - a).length; ang = math.atan2(-(b - a).x, (b - a).y) + math.pi
        n = max(2, int((t1 - t0) * 12))
        for i in range(n + 1):
            u = i / n; f = F(t0 + u * (t1 - t0)); p = a.lerp(b, u); ph = u * d / stride * math.pi
            sw = math.sin(ph); bob = abs(math.cos(ph))
            s.place(f, (p.x, p.y, 0.018 * bob - 0.012), ang)
            s.pose(f, {'thigh.L': (0.42 * sw, 0, 0), 'thigh.R': (-0.42 * sw, 0, 0),
                       'shin.L': (-0.75 * max(0, -math.sin(ph + 0.6)) - 0.08, 0, 0), 'shin.R': (-0.75 * max(0, math.sin(ph + 0.6)) - 0.08, 0, 0),
                       'foot.L': (0.25 * max(0, sw), 0, 0), 'foot.R': (0.25 * max(0, -sw), 0, 0),
                       'upper_arm.L': (-arm * sw + 0.05, 0, math.radians(4)), 'upper_arm.R': (arm * sw + 0.05, 0, math.radians(-4)),
                       'forearm.L': (-0.25 - 0.15 * max(0, -sw), 0, 0), 'forearm.R': (-0.25 - 0.15 * max(0, sw), 0, 0),
                       'hips': (0, 0.05 * sw, 0.06 * sw), 'chest': (0.04, -0.04 * sw, -0.07 * sw), 'head': (0, 0, 0.03 * sw)})
        if settle: s.rest(F(t1) + 8)
    def head_world(s):
        bpy.context.view_layer.update(); pb = s.arm.pose.bones['head']; return s.arm.matrix_world @ (pb.head + Vector((0, -0.04, 0.11)) * s.k)
    def bone_world(s, b, frac=0.0):
        bpy.context.view_layer.update(); pb = s.arm.pose.bones[b]; return s.arm.matrix_world @ pb.head.lerp(pb.tail, frac)

def _face_material(tone, lip, age=30):
    """Head skin: the skin shader + smooth lip tint and a faint socket/under-eye darkening, masked in the head's object space."""
    m = ck.m_skin.__wrapped__(tone) if hasattr(ck.m_skin, '__wrapped__') else None
    m, n, b = ck._base('faceskin', tone, 0.42, spec=0.45)
    b.inputs['Subsurface Weight'].default_value = 0.25; b.inputs['Subsurface Radius'].default_value = (1.0, 0.35, 0.2); b.inputs['Subsurface Scale'].default_value = 0.012
    tc = n.new('ShaderNodeTexCoord'); sp = n.new('ShaderNodeSeparateXYZ'); n.link(tc, 'Object', sp, 'Vector')
    def ell(cx, cz, rx, rz, y_max):
        # exp(-((x-cx)/rx)^2 - ((z-cz)/rz)^2) * (y < y_max)
        dx = n.new('ShaderNodeMath', operation='SUBTRACT'); n.link(sp, 'X', dx, 0); dx.inputs[1].default_value = cx
        qx = n.new('ShaderNodeMath', operation='DIVIDE'); n.link(dx, 0, qx, 0); qx.inputs[1].default_value = rx
        px = n.new('ShaderNodeMath', operation='POWER'); n.link(qx, 0, px, 0); px.inputs[1].default_value = 2.0
        dz = n.new('ShaderNodeMath', operation='SUBTRACT'); n.link(sp, 'Z', dz, 0); dz.inputs[1].default_value = cz
        qz = n.new('ShaderNodeMath', operation='DIVIDE'); n.link(dz, 0, qz, 0); qz.inputs[1].default_value = rz
        pz = n.new('ShaderNodeMath', operation='POWER'); n.link(qz, 0, pz, 0); pz.inputs[1].default_value = 2.0
        sm = n.new('ShaderNodeMath', operation='ADD'); n.link(px, 0, sm, 0); n.link(pz, 0, sm, 1)
        ng = n.new('ShaderNodeMath', operation='MULTIPLY'); n.link(sm, 0, ng, 0); ng.inputs[1].default_value = -1.0
        ex = n.new('ShaderNodeMath', operation='EXPONENT'); n.link(ng, 0, ex, 0)
        fr = n.new('ShaderNodeMath', operation='LESS_THAN'); n.link(sp, 'Y', fr, 0); fr.inputs[1].default_value = y_max
        mu = n.new('ShaderNodeMath', operation='MULTIPLY'); n.link(ex, 0, mu, 0); n.link(fr, 0, mu, 1); return mu
    lips = ell(0.0, 0.055, 0.02, 0.0085, -0.06)
    lipc = n.new('ShaderNodeMath', operation='POWER'); n.link(lips, 0, lipc, 0); lipc.inputs[1].default_value = 0.6
    nz = n.new('ShaderNodeTexNoise', Scale=18.0, Detail=6.0); n.link(tc, 'Object', nz, 'Vector')
    base = ck._mix(n, tone, '#c07a68', nz.outputs['Fac'], 'MIX'); base.inputs['Factor'].default_value = 0.18
    col = ck._mix(n, base.outputs[2], lip, lipc.outputs[0])
    socks = n.new('ShaderNodeMath', operation='ADD'); n.link(ell(0.032, 0.122, 0.02, 0.014, -0.05), 0, socks, 0); n.link(ell(-0.032, 0.122, 0.02, 0.014, -0.05), 0, socks, 1)
    sk2 = n.new('ShaderNodeMath', operation='MULTIPLY'); n.link(socks, 0, sk2, 0); sk2.inputs[1].default_value = 0.22 + 0.15 * min(1, max(0, (age - 30) / 30))
    col2 = ck._mix(n, col.outputs[2], '#6a4038', sk2.outputs[0])
    n.nt.links.new(col2.outputs[2], b.inputs['Base Color'])
    rr = n.new('ShaderNodeMapRange', To_Min=0.45, To_Max=0.28); n.link(lipc, 0, rr, 'Value'); n.link(rr, 0, b, 'Roughness')
    pores = n.new('ShaderNodeTexVoronoi', Scale=900.0); n.link(tc, 'Object', pores, 'Vector')
    bp = ck._bump(n, pores.outputs['Distance'], 0.05, 0.0003); n.link(bp, 0, b, 'Normal')
    return m

def _eye_material(iris='#4a5a6a'):
    """Eyeball: sclera (warm white, faint veins), coloured iris with radial fibres, black pupil, wet cornea (clear coat)."""
    m = bpy.data.materials.new('eye'); m.use_nodes = True; n = ck.N(m); b = n.bsdf()
    tc = n.new('ShaderNodeTexCoord'); sep = n.new('ShaderNodeSeparateXYZ'); n.link(tc, 'Object', sep, 'Vector')
    # radial distance from the -Y pole, normalised by the radius (object coords are in metres; radius ~0.0118)
    sq = n.new('ShaderNodeVectorMath', operation='LENGTH'); cb = n.new('ShaderNodeCombineXYZ'); n.link(sep, 'X', cb, 'X'); n.link(sep, 'Z', cb, 'Z'); n.link(cb, 0, sq, 0)
    sc_ = n.new('ShaderNodeMath', operation='DIVIDE'); sc_.inputs[1].default_value = 0.0118; n.link(sq, 'Value', sc_, 0)
    front = n.new('ShaderNodeMath', operation='LESS_THAN'); front.inputs[1].default_value = 0.0; n.link(sep, 'Y', front, 0)
    r = ck._ramp(n, sc_, 0, [(0.0, '#050404'), (0.19, '#050404'), (0.2, iris), (0.44, ck.hexc(iris) and iris), (0.47, '#1a1612'), (0.5, '#f2ece4'), (1.0, '#e9dcd4')])
    fib = n.new('ShaderNodeTexWave', wave_type='RINGS', Scale=0.0, Distortion=0.0)
    ang = n.new('ShaderNodeMath', operation='ARCTAN2'); n.link(sep, 'Z', ang, 0); n.link(sep, 'X', ang, 1)
    fn = n.new('ShaderNodeTexNoise', Scale=30.0, Detail=2.0); n.link(ang, 0, fn, 'W') if 'W' in fn.inputs else None
    fn.noise_dimensions = '1D'; n.link(ang, 0, fn, 'W')
    mixc = ck._mix(n, r.outputs['Color'], '#000000', fn.outputs['Fac'], 'MULTIPLY'); mixc.inputs['Factor'].default_value = 0.35
    back = ck._mix(n, '#e9dcd4', mixc.outputs[2], front.outputs[0])
    n.nt.links.new(back.outputs[2], b.inputs['Base Color']); b.inputs['Roughness'].default_value = 0.3
    b.inputs['Coat Weight'].default_value = 1.0; b.inputs['Coat Roughness'].default_value = 0.02; b.inputs['Coat IOR'].default_value = 1.38
    b.inputs['Subsurface Weight'].default_value = 0.1
    return m
