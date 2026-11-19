# Director's decisions for the e2e demo, written as data (layout + shot plan).
import json, sys
P = sys.argv[1]
PI = 3.14159265
layout = {
 "version": 1, "units": "meters",
 "anchors": {
  "atriumDoorBefore": [0, 2.3, -9.5], "atriumDoor": [0, 2.3, -15], "corridorMid": [0, 2.1, -31],
  "labEntry": [0, 1.9, -45.5], "labInside": [-1.8, 1.8, -48.6],
  "lensEntry": [0.4, -0.9, -52.6], "lensMid": [0.4, -8.36, -55.5], "lensExit": [0.4, -15.6, -58.3], "underScope": [0.4, 0.35, -52.35],
  "microApproach": [1.6, -19.2, -60.8],
  "veilIn": [0, -22.8, -73.5], "confDoorS": [0, -23.4, -80.6], "overAudience": [0.2, -22.3, -87.5], "stageFront": [0.6, -22.9, -93.5],
  "throughA": [0.95, -24.15, -100.6], "confDoorN": [0.7, -24.1, -104.7], "awardEntry": [0.4, -24.0, -108.8],
  "pillarPass": [-1.7, -24.1, -128.6], "voidApproach": [0.4, -23.2, -136.2]
 },
 "zones": [
  {"id": "atrium", "component": "MonumentalRoom", "position": [0, 0, 0], "cullRadius": 70,
   "props": {"size": [30, 30], "height": 14, "doorways": [{"wall": "n", "width": 3.5, "height": 5}]}},
  {"id": "corridor", "component": "BrutalistCorridor", "position": [0, 0, -15], "cullRadius": 60, "props": {"length": 30, "width": 7, "height": 7}},
  {"id": "lab", "component": "Laboratory", "position": [0, 0, -52], "cullRadius": 50, "props": {"microscopeGlow": 0.9}},
  {"id": "lens", "component": "LensTunnel", "position": [0.4, -0.9, -52.6], "rotation": [-1.2, 0, 0], "cullRadius": 30, "props": {"length": 16, "radius": 1.8}},
  {"id": "micro", "component": "MicroscopicWorld", "position": [0, -26, -60], "cullRadius": 45, "props": {"swarm": 220}},
  {"id": "conference", "component": "ConferenceHall", "position": [0, -26, -92], "cullRadius": 40,
   "props": {"attention": 0.15, "screenContent": "bars", "doorways": [{"wall": "s", "width": 3.5, "height": 4.5}, {"wall": "n", "width": 3.5, "height": 5}]}},
  {"id": "award", "component": "AwardHall", "position": [0, -26, -118], "cullRadius": 45},
  {"id": "void", "component": "StomachLining", "position": [0, -26, -142], "cullRadius": 35, "props": {"size": [18, 18], "foldHeight": 0.7, "segments": 60}}
 ],
 "objects": [
  {"id": "dais", "component": "Platform", "position": [0, 0, 0], "props": {"size": [6, 0.8, 6], "steps": 3}},
  {"id": "pages", "component": "FloatingPages", "position": [0, 0.8, 0], "props": {"radius": 3.8, "height": 5, "appearAt": 150, "count": 46, "speed": 0.22}},
  {"id": "acid", "component": "FluidSurface", "position": [0, 0.06, 7.5], "props": {"size": [10, 5], "color": "#6a0810", "waveHeight": 0.05}},
  {"id": "hero_bact", "component": "SpiralBacterium", "position": [0.5, -22.4, -62], "rotation": [0.4, 0, 1.1], "scale": 2.6, "cullRadius": 40},
  {"id": "veil", "component": "ParticleVeil", "position": [0, -23.5, -76.5], "props": {"width": 16, "height": 8, "depth": 3, "count": 1500}},
  {"id": "plinth", "component": "AwardPlinth", "position": [0, -25.6, -118], "props": {"revealStart": 1500, "revealEnd": 1745},
   "children": [{"id": "medal", "component": "AwardMedal", "position": [0, 0.14, 0], "scale": 2.5}]},
  {"id": "lone_bact", "component": "SpiralBacterium", "position": [0, -23.8, -142], "rotation": [0.3, 0, 0.9], "scale": 1.6, "cullRadius": 40},
  {"id": "void_shaft", "component": "LightShaft", "position": [0, -17, -142], "props": {"length": 14, "radius": 3, "color": "#ff1a2a", "intensity": 0.12}},
  {"id": "void_spot", "component": "SpotPool", "position": [0, -26, -142], "props": {"position": [0, 8, 2], "target": [0, 2.2, 0], "color": "#ff2a2a", "intensity": 140}}
 ],
 "actors": [
  {"id": "doctor", "component": "Figure", "position": [0, 0.8, 0], "rotation": [0, 0, 0], "props": {"character": "older-male"},
   "actions": [{"type": "pose", "pose": "cross", "start": 10, "end": 200}, {"type": "pose", "pose": "gesture", "start": 200, "end": 380}]},
  {"id": "warren", "component": "Figure", "position": [1.3, 0, -51.7], "rotation": [0, -1.5708, 0], "props": {"character": "scientist"},
   "actions": [{"type": "pose", "pose": "inspect", "start": 480, "end": 820}]},
  {"id": "marshall", "component": "Figure", "position": [1.2, -25, -98.2], "rotation": [0, 0, 0],
   "props": {"character": "doctor", "item": "culture", "itemFrames": [1150, 1335]},
   "actions": [{"type": "pose", "pose": "gesture", "start": 1030, "end": 1150}, {"type": "pose", "pose": "hold", "start": 1150, "end": 1240},
               {"type": "pose", "pose": "drink", "start": 1240, "end": 1335}, {"type": "pose", "pose": "slump", "start": 1385, "end": 1520, "fade": 18}]},
  {"id": "warren_old", "component": "Figure", "position": [-1.7, -25.6, -117.3], "rotation": [0, 0.35, 0], "props": {"character": "scientist@older"},
   "actions": [{"type": "look", "start": 1500, "end": 1760, "yaw": 0.3, "pitch": -0.1}]},
  {"id": "marshall_old", "component": "Figure", "position": [1.7, -25.6, -117.3], "rotation": [0, -0.35, 0], "props": {"character": "doctor@older"},
   "actions": [{"type": "pose", "pose": "raise", "start": 1580, "end": 1720}]}
 ],
 "occluders": [
  {"id": "scope-barrel", "shape": "box", "center": [0.4, 0.42, -52.2], "halfSize": [0.22, 1.12, 0.32], "color": "#030703", "feather": 0.25, "frames": [760, 830]},
  {"id": "marshall-shoulder", "shape": "sphere", "center": [0.98, -23.62, -98.0], "radius": 0.2, "color": "#120305", "feather": 0.25, "frames": [1420, 1475]}
 ]
}
def shot(i, sf, ef, lighting, camera, purpose, env, chars=(), objs=(), tin="none", tout="none", sound=(), anim="", emotion=""):
  return {"id": f"S{i:03d}", "startFrame": sf, "endFrame": ef, "audioStart": round(sf/30, 3), "audioEnd": round(ef/30, 3),
          "narration": "", "visualPurpose": purpose, "emotion": emotion, "environment": env, "characters": list(chars), "objects": list(objs),
          "lighting": lighting, "camera": camera, "cameraTarget": camera.get("target", "path"), "animation": anim,
          "transitionIn": tin, "transitionOut": tout, "sound": list(sound), "subtitle": "auto"}
S = [
 shot(1, 0, 80, "mystery", {"move": "crane", "distance": -5.2, "forward": 7, "target": "doctor.head", "fov": 38, "lead": 0.4},
      "Descend into a monumental hall of medical orthodoxy; a lone doctor stands on a dais.", "atrium", ["doctor"], ["dais"], sound=["amb:hall", "boom"], emotion="certainty, weight", anim="doctor arms crossed"),
 shot(2, 80, 159, "mystery", {"preset": "hero-orbit", "target": "doctor.head", "radius": 5.5, "sweepDeg": 50, "height": 0.2},
      "Hero orbit: the establishment's certainty embodied.", "atrium", ["doctor"], ["dais"], emotion="authority"),
 shot(3, 159, 354, "industrial-red", {"preset": "rising-spiral", "target": "doctor.chest", "radius": 6, "radiusEnd": 8, "sweepDeg": 140, "height": 0.8, "heightEnd": 3.8},
      "Beliefs as a vortex of prescriptions orbiting the doctor; an acid pool glows — stress, spice, acid as dogma.", "atrium", ["doctor"], ["pages", "acid"], sound=["shimmer"], emotion="received wisdom", anim="pages vortex appears; doctor gestures"),
 shot(4, 354, 475, "volumetric-corridor", {"move": "travel", "via": ["atriumDoorBefore", "atriumDoor"], "to": "corridorMid", "lookAlongPath": True, "fov": 44, "lead": 0.3},
      "Leave the hall through the doorway into an empty corridor: a stomach where 'nothing could live'.", "corridor", tin="doorway", sound=["amb:corridor"], emotion="emptiness"),
 shot(5, 475, 615, "low-key-lab", {"move": "travel", "via": ["labEntry"], "to": "labInside", "target": "warren.head", "fov": 38, "lead": 0.5},
      "Corridor opens into a low-key lab; a pathologist bends over a microscope.", "lab", ["warren"], ["microscope"], tin="room-to-room", sound=["amb:lab"], emotion="quiet persistence", anim="warren inspects"),
 shot(6, 615, 745, "low-key-lab", {"preset": "hero-orbit", "target": "warren.head", "radius": 2.4, "sweepDeg": -95, "height": 0.25, "fov": 34},
      "Orbit the scientist at work; reveal the glowing eyepiece.", "lab", ["warren"], ["microscope"], emotion="curiosity"),
 shot(7, 745, 790, "discovery", {"move": "travel", "via": [{"anchor": "lab.microscopeEyepiece", "offset": [0, 0.22, 0.75]}], "to": {"anchor": "lab.microscopeEyepiece", "offset": [0, 0.04, 0.1]}, "target": "lab.microscopeObjective", "fov": 30, "lead": 0.6},
      "Push into the eyepiece.", "lab", [], ["microscope"], tout="microscope-lens", sound=["riser"], emotion="anticipation"),
 shot(8, 790, 870, "microscopic-green", {"move": "travel", "via": ["underScope", "lensEntry", "lensMid"], "to": "lensExit", "lookAlongPath": True, "lookAhead": 3, "fov": 55, "lead": 0.15},
      "Through the lens: optical rings rush past (scale transformation into the microscopic).", "lens", [], ["lens"], tin="microscope-lens", sound=["amb:micro"], emotion="wonder"),
 shot(9, 870, 1050, "explanation", {"move": "spiral", "target": "hero_bact", "radius": 6.5, "radiusEnd": 4.5, "sweepDeg": 130, "height": 1.8, "heightEnd": 0.6, "fov": 40, "lead": 0.35},
      "Spiral bacteria living in the mucus layer above the stomach lining — the claim made visible.", "micro", [], ["hero_bact"], sound=["amb:micro"], emotion="revelation", anim="swarm drifts, hero bacterium corkscrews"),
 shot(10, 1050, 1160, "rejection", {"move": "travel", "via": ["veilIn", "confDoorS", "overAudience"], "to": "stageFront", "target": "marshall.head", "fov": 38, "lead": 0.55},
      "Push through a crimson particle veil into a conference hall whose audience looks away.", "conference", ["marshall"], ["veil"], tin="particle", sound=["amb:hall", "impact"], emotion="rejection, coldness"),
 shot(11, 1160, 1385, "experiment", {"preset": "portrait-revolve", "target": "marshall.head", "radius": 2.3, "sweepDeg": 300, "height": 0.05, "heightEnd": -0.1, "fov": 30},
      "Revolve around Marshall as he raises and drinks the culture.", "conference", ["marshall"], [], sound=["glass"], emotion="defiance", anim="hold → drink"),
 shot(12, 1385, 1440, "crimson-rim", {"move": "dolly", "to": {"anchor": "marshall.shoulderR", "offset": [0.05, -0.05, 0.75]}, "target": {"anchor": "marshall.shoulderR", "offset": [0, -0.05, 0.2]}, "fov": 34, "lead": 0.5},
      "He falls ill: push in on the slumping shoulder.", "conference", ["marshall"], [], sound=["heartbeat"], emotion="sickness, proof", anim="slump"),
 shot(13, 1440, 1500, "golden-award", {"move": "through", "via": [{"anchor": "marshall.shoulderR", "offset": [0, -0.07, 0.15]}, "throughA", "confDoorN"], "to": "awardEntry", "lookAhead": 3, "fov": 40, "lead": 0.3},
      "Through his shoulder and the doorway behind him into the award hall.", "award", ["marshall"], [], tin="camera-through-object", sound=["whoosh"], emotion="release"),
 shot(14, 1500, 1620, "golden-award", {"move": "orbit", "target": "plinth.top", "radius": 5.2, "sweepDeg": 70, "height": 1.1, "fov": 36, "lead": 0.4},
      "Golden reveal: the medal on its plinth between the two aged researchers.", "award", ["warren_old", "marshall_old"], ["plinth", "medal"], sound=["shimmer"], emotion="vindication"),
 shot(15, 1620, 1740, "triumph", {"move": "orbit", "target": "plinth.top", "sweepDeg": 70, "height": 1.8, "fov": 36},
      "Continue the revolve as Marshall raises his arm.", "award", ["warren_old", "marshall_old"], ["plinth"], emotion="triumph", anim="marshall_old raises arm"),
 shot(16, 1740, 1815, "punchline", {"move": "travel", "via": ["pillarPass"], "to": "voidApproach", "target": "lone_bact", "fov": 36, "lead": 0.5},
      "Slide past a pillar out of the light into crimson darkness.", "void", [], ["lone_bact"], tin="pillar-occlusion", emotion="sober return"),
 shot(17, 1815, 1979, "punchline", {"move": "orbit", "target": "lone_bact", "radius": 3.4, "radiusEnd": 4.8, "sweepDeg": 100, "height": 0.6, "heightEnd": 1.6, "fov": 34},
      "A single bacterium alive on the stomach lining — the place nobody believed anything could live.", "void", [], ["lone_bact"], sound=["boom"], emotion="irony, awe"),
]
tl = json.load(open(f"{P}/analysis/timeline.json"))
for s in S:
  ws = [w for w in tl["words"] if s["startFrame"] <= w["startFrame"] < s["endFrame"]]
  s["narration"] = " ".join(w["text"] + w.get("punct", "") for w in ws)
plan = {"version": 1, "fps": 30, "durationFrames": 1979, "director": "brutalist-3d-documentary-director", "shots": S}
def shift(v, dz):
  return [v[0], v[1], v[2] + dz] if isinstance(v, list) and len(v) == 3 and isinstance(v[2], (int, float)) else v
def dz_for(z):
  return 0 if z > -70 else (-14 if z < -135 else -8)
for k, v in list(layout["anchors"].items()):
  layout["anchors"][k] = shift(v, dz_for(v[2]))
for kind in ("zones", "objects", "actors"):
  for e in layout[kind]:
    z = e["position"][2]
    d = dz_for(z)
    e["position"] = shift(e["position"], d)
    for a in e.get("actions", []):
      if "path" in a: a["path"] = [shift(x, d) for x in a["path"]]
for o in layout["occluders"]:
  o["center"] = shift(o["center"], dz_for(o["center"][2]))
layout["objects"].append({"id": "dais_spot", "component": "SpotPool", "position": [0, 0, 0], "props": {"position": [0, 12, 5], "target": [0, 1.6, 0], "color": "#ff5040", "intensity": 900, "angle": 0.32, "distance": 30}})
layout["objects"].append({"id": "door_spot", "component": "SpotPool", "position": [0, 0, -15], "props": {"position": [0, 6.5, 3], "target": [0, 0.5, -2], "color": "#ff4a3a", "intensity": 500, "angle": 0.5, "distance": 22, "castShadow": False}})
layout["objects"].append({"id": "corridor_end_lamp", "component": "HangingLamp", "position": [0, 6.2, -41], "props": {"cable": 0.8, "intensity": 60, "distance": 16}})
layout["objects"].append({"id": "lab_entry_lamp", "component": "HangingLamp", "position": [-1.5, 4.3, -47.5], "props": {"cable": 0.6, "intensity": 45, "distance": 12}})
layout["occluders"].append({"id": "pillar-wipe", "shape": "box", "center": [-3.4, -19, -136.5], "halfSize": [0.6, 7, 0.6], "color": "#000000", "feather": 0.1, "frames": [1745, 1795], "intent": "declared intentional dark window: foreground pillar wipe"})
layout["objects"].append({"id": "hall_shaft", "component": "LightShaft", "position": [0, 12.5, 0], "props": {"length": 12, "radius": 3.2, "color": "#ff3a2a", "intensity": 0.1}})
json.dump(layout, open(f"{P}/data/world-layout.json", "w"), indent=1)
json.dump(plan, open(f"{P}/data/shot-plan.json", "w"), indent=1)
cfg = json.load(open(f"{P}/data/production-config.json"))
cfg["camera"]["initial"] = {"position": [0, 9.6, 13.5], "target": [0, 2.6, 0], "fov": 40, "rollDeg": 0}
cfg["style"]["letterbox"] = 0
json.dump(cfg, open(f"{P}/data/production-config.json", "w"), indent=1)
print("directed", len(S), "moves")
