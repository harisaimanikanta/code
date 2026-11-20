# Director's decisions for "The Patient Was Him" (9:16), expressed as data.
import json, sys, math
P = sys.argv[1]
PI = math.pi
LAB = [0, 0, -24.45]
LEC = [0, -26, -65.2]
ANI = [8.0, -26, -79.15]
HOS = [17.1, -26, -79.15]
STO = [17.5, -24.5, -95]
PRE = [17.5, -26, -107]
CER = [17.5, -26, -140]
HOR = [17.5, -26, -166]
def add(a, b): return [round(a[0] + b[0], 3), round(a[1] + b[1], 3), round(a[2] + b[2], 3)]

layout = {
 "version": 1, "units": "meters",
 "anchors": {
  "extHigh": [-3, 7.5, 2], "signFront": [-6.2, 1.9, -6.6], "doorApproach": [0, 1.75, -14.5], "doorway": [0, 1.7, -19.0],
  "labInside": [1.6, 1.75, -21.3], "eyeFront": add(LAB, [0.4, 1.7, 1.0]), "eyePiece": add(LAB, [0.4, 1.48, 0.16]),
  "underScope": add(LAB, [0.4, 0.35, -0.35]), "lensEntry": add(LAB, [0.4, -0.9, -0.45]), "lensMid": add(LAB, [0.4, -8.36, -3.35]), "lensExit": add(LAB, [0.4, -15.6, -6.2]),
  "veilIn": [0, -23.9, -51.5], "lecBackDoor": [0, -24.4, -55.9], "overSeats": [0.6, -22.4, -60.5], "stageFront": [1.4, -23.3, -66.4],
  "stampDesk": add(LEC, [-3.5, 1.75, -6.5]), "stageDoor": [5.5, -24.4, -74.55], "aniInside": [6.6, -24.3, -77.0],
  "aniEastDoor": [13.3, -24.4, -79.15], "hosInside": [15.2, -24.4, -78.6], "monitorFront": add(HOS, [0.45, 1.25, -1.0]), "patientChest": add(HOS, [0.0, 0.85, -0.5]), "bedside": add(HOS, [1.7, 1.6, 0.9]),
  "monitorIn": add(HOS, [0.42, 1.25, -1.9]), "wallBehind": add(HOS, [0.4, 1.4, -3.7]), "stomachApproach": add(STO, [0.6, 1.0, 9.0]),
  "stomachCore": add(STO, [0.3, 1.2, -0.6]), "stomachBack": add(STO, [0.3, 0.9, -5.5]), "pressFront": add(PRE, [0.3, 1.7, 3.9]), "pressExit": add(PRE, [3.6, 2.2, -0.5]),
  "cerAudience": add(CER, [0.6, 2.4, 6.0]), "curtainGap": add(CER, [0, 2.2, -8.8]), "horizonIn": add(HOR, [0, 3.0, 6.5]),
 },
 "zones": [
  {"id": "ext", "component": "InstituteExterior", "position": [0, 0, 0], "cullRadius": 120, "props": {"entranceOpen": True}},
  {"id": "lab", "component": "PathologyLab", "position": LAB, "cullRadius": 40, "props": {"microscopeGlow": 0.9, "focusTurn": 0.6}},
  {"id": "lens", "component": "LensTunnel", "position": add(LAB, [0.4, -0.9, -0.45]), "rotation": [-1.2, 0, 0], "cullRadius": 30, "props": {"length": 16, "radius": 1.8}},
  {"id": "micro", "component": "MicroscopicWorld", "position": [0, -26, -33], "cullRadius": 45, "props": {"swarm": 240}},
  {"id": "lecture", "component": "LectureTheatre", "position": LEC, "cullRadius": 40, "props": {"attention": 0.12}},
  {"id": "animal", "component": "AnimalLab", "position": ANI, "cullRadius": 30},
  {"id": "hospital", "component": "EndoscopyRoom", "position": HOS, "cullRadius": 30},
  {"id": "press", "component": "PublicationDesk", "position": PRE, "cullRadius": 30, "props": {"revealStart": 1640, "revealEnd": 1700}},
  {"id": "ceremony", "component": "CeremonyStage", "position": CER, "cullRadius": 40, "props": {"revealStart": 1730}},
  {"id": "horizon", "component": "RedSunHorizon", "position": HOR, "cullRadius": 260},
 ],
 "objects": [
  {"id": "hero_bact", "component": "SpiralBacterium", "position": [0.5, -22.4, -35], "rotation": [0.4, 0, 1.1], "scale": 2.6, "cullRadius": 40},
  {"id": "veil", "component": "ParticleVeil", "position": [0, -23.5, -54.4], "props": {"width": 10, "height": 7, "depth": 2.2, "count": 4500}},
  {"id": "stamp_desk", "component": "Desk", "position": add(LEC, [-3.5, 0.8, -6.5]), "rotation": [0, 0.3, 0]},
  {"id": "stamp_papers", "component": "PaperStack", "position": add(LEC, [-3.45, 1.57, -6.45]), "props": {"sheets": 16}},
  {"id": "stamp", "component": "StampMark", "position": add(LEC, [-3.45, 1.62, -6.45]), "props": {"text": "REJECTED", "size": 0.07, "at": 772}},
  {"id": "marshall_rig_lec", "component": "SubjectRig", "position": add(LEC, [1.8, 0.8, -6.1]), "props": {"facing": 0, "keyIntensity": 55, "rimIntensity": 70}},
  {"id": "marshall_rig_ani", "component": "SubjectRig", "position": [10.4, -26, -76.9], "props": {"facing": 1.5708, "keyIntensity": 45, "rimIntensity": 80, "keySide": -1}},
  {"id": "patient_rig", "component": "SubjectRig", "position": add(HOS, [0.2, 0, -0.5]), "props": {"facing": 0, "height": 0.9, "keyIntensity": 30, "rimIntensity": 40, "rimColor": "#ff2a2a"}},
  {"id": "stomach", "component": "StomachOrgan", "position": STO, "rotation": [0, -0.5, 0.15], "scale": 22, "cullRadius": 45, "props": {"inflamed": 1, "colonies": 1}},
  {"id": "stomach_key", "component": "SpotPool", "position": STO, "props": {"position": [5, 7, 6], "target": [0, 1, 0], "color": "#ffd0c0", "intensity": 260, "angle": 0.45, "penumbra": 0.6}},
  {"id": "stomach_rim", "component": "SpotPool", "position": STO, "props": {"position": [-6, 3, -7], "target": [0, 1, 0], "color": "#ff1a1a", "intensity": 300, "angle": 0.5, "penumbra": 0.7, "castShadow": False}},
  {"id": "neutral_bact", "component": "NeutralisingBacterium", "position": add(STO, [3.4, 1.4, 4.2]), "rotation": [0.5, 0, 0.9], "scale": 0.9},
  {"id": "urea", "component": "Molecule", "position": add(STO, [4.6, 2.3, 3.2]), "props": {"kind": "urea", "appearStart": 1390}},
  {"id": "ammonia1", "component": "Molecule", "position": add(STO, [2.3, 2.0, 5.2]), "props": {"kind": "ammonia", "appearStart": 1430}},
  {"id": "ammonia2", "component": "Molecule", "position": add(STO, [4.0, 0.6, 5.5]), "props": {"kind": "ammonia", "appearStart": 1460}},
  {"id": "pills", "component": "Capsules", "position": add(STO, [2.2, -0.2, 4.0]), "scale": 6, "props": {"count": 30, "spread": 0.35, "pourStart": 1505, "pourEnd": 1580}},
  {"id": "swarm2", "component": "MicrobeSwarm", "position": add(STO, [1.5, 0.5, 3.0]), "props": {"count": 90, "bounds": [8, 5, 6], "size": 0.35}},
  {"id": "laureate_rig", "component": "SubjectRig", "position": add(CER, [0, 1.0, -4.6]), "props": {"facing": 0, "keyColor": "#ffd890", "keyIntensity": 70, "rimColor": "#ff9a3a", "rimIntensity": 70}},
  {"id": "horizon_rim", "component": "SpotPool", "position": HOR, "props": {"position": [0, 6, -20], "target": [0, 3.5, -8], "color": "#ff1a10", "intensity": 220, "angle": 0.35, "penumbra": 0.5, "castShadow": False}},
 ],
 "actors": [
  {"id": "warren", "component": "Figure", "position": add(LAB, [1.25, 0, 0.3]), "rotation": [0, -1.5708, 0], "props": {"character": "senior-pathologist"},
   "actions": [{"type": "pose", "pose": "inspect", "start": 240, "end": 430}, {"type": "expression", "expression": "concentrate", "start": 240, "end": 430},
               {"type": "walk", "start": 432, "end": 470, "path": [add(LAB, [1.25, 0, 0.3]), add(LAB, [2.1, 0, 1.1])]}, {"type": "turn", "start": 470, "end": 500, "yaw": -2.4},
               {"type": "pose", "pose": "think", "start": 480, "end": 700}]},
  {"id": "marshall_lec", "component": "Figure", "position": add(LEC, [1.8, 0.8, -6.1]), "rotation": [0, -0.15, 0], "props": {"character": "young-doctor"},
   "actions": [{"type": "pose", "pose": "gesture", "start": 560, "end": 760}, {"type": "pose", "pose": "cross", "start": 770, "end": 900}, {"type": "expression", "expression": "determined", "start": 560, "end": 900}]},
  {"id": "warren_lec", "component": "Figure", "position": add(LEC, [0.4, 0.8, -6.9]), "rotation": [0, 0.35, 0], "props": {"character": "senior-pathologist"},
   "actions": [{"type": "look", "start": 600, "end": 900, "yaw": -0.5, "pitch": 0.05}, {"type": "expression", "expression": "sad", "start": 780, "end": 900}]},
  {"id": "marshall_ani", "component": "Figure", "position": [10.4, -26, -76.9], "rotation": [0, 1.5708, 0], "props": {"character": "young-doctor", "item": "culture", "itemFrames": [990, 1120]},
   "actions": [{"type": "look", "start": 800, "end": 980, "yaw": 1.2, "pitch": 0.25}, {"type": "pose", "pose": "examine", "start": 990, "end": 1060}, {"type": "expression", "expression": "determined", "start": 990, "end": 1070},
               {"type": "pose", "pose": "drink", "start": 1060, "end": 1120}, {"type": "pose", "pose": "clutch-stomach", "start": 1135, "end": 1240, "fade": 14}, {"type": "expression", "expression": "pain", "start": 1135, "end": 1240}]},
  {"id": "patient", "component": "Figure", "position": add(HOS, [0.2, 0.56, -0.5]), "rotation": [0, 1.5708, 0], "props": {"character": "young-doctor+gown"},
   "actions": [{"type": "pose", "pose": "lie", "start": 0, "end": 99999, "fade": 0}, {"type": "expression", "expression": "pain", "start": 1150, "end": 1400}]},
  {"id": "marshall_press", "component": "Figure", "position": add(PRE, [-0.35, 0, 0.35]), "rotation": [0, 2.8, 0], "props": {"character": "young-doctor", "item": "newspaper", "itemFrames": [0, 99999]},
   "actions": [{"type": "pose", "pose": "examine", "start": 1590, "end": 1680}, {"type": "pose", "pose": "facepalm", "start": 1685, "end": 1760}, {"type": "expression", "expression": "smile", "start": 1690, "end": 1760}]},
  {"id": "laureate_m", "component": "Figure", "position": add(CER, [0.7, 1.0, -4.6]), "rotation": [0, -0.25, 0], "props": {"character": "young-doctor@older+tuxedo", "item": "medal"},
   "actions": [{"type": "pose", "pose": "present", "start": 1730, "end": 1900}, {"type": "expression", "expression": "smile", "start": 1730, "end": 1900}]},
  {"id": "laureate_w", "component": "Figure", "position": add(CER, [-0.75, 1.0, -4.7]), "rotation": [0, 0.25, 0], "props": {"character": "senior-pathologist@elderly+tuxedo", "item": "medal"},
   "actions": [{"type": "pose", "pose": "present", "start": 1730, "end": 1900}, {"type": "expression", "expression": "smile", "start": 1760, "end": 1900}]},
  {"id": "silhouette", "component": "Figure", "position": add(HOR, [0, 2.4, -8]), "rotation": [0, PI, 0], "props": {"character": "young-doctor@older+tuxedo"}, "actions": [{"type": "look", "start": 1960, "end": 2043, "yaw": 0.15, "pitch": -0.1}]},
 ],
 "occluders": [
  {"id": "scope-barrel", "shape": "box", "center": add(LAB, [0.4, 0.42, -0.25]), "halfSize": [0.22, 1.12, 0.32], "color": "#030703", "feather": 0.25, "frames": [455, 520]},
  {"id": "monitor-screen", "shape": "box", "center": add(HOS, [0.42, 1.25, -2.15]), "halfSize": [0.4, 0.35, 0.35], "color": "#2a0306", "feather": 0.2, "frames": [1320, 1395]},
  {"id": "theatre-door", "shape": "box", "center": [0, -24.3, -55.0], "halfSize": [1.6, 1.8, 1.2], "color": "#3a0508", "feather": 0.8, "frames": [700, 770]},
  {"id": "stomach-wall", "shape": "sphere", "center": add(STO, [0.3, 0.95, -3.0]), "radius": 0.9, "color": "#4a0508", "feather": 0.35, "frames": [1620, 1680]},
  {"id": "curtain", "shape": "box", "center": add(CER, [0, 3, -8.9]), "halfSize": [8, 4, 0.5], "color": "#2a0204", "feather": 0.3, "frames": [1880, 1930]},
 ],
}

def shot(i, sf, ef, lighting, camera, purpose, env, chars=(), objs=(), tin="none", tout="none", sound=(), anim="", emotion="", post=None):
  s = {"id": f"S{i:03d}", "startFrame": sf, "endFrame": ef, "audioStart": round(sf / 30, 3), "audioEnd": round(ef / 30, 3), "narration": "",
       "visualPurpose": purpose, "emotion": emotion, "environment": env, "characters": list(chars), "objects": list(objs), "lighting": lighting,
       "camera": camera, "cameraTarget": camera.get("target", "path"), "animation": anim, "transitionIn": tin, "transitionOut": tout, "sound": list(sound), "subtitle": "auto"}
  if post: s["post"] = post
  return s

S = [
 shot(1, 0, 125, "mystery", {"move": "crane", "distance": -5.2, "forward": 5.5, "target": "ext.sign", "fov": 46, "lead": 0.3},
      "Establish Perth: a brutalist institute at dusk under a red sun; descend toward the cast PERTH AUSTRALIA sign.", "ext", (), ("sign", "flag"), sound=("amb:hall", "boom"), emotion="place, weight", post={"dof": 0.15}),
 shot(2, 125, 275, "industrial-red", {"move": "travel", "via": ["doorApproach"], "to": "doorway", "target": "lab.center", "fov": 42, "lead": 0.6},
      "Glide across the plaza to the entrance: the rule of medicine is the building itself.", "ext", tin="none", tout="doorway", sound=("whoosh",), emotion="authority", post={"dof": 0.2}),
 shot(3, 275, 455, "low-key-lab", {"move": "orbit", "target": "warren.head", "radius": 2.0, "sweepDeg": -110, "height": 0.25, "fov": 32, "lead": 0.4},
      "Inside the pathology lab, revolve around Warren bent over the microscope.", "lab", ("warren",), ("microscope",), tin="doorway", sound=("amb:lab",), emotion="curiosity", post={"dof": 0.7}),
 shot(4, 455, 500, "discovery", {"move": "travel", "via": ["eyeFront"], "to": "eyePiece", "target": "lab.microscopeObjective", "fov": 30, "lead": 0.5},
      "Push into the glowing eyepiece.", "lab", (), ("microscope",), tout="microscope-lens", sound=("riser",), post={"dof": 0.8}),
 shot(5, 500, 575, "microscopic-green", {"move": "through", "via": ["underScope", "lensEntry", "lensMid"], "to": "lensExit", "lookAhead": 3, "fov": 55, "lead": 0.15},
      "Dive through the optical path (scale transformation).", "lens", tin="microscope-lens", sound=("amb:micro",), post={"dof": 0, "bloom": 1.3}),
 shot(6, 575, 690, "explanation", {"move": "spiral", "target": "hero_bact", "radius": 6.0, "radiusEnd": 4.4, "sweepDeg": 120, "height": 1.8, "heightEnd": 0.5, "fov": 40, "lead": 0.35},
      "Spiral bacteria living in the mucus above the stomach lining.", "micro", (), ("hero_bact",), emotion="revelation", post={"dof": 0.5}),
 shot(7, 690, 800, "rejection", {"move": "travel", "via": ["veilIn", "lecBackDoor", "overSeats"], "to": "stageFront", "target": "marshall_lec.head", "lookAlongPath": True, "lookAhead": 4, "fov": 36, "lead": 0.2},
      "Through a crimson veil into the lecture theatre; Marshall presents to an audience that looks away.", "lecture", ("marshall_lec", "warren_lec"), tin="particle", sound=("amb:hall",), emotion="defiance", post={"dof": 0.4}),
 shot(8, 800, 880, "rejection", {"move": "orbit", "target": "stamp_papers", "radius": 1.3, "sweepDeg": 70, "height": 0.9, "fov": 32, "lead": 0.5},
      "REJECTED slams onto their papers.", "lecture", (), ("stamp",), sound=("stamp",), emotion="rejection", post={"dof": 0.8}),
 shot(9, 880, 990, "experiment", {"move": "travel", "via": ["stageDoor"], "to": "aniInside", "target": "animal.penA", "fov": 38, "lead": 0.5},
      "Through the stage door into the animal lab: the pigs stay healthy.", "animal", (), ("pigs",), tin="doorway", sound=("amb:office",), emotion="frustration", post={"dof": 0.3}),
 shot(10, 990, 1140, "crimson-rim", {"preset": "portrait-revolve", "target": "marshall_ani.head", "radius": 1.6, "sweepDeg": 150, "height": 0.0, "fov": 30},
      "Portrait revolve: Marshall raises the glowing culture and drinks it.", "animal", ("marshall_ani",), ("culture",), sound=("glass",), emotion="resolve", post={"dof": 0.9}),
 shot(11, 1140, 1215, "punchline", {"move": "dolly", "to": {"anchor": "marshall_ani.head", "offset": [0.9, -0.15, 0.6]}, "target": "marshall_ani.chest", "fov": 34, "lead": 0.5},
      "He doubles over in pain.", "animal", ("marshall_ani",), sound=("heartbeat",), emotion="sickness", post={"dof": 0.8}),
 shot(12, 1215, 1300, "explanation", {"move": "travel", "via": ["aniEastDoor", "hosInside"], "to": "bedside", "target": "patientChest", "fov": 44, "lead": 0.3},
      "Into the endoscopy room: past the patient on the bed to the monitor showing his inflamed stomach.", "hospital", ("patient",), ("endoscopy",), tin="doorway", emotion="clinical", post={"dof": 0.4}),
 shot(13, 1300, 1395, "explanation", {"move": "through", "via": ["monitorFront", "monitorIn", "wallBehind"], "to": "stomachApproach", "lookAhead": 3, "fov": 44, "lead": 0.45},
      "Through the screen into the stomach itself.", "stomach", tin="camera-through-object", sound=("whoosh",), post={"dof": 0}),
 shot(14, 1395, 1505, "explanation", {"move": "orbit", "target": "stomach", "radius": 8.5, "sweepDeg": 70, "height": 1.2, "fov": 38, "lead": 0.4},
      "Inflamed stomach with glowing colonies; urea → ammonia: the bacteria neutralise acid around them.", "stomach", (), ("stomach", "molecules"), emotion="understanding", post={"dof": 0.3, "bloom": 1.1}),
 shot(15, 1505, 1600, "discovery", {"move": "orbit", "target": "stomach", "sweepDeg": 50, "height": 0.4, "radiusEnd": 7.0, "fov": 38},
      "Antibiotic capsules pour in; the colonies are wiped out.", "stomach", (), ("pills",), sound=("shimmer",), emotion="cure", post={"dof": 0.3}),
 shot(16, 1600, 1730, "crimson-rim", {"move": "through", "via": ["stomachCore", "stomachBack"], "to": "pressFront", "target": {"anchor": "press.wallText", "offset": [0, -0.6, 0]}, "lookAhead": 3, "fov": 40, "lead": 0.25},
      "Through the stomach wall to the desk: the published case; THE PATIENT WAS HIM rises out of the wall.", "press", ("marshall_press",), ("newspaper",), tin="camera-through-object", emotion="irony", post={"dof": 0.4}),
 shot(17, 1730, 1885, "golden-award", {"move": "travel", "via": ["pressExit", "cerAudience"], "to": {"anchor": "ceremony.plinth", "offset": [1.8, 0.2, 3.2]}, "target": "laureate_m.head", "fov": 34, "lead": 0.5},
      "Over the applauding hall to the laureates presenting their medals.", "ceremony", ("laureate_m", "laureate_w"), ("medal", "plaque"), tin="room-to-room", sound=("boom",), emotion="vindication", post={"dof": 0.5, "bloom": 1.2}),
 shot(18, 1885, 1955, "punchline", {"move": "through", "via": ["curtainGap"], "to": "horizonIn", "lookAhead": 4, "fov": 44, "lead": 0.3},
      "Through the curtain into the red horizon.", "horizon", tin="camera-through-object", sound=("whoosh",), post={"dof": 0}),
 shot(19, 1955, 2043, "punchline", {"move": "orbit", "target": "silhouette.head", "radius": 6.5, "radiusEnd": 7.5, "sweepDeg": 22, "height": -0.4, "heightEnd": -0.2, "fov": 38, "lead": 0.5},
      "A lone silhouette against the red sun.", "horizon", ("silhouette",), sound=("boom",), emotion="irony, awe", post={"dof": 0.2}),
]
tl = json.load(open(f"{P}/analysis/timeline.json"))
ADJ = {"S002": ["lab"], "S004": ["lens"], "S005": ["lab", "micro"], "S006": ["lens"], "S007": ["micro"], "S009": ["lecture"], "S012": ["animal"],
       "S013": ["stomach", "hospital"], "S016": ["stomach"], "S017": ["press"], "S018": ["ceremony"]}
for s in S:
  if s["id"] in ADJ: s["activeZones"] = ADJ[s["id"]]
for s in S:
  ws = [w for w in tl["words"] if s["startFrame"] <= w["startFrame"] < s["endFrame"]]
  s["narration"] = " ".join(w["text"] + w.get("punct", "") for w in ws)
ZONE_OF = {"hero_bact": "micro", "veil": "micro", "stamp_desk": "lecture", "stamp_papers": "lecture", "stamp": "lecture", "marshall_rig_lec": "lecture",
  "marshall_rig_ani": "animal", "patient_rig": "hospital", "stomach": "stomach", "stomach_key": "stomach", "stomach_rim": "stomach", "neutral_bact": "stomach",
  "urea": "stomach", "ammonia1": "stomach", "ammonia2": "stomach", "pills": "stomach", "swarm2": "stomach", "laureate_rig": "ceremony",
  "horizon_rim": "horizon", "warren": "lab", "marshall_lec": "lecture", "warren_lec": "lecture", "marshall_ani": "animal", "patient": "hospital",
  "marshall_press": "press", "laureate_m": "ceremony", "laureate_w": "ceremony", "silhouette": "horizon"}
for kind in ("objects", "actors"):
  for e in layout[kind]:
    e["zone"] = ZONE_OF[e["id"]]
json.dump(layout, open(f"{P}/data/world-layout.json", "w"), indent=1)
json.dump({"version": 1, "fps": 30, "durationFrames": 2043, "shots": S}, open(f"{P}/data/shot-plan.json", "w"), indent=1)
cfg = json.load(open(f"{P}/data/production-config.json"))
cfg["camera"]["initial"] = {"position": [-4, 9.5, 6], "target": [-8, 1.8, -11], "fov": 48, "rollDeg": 0}
cfg["render"]["post"] = "final"
json.dump(cfg, open(f"{P}/data/production-config.json", "w"), indent=1)
print("directed", len(S), "moves")
