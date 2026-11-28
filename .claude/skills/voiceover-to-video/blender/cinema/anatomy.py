# Cinema kit (v5) - medically readable anatomy for science-documentary cutaways.
# Translucent "ghost" figure (skin dissolve keyable), skeleton (ribs, sternum, spine, clavicles, arm bones), a heart with chambers,
# great vessels and coronary vessels (lub-dub beat), the venous road from the hand to the right atrium (anatomically ordered:
# dorsal hand network -> cephalic/basilic -> median cubital at the elbow -> basilic -> axillary -> subclavian -> brachiocephalic ->
# superior vena cava -> right atrium), a catheter that grows along that road, and an X-ray material mode for radiographs.
import bpy, math
from mathutils import Vector, Matrix
import ck
from ck import F, hexc, key, V

# ------------------------------------------------ materials
def m_ghost_skin(tone='#c8a8a0', rim='#8fb8ff', name='ghost', body=0.02):
    """Translucent skin: facing ratio -> transparent in the middle, glowing soft rim at grazing angles, faint SSS body.
    Keyable 'solid' mix (input 0 of the final mix): 1 = real opaque skin, 0 = ghost. Animate with ghost_solid()."""
    body_amt = body
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; n = ck.N(m); b = n.bsdf()
    b.inputs['Base Color'].default_value = (*hexc(tone), 1); b.inputs['Roughness'].default_value = 0.45
    b.inputs['Subsurface Weight'].default_value = 0.3; b.inputs['Subsurface Radius'].default_value = (1, 0.4, 0.25); b.inputs['Subsurface Scale'].default_value = 0.01
    lw = n.new('ShaderNodeLayerWeight', Blend=0.35)
    tr = n.new('ShaderNodeBsdfTransparent'); em = n.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (*hexc(rim), 1); em.inputs['Strength'].default_value = 1.2
    glass = n.new('ShaderNodeMixShader'); glass.inputs[0].default_value = 0.0
    fr_pow = n.new('ShaderNodeMath', operation='POWER'); n.link(lw, 'Facing', fr_pow, 0); fr_pow.inputs[1].default_value = 2.2
    rimmix = n.new('ShaderNodeMixShader'); n.link(fr_pow, 0, rimmix, 0); n.nt.links.new(tr.outputs[0], rimmix.inputs[1]); n.nt.links.new(em.outputs[0], rimmix.inputs[2])
    body = n.new('ShaderNodeMixShader'); body.inputs[0].default_value = body_amt; n.nt.links.new(rimmix.outputs[0], body.inputs[1]); n.nt.links.new(b.outputs[0], body.inputs[2])
    solid = n.new('ShaderNodeMixShader'); solid.name = 'SOLID'; solid.inputs[0].default_value = 0.0
    n.nt.links.new(body.outputs[0], solid.inputs[1]); n.nt.links.new(b.outputs[0], solid.inputs[2])
    out = nt.nodes['Material Output']; n.nt.links.new(solid.outputs[0], out.inputs['Surface'])
    m.blend_method = 'BLEND' if hasattr(m, 'blend_method') else None
    return m
def ghost_solid(m, frame, value):
    s = m.node_tree.nodes['SOLID']; s.inputs[0].default_value = value; s.inputs[0].keyframe_insert('default_value', frame=frame)
def m_bone(color='#bfb39a', see_through=0.62):
    m, n, b = ck._base('bone', color, 0.55); b.inputs['Subsurface Weight'].default_value = 0.2; b.inputs['Subsurface Radius'].default_value = (1, 0.8, 0.6); b.inputs['Subsurface Scale'].default_value = 0.004
    co = ck._coord(n, 'Object', 1.0); nz = n.new('ShaderNodeTexNoise', Scale=60.0, Detail=6.0); n.link(co, 0, nz, 'Vector')
    bp = ck._bump(n, nz.outputs['Fac'], 0.15, 0.001); n.link(bp, 0, b, 'Normal')
    if see_through:
        tr = n.new('ShaderNodeBsdfTransparent'); mx = n.new('ShaderNodeMixShader'); mx.inputs[0].default_value = see_through
        n.nt.links.new(b.outputs[0], mx.inputs[1]); n.nt.links.new(tr.outputs[0], mx.inputs[2]); n.nt.links.new(mx.outputs[0], m.node_tree.nodes['Material Output'].inputs['Surface'])
    return m
def m_heart():
    """Cardiac muscle: deep reds with fibre banding, wet clear coat, red SSS; yellow epicardial fat in the grooves (noise-masked)."""
    m, n, b = ck._base('heart', '#7a1418', 0.35)
    b.inputs['Subsurface Weight'].default_value = 0.45; b.inputs['Subsurface Radius'].default_value = (1.0, 0.2, 0.1); b.inputs['Subsurface Scale'].default_value = 0.012
    b.inputs['Coat Weight'].default_value = 0.6; b.inputs['Coat Roughness'].default_value = 0.08
    co = ck._coord(n, 'Object', 1.0)
    fib = n.new('ShaderNodeTexWave', wave_type='BANDS', bands_direction='Z', Scale=40.0, Distortion=6.0, Detail=3.0); n.link(co, 0, fib, 'Vector')
    nz = n.new('ShaderNodeTexNoise', Scale=14.0, Detail=6.0); n.link(co, 0, nz, 'Vector')
    col = ck._mix(n, '#5e0c12', '#a8282c', fib.outputs['Fac']); col.inputs['Factor'].default_value = 0.5
    fat = n.new('ShaderNodeMapRange', From_Min=0.7, From_Max=0.76); n.link(nz, 'Fac', fat, 'Value')
    col2 = ck._mix(n, col.outputs[2], '#d8b060', fat.outputs[0])
    n.nt.links.new(col2.outputs[2], b.inputs['Base Color'])
    bp = ck._bump(n, fib.outputs['Fac'], 0.2, 0.002); n.link(bp, 0, b, 'Normal')
    return m
def m_vessel(color='#2c3c9a', glow=0.15, name='vein', see_through=0.0):
    m, n, b = ck._base(name, color, 0.3)
    if see_through:
        tr = n.new('ShaderNodeBsdfTransparent'); mx = n.new('ShaderNodeMixShader'); mx.inputs[0].default_value = see_through
        n.nt.links.new(b.outputs[0], mx.inputs[1]); n.nt.links.new(tr.outputs[0], mx.inputs[2]); n.nt.links.new(mx.outputs[0], m.node_tree.nodes['Material Output'].inputs['Surface'])
    b.inputs['Subsurface Weight'].default_value = 0.4; b.inputs['Subsurface Radius'].default_value = (0.4, 0.5, 1.0); b.inputs['Subsurface Scale'].default_value = 0.004
    b.inputs['Coat Weight'].default_value = 0.5; b.inputs['Emission Color'].default_value = (*hexc(color), 1); b.inputs['Emission Strength'].default_value = glow
    return m
def m_glow(color='#7fb0ff', strength=6.0, name='glow'):
    return ck.m_emit(color, strength)
def m_xray(density=1.0, name='xr'):
    """X-ray mode: additive emission (thickness accumulates) + transparency, so overlapping tissue reads denser."""
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.remove(nt.nodes['Principled BSDF'])
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Strength'].default_value = density; e.inputs['Color'].default_value = (1, 1, 1, 1)
    t = nt.nodes.new('ShaderNodeBsdfTransparent'); a = nt.nodes.new('ShaderNodeAddShader')
    nt.links.new(e.outputs[0], a.inputs[0]); nt.links.new(t.outputs[0], a.inputs[1]); nt.links.new(a.outputs[0], nt.nodes['Material Output'].inputs['Surface']); return m

# ------------------------------------------------ figure
class Anatomy:
    """Builds the anatomy figure around a posed ghost Human. Call build() after posing. Everything is static in world space
    (the camera moves), except the heart beat, skin dissolve, catheter growth and the travelling vein glow."""
    def __init__(s, coll, human, side='L', cutaway=True):
        s.C, s.h, s.side, s.cutaway = coll, human, side, cutaway; s.parts = {'bones': [], 'veins': [], 'heart': [], 'cath': [], 'glow': []}
    def J(s, b, frac=0.0): return s.h.bone_world(b, frac)
    # ---------- skeleton
    def skeleton(s):
        C, bm = s.C, m_bone(); P = s.parts['bones']
        sp0, sp1 = s.J('hips'), s.J('neck'); ax = (sp1 - sp0).normalized()
        n = 17
        for i in range(n):   # vertebral bodies
            p = sp0.lerp(sp1, i / (n - 1)) + Vector((0, 0.045, 0)); P.append(ck.cyl(C, tuple(p), 0.016 - 0.004 * i / n, 0.016, bm, name='vert', bev=0.004, steps=20))
            P.append(ck.box(C, tuple(p + Vector((0, 0.022, 0))), (0.01, 0.03, 0.012), bm, 0.003, name='spinous'))
        top = s.J('neck'); stern_top = Vector((0, -0.085, top.z - 0.05)); stern_bot = Vector((0, -0.095, top.z - 0.24))
        if not s.cutaway: P.append(ck.tube(C, [tuple(stern_top), tuple(stern_top.lerp(stern_bot, 0.5) + Vector((0, -0.006, 0))), tuple(stern_bot)], 0.012, bm, 'sternum'))
        for i in range(11):   # ribs: elliptic arcs from the spine round to the costal cartilage
            z = top.z - 0.06 - i * 0.025; w = 0.075 + 0.055 * math.sin(min(1, (i + 2) / 7) * math.pi / 2); d = 0.07 + 0.004 * min(i, 5)
            for sx in (-1, 1):
                pts = []
                for k in range(9 if not s.cutaway else 6):
                    a = math.pi * k / 8 * (1.0 if not s.cutaway else (0.62 + 0.08 * (sx > 0)) * 8 / 5); x = sx * w * math.sin(a); y = 0.045 - d * (1 - math.cos(a)) * 0.95; zz = z - (0.07 + 0.03 * i / 10) * (1 - math.cos(a)) / 2
                    if k == 8 and i > 6: continue
                    pts.append((x, y, zz))
                if not s.cutaway: pts[-1] = (pts[-1][0] * 0.35, pts[-1][1], pts[-1][2])
                P.append(ck.tube(C, pts, 0.0042 - 0.001 * (i > 8), bm, 'rib'))
        for sd in ('L', 'R'):   # clavicle, humerus, radius/ulna
            sh = s.J('upper_arm.' + sd); P.append(ck.tube(C, [(0, -0.07, top.z - 0.035), tuple((Vector((0, -0.07, top.z - 0.035)).lerp(sh, 0.5)) + Vector((0, -0.01, 0.012))), tuple(sh + Vector((0, -0.01, 0.01)))], 0.007, bm, 'clavicle'))
            e = s.J('forearm.' + sd); w = s.J('hand.' + sd)
            P.append(ck.tube(C, [tuple(sh), tuple(sh.lerp(e, 0.5)), tuple(e)], 0.011, bm, 'humerus')); P.append(ck.sphere(C, tuple(sh), 0.024, bm, name='humhead'))
            P.append(ck.sphere(C, tuple(e), 0.018, bm, (1.5, 1, 1), name='epicondyle'))
            for o in (-0.008, 0.008):
                P.append(ck.tube(C, [tuple(e + Vector((o, 0, 0))), tuple(e.lerp(w, 0.5) + Vector((o * 1.3, 0, 0))), tuple(w + Vector((o, 0, 0.0)))], 0.0065, bm, 'forearmbone'))
        return P
    # ---------- heart
    def heart(s, center=None, scale=1.3):
        """One sculpted mesh (no blobs): cone-like ventricles tapering to a left-pointing apex, right/left atrial bulges with the
        right auricle, an interventricular groove; great vessels as tubes; coronary vessels snapped onto the surface."""
        C, hm = s.C, m_heart(); top = s.J('neck')
        c = Vector(center) if center else Vector((0.025, -0.035, top.z - 0.215))
        root = bpy.data.objects.new('heart_root', None); C.objects.link(root); root.location = c; s.heart_root = root
        bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=48, radius=1.0); body = bpy.context.object; ck._link(body, C); body.name = 'heart'
        def g(p, q, sig): return math.exp(-((p - q).length ** 2) / (2 * sig * sig))
        bumps = [(Vector((-0.8, -0.25, 0.55)).normalized(), 0.02, 0.45), (Vector((0.35, 0.85, 0.55)).normalized(), 0.014, 0.42),
                 (Vector((-0.45, -0.85, 0.45)).normalized(), 0.011, 0.28), (Vector((0.0, 0.2, 1.0)).normalized(), 0.008, 0.5)]
        for v in body.data.vertices:
            u = v.co.copy(); x, y, z = u.x * 0.05, u.y * 0.043, u.z * 0.058
            if u.z < 0:
                t = (-u.z) ** 1.5; x *= 1 - 0.5 * t; y *= 1 - 0.45 * t; x += 0.014 * (-u.z) ** 2; y -= 0.006 * (-u.z) ** 2
            p = Vector((x, y, z)); d = 0.0
            for dirn, amt, sig in bumps: d += amt * g(u, dirn, sig)
            if u.y < 0 and u.z < 0.5: d -= 0.004 * math.exp(-((u.x - 0.12 + 0.25 * u.z) ** 2) / 0.006)   # anterior interventricular groove
            v.co = p + u.normalized() * d
        ck.smooth(body); body.data.materials.append(hm); body.parent = root; body.location = (0, 0, 0)
        body.rotation_euler = (math.radians(-18), math.radians(28), math.radians(-10)); ck.subsurf(body, 1, 2)
        H = [body]
        def vessel(pts, r, mat=hm, name='vessel'):
            o = ck.tube(C, [tuple(Vector(p)) for p in pts], r, mat, name); o.parent = root; H.append(o); return o
        art = m_vessel('#8a1a20', 0.0, 'artery'); vb = m_vessel('#3a3e8e', 0.05, 'greatvein')
        s.aorta = vessel([(0.004, 0.0, 0.035), (0.004, -0.004, 0.075), (0.014, 0.008, 0.108), (0.032, 0.032, 0.114), (0.042, 0.052, 0.088), (0.042, 0.058, -0.01)], 0.0135, art, 'aorta')
        for q in ((0.014, 0.01, 0.112), (0.024, 0.02, 0.118), (0.034, 0.032, 0.116)): vessel([q, (q[0] * 1.1, q[1], q[2] + 0.055)], 0.0048, art, 'archbranch')
        vessel([(0.018, -0.026, 0.035), (0.022, -0.028, 0.07), (0.032, -0.01, 0.09), (0.06, 0.004, 0.088)], 0.012, m_vessel('#5a3a7a', 0.0, 'pulm'), 'pulmonary')
        s.svc_top = c + Vector((-0.04, -0.012, 0.16))
        s.svc = vessel([(-0.04, -0.012, 0.16), (-0.041, -0.012, 0.1), (-0.04, -0.012, 0.055)], 0.0105, vb, 'svc')
        vessel([(-0.036, 0.004, -0.02), (-0.034, 0.014, -0.065), (-0.032, 0.02, -0.11)], 0.0115, vb, 'ivc')
        # coronaries: rough paths snapped to the evaluated surface
        bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
        from mathutils.bvhtree import BVHTree
        bvh = BVHTree.FromObject(body, dg); mw = body.matrix_world; mwi = mw.inverted()
        def snapped(pts, lift):
            out = []
            for p in pts:
                w = c + Vector(p); hit = bvh.find_nearest(mwi @ w)
                if hit[0] is None: out.append(Vector(p)); continue
                q = mw @ hit[0]; nrm = (mw.to_3x3() @ hit[1]).normalized(); out.append(q + nrm * lift - c)
            return out
        for pts in ([(-0.018, -0.05, 0.03), (0.002, -0.05, 0.0), (0.014, -0.045, -0.035), (0.03, -0.03, -0.07)],
                    [(-0.03, -0.04, 0.025), (-0.045, -0.03, -0.005), (-0.04, -0.02, -0.04)], [(0.02, -0.04, 0.03), (0.045, -0.02, 0.005), (0.05, 0.0, -0.03)]):
            vessel(snapped(pts, 0.0022), 0.0022, art, 'coronary'); vessel(snapped([(q[0] + 0.007, q[1], q[2] - 0.004) for q in pts], 0.0018), 0.0017, vb, 'cardvein')
        root.scale = (scale,) * 3; s.parts['heart'] = H
        return root
    def beat(s, times, amp=0.05):
        """Lub-dub at each time t (seconds): ventricles contract (scale down) then relax."""
        r = s.heart_root; base = r.scale.x
        key(r, 'scale', F(times[0]) - 4, Vector((base,) * 3))
        for t in times:
            f = F(t); key(r, 'scale', f - 1, Vector((base,) * 3)); key(r, 'scale', f + 2, Vector((base * (1 - amp), base * (1 - amp * 0.6), base * (1 - amp)))); key(r, 'scale', f + 5, Vector((base * (1 + amp * 0.2),) * 3))
            key(r, 'scale', f + 8, Vector((base * (1 - amp * 0.5),) * 3)); key(r, 'scale', f + 13, Vector((base,) * 3))
    # ---------- venous road
    def road(s, sd='L'):
        """Return the ordered venous path (world points) from the back of the hand to the right atrium for one arm, plus
        named landmarks (elbow entry point, axilla, subclavian, svc, atrium)."""
        sx = 1 if sd == 'L' else -1
        sh, el, wr, kn = s.J('upper_arm.' + sd), s.J('forearm.' + sd), s.J('hand.' + sd), s.J('hand.' + sd, 1.0)
        arm_dir = (el - sh).normalized(); fwd = Vector((0, -1, 0)); med = Vector((-sx, 0, 0))
        def off(p, f=0.03, m_=0.0): return p + fwd * f + med * m_
        hand = off(wr.lerp(kn, 0.55), 0.0, 0.0) + Vector((0, 0.02, 0))   # dorsal network (back of the hand)
        wrist = off(wr, 0.012, -0.012)
        mid_fore = off(wr.lerp(el, 0.5), 0.028, 0.008)
        entry = off(el, 0.036, 0.012) + Vector((0, 0, 0.005))             # antecubital fossa (median cubital -> basilic)
        bas1 = off(el.lerp(sh, 0.3), 0.025, 0.03); bas2 = off(el.lerp(sh, 0.7), 0.018, 0.04)
        axilla = sh + med * 0.05 + Vector((0, -0.01, -0.03))
        top = s.J('neck'); subcl = Vector((sx * 0.07, -0.06, top.z - 0.045))
        brach = Vector((sx * 0.03 if sd == 'L' else -0.035, -0.07, top.z - 0.07))
        svc_top = s.svc_top; atrium = s.heart_root.location + Vector((-0.038, -0.01, 0.035))
        pts = [hand, wrist, mid_fore, entry, bas1, bas2, axilla, subcl, brach, svc_top, svc_top.lerp(atrium, 0.6), atrium]
        names = ['hand', 'wrist', 'forearm', 'entry', 'basilic1', 'basilic2', 'axilla', 'subclavian', 'brachiocephalic', 'svc', 'svc_low', 'atrium']
        return pts, dict(zip(names, pts))
    def veins(s, sd='L', r=0.0042, glow_mat=None):
        C = s.C; vm = m_vessel('#2a3a9a', 0.3, 'vein', 0.5); P = s.parts['veins']
        pts, L = s.road(sd); s.roads = getattr(s, 'roads', {}); s.roads[sd] = (pts, L)
        rad = [r * 0.6, r * 0.8, r * 0.9, r, r * 1.1, r * 1.25, r * 1.5, r * 1.9, r * 2.2, r * 2.6, r * 2.6, r * 2.6]
        main = ck.tube(C, [(*p, rr / r) for p, rr in zip(pts, rad)], r, vm, 'vein_main_' + sd); P.append(main)
        # side branches: cephalic (lateral), forearm and hand network
        sx = 1 if sd == 'L' else -1; lat = Vector((sx, 0, 0))
        el = L['entry']; ax = L['axilla']; sh = s.J('upper_arm.' + sd)
        ceph = [L['wrist'] + lat * 0.03, L['forearm'] + lat * 0.035, el + lat * 0.045, el.lerp(sh, 0.5) + lat * 0.035 + Vector((0, -0.01, 0)), sh + lat * 0.01 + Vector((0, -0.04, 0.02)), L['subclavian']]
        P.append(ck.tube(C, [tuple(p) for p in ceph], r * 0.75, vm, 'vein_cephalic'))
        P.append(ck.tube(C, [tuple(L['forearm'] + lat * 0.035), tuple(el + lat * 0.02 + Vector((0, -0.004, -0.02))), tuple(el)], r * 0.7, vm, 'vein_mediancubital'))
        hand = L['hand']; wr = s.J('hand.' + sd)
        for k in range(5):
            d = Vector(((k - 2) * 0.016, 0.0, -0.05)); P.append(ck.tube(C, [tuple(hand + d), tuple(hand + d * 0.5 + Vector((0, 0.002, 0))), tuple(hand)], r * 0.35, vm, 'vein_hand'))
        for k in range(4):
            a = L['wrist'].lerp(L['forearm'], 0.2 + 0.2 * k); P.append(ck.tube(C, [tuple(a + lat * 0.03), tuple(a + lat * 0.012 + Vector((0, -0.006, 0.02))), tuple(a + Vector((0, 0, 0.04)))], r * 0.4, vm, 'vein_twig'))
        return P
    def glow_road(s, sd, t0, t1, color='#8fc0ff', strength=9.0, r=0.0065):
        """Light travelling along the venous road from the hand to the heart between t0 and t1 (bevel factor growth)."""
        pts, L = s.roads[sd]; g = ck.tube(s.C, [tuple(p) for p in pts], r, m_glow(color, strength, 'roadglow'), 'roadglow_' + sd)
        g.visible_shadow = False; cu = g.data; cu.bevel_factor_mapping_end = 'SPLINE'
        cu.bevel_factor_end = 0.0; cu.keyframe_insert('bevel_factor_end', frame=F(t0)); cu.bevel_factor_end = 1.0; cu.keyframe_insert('bevel_factor_end', frame=F(t1))
        s.parts['glow'].append(g); return g
    def catheter(s, sd='L', outside=0.12, r=0.0028):
        """Catheter: outside part (from the incision, curving away to the side table) + inside part following the road from the
        elbow entry to the atrium. grow(t, frac) keys how far the tip has travelled (0 = at the entry, 1 = in the atrium)."""
        pts, L = s.roads[sd]; i0 = 3; inner = pts[i0:]
        e = L['entry']; out = [e + Vector((0.0, -0.05, -0.03)) * (outside / 0.12), e + Vector((0.0, -0.02, -0.008)), e]
        cm = ck.m_rubber_catheter(); cmg = _glowing(cm, '#ff9a40', 2.0); o1 = ck.tube(s.C, [tuple(p) for p in out], r, cm, 'cath_out')
        o2 = ck.tube(s.C, [tuple(p) for p in inner], r, cmg, 'cath_in'); o2.data.bevel_factor_mapping_end = 'SPLINE'
        tip = ck.sphere(s.C, tuple(inner[0]), r * 1.15, cmg, name='cath_tip'); s.cath = (o1, o2, tip, inner); s.parts['cath'] += [o1, o2, tip]
        return o2
    def grow(s, t, frac):
        o1, o2, tip, inner = s.cath; o2.data.bevel_factor_end = max(0.0, min(1.0, frac)); o2.data.keyframe_insert('bevel_factor_end', frame=F(t))
        p = _along(inner, frac); tip.location = p; tip.keyframe_insert('location', frame=F(t))
    def tip_pos(s, frac): return _along(s.cath[3], frac)
    def xray_mode(s, ghost_objs):
        """Swap materials for an X-ray render: bones dense, heart/vessels medium, soft tissue faint, catheter dense."""
        for o in s.parts['bones']: _setmat(o, m_xray(0.3 if not o.name.startswith(('vert', 'spinous')) else 0.22, 'xr_bone'))
        for o in s.parts['heart']: _setmat(o, m_xray(0.22, 'xr_heart'))
        for o in s.parts['veins'] + s.parts['glow']: o.hide_render = True
        for o in s.parts['cath']: _setmat(o, m_xray(1.6, 'xr_cath'))
        for o in ghost_objs: _setmat(o, m_xray(0.05, 'xr_soft'))

def _glowing(m, color, strength):
    g = m.copy(); g.name = m.name + '_glow'; b = g.node_tree.nodes['Principled BSDF']
    b.inputs['Emission Color'].default_value = (*hexc(color), 1); b.inputs['Emission Strength'].default_value = strength; return g
def _setmat(o, m):
    if o.data is None: return
    o.data.materials.clear(); o.data.materials.append(m)
def _along(pts, frac):
    """Point at fraction (by length) along a polyline approximation of a smooth curve."""
    L = [0.0]
    for a, b in zip(pts, pts[1:]): L.append(L[-1] + (Vector(b) - Vector(a)).length)
    d = frac * L[-1]
    for i in range(len(pts) - 1):
        if L[i + 1] >= d: u = (d - L[i]) / max(1e-6, L[i + 1] - L[i]); return Vector(pts[i]).lerp(Vector(pts[i + 1]), u)
    return Vector(pts[-1])
