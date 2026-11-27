#!/usr/bin/env python3
"""Turn MITHQAL carousel slides (1080x1350 PNG) into a 9:16 vertical video (1080x1920 MP4)
for Instagram Reels, TikTok and YouTube Shorts.

Usage: python3 reel.py OUTPUT.mp4 slide1.png slide2.png ...

- Each slide is centered on a navy background matching the slides.
- Slow zoom on every slide, 0.5 s crossfade between slides.
- Cover slide stays 3.5 s, the others 4.5 s (dense tables need reading time).
- Silent stereo audio track (no copyrighted music); sound can be added in-app later.
"""
import subprocess
import sys
import tempfile
from pathlib import Path

W, H = 1080, 1920
BG = "0x0a1a33"          # navy, matches the slide gradient edges
FPS = 30
FADE = 0.5


def durations(n):
    if n == 1:          # single-slide quiz: leave time to read and answer
        return [8.0]
    return [3.5] + [4.5] * (n - 1)


def render_clip(src, dst, dur):
    frames = int(dur * FPS)
    # Pad the 1080x1350 slide onto a 1080x1920 canvas, then a gentle zoom (1.00 -> 1.04).
    # Background = the same slide stretched to fill 9:16 and blurred (no visible seam),
    # foreground = the slide at full width, centered.
    vf = (
        f"split[a][b];[a]scale={W}:{H},boxblur=40:2,eq=brightness=-0.05[bg];"
        f"[b]scale={W}:-2[fg];[bg][fg]overlay=0:(H-h)/2,"
        f"scale={W*2}:{H*2},"
        f"zoompan=z='min(1+0.04*on/{frames},1.04)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
        f":d={frames}:s={W}x{H}:fps={FPS},format=yuv420p"
    )
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-i", str(src),
         "-vf", vf, "-t", f"{dur}", "-r", str(FPS), "-c:v", "libx264",
         "-preset", "veryfast", "-crf", "20", str(dst)],
        check=True,
    )


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    out = Path(sys.argv[1])
    slides = [Path(p) for p in sys.argv[2:]]
    durs = durations(len(slides))
    with tempfile.TemporaryDirectory() as tmp:
        clips = []
        for i, (s, d) in enumerate(zip(slides, durs)):
            c = Path(tmp) / f"c{i:02d}.mp4"
            render_clip(s, c, d)
            clips.append(c)
        # Chain crossfades.
        inputs = []
        for c in clips:
            inputs += ["-i", str(c)]
        if len(clips) == 1:
            fc = "[0:v]copy[v]"
        else:
            parts, prev, offset = [], "[0:v]", 0.0
            for i in range(1, len(clips)):
                offset += durs[i - 1] - FADE
                lab = f"[x{i}]" if i < len(clips) - 1 else "[v]"
                parts.append(f"{prev}[{i}:v]xfade=transition=fade:duration={FADE}:offset={offset:.3f}{lab}")
                prev = lab
            fc = ";".join(parts)
        total = sum(durs) - FADE * (len(clips) - 1)
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", *inputs,
             "-f", "lavfi", "-t", f"{total:.3f}", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
             "-filter_complex", fc, "-map", "[v]", "-map", f"{len(clips)}:a",
             "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
             "-c:a", "aac", "-b:a", "96k", "-shortest", "-movflags", "+faststart", str(out)],
            check=True,
        )
    print(f"OK {out} {total:.1f}s {len(slides)} slides")


if __name__ == "__main__":
    main()
