# Cinema kit (v5) - core: render/colour management, procedural PBR materials, modelling helpers (bevelled boxes, lathe,
# sweeps), lighting rigs (motivated key/fill/rim, practicals, windows, volumetric haze) and an operated camera system
# (eased dolly/track/orbit/crane/push/rack-focus moves bound to timeline markers).
# Coordinates: Z up, metres. Characters face -Y. Everything is keyed in absolute frames so all sets share one timeline.
import bpy, bmesh, math, random
from mathutils import Vector, Euler, Matrix

FPS = 24
def set_fps(f):
    global FPS; FPS = f
def F(t): return int(round(t * FPS))
def hexc(h):
    if not isinstance(h, str): return tuple(h)
    h = h.lstrip('#'); return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4))
V = Vector

# ================================================================ render + colour
def setup_render(sc, res=(720, 1280), samples=48, look='AgX - Medium High Contrast', exposure=0.0, mblur=True, noise=0.02, bounces=(4, 2, 2, 6, 1)):
    """Cycles, CPU-friendly but filmic: adaptive sampling + OpenImageDenoise, AgX, controlled bounces, indirect clamp
    (kills fireflies without flattening), motion blur, persistent data for animation."""
    sc.render.engine = 'CYCLES'; c = sc.cycles
    c.device = 'CPU'; c.samples = samples; c.use_adaptive_sampling = True; c.adaptive_threshold = noise; c.adaptive_min_samples = 8
    c.use_denoising = True; c.denoiser = 'OPENIMAGEDENOISE'
    try: c.denoising_input_passes = 'RGB_ALBEDO_NORMAL'; c.denoising_prefilter = 'ACCURATE'
    except Exception: pass
    c.max_bounces, c.diffuse_bounces, c.glossy_bounces, c.transmission_bounces, c.volume_bounces = bounces[0], bounces[1], bounces[2], bounces[3], bounces[4]
    c.transparent_max_bounces = 8; c.caustics_reflective = False; c.caustics_refractive = False
    c.sample_clamp_direct = 0; c.sample_clamp_indirect = 4.0; c.blur_glossy = 1.0
    c.volume_step_rate = 4.0; c.volume_max_steps = 64
    try: sc.render.use_persistent_data = True
    except Exception: pass
    sc.render.resolution_x, sc.render.resolution_y = res; sc.render.resolution_percentage = 100; sc.render.fps = FPS
    sc.render.use_motion_blur = mblur; sc.render.motion_blur_shutter = 0.45
    sc.render.film_transparent = False
    sc.view_settings.view_transform = 'AgX'
    try: sc.view_settings.look = look
    except Exception: sc.view_settings.look = 'None'
    sc.view_settings.exposure = exposure; sc.view_settings.gamma = 1.0
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_depth = '8'
    return sc

def world(sc, color='#05060a', strength=1.0, haze=0.0, haze_color='#ffffff', anisotropy=0.35):
    """Dark motivated world. haze>0 adds a uniform volume (use local_haze() for cheaper, bounded haze)."""
    w = sc.world or bpy.data.worlds.new(sc.name + '_world'); sc.world = w; w.use_nodes = True; nt = w.node_tree
    bg = nt.nodes.get('Background') or nt.nodes.new('ShaderNodeBackground'); bg.inputs['Color'].default_value = (*hexc(color), 1); bg.inputs['Strength'].default_value = strength
    if haze:
        vol = nt.nodes.new('ShaderNodeVolumePrincipled'); vol.inputs['Density'].default_value = haze; vol.inputs['Anisotropy'].default_value = anisotropy
        vol.inputs['Color'].default_value = (*hexc(haze_color), 1); out = nt.nodes['World Output']; nt.links.new(vol.outputs[0], out.inputs['Volume'])
    return w

# ================================================================ node helpers
class N:
    """Tiny node-graph builder: n = N(mat); t = n.new('ShaderNodeTexNoise', Scale=40); n.link(t, 'Fac', bsdf, 'Roughness')."""
    def __init__(s, m): s.m = m; s.nt = m.node_tree; s.nodes = s.nt.nodes
    def new(s, kind, **inputs):
        nd = s.nodes.new(kind)
        for k, v in inputs.items():
            k2 = k.replace('_', ' ')
            if k2 in nd.inputs:
                try: nd.inputs[k2].default_value = v
                except Exception: nd.inputs[k2].default_value = (*v, 1) if len(v) == 3 else v
            elif hasattr(nd, k): setattr(nd, k, v)
        return nd
    def link(s, a, ao, b, bi):
        s.nt.links.new(a.outputs[ao] if not isinstance(ao, int) or ao < len(a.outputs) else a.outputs[0], b.inputs[bi]); return b
    def bsdf(s): return s.nodes['Principled BSDF']
def _ramp(n, src, out, stops):
    r = n.new('ShaderNodeValToRGB'); r.color_ramp.elements[0].position = stops[0][0]; r.color_ramp.elements[0].color = (*hexc(stops[0][1]), 1)
    r.color_ramp.elements[1].position = stops[-1][0]; r.color_ramp.elements[1].color = (*hexc(stops[-1][1]), 1)
    for p, c in stops[1:-1]: e = r.color_ramp.elements.new(p); e.color = (*hexc(c), 1)
    n.link(src, out, r, 'Fac'); return r
def _mix(n, a, b, fac, blend='MIX'):
    m = n.new('ShaderNodeMix'); m.data_type = 'RGBA'; m.blend_type = blend
    if isinstance(fac, float): m.inputs['Factor'].default_value = fac
    else: n.nt.links.new(fac, m.inputs['Factor'])
    for slot, v in ((6, a), (7, b)):
        if isinstance(v, (tuple, list, str)): m.inputs[slot].default_value = (*hexc(v), 1)
        else: n.nt.links.new(v, m.inputs[slot])
    return m
def _bump(n, height_socket, strength=0.2, distance=0.01, normal=None):
    b = n.new('ShaderNodeBump', Strength=strength, Distance=distance); n.nt.links.new(height_socket, b.inputs['Height'])
    if normal is not None: n.nt.links.new(normal, b.inputs['Normal'])
    return b
def _planar(n, plane='wall', kind='Object'):
    """2D texture vector for flat surfaces: 'wall' uses (x+y, z) so it works on walls facing X or Y; 'floor' uses (x, y)."""
    tc = n.new('ShaderNodeTexCoord'); sp = n.new('ShaderNodeSeparateXYZ'); n.link(tc, kind, sp, 'Vector'); cb = n.new('ShaderNodeCombineXYZ')
    if plane == 'wall':
        ad = n.new('ShaderNodeMath', operation='ADD'); n.link(sp, 'X', ad, 0); n.link(sp, 'Y', ad, 1); n.link(ad, 0, cb, 'X'); n.link(sp, 'Z', cb, 'Y')
    else: n.link(sp, 'X', cb, 'X'); n.link(sp, 'Y', cb, 'Y')
    return cb
def _coord(n, kind='Object', scale=1.0):
    tc = n.new('ShaderNodeTexCoord'); mp = n.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (scale,) * 3; n.link(tc, kind, mp, 'Vector'); return mp

_cache = {}
def _base(name, color='#808080', rough=0.5, metal=0.0, spec=0.5):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*hexc(color), 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    try: b.inputs['Specular IOR Level'].default_value = spec
    except Exception: pass
    return m, N(m), b
def cached(fn):
    def w(*a, **k):
        key = (fn.__name__, a, tuple(sorted(k.items())))
        if key not in _cache: _cache[key] = fn(*a, **k)
        return _cache[key]
    w.__name__ = fn.__name__; return w

# ================================================================ material library (procedural PBR, no flat colours)
@cached
def m_plaster(color='#d8d0bc', grime='#8a7f68', grime_amt=0.35, scale=1.0):
    """Painted plaster wall: low-frequency colour variation, grime gathering low, fine stipple bump, matte."""
    m, n, b = _base('plaster', color, 0.85)
    co = _coord(n, 'Object', scale); big = n.new('ShaderNodeTexNoise', Scale=1.2, Detail=6.0, Roughness=0.55); n.link(co, 0, big, 'Vector')
    fine = n.new('ShaderNodeTexNoise', Scale=180.0, Detail=4.0); n.link(co, 0, fine, 'Vector')
    sep = n.new('ShaderNodeSeparateXYZ'); n.link(co, 0, sep, 'Vector')
    low = n.new('ShaderNodeMapRange', From_Min=0.0, From_Max=1.2, To_Min=1.0, To_Max=0.0); n.link(sep, 'Z', low, 'Value')
    gm = n.new('ShaderNodeMath', operation='MULTIPLY'); n.link(low, 0, gm, 0); n.link(big, 'Fac', gm, 1)
    gm2 = n.new('ShaderNodeMath', operation='MULTIPLY'); gm2.inputs[1].default_value = grime_amt; n.link(gm, 0, gm2, 0)
    col = _mix(n, color, grime, gm2.outputs[0]); var = _mix(n, col.outputs[2], '#ffffff', 0.0)
    c2 = _mix(n, col.outputs[2], color, big.outputs['Fac'], 'OVERLAY'); c2.inputs['Factor'].default_value = 0.25
    n.nt.links.new(c2.outputs[2], b.inputs['Base Color'])
    bp = _bump(n, fine.outputs['Fac'], 0.08, 0.002); n.link(bp, 0, b, 'Normal')
    return m
@cached
def m_tiles(color='#e9ece6', grout='#9c9a90', size=0.15, ratio=1.0, rough=0.12, wear=0.2, plane='wall', kind='Object'):
    """Glazed ceramic tiles (brick texture as a grid), dark grout recess, glaze roughness variation, slight per-tile tint."""
    m, n, b = _base('tiles', color, rough, spec=0.6)
    co = _coord(n, 'Object', 1.0); br = n.new('ShaderNodeTexBrick', Offset=0.0, Squash=1.0, Mortar_Size=0.004, Mortar_Smooth=0.3, Bias=0.0, Brick_Width=size, Row_Height=size * ratio)
    br.offset = 0.0; br.inputs['Scale'].default_value = 1.0
    n.link(_planar(n, plane, kind), 0, br, 'Vector')
    br.inputs['Color1'].default_value = (*hexc(color), 1); br.inputs['Color2'].default_value = (*[c * 0.93 for c in hexc(color)], 1); br.inputs['Mortar'].default_value = (*hexc(grout), 1)
    dirt = n.new('ShaderNodeTexNoise', Scale=6.0, Detail=8.0); n.link(co, 0, dirt, 'Vector')
    col = _mix(n, br.outputs['Color'], '#b8ae96', dirt.outputs['Fac'], 'MULTIPLY'); col.inputs['Factor'].default_value = wear
    n.nt.links.new(col.outputs[2], b.inputs['Base Color'])
    rr = n.new('ShaderNodeMapRange', To_Min=rough, To_Max=0.6); n.link(br, 'Fac', rr, 'Value'); n.link(rr, 0, b, 'Roughness')
    inv = n.new('ShaderNodeMath', operation='SUBTRACT'); inv.inputs[0].default_value = 1.0; n.link(br, 'Fac', inv, 1)
    bp = _bump(n, inv.outputs[0], 0.5, 0.003); n.link(bp, 0, b, 'Normal')
    return m
@cached
def m_wood(color='#5a3420', dark='#2e1a10', scale=1.0, rough=0.35, coat=0.3, axis='X'):
    """Varnished hardwood: stretched wave rings + noise distortion, darker figure, satin clear coat, grain bump."""
    m, n, b = _base('wood', color, rough)
    co = _coord(n, 'Object', scale); mp = co
    s = {'X': (0.08, 1, 1), 'Y': (1, 0.08, 1), 'Z': (1, 1, 0.08)}[axis]; mp.inputs['Scale'].default_value = tuple(v * scale for v in s)
    nz = n.new('ShaderNodeTexNoise', Scale=3.0, Detail=6.0); n.link(mp, 0, nz, 'Vector')
    wv = n.new('ShaderNodeTexWave', wave_type='RINGS', Scale=4.0, Distortion=8.0, Detail=3.0); n.link(mp, 0, wv, 'Vector')
    fine = n.new('ShaderNodeTexNoise', Scale=60.0, Detail=2.0); n.link(mp, 0, fine, 'Vector')
    col = _mix(n, color, dark, wv.outputs['Fac']); col.inputs['Factor'].default_value = 0.6
    col2 = _mix(n, col.outputs[2], dark, nz.outputs['Fac'], 'MULTIPLY'); col2.inputs['Factor'].default_value = 0.35
    n.nt.links.new(col2.outputs[2], b.inputs['Base Color'])
    b.inputs['Coat Weight'].default_value = coat; b.inputs['Coat Roughness'].default_value = 0.18
    bp = _bump(n, fine.outputs['Fac'], 0.12, 0.002); n.link(bp, 0, b, 'Normal')
    return m
@cached
def m_floor_planks(color='#6b4a2e', dark='#3a2617', plank=0.14, rough=0.4):
    """Worn oak floorboards: brick texture as staggered planks, per-plank tint, scuffed varnish."""
    m, n, b = _base('planks', color, rough)
    co = _coord(n, 'Object', 1.0)
    br = n.new('ShaderNodeTexBrick', Offset=0.5, Mortar_Size=0.003, Brick_Width=1.4, Row_Height=plank)
    n.link(_planar(n, 'floor'), 0, br, 'Vector'); br.inputs['Color1'].default_value = (*hexc(color), 1); br.inputs['Color2'].default_value = (*hexc(dark), 1); br.inputs['Mortar'].default_value = (*hexc('#1a0f08'), 1)
    br.inputs['Bias'].default_value = -0.3
    g = n.new('ShaderNodeMapping'); g.inputs['Scale'].default_value = (0.25, 8.0, 1.0); n.link(co, 0, g, 'Vector')
    wv = n.new('ShaderNodeTexWave', wave_type='BANDS', Scale=3.0, Distortion=2.5, Detail=3.0); n.link(g, 0, wv, 'Vector')
    col = _mix(n, br.outputs['Color'], dark, wv.outputs['Fac'], 'MULTIPLY'); col.inputs['Factor'].default_value = 0.18
    n.nt.links.new(col.outputs[2], b.inputs['Base Color'])
    sc_ = n.new('ShaderNodeTexNoise', Scale=25.0, Detail=10.0); n.link(co, 0, sc_, 'Vector')
    rr = n.new('ShaderNodeMapRange', To_Min=0.25, To_Max=0.7); n.link(sc_, 'Fac', rr, 'Value'); n.link(rr, 0, b, 'Roughness')
    inv = n.new('ShaderNodeMath', operation='SUBTRACT'); inv.inputs[0].default_value = 1.0; n.link(br, 'Fac', inv, 1)
    bp = _bump(n, inv.outputs[0], 0.4, 0.002); n.link(bp, 0, b, 'Normal')
    return m
@cached
def m_metal(color='#b8bcc2', rough=0.28, brushed=True, scale=1.0):
    """Brushed/satin steel: anisotropic-looking stretched noise in roughness, faint smudges."""
    m, n, b = _base('metal', color, rough, metal=1.0)
    co = _coord(n, 'Object', scale)
    if brushed: co.inputs['Scale'].default_value = (400 * scale, 4 * scale, 4 * scale)
    nz = n.new('ShaderNodeTexNoise', Scale=1.0, Detail=4.0); n.link(co, 0, nz, 'Vector')
    sm = n.new('ShaderNodeTexNoise', Scale=8.0, Detail=6.0)
    rr = n.new('ShaderNodeMapRange', To_Min=rough * 0.7, To_Max=rough * 1.5); n.link(nz, 'Fac', rr, 'Value'); n.link(rr, 0, b, 'Roughness')
    bp = _bump(n, nz.outputs['Fac'], 0.05, 0.001); n.link(bp, 0, b, 'Normal')
    return m
@cached
def m_chrome(color='#e8eaee', rough=0.08):
    if isinstance(color, (int, float)): color, rough = '#e8eaee', float(color)   # m_chrome(0.15) = roughness
    m, n, b = _base('chrome', color, rough, metal=1.0); return m
@cached
def m_brass(color='#c89a4a', rough=0.25, tarnish=0.35):
    m, n, b = _base('brass', color, rough, metal=1.0)
    co = _coord(n, 'Object', 1.0); nz = n.new('ShaderNodeTexNoise', Scale=12.0, Detail=8.0); n.link(co, 0, nz, 'Vector')
    col = _mix(n, color, '#5a4020', nz.outputs['Fac'], 'MULTIPLY'); col.inputs['Factor'].default_value = tarnish; n.nt.links.new(col.outputs[2], b.inputs['Base Color'])
    rr = n.new('ShaderNodeMapRange', To_Min=rough, To_Max=rough + 0.3); n.link(nz, 'Fac', rr, 'Value'); n.link(rr, 0, b, 'Roughness')
    return m
@cached
def m_enamel(color='#f0efe8', rough=0.12, chips=0.0, chip_color='#1b1d22'):
    """Vitreous enamel / gloss paint on metal (trays, bed frames, lamp shades), optional chipped edges."""
    m, n, b = _base('enamel', color, rough, spec=0.6)
    b.inputs['Coat Weight'].default_value = 0.4; b.inputs['Coat Roughness'].default_value = 0.05
    if chips:
        co = _coord(n, 'Object', 1.0); nz = n.new('ShaderNodeTexNoise', Scale=30.0, Detail=10.0, Roughness=0.7); n.link(co, 0, nz, 'Vector')
        th = n.new('ShaderNodeMapRange', From_Min=0.62 - chips * 0.1, From_Max=0.64 - chips * 0.1); n.link(nz, 'Fac', th, 'Value')
        col = _mix(n, color, chip_color, th.outputs[0]); n.nt.links.new(col.outputs[2], b.inputs['Base Color'])
    return m
@cached
def m_paint_metal(color='#e6e2d6', rough=0.35, wear=0.3):
    """Painted cast iron (beds, radiators): satin paint with dirt in recesses-ish noise and fine orange-peel bump."""
    m, n, b = _base('paintmetal', color, rough)
    co = _coord(n, 'Object', 1.0); nz = n.new('ShaderNodeTexNoise', Scale=5.0, Detail=8.0); n.link(co, 0, nz, 'Vector')
    col = _mix(n, color, '#6e6350', nz.outputs['Fac'], 'MULTIPLY'); col.inputs['Factor'].default_value = wear; n.nt.links.new(col.outputs[2], b.inputs['Base Color'])
    op = n.new('ShaderNodeTexNoise', Scale=300.0, Detail=2.0); n.link(co, 0, op, 'Vector'); bp = _bump(n, op.outputs['Fac'], 0.05, 0.001); n.link(bp, 0, b, 'Normal')
    return m
@cached
def m_glass(tint='#f4fbff', rough=0.0, ior=1.47):
    m, n, b = _base('glass', tint, rough); b.inputs['Transmission Weight'].default_value = 1.0; b.inputs['IOR'].default_value = ior; return m
@cached
def m_frosted(tint='#eef3f6', rough=0.35):
    m, n, b = _base('frosted', tint, rough); b.inputs['Transmission Weight'].default_value = 1.0; return m
@cached
def m_fabric(color='#f2f0ea', rough=0.85, weave=320.0, sheen=0.4, dirt=0.06):
    """Cotton/linen: crossed wave weave bump, sheen for the fuzzy rim, slight low-frequency soiling."""
    m, n, b = _base('fabric', color, rough, spec=0.3)
    try: b.inputs['Sheen Weight'].default_value = sheen; b.inputs['Sheen Roughness'].default_value = 0.5
    except Exception: pass
    co = _coord(n, 'Object', 1.0)
    w1 = n.new('ShaderNodeTexWave', wave_type='BANDS', bands_direction='X', Scale=weave, Distortion=0.5); n.link(co, 0, w1, 'Vector')
    w2 = n.new('ShaderNodeTexWave', wave_type='BANDS', bands_direction='Z', Scale=weave, Distortion=0.5); n.link(co, 0, w2, 'Vector')
    mx = n.new('ShaderNodeMath', operation='MULTIPLY'); n.link(w1, 'Fac', mx, 0); n.link(w2, 'Fac', mx, 1)
    nz = n.new('ShaderNodeTexNoise', Scale=2.5, Detail=4.0); n.link(co, 0, nz, 'Vector')
    col = _mix(n, color, '#a89c80', nz.outputs['Fac'], 'MULTIPLY'); col.inputs['Factor'].default_value = dirt; n.nt.links.new(col.outputs[2], b.inputs['Base Color'])
    bp = _bump(n, mx.outputs[0], 0.15, 0.0008); n.link(bp, 0, b, 'Normal')
    return m
@cached
def m_wool(color='#24262c', rough=0.9):
    """Suit cloth: fine twill noise, strong sheen."""
    m, n, b = _base('wool', color, rough, spec=0.25)
    try: b.inputs['Sheen Weight'].default_value = 0.7; b.inputs['Sheen Roughness'].default_value = 0.4; b.inputs['Sheen Tint'].default_value = (0.6, 0.6, 0.65, 1)
    except Exception: pass
    co = _coord(n, 'Object', 1.0); tw = n.new('ShaderNodeTexWave', wave_type='BANDS', bands_direction='DIAGONAL', Scale=500.0, Distortion=1.0); n.link(co, 0, tw, 'Vector')
    bp = _bump(n, tw.outputs['Fac'], 0.12, 0.0005); n.link(bp, 0, b, 'Normal')
    return m
@cached
def m_leather(color='#4a2a18', rough=0.45):
    m, n, b = _base('leather', color, rough)
    co = _coord(n, 'Object', 1.0); vo = n.new('ShaderNodeTexVoronoi', Scale=220.0); n.link(co, 0, vo, 'Vector')
    nz = n.new('ShaderNodeTexNoise', Scale=6.0, Detail=6.0); n.link(co, 0, nz, 'Vector')
    col = _mix(n, color, '#1a0d06', nz.outputs['Fac'], 'MULTIPLY'); col.inputs['Factor'].default_value = 0.4; n.nt.links.new(col.outputs[2], b.inputs['Base Color'])
    bp = _bump(n, vo.outputs['Distance'], 0.2, 0.001); n.link(bp, 0, b, 'Normal')
    b.inputs['Coat Weight'].default_value = 0.15
    return m
@cached
def m_rubber_catheter(color='#9a4a1c', rough=0.22):
    """1920s varnished rubber ureteral catheter: amber-brown, translucent-ish (SSS), glossy varnish coat, faint banding."""
    m, n, b = _base('catheter', color, rough)
    b.inputs['Subsurface Weight'].default_value = 0.5; b.inputs['Subsurface Radius'].default_value = (1.0, 0.45, 0.2); b.inputs['Subsurface Scale'].default_value = 0.004
    b.inputs['Coat Weight'].default_value = 0.8; b.inputs['Coat Roughness'].default_value = 0.06
    return m
@cached
def m_skin(tone='#d9a587', rough=0.42, sss=0.25, blush='#c8705a'):
    """Skin: SSS (red-weighted radius), mottled tone, blush on cheeks-ish noise, pore bump, soft specular."""
    m, n, b = _base('skin', tone, rough, spec=0.45)
    b.inputs['Subsurface Weight'].default_value = sss; b.inputs['Subsurface Radius'].default_value = (1.0, 0.35, 0.2); b.inputs['Subsurface Scale'].default_value = 0.012
    co = _coord(n, 'Object', 1.0); nz = n.new('ShaderNodeTexNoise', Scale=18.0, Detail=6.0); n.link(co, 0, nz, 'Vector')
    col = _mix(n, tone, blush, nz.outputs['Fac'], 'MIX'); col.inputs['Factor'].default_value = 0.0
    rr = n.new('ShaderNodeMapRange', From_Min=0.45, From_Max=0.75, To_Min=0.0, To_Max=0.35); n.link(nz, 'Fac', rr, 'Value'); n.nt.links.new(rr.outputs[0], col.inputs['Factor'])
    n.nt.links.new(col.outputs[2], b.inputs['Base Color'])
    pores = n.new('ShaderNodeTexVoronoi', Scale=900.0); n.link(co, 0, pores, 'Vector')
    bp = _bump(n, pores.outputs['Distance'], 0.06, 0.0003); n.link(bp, 0, b, 'Normal')
    return m
@cached
def m_hair(color='#1e140e', rough=0.5, scale=900.0):
    """Sculpted hair mass: strand stripes (stretched noise) in colour, roughness and bump, darker roots."""
    m, n, b = _base('hair', color, rough, spec=0.6)
    co = _coord(n, 'Object', 1.0); co.inputs['Scale'].default_value = (scale, scale * 0.04, scale)
    st = n.new('ShaderNodeTexNoise', Scale=1.0, Detail=3.0); n.link(co, 0, st, 'Vector')
    col = _mix(n, color, [min(1, c * 2.2 + 0.02) for c in hexc(color)], st.outputs['Fac']); col.inputs['Factor'].default_value = 0.0
    rr = n.new('ShaderNodeMapRange', From_Min=0.4, From_Max=0.7, To_Min=0.0, To_Max=0.5); n.link(st, 'Fac', rr, 'Value'); n.nt.links.new(rr.outputs[0], col.inputs['Factor'])
    n.nt.links.new(col.outputs[2], b.inputs['Base Color'])
    bp = _bump(n, st.outputs['Fac'], 0.35, 0.002); n.link(bp, 0, b, 'Normal')
    b.inputs['Coat Weight'].default_value = 0.08; b.inputs['Coat Roughness'].default_value = 0.3
    try: b.inputs['Specular IOR Level'].default_value = 0.35
    except Exception: pass
    return m
@cached
def m_paper(color='#efe6cf', rough=0.8):
    m, n, b = _base('paper', color, rough)
    co = _coord(n, 'Object', 1.0); nz = n.new('ShaderNodeTexNoise', Scale=40.0, Detail=10.0); n.link(co, 0, nz, 'Vector')
    col = _mix(n, color, '#c8b890', nz.outputs['Fac'], 'MULTIPLY'); col.inputs['Factor'].default_value = 0.25; n.nt.links.new(col.outputs[2], b.inputs['Base Color'])
    return m
@cached
def m_emit(color='#ffd39a', strength=8.0):
    m = bpy.data.materials.new('emit'); m.use_nodes = True; nt = m.node_tree; nt.nodes.remove(nt.nodes['Principled BSDF'])
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (*hexc(color), 1); e.inputs['Strength'].default_value = strength
    nt.links.new(e.outputs[0], nt.nodes['Material Output'].inputs['Surface']); return m
@cached
def m_bulb(color='#ffd8a0', strength=30.0):
    """Practical bulb: emissive core + glass-ish falloff."""
    return m_emit(color, strength)
def m_image(path, rough=0.6, emit=0.0, name='img', alpha=False, extend='CLIP', mapping_scale=None):
    m, n, b = _base(name, '#ffffff', rough); t = n.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(path, check_existing=True); t.extension = extend
    n.link(t, 'Color', b, 'Base Color')
    if emit: n.link(t, 'Color', b, 'Emission Color'); b.inputs['Emission Strength'].default_value = emit
    if alpha: n.link(t, 'Alpha', b, 'Alpha')
    return m
def m_backlit_film(path, strength=3.0, tint='#dfe9f2'):
    """Radiograph on a light box: the film image is emission (light passes through), modulated by a tint; glossy film surface on top."""
    m = bpy.data.materials.new('film'); m.use_nodes = True; nt = m.node_tree; n = N(m); b = n.bsdf()
    t = n.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(path, check_existing=True); t.extension = 'CLIP'
    mx = _mix(n, t.outputs['Color'], tint, 1.0, 'MULTIPLY')
    b.inputs['Base Color'].default_value = (0.02, 0.02, 0.025, 1); b.inputs['Roughness'].default_value = 0.12
    n.nt.links.new(mx.outputs[2], b.inputs['Emission Color']); b.inputs['Emission Strength'].default_value = strength
    return m

# ================================================================ geometry helpers
def _link(o, coll):
    for c in list(o.users_collection): c.objects.unlink(o)
    coll.objects.link(o); return o
def smooth(o, auto=True):
    for p in o.data.polygons: p.use_smooth = True
    return o
def bevel(o, w=0.01, seg=3, angle=35):
    md = o.modifiers.new('bevel', 'BEVEL'); md.width = w; md.segments = seg; md.limit_method = 'ANGLE'; md.angle_limit = math.radians(angle)
    md.harden_normals = False; return o
def wnormal(o):
    try: o.modifiers.new('wn', 'WEIGHTED_NORMAL').keep_sharp = True
    except Exception: pass
    return o
def subsurf(o, lv=2, render=None):
    md = o.modifiers.new('sub', 'SUBSURF'); md.levels = lv; md.render_levels = render if render is not None else lv; return o
def solidify(o, t=0.01, off=-1):
    md = o.modifiers.new('solid', 'SOLIDIFY'); md.thickness = t; md.offset = off; return o
def mesh_obj(coll, name, verts, faces, m=None, smooth_=False):
    me = bpy.data.meshes.new(name); me.from_pydata([tuple(v) for v in verts], [], faces); me.update()
    o = bpy.data.objects.new(name, me); coll.objects.link(o)
    if m: o.data.materials.append(m)
    if smooth_: smooth(o)
    return o
def box(coll, loc, size, m, bev=0.006, rot=(0, 0, 0), name='box', seg=3):
    """Bevelled box (never a raw cube): real edge highlights."""
    sx, sy, sz = size[0] / 2, size[1] / 2, size[2] / 2
    vs = [(-sx, -sy, -sz), (sx, -sy, -sz), (sx, sy, -sz), (-sx, sy, -sz), (-sx, -sy, sz), (sx, -sy, sz), (sx, sy, sz), (-sx, sy, sz)]
    fs = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    o = mesh_obj(coll, name, vs, fs, m); o.location = loc; o.rotation_euler = rot
    if bev: bevel(o, min(bev, min(size) * 0.45), seg); smooth(o); wnormal(o)
    return o
def lathe(coll, profile, m, loc=(0, 0, 0), rot=(0, 0, 0), steps=48, name='lathe', smooth_=True, cap=True):
    """Surface of revolution around local Z from a profile [(r, z), ...] (bottles, lamps, columns, knobs, heart vessels)."""
    verts, faces = [], []; n = len(profile)
    for i in range(steps):
        a = 2 * math.pi * i / steps; ca, sa = math.cos(a), math.sin(a)
        for r, z in profile: verts.append((r * ca, r * sa, z))
    for i in range(steps):
        j = (i + 1) % steps
        for k in range(n - 1): faces.append((i * n + k, j * n + k, j * n + k + 1, i * n + k + 1))
    if cap:
        if profile[0][0] > 1e-4: verts.append((0, 0, profile[0][1])); c0 = len(verts) - 1; faces += [(j * n, i * n, c0) for i, j in ((i, (i + 1) % steps) for i in range(steps))]
        if profile[-1][0] > 1e-4: verts.append((0, 0, profile[-1][1])); c1 = len(verts) - 1; faces += [(i * n + n - 1, ((i + 1) % steps) * n + n - 1, c1) for i in range(steps)]
    o = mesh_obj(coll, name, verts, faces, m, smooth_); o.location = loc; o.rotation_euler = rot
    me = o.data; bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    return o
def cyl(coll, loc, r, h, m, rot=(0, 0, 0), name='cyl', bev=0.003, steps=40):
    """Cylinder with rounded rims (lathe), base at loc z - h/2."""
    b = min(bev, r * 0.3, h * 0.3)
    prof = [(0.0, -h / 2), (r - b, -h / 2), (r, -h / 2 + b), (r, h / 2 - b), (r - b, h / 2), (0.0, h / 2)]
    return lathe(coll, prof, m, loc, rot, steps, name)
def sphere(coll, loc, r, m, scale=(1, 1, 1), name='sph', seg=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=max(8, seg // 2), radius=r, location=loc)
    o = bpy.context.object; o.name = name; o.scale = scale; o.data.materials.append(m); smooth(o); return _link(o, coll)
def torus(coll, loc, R, r, m, rot=(0, 0, 0), name='tor', maj=48, mn=12):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, location=loc, rotation=rot, major_segments=maj, minor_segments=mn)
    o = bpy.context.object; o.name = name; o.data.materials.append(m); smooth(o); return _link(o, coll)
def tube(coll, pts, r, m, name='tube', res=6, bev_res=4, taper=None, closed=False, uv=True):
    """Sweep a round profile along a smooth path (pipes, rails, cables, veins, the catheter).
    Returns the curve object; animate data.bevel_factor_end for growth along the path."""
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.resolution_u = res; cu.bevel_depth = r; cu.bevel_resolution = bev_res
    cu.use_fill_caps = True
    sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(pts) - 1)
    for bp, p in zip(sp.bezier_points, pts):
        bp.co = Vector(p[:3]); bp.handle_left_type = bp.handle_right_type = 'AUTO'
        if len(p) > 3: bp.radius = p[3]
    sp.use_cyclic_u = closed
    o = bpy.data.objects.new(name, cu); coll.objects.link(o); o.data.materials.append(m); return o
def text(coll, s, loc, size, m, rot=(math.pi / 2, 0, 0), extrude=0.0, align='CENTER', name='txt', font=None, bevel_depth=0.0):
    cu = bpy.data.curves.new(name, 'FONT'); cu.body = s; cu.size = size; cu.extrude = extrude; cu.align_x = align; cu.align_y = 'CENTER'; cu.bevel_depth = bevel_depth
    if font: cu.font = bpy.data.fonts.load(font, check_existing=True)
    o = bpy.data.objects.new(name, cu); o.location = loc; o.rotation_euler = rot; o.data.materials.append(m); coll.objects.link(o); return o
def plane(coll, loc, size, m, rot=(0, 0, 0), name='plane'):
    sx, sy = size[0] / 2, size[1] / 2
    o = mesh_obj(coll, name, [(-sx, -sy, 0), (sx, -sy, 0), (sx, sy, 0), (-sx, sy, 0)], [(0, 1, 2, 3)], m); o.location = loc; o.rotation_euler = rot
    o.data.uv_layers.new(); uv = o.data.uv_layers[0].data
    for i, c in enumerate([(0, 0), (1, 0), (1, 1), (0, 1)]): uv[i].uv = c
    return o
def group(coll, name, objs, loc=(0, 0, 0), rot=(0, 0, 0), scale=1.0):
    """Parent objects to an empty so a prop can be placed/animated as one."""
    e = bpy.data.objects.new(name, None); coll.objects.link(e)
    for o in objs: o.parent = e
    e.location = loc; e.rotation_euler = rot; e.scale = (scale,) * 3; return e

# ================================================================ keys
def key(o, path, frame, value=None, index=-1):
    if value is not None:
        if index >= 0: getattr(o, path)[index] = value
        else: setattr(o, path, value)
    o.keyframe_insert(path, frame=frame, index=index)
def key_vis(o, frame, visible):
    o.hide_render = not visible; o.keyframe_insert('hide_render', frame=frame)
def ease_all(o, interp='BEZIER', easing='AUTO'):
    ad = o.animation_data
    if not ad or not ad.action: return
    for fc in _fcurves(ad.action):
        for kp in fc.keyframe_points: kp.interpolation = interp; kp.easing = easing; kp.handle_left_type = kp.handle_right_type = 'AUTO_CLAMPED'
def _fcurves(action):
    try: return list(action.fcurves)
    except Exception: pass
    out = []
    for layer in getattr(action, 'layers', []):
        for strip in layer.strips:
            for cb in strip.channelbags: out += list(cb.fcurves)
    return out

# ================================================================ lighting
def area(coll, loc, aim, size, color, power, name='area', shadow=True, shape='RECTANGLE', size_y=None, spread=180, visible=False):
    d = bpy.data.lights.new(name, 'AREA'); d.shape = shape; d.size = size; d.size_y = size_y or size; d.color = hexc(color); d.energy = power
    d.use_shadow = shadow
    try: d.spread = math.radians(spread)
    except Exception: pass
    o = bpy.data.objects.new(name, d); o.location = loc; coll.objects.link(o)
    o.rotation_euler = (Vector(aim) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    o.visible_camera = visible; return o
def point(coll, loc, color, power, radius=0.03, name='pt', shadow=True):
    d = bpy.data.lights.new(name, 'POINT'); d.energy = power; d.color = hexc(color); d.shadow_soft_size = radius; d.use_shadow = shadow
    o = bpy.data.objects.new(name, d); o.location = loc; coll.objects.link(o); return o
def spot(coll, loc, aim, color, power, angle=40, blend=0.3, radius=0.05, name='spot', shadow=True):
    d = bpy.data.lights.new(name, 'SPOT'); d.energy = power; d.color = hexc(color); d.spot_size = math.radians(angle); d.spot_blend = blend; d.shadow_soft_size = radius; d.use_shadow = shadow
    o = bpy.data.objects.new(name, d); o.location = loc; coll.objects.link(o); o.rotation_euler = (Vector(aim) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); return o
def sun(coll, direction, color, energy, angle=1.5, name='sun'):
    d = bpy.data.lights.new(name, 'SUN'); d.energy = energy; d.color = hexc(color); d.angle = math.radians(angle)
    o = bpy.data.objects.new(name, d); coll.objects.link(o); o.rotation_euler = Vector(direction).to_track_quat('-Z', 'Y').to_euler(); return o
def three_point(coll, subject, cam_dir, key_color='#ffd9b0', key=150, fill_ratio=0.18, rim_color='#9fc0ff', rim=220, key_side=1, key_size=1.2, height=0.6, dist=2.2, tag='tp'):
    """Classic rig placed relative to the subject and the camera direction (cam_dir = vector from subject to camera).
    Key 35-45 deg off-axis and above (large, soft), fill on the camera side opposite the key (ratio 1:4 - 1:8, no shadow),
    rim behind/above opposite the key for separation."""
    S = Vector(subject); c = Vector(cam_dir).normalized(); up = Vector((0, 0, 1)); side = c.cross(up).normalized() * key_side
    kp = S + (c * 0.75 + side * 0.85).normalized() * dist + up * height * dist
    fp = S + (c * 0.9 - side * 0.5).normalized() * dist + up * 0.15 * dist
    rp = S + (-c * 0.9 - side * 0.6).normalized() * dist + up * 0.7 * dist
    k = area(coll, tuple(kp), tuple(S), key_size, key_color, key, tag + '_key')
    f = area(coll, tuple(fp), tuple(S), key_size * 1.5, '#e8eef8', key * fill_ratio, tag + '_fill', shadow=False)
    r = area(coll, tuple(rp), tuple(S + up * 0.1), 0.5, rim_color, rim, tag + '_rim', spread=60)
    return k, f, r
def practical_bulb(coll, loc, color='#ffc27a', power=25, r=0.025, glow=40.0, name='bulb'):
    """A visible bulb (emissive mesh) + the point light it motivates."""
    b = sphere(coll, loc, r, m_bulb(color, glow), name=name + '_glass', seg=16); b.visible_shadow = False
    p = point(coll, loc, color, power, r * 1.2, name + '_light'); return b, p
def window_light(coll, center, normal, w, h, color='#cfe0ff', power=600, name='win', sun_dir=None, sun_energy=0.0, sun_color='#ffe2b8'):
    """Daylight through a window: a large area light just outside the opening (soft sky) + an optional sun for hard shafts."""
    nrm = Vector(normal).normalized(); C = Vector(center) + nrm * 0.25
    a = area(coll, tuple(C), tuple(Vector(center) - nrm), w, color, power, name + '_sky', shape='RECTANGLE', size_y=h, shadow=True)
    a.visible_camera = False; a.visible_transmission = False   # the sky panel lights the room; the view through the glass shows the backdrop, not a white slab (L063)
    s = sun(coll, sun_dir, sun_color, sun_energy, 0.8, name + '_sun') if sun_dir and sun_energy else None
    return a, s
def haze(coll, loc, size, density=0.02, color='#ffffff', anisotropy=0.5, name='haze'):
    """Bounded volumetric haze (a box with Principled Volume, no surface): light shafts, beams, atmospheric depth.
    Keep density 0.005-0.05; it costs render time, so only where it tells the story."""
    o = box(coll, loc, size, None, bev=0, name=name); o.display_type = 'WIRE'
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.remove(nt.nodes['Principled BSDF'])
    v = nt.nodes.new('ShaderNodeVolumePrincipled'); v.inputs['Density'].default_value = density; v.inputs['Anisotropy'].default_value = anisotropy; v.inputs['Color'].default_value = (*hexc(color), 1)
    nt.links.new(v.outputs[0], nt.nodes['Material Output'].inputs['Volume']); o.data.materials.append(m)
    o.visible_shadow = False; return o

# ================================================================ camera (operated, eased, bound to markers)
MOVES = {}   # shot id -> camera object (for storyboard stills)
class Shot:
    """A camera operated like a real one.  keys: [(t, pos, aim[, lens][, focus_dist])].  ease: 'smooth' (bezier ease in/out),
    'linear' (constant speed for tracking shots), 'out' (decelerate into the final position), 'in' (accelerate).
    focus: object to track OR None to use keyed focus distances (rack focus).  shake: micro hand-held amplitude in metres (0 = locked)."""
    def __init__(s, sc, coll, sid, t0, keys, lens=50, fstop=2.8, focus=None, ease='smooth', shake=0.0, sensor=36, clip=(0.01, 200), roll=0.0):
        s.sid = sid; cd = bpy.data.cameras.new('cam_' + sid); cd.lens = lens; cd.sensor_width = sensor; cd.sensor_fit = 'HORIZONTAL'
        cd.clip_start, cd.clip_end = clip; cd.dof.use_dof = fstop is not None
        if fstop: cd.dof.aperture_fstop = fstop; cd.dof.aperture_blades = 7; cd.dof.aperture_rotation = 0.3
        cam = bpy.data.objects.new('cam_' + sid, cd); coll.objects.link(cam); s.cam = cam
        tgt = bpy.data.objects.new('aim_' + sid, None); coll.objects.link(tgt); s.tgt = tgt
        con = cam.constraints.new('TRACK_TO'); con.target = tgt; con.track_axis = 'TRACK_NEGATIVE_Z'; con.up_axis = 'UP_Y'
        for k in keys:
            t, p, a = k[0], k[1], k[2]
            key(cam, 'location', F(t), Vector(p)); key(tgt, 'location', F(t), Vector(a))
            if len(k) > 3 and k[3]: cd.lens = k[3]; cd.keyframe_insert('lens', frame=F(t))
            if len(k) > 4 and k[4] is not None: cd.dof.focus_distance = k[4]; cd.dof.keyframe_insert('focus_distance', frame=F(t))
        if roll: cam.rotation_mode = 'XYZ'
        if fstop and focus is not None: cd.dof.focus_object = focus
        elif fstop and not any(len(k) > 4 and k[4] is not None for k in keys): cd.dof.focus_object = tgt
        for o in (cam, tgt, cd): s._ease(o, ease)
        if shake: s._shake(cam, shake)
        m = sc.timeline_markers.new('shot_' + sid, frame=F(t0)); m.camera = cam
        if sc.camera is None: sc.camera = cam
        MOVES[sid] = cam
    @staticmethod
    def _ease(o, ease):
        ad = o.animation_data
        if not ad or not ad.action: return
        for fc in _fcurves(ad.action):
            for kp in fc.keyframe_points:
                if ease == 'linear': kp.interpolation = 'LINEAR'
                else:
                    kp.interpolation = 'BEZIER'; kp.handle_left_type = kp.handle_right_type = 'AUTO_CLAMPED'
            if ease in ('out', 'in') and len(fc.keyframe_points) >= 2:
                for kp in fc.keyframe_points:
                    kp.interpolation = 'SINE'; kp.easing = 'EASE_OUT' if ease == 'out' else 'EASE_IN'
    @staticmethod
    def _shake(cam, amp):
        ad = cam.animation_data
        for fc in _fcurves(ad.action):
            if fc.data_path == 'location':
                md = fc.modifiers.new('NOISE'); md.scale = 40; md.strength = amp; md.phase = random.random() * 100; md.depth = 1

def shot_at(sc, frame):
    mk = [m for m in sc.timeline_markers if m.frame <= frame and m.camera]
    return max(mk, key=lambda m: m.frame).camera if mk else sc.camera
