#!/usr/bin/env bash
# Web-ready assets: textures to WebP, glTF to meshopt-compressed .glb with WebP textures.
#   optimize-assets.sh <srcdir> <outdir> [texture-width=1024]
# Run from a project with `sharp` installed (Astro templates have it).
set -euo pipefail
src=$1; out=$2; w=${3:-1024}
mkdir -p "$out"
for f in "$src"/*.jpg "$src"/*.png; do
  [ -e "$f" ] || continue
  n=$(basename "${f%.*}")
  node -e "require('sharp')(process.argv[1]).resize(+process.argv[3]).webp({quality:70}).toFile(process.argv[2])" "$f" "$out/$n.webp" "$w"
done
for g in "$src"/*/*.gltf "$src"/*.glb; do
  [ -e "$g" ] || continue
  n=$(basename "${g%.*}")
  npx -y @gltf-transform/cli@4.2.1 optimize "$g" "$out/$n.glb" --compress meshopt --texture-compress webp --texture-size 512 >/dev/null
done
cp "$src"/*.hdr "$out"/ 2>/dev/null || true
ls -la "$out"
