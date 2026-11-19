#!/usr/bin/env python3
"""Validate the idea-creator skill: structure, frontmatter, and file references."""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REQUIRED = [
    "SKILL.md",
    "references/niche.md",
    "references/style-target.md",
    "references/idea-engine.md",
    "references/search-playbook.md",
    "research/idea-bank.md",
    "research/competition-snapshot.md",
    "scripts/competition_check.py",
    "scripts/setup.sh",
]
errors = []

for rel in REQUIRED:
    if not os.path.isfile(os.path.join(ROOT, rel)):
        errors.append(f"missing file: {rel}")

skill = open(os.path.join(ROOT, "SKILL.md"), encoding="utf-8").read()
fm = re.match(r"^---\n(.*?)\n---\n", skill, re.S)
if not fm:
    errors.append("SKILL.md: missing YAML frontmatter")
else:
    meta = dict(re.findall(r"^([a-z-]+):\s*(.+)$", fm.group(1), re.M))
    name = meta.get("name", "")
    if name != os.path.basename(ROOT):
        errors.append(f"frontmatter name '{name}' != folder '{os.path.basename(ROOT)}'")
    if not re.fullmatch(r"[a-z0-9-]{1,64}", name):
        errors.append("name must be lowercase letters, digits, hyphens (<=64)")
    desc = meta.get("description", "")
    if not desc or len(desc) > 1024:
        errors.append(f"description missing or > 1024 chars ({len(desc)})")

# every backticked relative path mentioned in SKILL.md / references must exist
for md in ["SKILL.md"] + [f"references/{f}" for f in os.listdir(os.path.join(ROOT, "references"))]:
    text = open(os.path.join(ROOT, md), encoding="utf-8").read()
    for ref in set(re.findall(r"`((?:references|templates|research|scripts)/[^`<>{}\s]+)`", text)):
        ref = ref.replace("${CLAUDE_SKILL_DIR}/", "")
        if ref.endswith("/"):
            ok = os.path.isdir(os.path.join(ROOT, ref))
        else:
            ok = os.path.exists(os.path.join(ROOT, ref))
        if not ok:
            errors.append(f"{md}: referenced path not found: {ref}")

lines = skill.count("\n")
if lines > 500:
    errors.append(f"SKILL.md is {lines} lines; keep it under 500")

if errors:
    print("FAIL")
    for e in errors:
        print(" -", e)
    sys.exit(1)
print(f"OK - {len(REQUIRED)} required files present, frontmatter valid, all references resolve, SKILL.md {lines} lines")
