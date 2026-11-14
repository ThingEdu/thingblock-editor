#!/usr/bin/env bash
# Stage the live-only web editor for tablets: the GUI build, the resource pack beside it, and an
# index.html that tells the editor where the pack is and that it runs live-only (no link helper:
# blocks drive a ThingBot over Web Bluetooth, nothing is compiled or uploaded). Serve the output
# folder over HTTPS from any path; Web Bluetooth needs Chrome (Android, ChromeOS, desktop).
#
# Build first:  npm run build --workspace=@thingblock/thingblock-resource
#               npm run build --workspace=@thingblock/thingblock-gui
# Then:         scripts/web-live/stage.sh [out-dir]   (default: dist/web-live)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HERE="$ROOT/scripts/web-live"
GUI_BUILD="$ROOT/packages/thingblock-gui/build"
RESOURCE_PACK="$ROOT/packages/thingblock-resource/dist/thingblock-resource"
OUT="${1:-$ROOT/dist/web-live}"

for dir in "$GUI_BUILD" "$RESOURCE_PACK"; do
    if [ ! -d "$dir" ]; then
        echo "stage.sh: $dir is missing; build the GUI and the resource pack first" >&2
        exit 1
    fi
done

rm -rf "$OUT"
mkdir -p "$OUT"
cp -R "$GUI_BUILD"/. "$OUT"/
cp -R "$RESOURCE_PACK" "$OUT/thingblock-resource"
cp "$HERE/manifest.webmanifest" "$HERE/icon-192.png" "$HERE/icon-512.png" "$OUT"/
# Pages the tablet build does not use.
rm -f "$OUT"/blocks-only.html "$OUT"/compatibility-testing.html "$OUT"/player.html "$OUT"/standalone.html \
    "$OUT"/blocksonly.js "$OUT"/compatibilitytesting.js "$OUT"/player.js "$OUT"/guistandalone.js "$OUT"/*.map

# The pack base is resolved against the page, so the folder works at any URL path.
INDEX="$OUT/index.html"
if ! grep -q '</head>' "$INDEX"; then
    echo "stage.sh: no </head> in $INDEX" >&2
    exit 1
fi
HEAD='<link rel="manifest" href="manifest.webmanifest"><meta name="theme-color" content="#4c97ff">'
HEAD="$HEAD"'<script>globalThis.__THINGBLOCK_RESOURCE_BASE__=new URL("thingblock-resource",location.href).href;'
HEAD="$HEAD"'globalThis.__THINGBLOCK_LIVE_ONLY__=true;</script>'
sed "s|</head>|$HEAD</head>|" "$INDEX" > "$INDEX.tmp"
mv "$INDEX.tmp" "$INDEX"

echo "Staged the live-only web editor in $OUT ($(du -sh "$OUT" | cut -f1))"
