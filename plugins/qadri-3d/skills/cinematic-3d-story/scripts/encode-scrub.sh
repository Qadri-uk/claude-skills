#!/usr/bin/env bash
# Encode a clip for scroll-scrubbing: every frame a keyframe, no B-frames, no audio,
# moov atom at the front. Seeking then lands instantly on any frame.
#   encode-scrub.sh in.mp4 out.mp4 [height=720] [crf=24]
set -euo pipefail
in=$1; out=$2; h=${3:-720}; crf=${4:-24}
ffmpeg -y -loglevel error -i "$in" -an \
  -vf "scale=-2:${h}:flags=lanczos,format=yuv420p" \
  -c:v libx264 -preset slow -crf "$crf" -g 1 -keyint_min 1 -bf 0 -sc_threshold 0 \
  -movflags +faststart "$out"
echo "$out: $(du -h "$out" | cut -f1)"
