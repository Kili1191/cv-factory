#!/usr/bin/env python3
"""
Nuvi v3 - Patch InterviewModal.jsx pour transformer Gold/Dark vers palette Nuvi.

USAGE:
    python3 patch_interview_modal.py InterviewModal.jsx

Le script lit le fichier, applique les transformations, et ECRIT le résultat
dans le même fichier (avec backup .bak).

Les transformations:
- Gold (#c9a96e)            -> Coral (#d97757) ou Purple (#5b3df5) selon contexte
- GoldDeep (#a07840)        -> Coral (#d97757) eyebrows
- GradGold / GradPurple     -> linear-gradient(Purple, Magenta) pour CTAs primaires
- Ink (button backgrounds)  -> linear-gradient(Purple, Magenta)
- Gray200 (borders)         -> Hairline (#e8e3d6)
- Gray600 (text muted)      -> InkMuted (#5a5a62)
- Cream (sur Ink button)    -> "#fff"
"""

import sys
import os
import shutil


def patch_imports(content):
    """Update imports to use new tokens."""
    # Find the import block and replace
    old_import = """import {
  Ink, Cream, CreamSoft, Paper, Gold, GoldDeep, Purple, PurpleSoft,
  Coral, CoralSoft, Green, GreenSoft, Gray100, Gray200, Gray400, Gray600,
  Serif, Sans, RadiusSm, RadiusMd, RadiusPill, ShadowSm,
  GradPurple, GradGold, KEYFRAMES_V17, B,
} from "./tokens";"""

    new_import = """import {
  Ink, InkMuted, Cream, CreamSoft, Paper, Hairline, Purple, PurpleSoft, Magenta,
  Coral, CoralSoft, Green, GreenSoft, Gray100, Gray200, Gray400, Gray600,
  Serif, Sans, RadiusSm, RadiusMd, RadiusPill, ShadowSm,
  KEYFRAMES_V17, B,
} from "./tokens";"""

    if old_import in content:
        content = content.replace(old_import, new_import)
    return content


REPLACEMENTS = [
    # Gradients - les plus specifiques d'abord
    ('background: GradPurple, color: "#fff"',
     'background: `linear-gradient(135deg, ${Purple}, ${Magenta})`, color: "#fff"'),
    ('background:GradPurple, color:"#fff"',
     'background:`linear-gradient(135deg, ${Purple}, ${Magenta})`, color:"#fff"'),
    ('background: GradPurple,',
     'background: `linear-gradient(135deg, ${Purple}, ${Magenta})`,'),
    ('background:GradPurple,',
     'background:`linear-gradient(135deg, ${Purple}, ${Magenta})`,'),
    ('background: GradGold,',
     'background: `linear-gradient(135deg, ${Purple}, ${Magenta})`,'),
    ('background:GradGold,',
     'background:`linear-gradient(135deg, ${Purple}, ${Magenta})`,'),

    # Gold backgrounds
    ('background:GoldDeep,', 'background:Coral,'),
    ('background: GoldDeep,', 'background: Coral,'),
    ('background: Gold,', 'background: Purple,'),
    ('background:Gold,', 'background:Purple,'),

    # Colors GoldDeep (eyebrows) -> Coral
    ('color:GoldDeep,', 'color:Coral,'),
    ('color: GoldDeep,', 'color: Coral,'),

    # Gold colors -> Purple
    ('color:Gold,', 'color:Purple,'),
    ('color: Gold,', 'color: Purple,'),

    # Gray200 borders -> Hairline
    ('border:"0.5px solid "+Gray200', 'border:"0.5px solid "+Hairline'),
    ('border: "0.5px solid "+Gray200', 'border: "0.5px solid "+Hairline'),
    ('borderTop:"0.5px solid "+Gray200', 'borderTop:"0.5px solid "+Hairline'),
    ('borderTop: "0.5px solid "+Gray200', 'borderTop: "0.5px solid "+Hairline'),
    ('borderBottom:"0.5px solid "+Gray200', 'borderBottom:"0.5px solid "+Hairline'),
    ('borderBottom: "0.5px solid "+Gray200', 'borderBottom: "0.5px solid "+Hairline'),
    ('background: Gray200', 'background: Hairline'),
    ('background:Gray200', 'background:Hairline'),

    # Gray600 -> InkMuted (text)
    ('color:Gray600,', 'color:InkMuted,'),
    ('color: Gray600,', 'color: InkMuted,'),

    # Ink button backgrounds -> gradient (CTAs primaires)
    ('background:Ink, color:Cream,',
     'background:`linear-gradient(135deg, ${Purple}, ${Magenta})`, color:"#fff",'),
    ('background: Ink, color: Cream,',
     'background: `linear-gradient(135deg, ${Purple}, ${Magenta})`, color: "#fff",'),

    # borderTopColor: Gold -> Purple
    ('borderTopColor:Gold,', 'borderTopColor:Purple,'),
    ('borderTopColor: Gold,', 'borderTopColor: Purple,'),
    ('borderTopColor:GoldDeep,', 'borderTopColor:Coral,'),
    ('borderTopColor: GoldDeep,', 'borderTopColor: Coral,'),

    # Borders gold
    ('border:"0.5px solid "+Gold', 'border:"0.5px solid "+Purple'),
    ('border: "0.5px solid "+Gold', 'border: "0.5px solid "+Purple'),
    ('borderLeft:"2px solid "+Gold', 'borderLeft:"2px solid "+Purple'),

    # Gray100 backgrounds -> CreamSoft (subtle)
    ('background:Gray100,', 'background:CreamSoft,'),

    # Specific colored text fixes - "color:Cream" sur fond Ink
    ('color:Cream,', 'color:"#fff",'),

    # Gold opacity hex -> Purple
    ('Gold+"22"', 'Purple+"22"'),

    # Hardcoded yellow -> CoralSoft
    ('background:"#fef3c7",', 'background:CoralSoft,'),
    ('border:"0.5px solid #fbbf24"', 'border:"0.5px solid "+Coral'),
    ('"#fff8e6"', 'CoralSoft'),

    # Gold hover/active -> Purple
    ('"+Gold;', '"+Purple;'),
    ('"+GoldDeep;', '"+Coral;'),
]


def patch_colors(content):
    """Apply all color transformations."""
    for old, new in REPLACEMENTS:
        content = content.replace(old, new)
    return content


def main():
    if len(sys.argv) != 2:
        print("Usage: python3 patch_interview_modal.py InterviewModal.jsx")
        sys.exit(1)

    filepath = sys.argv[1]
    if not os.path.exists(filepath):
        print(f"ERROR: File not found: {filepath}")
        sys.exit(1)

    # Backup
    backup = filepath + ".bak"
    shutil.copy2(filepath, backup)
    print(f"Backup created: {backup}")

    # Read
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    original_size = len(content)

    # Transform
    content = patch_imports(content)
    content = patch_colors(content)

    # Write
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

    new_size = len(content)
    print(f"OK: {filepath}")
    print(f"   Original size: {original_size} chars")
    print(f"   New size:      {new_size} chars")
    print(f"   Diff:          {new_size - original_size:+d} chars")
    print()
    print("Verify the file then commit. If problem, restore from .bak")


if __name__ == "__main__":
    main()
