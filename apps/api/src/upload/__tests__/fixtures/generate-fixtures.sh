#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

# 5s silent 720p30 H.264 MP4
ffmpeg -f lavfi -i testsrc=duration=5:size=1280x720:rate=30 -pix_fmt yuv420p -c:v libx264 -preset ultrafast -an -y valid-720p.mp4

# 5s silent 240p30 H.264 MP4 (below min resolution)
ffmpeg -f lavfi -i testsrc=duration=5:size=426x240:rate=30 -pix_fmt yuv420p -c:v libx264 -preset ultrafast -an -y 240p.mp4

# 5s 720p30 H.264 MP4 with audio
ffmpeg -f lavfi -i testsrc=duration=5:size=1280x720:rate=30 -f lavfi -i sine=frequency=1000:duration=5 -pix_fmt yuv420p -c:v libx264 -preset ultrafast -c:a aac -y with-audio.mp4

# 5s "static" 720p H.264 MP4 — identical frame repeated
ffmpeg -f lavfi -i color=c=blue:s=1280x720:d=5 -pix_fmt yuv420p -c:v libx264 -preset ultrafast -an -y static-frame.mp4

# 5s black 720p H.264 MP4
ffmpeg -f lavfi -i color=c=black:s=1280x720:d=5 -pix_fmt yuv420p -c:v libx264 -preset ultrafast -an -y black.mp4
