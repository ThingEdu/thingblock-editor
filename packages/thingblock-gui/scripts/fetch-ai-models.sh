#!/usr/bin/env bash
# Downloads the Camera AI models into static/ai-models (they are not committed: see the README there).
set -euo pipefail
cd "$(dirname "$0")/../static/ai-models"
fetch () {
    local file=$1 url=$2 sha=$3
    if [ -f "$file" ] && echo "$sha  $file" | shasum -a 256 -c --status; then
        echo "$file: ok"
        return
    fi
    echo "$file: downloading"
    curl -sSL -o "$file" "$url"
    echo "$sha  $file" | shasum -a 256 -c
}
fetch gesture_recognizer.task \
    https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task \
    97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482
fetch pose_landmarker_lite.task \
    https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task \
    59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a
