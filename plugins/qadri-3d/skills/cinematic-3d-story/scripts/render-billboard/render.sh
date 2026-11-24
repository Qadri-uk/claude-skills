#!/usr/bin/env bash
# Render a glTF model from two sides (90 degrees apart) onto a transparent 1024x768 atlas
# for crossed-quad billboards. Needs Playwright with Chromium and a project with three.
#   render.sh <project-with-three> <model-dir-containing-model.gltf> <model-name> <out.png>
# Example: render.sh ~/site dl/island_tree_02 island_tree_02 tree.png
set -euo pipefail
proj=$1; mdir=$(cd "$2" && pwd); name=$3; out=$(realpath -m "$4")
here=$(cd "$(dirname "$0")" && pwd)
NODE_PATH="$proj/node_modules" npx --prefix "$proj" esbuild "$here/render.ts" --bundle --format=iife --outfile="$mdir/../render.js" --log-level=warning
cp "$here/index.html" "$mdir/../render.html"
port=8765
( cd "$mdir/.." && python3 -I -m http.server $port --bind 127.0.0.1 >/dev/null 2>&1 ) & srv=$!
trap 'kill $srv' EXIT
sleep 1
node "$here/shot.cjs" "http://127.0.0.1:$port/render.html?$name#$name/$name.gltf" "$out"
echo "Crop the empty margin, then: sharp(out).extract(...).webp({quality:82, alphaQuality:90})"
