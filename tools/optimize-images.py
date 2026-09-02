#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Optimisation des images du site Sunikai.

    python tools/optimize-images.py

- Les fichiers d'origine sont deplaces une fois pour toutes dans assets/img/_originals/
  (meme arborescence). On peut donc relancer le script sans perte de qualite.
- Chaque image produit deux fichiers dans assets/img/ :
      nom.jpg      -> largeur max 1200 px, qualite 72, progressif
      nom-sm.jpg   -> largeur max  600 px, qualite 70, progressif
  build.js utilise le couple en srcset.

Necessite Pillow :  python -m pip install Pillow
"""

import os
import sys
import shutil

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Pillow manquant. Installer avec :  python -m pip install Pillow")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, "assets", "img")
ORIG = os.path.join(IMG, "_originals")

WIDTH_MAIN = 1200
WIDTH_SMALL = 600
Q_MAIN = 72
Q_SMALL = 70

EXTS = (".jpg", ".jpeg", ".png")

# Icones : a laisser telles quelles (ne pas convertir en JPEG, pas de variante -sm)
SKIP_NAMES = {"apple-touch-icon.png", "favicon.png", "og-image.png"}


def collect():
    """Retourne la liste des (chemin_relatif) des images a traiter."""
    out = []
    for base, dirs, files in os.walk(IMG):
        dirs[:] = [d for d in dirs if d != "_originals"]
        for f in files:
            if not f.lower().endswith(EXTS):
                continue
            if "-sm." in f:             # variante deja generee
                continue
            if f in SKIP_NAMES:         # icones
                continue
            out.append(os.path.relpath(os.path.join(base, f), IMG))
    return sorted(out)


def save(im, path, width, quality):
    work = im.copy()
    if work.width > width:
        h = round(work.height * width / work.width)
        work = work.resize((width, h), Image.LANCZOS)
    if work.mode not in ("RGB", "L"):
        work = work.convert("RGB")
    work.save(path, "JPEG", quality=quality, optimize=True, progressive=True)
    return os.path.getsize(path)


def main():
    rels = collect()
    if not rels:
        print("Aucune image trouvee dans assets/img/")
        return

    before = after = 0
    for rel in rels:
        src = os.path.join(IMG, rel)
        orig = os.path.join(ORIG, rel)

        # 1er passage : on archive l'original tel quel
        if not os.path.exists(orig):
            os.makedirs(os.path.dirname(orig), exist_ok=True)
            shutil.copy2(src, orig)

        before += os.path.getsize(orig)

        stem, _ = os.path.splitext(rel)
        out_main = os.path.join(IMG, stem + ".jpg")
        out_small = os.path.join(IMG, stem + "-sm.jpg")

        with Image.open(orig) as im:
            im = ImageOps.exif_transpose(im)
            a = save(im, out_main, WIDTH_MAIN, Q_MAIN)
            b = save(im, out_small, WIDTH_SMALL, Q_SMALL)

        # si l'original etait un .png, on retire le fichier source devenu inutile
        if not rel.lower().endswith(".jpg") and os.path.exists(src) and src != out_main:
            os.remove(src)

        after += a + b
        print("  %-42s %6d Ko -> %4d + %3d Ko" % (rel, os.path.getsize(orig) // 1024, a // 1024, b // 1024))

    print("\n%d images : %.1f Mo -> %.1f Mo (%.0f %% de gain)"
          % (len(rels), before / 1048576, after / 1048576,
             100 * (1 - after / before) if before else 0))
    print("Originaux conserves dans assets/img/_originals/ (non publies).")


if __name__ == "__main__":
    main()
