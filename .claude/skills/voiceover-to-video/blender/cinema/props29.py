# Cinema kit (v5) - period props and architecture (1920s European hospital, offices, theatres) + a few modern pieces.
# Every prop is built from bevelled/lathed/swept parts with procedural PBR materials: real thickness, rounded edges,
# believable proportions (metres). Builders return the root empty (or main object) so a prop can be placed/animated as one.
import bpy, math, random
from mathutils import Vector
import ck
from ck import box, cyl, lathe, tube, sphere, torus, plane, group, hexc

R = random.Random(7)

# ------------------------------------------------ architecture
def room(C, w, d, h, wall, floor, ceil=None, dado=None, dado_h=1.35, back=True, left=True, right=True, front=False, openings=(), skirting='#3a2a1c', cornice=True):
    """Box room centred on x=0, back wall at y=+d/2, front at y=-d/2. openings: [(wall, x0, x1, z0, z1)] wall in back/left/right/front;
    x along the wall (left/right walls use y). Builds walls with real holes (split into panels), skirting, dado band, cornice."""
    out = []
    out.append(box(C, (0, 0, -0.02), (w, d, 0.04), floor, 0.0, name='floor'))
    if ceil: out.append(box(C, (0, 0, h + 0.02), (w, d, 0.04), ceil, 0.0, name='ceiling'))
    T = 0.12
    walls = {'back': ((0, d / 2 + T / 2), w, 'x'), 'front': ((0, -d / 2 - T / 2), w, 'x'), 'left': ((-w / 2 - T / 2, 0), d, 'y'), 'right': ((w / 2 + T / 2, 0), d, 'y')}
    for name, ((cx, cy), L, axis) in walls.items():
        if not {'back': back, 'front': front, 'left': left, 'right': right}[name]: continue
        holes = sorted([o[1:] for o in openings if o[0] == name])
        def panel(a0, a1, z0, z1, m):
            if a1 - a0 < 1e-3 or z1 - z0 < 1e-3: return
            mid = (a0 + a1) / 2
            loc = (cx + mid, cy, (z0 + z1) / 2) if axis == 'x' else (cx, cy + mid, (z0 + z1) / 2)
            size = (a1 - a0, T, z1 - z0) if axis == 'x' else (T, a1 - a0, z1 - z0)
            out.append(box(C, loc, size, m, 0.0, name='wall_' + name))
        def span(z0, z1, m):
            a = -L / 2
            for x0, x1, hz0, hz1 in holes:
                panel(a, x0, z0, z1, m)
                lo, hi = max(z0, 0), min(z1, h)
                if hz0 > lo: panel(x0, x1, lo, min(hz0, hi), m)
                if hz1 < hi: panel(x0, x1, max(hz1, lo), hi, m)
                a = x1
            panel(a, L / 2, z0, z1, m)
        if dado: span(0, dado_h, dado); span(dado_h, h, wall)
        else: span(0, h, wall)
        # skirting + dado rail + cornice (only on solid spans, approximated as full length minus doors)
        sk = ck.m_wood(skirting, '#1a120a', 2.0, 0.4, 0.4)
        inn = -1 if name in ('back', 'right') else 1
        off = (0, inn * (T / 2 + 0.012)) if axis == 'x' else (inn * (T / 2 + 0.012), 0)
        for z, hh, dd, m in ((0.07, 0.14, 0.02, sk), (dado_h, 0.045, 0.025, sk) if dado else (None, 0, 0, None), (h - 0.06, 0.12, 0.06, ck.m_plaster('#e8e2d2', '#a09880', 0.1)) if cornice else (None, 0, 0, None)):
            if z is None: continue
            a = -L / 2; segs = []
            for x0, x1, hz0, hz1 in holes:
                if hz0 < z + hh / 2: segs.append((a, x0)); a = x1
            segs.append((a, L / 2))
            for a0, a1 in segs:
                if a1 - a0 < 0.02: continue
                mid = (a0 + a1) / 2
                loc = (cx + mid + off[0], cy + off[1], z) if axis == 'x' else (cx + off[0], cy + mid + off[1], z)
                size = (a1 - a0, dd, hh) if axis == 'x' else (dd, a1 - a0, hh)
                out.append(box(C, loc, size, m, 0.004, name='trim'))
    return out

def window(C, loc, rot_z, w, h, glass='clear', mullions=(2, 3), frame='#e6e0d0', sill=True, depth=0.12):
    """Sash window filling an opening: frame, mullions/transoms, glass panes (clear/frosted), sill."""
    fm = ck.m_paint_metal(frame, 0.4, 0.25) if frame else ck.m_wood('#5a3a22')
    gm = ck.m_glass('#f2f8ff') if glass == 'clear' else ck.m_frosted()
    parts = []; t = 0.05
    parts += [box(C, (0, 0, h / 2 - t / 2), (w, depth * 0.6, t), fm, 0.006), box(C, (0, 0, -h / 2 + t / 2), (w, depth * 0.6, t), fm, 0.006),
              box(C, (-w / 2 + t / 2, 0, 0), (t, depth * 0.6, h), fm, 0.006), box(C, (w / 2 - t / 2, 0, 0), (t, depth * 0.6, h), fm, 0.006)]
    nx, nz = mullions
    for i in range(1, nx): parts.append(box(C, (-w / 2 + w * i / nx, 0, 0), (0.03, depth * 0.5, h - 2 * t), fm, 0.004))
    for j in range(1, nz): parts.append(box(C, (0, 0, -h / 2 + h * j / nz), (w - 2 * t, depth * 0.5, 0.03), fm, 0.004))
    g = box(C, (0, 0, 0), (w - 2 * t, 0.006, h - 2 * t), gm, 0.0, name='glass'); g.visible_shadow = False; parts.append(g)
    if sill: parts.append(box(C, (0, -depth * 0.55, -h / 2 - 0.025), (w + 0.12, depth * 0.9, 0.05), ck.m_plaster('#ece6d8', '#9a9078', 0.1), 0.01))
    return group(C, 'window', parts, loc, (0, 0, rot_z))

def door(C, loc, rot_z, w=0.95, h=2.15, wood='#6a4428', glass_panel=False, sign=None, glow=0.0, open_angle=0.0):
    """Panelled door with architrave, brass knob, optional frosted glass panel (with painted sign text, optional glow from behind)."""
    wm = ck.m_wood(wood, '#2a180c', 1.5, 0.35, 0.5, 'Z'); parts = []
    leaf = []
    leaf.append(box(C, (w / 2, 0, h / 2), (w, 0.045, h), wm, 0.008, name='doorleaf'))
    for (zc, hh) in ((0.45, 0.6), (1.35, 0.9) if not glass_panel else (None, None)):
        if zc is None: continue
        for xc in (w * 0.27, w * 0.73):
            leaf.append(box(C, (xc, -0.026, zc), (w * 0.36, 0.012, hh), wm, 0.012, name='doorpanel'))
    if glass_panel:
        gp = box(C, (w / 2, -0.005, 1.45), (w * 0.7, 0.05, 0.85), ck.m_frosted('#f0f2ee', 0.3), 0.004, name='doorglass'); leaf.append(gp)
        if glow:
            gl = plane(C, (w / 2, 0.05, 1.45), (w * 0.7, 0.85), ck.m_emit('#fff3e0', glow), rot=(math.pi / 2, 0, 0), name='doorglow'); leaf.append(gl)
        if sign:
            t = ck.text(C, sign, (w / 2, -0.033, 1.62), 0.085, ck.m_enamel('#1a1a1c', 0.3), extrude=0.0008, name='sign'); leaf.append(t)
    knob = sphere(C, (w - 0.08, -0.06, 1.0), 0.03, ck.m_brass(), name='knob'); leaf.append(knob)
    leaf.append(cyl(C, (w - 0.08, -0.035, 1.0), 0.035, 0.012, ck.m_brass(), rot=(math.pi / 2, 0, 0), name='rose'))
    hinge = group(C, 'doorhinge', leaf, (0, 0, 0), (0, 0, open_angle))
    arch = ck.m_wood('#e8e2d0' if wood == '#6a4428' else wood, '#bcb4a0', 1, 0.5)
    parts += [hinge, box(C, (-0.05, -0.03, h / 2 + 0.05), (0.1, 0.06, h + 0.1), arch, 0.01), box(C, (w + 0.05, -0.03, h / 2 + 0.05), (0.1, 0.06, h + 0.1), arch, 0.01),
              box(C, (w / 2, -0.03, h + 0.1), (w + 0.2, 0.07, 0.1), arch, 0.01)]
    g = group(C, 'door', parts, loc, (0, 0, rot_z)); g['hinge'] = hinge.name; return g

def pendant_lamp(C, loc, drop=0.8, shade='#efece2', power=60, color='#ffcf8a', r=0.2):
    sm = ck.m_enamel(shade, 0.18); parts = []
    x, y, z = loc
    parts.append(tube(C, [(x, y, z + drop), (x, y, z + 0.12)], 0.004, ck.m_enamel('#202022', 0.3), 'cord'))
    parts.append(lathe(C, [(0.012, 0.13), (0.03, 0.12), (0.05, 0.08), (r * 0.6, 0.02), (r, -0.04), (r * 1.02, -0.05)], sm, (x, y, z), name='shade'))
    b, l = ck.practical_bulb(C, (x, y, z - 0.01), color, power, 0.03, 25)
    parts += [b]; return parts, l

def radiator(C, loc, rot_z, n=14, h=0.75):
    pm = ck.m_paint_metal('#dcd6c4', 0.45, 0.35); parts = []
    for i in range(n): parts.append(box(C, ((i - n / 2) * 0.065, 0, h / 2 + 0.08), (0.05, 0.16, h), pm, 0.02))
    parts.append(tube(C, [((-n / 2 - 0.5) * 0.065, 0, 0.14), ((n / 2 + 0.2) * 0.065, 0, 0.14)], 0.018, pm, 'radpipe'))
    parts.append(tube(C, [((-n / 2 - 0.5) * 0.065, 0, h + 0.04), ((n / 2 + 0.2) * 0.065, 0, h + 0.04)], 0.018, pm, 'radpipe'))
    for sx in (-1, 1): parts.append(cyl(C, (sx * n * 0.03, 0, 0.04), 0.02, 0.08, pm))
    return group(C, 'radiator', parts, loc, (0, 0, rot_z))

# ------------------------------------------------ hospital furniture
def iron_bed(C, loc, rot_z, sheet='#f3f1ea', blanket='#8a9a8a', pillow=True, occupied=False):
    pm = ck.m_paint_metal('#e8e4d8', 0.35, 0.25); parts = []; L, W = 1.95, 0.95
    for yy, hh in ((-L / 2, 1.05), (L / 2, 0.8)):
        for sx in (-1, 1):
            parts.append(tube(C, [(sx * W / 2, yy, 0.0), (sx * W / 2, yy, hh)], 0.018, pm, 'bedpost'))
            parts.append(sphere(C, (sx * W / 2, yy, hh + 0.02), 0.026, ck.m_brass(), name='finial'))
        parts.append(tube(C, [(-W / 2, yy, hh - 0.05), (W / 2, yy, hh - 0.05)], 0.014, pm, 'bedrail'))
        parts.append(tube(C, [(-W / 2, yy, 0.45), (W / 2, yy, 0.45)], 0.012, pm, 'bedrail'))
        for i in range(1, 6): xx = -W / 2 + W * i / 6; parts.append(tube(C, [(xx, yy, 0.45), (xx, yy, hh - 0.05)], 0.008, pm, 'bedbar'))
    for sx in (-1, 1): parts.append(box(C, (sx * W / 2, 0, 0.42), (0.03, L, 0.05), pm, 0.006))
    mat = box(C, (0, 0, 0.53), (W - 0.06, L - 0.06, 0.16), ck.m_fabric('#e8e2d2', 0.85, 200.0), 0.06, name='mattress'); ck.subsurf(mat, 2); parts.append(mat)
    sh = box(C, (0, 0.12, 0.62), (W + 0.02, L - 0.4, 0.04), ck.m_fabric(sheet, 0.9, 260.0), 0.02, name='sheet'); ck.subsurf(sh, 2); _wrinkle(sh, 0.012); parts.append(sh)
    bl = box(C, (0, 0.35, 0.645), (W + 0.04, L * 0.55, 0.035), ck.m_fabric(blanket, 0.95, 120.0, 0.6), 0.015, name='blanket'); ck.subsurf(bl, 2); _wrinkle(bl, 0.01); parts.append(bl)
    if pillow:
        pw = box(C, (0, -L / 2 + 0.3, 0.68), (0.62, 0.38, 0.12), ck.m_fabric(sheet, 0.9, 260.0), 0.05, name='pillow'); ck.subsurf(pw, 2); _wrinkle(pw, 0.012); parts.append(pw)
    return group(C, 'bed', parts, loc, (0, 0, rot_z))
def _wrinkle(o, amt):
    tex = bpy.data.textures.new('wr', 'CLOUDS'); tex.noise_scale = 0.12
    d = o.modifiers.new('disp', 'DISPLACE'); d.texture = tex; d.strength = amt; d.mid_level = 0.5
    o.modifiers.move(o.modifiers.find('disp'), len(o.modifiers) - 1) if False else None
    return o

def surgical_lamp(C, loc, r=0.42, power=900, color='#fff2dc', arm=True):
    """1920s operating light: enamel dish with a ring of reflector bulbs, central lens, heavy ceiling arm. Returns (group, light)."""
    x, y, z = loc; em = ck.m_enamel('#e9e7e0', 0.15, chips=0.3); parts = []
    parts.append(lathe(C, [(0.0, 0.16), (0.06, 0.16), (0.1, 0.13), (r * 0.8, 0.04), (r, -0.02), (r * 1.01, -0.05), (r * 0.96, -0.05), (r * 0.78, 0.0), (0.08, 0.06)], em, (x, y, z), name='lampdish'))
    parts.append(lathe(C, [(0.0, -0.02), (r * 0.25, -0.02), (r * 0.27, -0.04), (0.0, -0.045)], ck.m_frosted('#fff8ea', 0.2), (x, y, z), name='lamplens'))
    for i in range(8):
        a = i / 8 * math.tau; bx, by = x + math.cos(a) * r * 0.58, y + math.sin(a) * r * 0.58
        parts.append(lathe(C, [(0.0, 0.02), (0.05, 0.01), (0.06, -0.025)], ck.m_chrome(), (bx, by, z), name='reflector'))
        parts.append(sphere(C, (bx, by, z - 0.012), 0.018, ck.m_emit(color, 40), name='lampbulb'))
    if arm:
        parts.append(tube(C, [(x, y, z + 0.16), (x, y, z + 0.4), (x + 0.15, y + 0.1, z + 0.9), (x + 0.15, y + 0.1, z + 1.6)], 0.025, ck.m_paint_metal('#d8d4c8', 0.3), 'lamparm'))
        parts.append(sphere(C, (x, y, z + 0.24), 0.045, ck.m_chrome(), name='lampjoint'))
    l = ck.area(C, (x, y, z - 0.06), (x, y, z - 2.0), r * 1.5, color, power, 'surglamp', shape='DISK', spread=70)
    for p in parts:
        if p.name.startswith('lampbulb'): p.visible_shadow = False
    return parts, l

def operating_table(C, loc, rot_z, top_len=1.9, pad='#e8e4d6'):
    """Cast-iron pedestal table: lathed column, wide foot, crank wheel, padded top with linen and a head rest, leather straps."""
    pm = ck.m_paint_metal('#d6d2c6', 0.3, 0.3); parts = []
    parts.append(lathe(C, [(0.0, 0.0), (0.32, 0.0), (0.3, 0.04), (0.12, 0.08), (0.085, 0.14), (0.075, 0.7), (0.11, 0.74), (0.0, 0.76)], pm, (0, 0, 0), name='tablebase'))
    parts.append(torus(C, (0.18, 0, 0.45), 0.09, 0.008, ck.m_chrome(), rot=(0, math.pi / 2, 0), name='crank'))
    parts.append(box(C, (0, 0, 0.8), (0.55, top_len, 0.07), pm, 0.02, name='tabletop'))
    p = box(C, (0, 0, 0.86), (0.52, top_len - 0.04, 0.07), ck.m_leather('#3a2a22', 0.5), 0.03, name='tablepad'); ck.subsurf(p, 1); parts.append(p)
    lin = box(C, (0, 0.05, 0.9), (0.6, top_len - 0.3, 0.012), ck.m_fabric('#f2f0e8', 0.9, 260.0), 0.005, name='linen'); ck.subsurf(lin, 2); _wrinkle(lin, 0.008); parts.append(lin)
    parts.append(box(C, (0, -top_len / 2 + 0.12, 0.93), (0.3, 0.22, 0.06), ck.m_leather('#3a2a22', 0.5), 0.025, name='headrest'))
    return group(C, 'optable', parts, loc, (0, 0, rot_z))

def instrument_cabinet(C, loc, rot_z, w=1.0, h=1.85, d=0.42, fill=True):
    """White enamel steel cabinet with glass doors, sides and shelves, loaded with instruments, bottles and coiled catheters."""
    em = ck.m_enamel('#ecebe4', 0.18, chips=0.25); gl = ck.m_glass('#f4fbff'); parts = []
    t = 0.03
    for sx in (-1, 1):
        for sy in (-1, 1): parts.append(box(C, (sx * (w / 2 - t / 2), sy * (d / 2 - t / 2), h / 2 + 0.1), (t, t, h), em, 0.006))
    parts.append(box(C, (0, 0, 0.1), (w, d, 0.04), em, 0.008)); parts.append(box(C, (0, 0, h + 0.1), (w + 0.04, d + 0.04, 0.05), em, 0.01))
    for sx in (-1, 1): parts.append(cyl(C, (sx * (w / 2 - 0.05), 0, 0.04), 0.022, 0.09, ck.m_chrome()))
    parts.append(box(C, (0, d / 2 - 0.005, h / 2 + 0.1), (w, 0.01, h), ck.m_enamel('#dfe2dc', 0.3), 0.0))
    for sx in (-1, 1): g = box(C, (sx * (w / 2 - 0.005), 0, h / 2 + 0.1), (0.006, d - 2 * t, h - 0.05), gl, 0.0); g.visible_shadow = False; parts.append(g)
    for sx in (-1, 1):   # two glass doors
        g = box(C, (sx * w / 4, -d / 2 + 0.008, h / 2 + 0.1), (w / 2 - 0.03, 0.006, h - 0.08), gl, 0.0); g.visible_shadow = False; parts.append(g)
        parts.append(box(C, (sx * 0.02, -d / 2 + 0.004, h / 2 + 0.1), (0.025, 0.02, h - 0.08), em, 0.004))
        parts.append(cyl(C, (sx * 0.05, -d / 2 - 0.01, h * 0.55), 0.008, 0.06, ck.m_brass(), rot=(0, 0, 0)))
    parts.append(box(C, (0.0, -d / 2 - 0.012, h * 0.55), (0.03, 0.01, 0.04), ck.m_brass(), 0.003, name='lock'))
    shelves = [0.55, 0.95, 1.35, 1.7]
    for z in shelves: g = box(C, (0, 0, z), (w - 2 * t, d - 2 * t, 0.008), gl, 0.002); g.visible_shadow = False; parts.append(g)
    if fill:
        for si, z in enumerate(shelves):
            x = -w / 2 + 0.08
            while x < w / 2 - 0.08:
                kind = R.choice(['bottle', 'bottle', 'jar', 'tray', 'coil'] if si != 1 else ['coil', 'syringe', 'tray', 'scalpels'])
                if kind == 'bottle':
                    bh = R.uniform(0.12, 0.22); col = R.choice(['#8a4a1a', '#2a4a2a', '#f4f8fa', '#3a2a5a'])
                    parts.append(lathe(C, [(0.0, 0.0), (0.035, 0.0), (0.038, 0.01), (0.038, bh * 0.7), (0.014, bh * 0.85), (0.012, bh), (0.0, bh)], ck.m_glass(col, 0.02), (x, R.uniform(-0.05, 0.08), z + 0.005), name='bottle'))
                    parts.append(cyl(C, (x, 0.0, z + 0.005 + bh + 0.012), 0.014, 0.024, ck.m_enamel('#2a2420', 0.3)))
                    x += 0.1
                elif kind == 'jar':
                    parts.append(lathe(C, [(0.0, 0.0), (0.06, 0.0), (0.062, 0.14), (0.0, 0.14)], ck.m_glass('#f4fbff'), (x + 0.03, 0.02, z + 0.005), name='jar'))
                    parts.append(cyl(C, (x + 0.03, 0.02, z + 0.155), 0.066, 0.025, ck.m_metal('#c8ccd0', 0.3)))
                    for k in range(5): parts.append(tube(C, [(x + 0.03 + (k - 2) * 0.008, 0.02, z + 0.01), (x + 0.03 + (k - 2) * 0.014, 0.02, z + 0.2)], 0.0025, ck.m_chrome(), 'forceps'))
                    x += 0.15
                elif kind == 'coil':
                    parts.append(coil(C, (x + 0.06, 0.0, z + 0.012), 0.055, 3.5, 0.0028)); x += 0.15
                elif kind == 'syringe':
                    parts += syringe(C, (x + 0.05, -0.02, z + 0.02), 0.0); x += 0.14
                elif kind == 'scalpels':
                    for k in range(4): parts.append(scalpel(C, (x + 0.02 * k, 0.0, z + 0.012), math.radians(90)))
                    x += 0.12
                else:
                    parts.append(kidney_dish(C, (x + 0.08, 0.0, z + 0.01), 0.0)); x += 0.2
    return group(C, 'cabinet', parts, loc, (0, 0, rot_z))

def coil(C, loc, r=0.06, turns=3.0, tr=0.0028, mat=None, name='coil'):
    """A coiled catheter lying flat (spiral)."""
    pts = []; x, y, z = loc
    for i in range(int(turns * 24) + 1):
        a = i / 24 * math.tau; rr = r * (1 - 0.18 * i / (turns * 24)); pts.append((x + math.cos(a) * rr, y + math.sin(a) * rr, z + tr * (1 + 0.6 * (i % 24 == 0))))
    return tube(C, pts, tr, mat or ck.m_rubber_catheter(), name)
def scalpel(C, loc, rot_z=0.0):
    x, y, z = loc; h = tube(C, [(0, 0, 0), (0.1, 0, 0)], 0.0045, ck.m_metal('#c0c4c8', 0.25), 'scalpelhandle'); h.data.bevel_resolution = 2
    bl = ck.mesh_obj(C, 'blade', [(0.1, -0.001, 0.0), (0.135, 0.0, 0.0), (0.1, 0.006, 0.0)], [(0, 1, 2)], ck.m_chrome(0.05)); ck.solidify(bl, 0.0008, 0)
    return group(C, 'scalpel', [h, bl], loc, (0, 0, rot_z))
def syringe(C, loc, rot_z=0.0, length=0.12):
    """Glass syringe (barrel, plunger, finger rings, needle) lying along X."""
    x, y, z = loc; g = ck.m_glass('#f6fbff'); mt = ck.m_chrome(0.15); parts = []
    parts.append(lathe(C, [(0.0, 0.0), (0.009, 0.0), (0.009, length), (0.0, length)], g, (0, 0, 0), (0, math.pi / 2, 0), name='barrel'))
    parts.append(lathe(C, [(0.0, -0.03), (0.006, -0.03), (0.006, length * 0.6), (0.0, length * 0.6)], ck.m_glass('#e8f0f4', 0.05), (0, 0, 0), (0, math.pi / 2, 0), name='plunger'))
    for sx in (-1, 1): parts.append(torus(C, (0.002, sx * 0.016, 0), 0.008, 0.0016, mt, rot=(math.pi / 2, 0, 0), name='ring'))
    parts.append(tube(C, [(length, 0, 0), (length + 0.012, 0, 0)], 0.0025, mt, 'hub')); parts.append(tube(C, [(length + 0.012, 0, 0), (length + 0.05, 0, 0)], 0.0005, mt, 'needle'))
    return [group(C, 'syringe', parts, loc, (0, 0, rot_z))]
def kidney_dish(C, loc, rot_z=0.0, scale=1.0):
    em = ck.m_enamel('#f0efe8', 0.15, chips=0.4)
    pts = []
    for i in range(48):
        a = i / 48 * math.tau; r = 0.1 - 0.035 * max(0, math.cos(a)) ** 3; pts.append((math.cos(a) * r * 1.25, math.sin(a) * r * 0.6))
    verts = [(px, py, 0.0) for px, py in pts] + [(px * 1.12, py * 1.2, 0.035) for px, py in pts]
    faces = [(i, (i + 1) % 48, 48 + (i + 1) % 48, 48 + i) for i in range(48)] + [tuple(range(47, -1, -1))]
    o = ck.mesh_obj(C, 'kidneydish', verts, faces, em); ck.solidify(o, 0.002); ck.subsurf(o, 2); o.location = loc; o.rotation_euler = (0, 0, rot_z); o.scale = (scale,) * 3; return o
def enamel_tray(C, loc, w=0.42, d=0.3, rot_z=0.0):
    em = ck.m_enamel('#f1f0ea', 0.14, chips=0.35)
    o = box(C, (0, 0, 0.0), (w, d, 0.035), em, 0.012, name='tray'); bm_ = o.data
    import bmesh as _bm
    b = _bm.new(); b.from_mesh(bm_); top = [f for f in b.faces if f.normal.z > 0.9]
    _bm.ops.delete(b, geom=top, context='FACES'); b.to_mesh(bm_); b.free(); ck.solidify(o, 0.003, 1)
    rim = ck.torus(C, (0, 0, 0.018), 1.0, 0.004, ck.m_enamel('#2a3a6a', 0.2), name='trayrim'); rim.scale = (w / 2, d / 2, 1)
    return group(C, 'traygroup', [o, rim], loc, (0, 0, rot_z))

# ------------------------------------------------ office / desk dressing
def desk(C, loc, rot_z, w=1.6, d=0.85, h=0.77, wood='#4a2a18'):
    wm = ck.m_wood(wood, '#1e1008', 1.2, 0.3, 0.6); parts = []
    parts.append(box(C, (0, 0, h - 0.025), (w, d, 0.05), wm, 0.012, name='desktop'))
    parts.append(box(C, (0, 0.0, h - 0.0), (w - 0.2, d - 0.2, 0.004), ck.m_leather('#1f3a2a', 0.5), 0.002, name='desk_inlay'))
    for sx in (-1, 1):
        parts.append(box(C, (sx * (w / 2 - 0.22), 0, (h - 0.05) / 2), (0.42, d - 0.06, h - 0.05), wm, 0.01, name='pedestal'))
        for k in range(3):
            zc = 0.15 + k * 0.22; parts.append(box(C, (sx * (w / 2 - 0.22), -d / 2 + 0.025, zc), (0.38, 0.02, 0.19), wm, 0.008, name='drawer'))
            parts.append(torus(C, (sx * (w / 2 - 0.22), -d / 2 + 0.01, zc), 0.022, 0.004, ck.m_brass(), rot=(math.pi / 2, 0, 0), name='pull'))
    parts.append(box(C, (0, d / 2 - 0.04, (h - 0.05) / 2 + 0.1), (w - 0.9, 0.03, h - 0.25), wm, 0.008, name='modesty'))
    return group(C, 'desk', parts, loc, (0, 0, rot_z))
def bankers_lamp(C, loc, rot_z=0.0, power=35, color='#ffc87a', shade='#1f5a3a'):
    x, y, z = loc; parts = []
    parts.append(lathe(C, [(0.0, 0.0), (0.08, 0.0), (0.085, 0.015), (0.05, 0.03), (0.012, 0.04), (0.0, 0.04)], ck.m_brass(), (x, y, z), name='lampbase'))
    parts.append(tube(C, [(x, y, z + 0.03), (x, y, z + 0.33)], 0.008, ck.m_brass(), 'lampstem'))
    sh = lathe(C, [(0.0, 0.03), (0.04, 0.03), (0.075, 0.0), (0.078, -0.01)], ck.m_glass(shade, 0.05), (0, 0, 0), name='greenshade')
    sh.scale = (2.4, 1.0, 1.0); sh.location = (x, y, z + 0.36); sh.rotation_euler = (math.radians(-15), 0, rot_z); parts.append(sh)
    b, l = ck.practical_bulb(C, (x, y - 0.01, z + 0.33), color, power, 0.02, 30); parts.append(b)
    return parts, l
def books(C, loc, rot_z, length=0.8, h=(0.2, 0.3), depth=0.2):
    cols = ['#5a1a1a', '#1a2a4a', '#2a3a22', '#6a4a2a', '#3a2a1a', '#7a6a4a', '#22201c', '#4a1a2a']
    parts = []; x = 0.0
    while x < length:
        t = R.uniform(0.02, 0.055); hh = R.uniform(*h); lean = R.uniform(-0.03, 0.03) if R.random() < 0.15 else 0
        b = box(C, (x + t / 2, 0, hh / 2), (t, depth, hh), ck.m_leather(R.choice(cols), R.uniform(0.35, 0.6)), 0.003, rot=(0, lean, 0), name='book')
        parts.append(b)
        if R.random() < 0.5: parts.append(box(C, (x + t / 2, -depth / 2 - 0.0005, hh * 0.75), (t * 0.8, 0.001, 0.012), ck.m_brass('#c8a050', 0.4, 0.2), 0.0, name='gilt'))
        x += t + 0.002
    return group(C, 'books', parts, loc, (0, 0, rot_z))
def bookshelf(C, loc, rot_z, w=1.4, h=2.2, d=0.35, wood='#3a2214'):
    wm = ck.m_wood(wood, '#140a04', 1.0, 0.35, 0.5); parts = []
    for sx in (-1, 1): parts.append(box(C, (sx * w / 2, 0, h / 2), (0.04, d, h), wm, 0.008))
    parts.append(box(C, (0, d / 2, h / 2), (w, 0.02, h), wm, 0.0)); parts.append(box(C, (0, 0, h), (w + 0.08, d + 0.04, 0.05), wm, 0.012))
    n = 5
    for i in range(n):
        z = 0.08 + i * (h - 0.1) / n; parts.append(box(C, (0, 0, z), (w, d, 0.03), wm, 0.006))
        parts.append(books(C, (-w / 2 + 0.03, 0.0, z + 0.015), 0.0, w - 0.08 - R.uniform(0, 0.25), (0.18, min(0.32, (h - 0.1) / n - 0.05)), d * 0.75))
    return group(C, 'shelf', parts, loc, (0, 0, rot_z))
def frame_picture(C, loc, rot_z, w, h, img_mat, frame='#2a1a0e'):
    fm = ck.m_wood(frame, '#0a0604', 2, 0.3, 0.6)
    parts = [box(C, (0, 0.0, h / 2), (w + 0.06, 0.03, 0.03), fm, 0.008), box(C, (0, 0.0, -h / 2), (w + 0.06, 0.03, 0.03), fm, 0.008),
             box(C, (-w / 2, 0.0, 0), (0.03, 0.03, h), fm, 0.008), box(C, (w / 2, 0.0, 0), (0.03, 0.03, h), fm, 0.008),
             plane(C, (0, 0.005, 0), (w, h), img_mat, rot=(math.pi / 2, 0, 0), name='picture')]
    return group(C, 'framed', parts, loc, (0, 0, rot_z))
def chair(C, loc, rot_z, wood='#3a2214', leather='#4a2416'):
    wm = ck.m_wood(wood, '#140a04', 1.5, 0.35, 0.5); parts = []
    for sx in (-1, 1):
        for sy in (-1, 1): parts.append(tube(C, [(sx * 0.2, sy * 0.2, 0.0), (sx * 0.21, sy * 0.2, 0.45)], 0.018, wm, 'chairleg'))
        parts.append(tube(C, [(sx * 0.2, 0.2, 0.45), (sx * 0.19, 0.24, 0.95)], 0.017, wm, 'chairback'))
    s_ = box(C, (0, 0, 0.47), (0.46, 0.46, 0.06), ck.m_leather(leather, 0.45), 0.02); ck.subsurf(s_, 1); parts.append(s_)
    parts.append(box(C, (0, 0.23, 0.82), (0.4, 0.03, 0.18), wm, 0.012)); parts.append(box(C, (0, 0.23, 0.62), (0.4, 0.025, 0.05), wm, 0.008))
    return group(C, 'chair', parts, loc, (0, 0, rot_z))

# ------------------------------------------------ X-ray room (1920s)
def xray_apparatus(C, loc, rot_z=0.0):
    """Tube stand (column + counterweighted carriage + tube housing with a glass Coolidge tube), high-tension cables to the ceiling,
    a vertical chest stand with a film cassette, and a control desk with meters and knobs."""
    pm = ck.m_paint_metal('#3e4440', 0.35, 0.3); blk = ck.m_enamel('#1c1e1e', 0.3); parts = []
    parts.append(box(C, (0, 0, 0.04), (0.6, 0.6, 0.08), pm, 0.02)); parts.append(cyl(C, (0, 0, 1.15), 0.05, 2.2, pm))
    parts.append(box(C, (0, -0.07, 1.35), (0.16, 0.1, 0.3), pm, 0.015, name='carriage'))
    parts.append(tube(C, [(0, -0.12, 1.35), (0, -0.55, 1.35)], 0.025, ck.m_chrome(0.2), 'tubearm'))
    housing = lathe(C, [(0.0, -0.18), (0.09, -0.17), (0.12, -0.1), (0.12, 0.1), (0.09, 0.17), (0.0, 0.18)], ck.m_enamel('#2a2a28', 0.3, chips=0.2), (0, -0.62, 1.35), (0, math.pi / 2, 0), name='tubehousing')
    parts.append(housing)
    parts.append(lathe(C, [(0.0, -0.16), (0.03, -0.15), (0.075, -0.05), (0.075, 0.05), (0.03, 0.15), (0.0, 0.16)], ck.m_glass('#e8f4ea', 0.0), (0, -0.62, 1.35), (0, math.pi / 2, 0), name='coolidgetube'))
    parts.append(cyl(C, (0, -0.62, 1.2), 0.06, 0.06, ck.m_brass(), name='collimator'))
    for sx in (-1, 1):
        parts.append(tube(C, [(sx * 0.19, -0.62, 1.35), (sx * 0.4, -0.5, 1.9), (sx * 0.5, -0.2, 2.6), (sx * 0.6, 0.3, 3.0)], 0.018, blk, 'htcable'))
        parts.append(lathe(C, [(0.0, 0.0), (0.03, 0.0), (0.04, 0.03), (0.04, 0.08), (0.0, 0.08)], ck.m_enamel('#e8e4d8', 0.2), (sx * 0.18, -0.62, 1.35), (0, sx * math.pi / 2, 0), name='insulator'))
    parts.append(box(C, (0, -0.4, 2.25), (0.12, 0.12, 0.12), ck.m_paint_metal('#888070', 0.4), 0.01, name='counterweight'))
    # chest stand + cassette
    parts.append(box(C, (0, -1.55, 0.9), (0.5, 0.06, 1.8), ck.m_wood('#3a2a1a', '#1a0f08', 1, 0.4), 0.01, name='cheststand'))
    parts.append(box(C, (0, -1.585, 1.3), (0.4, 0.02, 0.48), ck.m_metal('#9aa0a4', 0.3), 0.006, name='cassette'))
    return group(C, 'xray', parts, loc, (0, 0, rot_z))
def control_desk(C, loc, rot_z=0.0):
    pm = ck.m_paint_metal('#2e3430', 0.4, 0.3); parts = [box(C, (0, 0, 0.5), (0.9, 0.5, 1.0), pm, 0.02)]
    parts.append(box(C, (0, -0.05, 1.12), (0.9, 0.35, 0.25), pm, 0.02, rot=(math.radians(-25), 0, 0)))
    for i, x in enumerate((-0.28, 0.0, 0.28)):
        parts.append(cyl(C, (x, -0.17, 1.16), 0.07, 0.02, ck.m_brass(), rot=(math.radians(65), 0, 0), name='meter'))
        parts.append(cyl(C, (x, -0.18, 1.165), 0.06, 0.004, ck.m_paper('#f2ecd8'), rot=(math.radians(65), 0, 0), name='meterface'))
        parts.append(cyl(C, (x, -0.25, 1.05), 0.025, 0.03, ck.m_enamel('#141414', 0.3), rot=(math.radians(65), 0, 0), name='knob'))
    parts.append(box(C, (0.35, -0.28, 0.95), (0.04, 0.03, 0.1), ck.m_enamel('#8a1a1a', 0.3), 0.01, name='switch'))
    return group(C, 'controldesk', parts, loc, (0, 0, rot_z))
def light_box(C, loc, rot_z=0.0, w=0.62, h=0.75, power=4.0, film_mat=None):
    """Wall-mounted film viewer: metal housing, frosted opal panel (emissive), optional film (backlit) clipped on top."""
    pm = ck.m_paint_metal('#d8d6cc', 0.35, 0.3); parts = [box(C, (0, 0.06, 0), (w + 0.08, 0.12, h + 0.08), pm, 0.015, name='lbhousing')]
    panel = plane(C, (0, -0.002, 0), (w, h), ck.m_emit('#eef4fa', power), rot=(math.pi / 2, 0, 0), name='lbpanel'); parts.append(panel)
    film = None
    if film_mat:
        film = plane(C, (0, -0.006, 0.0), (w * 0.92, h * 0.94), film_mat, rot=(math.pi / 2, 0, 0), name='film'); parts.append(film)
        for x in (-0.15, 0.15): parts.append(box(C, (x, -0.012, h / 2 - 0.01), (0.04, 0.008, 0.03), ck.m_chrome(), 0.003, name='clip'))
    l = ck.area(C, (0, -0.1, 0), (0, -2, 0), w, '#e8f0fa', power * 25, 'lightbox_light', size_y=h)
    g = group(C, 'lightbox', parts + [l], loc, (0, 0, rot_z)); return g, panel, film

# ------------------------------------------------ theatre / ceremony
def amphitheatre(C, loc, r0=2.2, tiers=6, rise=0.42, step=0.75, wood='#4a2c18', arc=(math.radians(-200), math.radians(20))):
    """Steep circular surgical theatre: concentric stepped tiers (lathed ring sections) with turned railings."""
    wm = ck.m_wood(wood, '#1a0d06', 1.0, 0.4, 0.4); parts = []
    for i in range(tiers):
        r = r0 + i * step; z = (i + 1) * rise
        o = lathe(C, [(r, 0.0), (r, z), (r + step, z), (r + step, 0.0)], wm, (0, 0, 0), name='tier', steps=96, cap=False); parts.append(o)
        rail = []
        for k in range(97):
            a = k / 96 * math.tau; rail.append((math.cos(a) * (r + 0.05), math.sin(a) * (r + 0.05), z + 0.95))
        parts.append(tube(C, rail, 0.025, wm, 'rail'))
        for k in range(0, 96, 2):
            a = k / 96 * math.tau; parts.append(tube(C, [(math.cos(a) * (r + 0.05), math.sin(a) * (r + 0.05), z), (math.cos(a) * (r + 0.05), math.sin(a) * (r + 0.05), z + 0.95)], 0.012, wm, 'baluster'))
    parts.append(cyl(C, (0, 0, -0.02), r0 + 0.02, 0.04, ck.m_floor_planks('#5a3a22', '#2a1a0e'), steps=96, name='pit'))
    return group(C, 'amphi', parts, loc)
def curtain(C, loc, w, h, color='#5a0e14', folds=14, rot_z=0.0):
    verts, faces = [], []; nx, nz = folds * 8, 12
    for j in range(nz + 1):
        for i in range(nx + 1):
            x = -w / 2 + w * i / nx; y = 0.06 * math.sin(i / 8 * math.tau) * (0.7 + 0.3 * (j / nz)); verts.append((x, y, h * j / nz))
    for j in range(nz):
        for i in range(nx): a = j * (nx + 1) + i; faces.append((a, a + 1, a + nx + 2, a + nx + 1))
    o = ck.mesh_obj(C, 'curtain', verts, faces, ck.m_wool(color, 0.75), True); ck.solidify(o, 0.01); o.location = loc; o.rotation_euler = (0, 0, rot_z); return o
def medal_case(C, loc, rot_z=0.0, open_angle=70):
    lm = ck.m_leather('#6a0c14', 0.35); parts = []
    parts.append(box(C, (0, 0, 0.02), (0.12, 0.12, 0.04), lm, 0.01, name='casebase'))
    parts.append(box(C, (0, 0, 0.042), (0.11, 0.11, 0.004), ck.m_wool('#1a1a40', 0.9), 0.002, name='velvet'))
    lid = box(C, (0, 0.06, 0.02), (0.12, 0.12, 0.03), lm, 0.01, name='caselid'); lid.location = (0, 0.06, 0.045); lid.rotation_euler = (math.radians(-open_angle), 0, 0)
    parts.append(lid)
    medal = cyl(C, (0, 0, 0.05), 0.033, 0.005, ck.m_brass('#e0b04a', 0.18, 0.05), name='medal')
    parts.append(medal)
    parts.append(torus(C, (0, 0, 0.053), 0.03, 0.0018, ck.m_brass('#e8b850', 0.15, 0.05), name='medalrim'))
    parts.append(sphere(C, (0, -0.003, 0.054), 0.014, ck.m_brass('#d8a848', 0.2, 0.05), (1, 1, 0.12), name='medalrelief'))
    return group(C, 'medalcase', parts, loc, (0, 0, rot_z))

# ------------------------------------------------ modern cath lab
def c_arm(C, loc, rot_z=0.0):
    wm = ck.m_enamel('#eef0f2', 0.25); parts = []
    parts.append(torus(C, (0, 0, 1.15), 0.75, 0.07, wm, rot=(0, math.pi / 2, 0), name='carm'))
    bm = __import__('bmesh'); o = parts[0]; b = bm.new(); b.from_mesh(o.data)
    bm.ops.delete(b, geom=[v for v in b.verts if v.co.y > 0.35 * 0.75 and v.co.x < 0.6], context='VERTS'); b.to_mesh(o.data); b.free()
    parts.append(box(C, (0, 0, 1.95), (0.5, 0.45, 0.22), wm, 0.05, name='detector'))
    parts.append(box(C, (0, 0, 0.42), (0.3, 0.3, 0.3), wm, 0.05, name='tubehead'))
    parts.append(box(C, (0.0, 0.85, 1.15), (0.3, 0.4, 0.5), wm, 0.05, name='carmmount'))
    parts.append(tube(C, [(0, 0.95, 1.4), (0, 1.0, 2.6), (0, 0.6, 3.2)], 0.12, wm, 'boom'))
    return group(C, 'carm', parts, loc, (0, 0, rot_z))
def monitor_bank(C, loc, rot_z, img_mat, n=3):
    bk = ck.m_enamel('#1a1c20', 0.3); parts = []
    for i in range(n):
        x = (i - (n - 1) / 2) * 0.62
        parts.append(box(C, (x, 0.02, 0), (0.6, 0.05, 0.38), bk, 0.01))
        parts.append(plane(C, (x, -0.006, 0), (0.56, 0.34), img_mat[i % len(img_mat)] if isinstance(img_mat, list) else img_mat, rot=(math.pi / 2, 0, 0), name='screen'))
    parts.append(tube(C, [(0, 0.05, 0.2), (0, 0.1, 1.2)], 0.04, ck.m_enamel('#dfe2e6', 0.3), 'monitorarm'))
    return group(C, 'monitors', parts, loc, (0, 0, rot_z))
