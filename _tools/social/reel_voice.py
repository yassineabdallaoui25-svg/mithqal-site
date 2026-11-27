#!/usr/bin/env python3
"""MITHQAL voiced Short: slides (1080x1350) + spoken narration + music bed -> 9:16 MP4.

Usage:
  python3 reel_voice.py OUT.mp4 --voice fr-siwis-medium.onnx [--hook "Phrase d'accroche"] \
      [--music bed.mp3] slide1.png slide2.png ...

Narration per slide, first match wins:
  1. slideN.say.txt next to the slide (hand-written spoken text),
  2. --hook for slide 1,
  3. a short spoken version built from slideN.txt (written by gen.js): heading + key figure,
     never the long tables or source lines.
Voice: Piper TTS with the SIWIS French voice (CC BY 4.0, credit "Voix de synthèse : SIWIS").
  curl -sL https://github.com/rhasspy/piper/releases/download/v0.0.2/voice-fr-siwis-medium.tar.gz | tar xz
  pip install piper-tts
Sound: voice cleaned (high-pass, warmth, presence, compression, small room), music bed that
ducks under the voice, loudness normalised to -14 LUFS for social apps.
"""
import argparse
import random
import re
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

W, H, FPS = 1080, 1920, 30
PAD = 0.35
MIN_SLIDE = 2.4
SKIP = re.compile(r"^(sources?\b|exemple p[ée]dagogique|estimation p[ée]dagogique|cas p[ée]dagogique|hypoth[èe]se|projet de loi\s*:|@mithqal|v[ée]rifie ta situation)", re.I)
ACRO = ["CGNC", "CNSS", "AMO", "BFR", "PLF", "DGI", "TVA", "IR", "IS", "CPC", "ESG", "ETIC", "SIG", "EBE", "CAF", "VAN", "TRI", "PME", "SMIG", "OCDE", "CCA", "BO"]
NUM = re.compile(r"[−+\-]?[\d\s  ,.]+\s*(%|M|j|MAD|k)?")


def speakable(s: str) -> str:
    s = re.sub(r"(?<=\d)[\s  ](?=\d{3}\b)", "", s)
    s = re.sub(r"(?<=\d)[\s  ](?=\d{3}\b)", "", s)
    s = re.sub(r"(\d+(?:,\d+)?)\s*M\s*MAD", r"\1 millions de dirhams", s)
    s = re.sub(r"(\d+(?:,\d+)?)\s*M\b", r"\1 millions", s)
    s = re.sub(r"\bMAD\b", "dirhams", s)
    s = re.sub(r"(\d)\s*j\b", r"\1 jours", s)
    s = re.sub(r"\bCA\b", "chiffre d'affaires", s)
    for a in ACRO:
        s = re.sub(rf"\b{a}\b", ".".join(a) + ".", s)
    s = re.sub(r"[−–]\s*(?=\d)", "moins ", s)
    s = re.sub(r"\+\s*(?=\d)", "plus ", s)
    s = (s.replace("÷", " divisé par ").replace("×", " fois ").replace(" = ", " égale ")
           .replace("→", " ").replace("≥", " au moins ").replace("≤", " au plus ")
           .replace("·", ",").replace("’", "'").replace("…", "...").replace("📌", "").replace("👇", ""))
    s = re.sub(r"\.(\s*\.)+", ".", s)
    return re.sub(r"\s+", " ", s).strip()


def short_narration(text: str, last: bool) -> str:
    lines = [l.strip() for l in text.replace("\r", "").split("\n")]
    lines = [l for l in lines if l and l not in ("M", "MITHQAL") and not SKIP.match(l)]
    quiz = any(re.match(r"^[ABC]\t", l) for l in lines)
    out, prose = [], 0
    for l in lines:
        if "\t" in l and not quiz:
            continue                                  # table rows: the screen shows them
        if re.match(r"^[ABC]\t", l):
            l = l[0] + ", " + l[2:].replace("\t", " ")
        elif re.fullmatch(r"[A-ZÀ-Ÿ0-9 ·'’:\-/]+", l) and len(l) > 3:
            l = l.capitalize()                        # small-caps label
        elif len(l) > 90 and not quiz:
            prose += 1
            if prose > 1:                             # one explanatory sentence per slide, max
                continue
            l = re.split(r"(?<=[.!?])\s", l)[0]
        if NUM.fullmatch(l):
            out.append(l)
        else:
            out.append(l if re.search(r"[.!?:]$", l) else l + ".")
    s = " ".join(out)
    if last and not quiz:
        s = re.sub(r"(La |Le |Les |L')[^.]*Académie Mithqal[^.]*\.", "", s)
        s = re.sub(r"Lien en bio\.", "", s)
        s += " Abonne-toi pour la suite." if "commentaire" in s else " Abonne-toi pour la suite, et dis-moi en commentaire ce que tu veux voir ensuite."
    return speakable(s)


def tts(text: str, voice: str, wav: Path, rng: random.Random):
    base = [sys.executable, "-m", "piper", "-m", voice, "-f", str(wav),
            "--sentence-silence", f"{rng.uniform(0.18, 0.32):.2f}", "--length-scale", f"{rng.uniform(0.86, 0.93):.2f}",
            "--noise-scale", "0.72"]
    for extra in (["--noise-w-scale", "0.9"], ["--noise-w", "0.9"], []):
        r = subprocess.run(base + extra, input=text.encode(), capture_output=True)
        if r.returncode == 0:
            return
    raise RuntimeError(r.stderr.decode()[-400:])


def duration(wav: Path) -> float:
    with wave.open(str(wav)) as w:
        return w.getnframes() / w.getframerate()


def clip(src: Path, dst: Path, dur: float):
    frames = int(dur * FPS)
    vf = (f"split[a][b];[a]scale={W}:{H},boxblur=40:2,eq=brightness=-0.05[bg];"
          f"[b]scale={W}:-2[fg];[bg][fg]overlay=0:(H-h)/2,scale={W*2}:{H*2},"
          f"zoompan=z='min(1+0.05*on/{frames},1.05)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
          f":d={frames}:s={W}x{H}:fps={FPS},format=yuv420p")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-i", str(src), "-vf", vf,
                    "-t", f"{dur:.3f}", "-r", str(FPS), "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", str(dst)], check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out")
    ap.add_argument("--voice", required=True)
    ap.add_argument("--hook")
    ap.add_argument("--music")
    ap.add_argument("slides", nargs="+")
    a = ap.parse_args()
    rng = random.Random(a.out)
    n = len(a.slides)
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        vids, auds, total = [], [], 0.0
        for i, s in enumerate(map(Path, a.slides)):
            say = s.with_suffix(".say.txt")
            src_txt = s.with_suffix(".txt").read_text() if s.with_suffix(".txt").exists() else ""
            if say.exists():
                txt = speakable(say.read_text())
            elif i == 0 and a.hook and n > 1:
                txt = speakable(a.hook)
            else:
                txt = short_narration(src_txt, last=(i == n - 1))
            wav = tmp / f"v{i}.wav"
            if txt:
                tts(txt, a.voice, wav, rng)
                d = max(duration(wav) + PAD, MIN_SLIDE)
            else:
                d = MIN_SLIDE
            v = tmp / f"c{i}.mp4"
            clip(s, v, d)
            pa = tmp / f"a{i}.wav"
            src = ["-i", str(wav)] if txt else ["-f", "lavfi", "-i", "anullsrc=r=22050:cl=mono"]
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *src, "-af", f"apad,atrim=0:{d:.3f}", "-ar", "44100", "-ac", "1", str(pa)], check=True)
            vids.append(v); auds.append(pa); total += d
            print(f"slide {i+1}: {d:.1f}s  {txt}")
        (tmp / "v.txt").write_text("".join(f"file '{v}'\n" for v in vids))
        (tmp / "a.txt").write_text("".join(f"file '{x}'\n" for x in auds))
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(tmp / "a.txt"), str(tmp / "voice.wav")], check=True)
        voice_fx = ("highpass=f=85,lowpass=f=12500,equalizer=f=180:t=q:w=1.0:g=2,equalizer=f=3200:t=q:w=1.2:g=3,"
                    "equalizer=f=7000:t=q:w=2:g=-2,acompressor=threshold=-20dB:ratio=3:attack=8:release=120:makeup=3,"
                    "aecho=0.85:0.5:24|41:0.10|0.06")
        if a.music:
            fc = (f"[1:a]{voice_fx},asplit=2[vo][sc];"
                  f"[2:a]aloop=loop=-1:size=2e9,atrim=0:{total:.3f},volume=0.22,afade=t=in:d=0.6,afade=t=out:st={max(total-1.5,0):.3f}:d=1.5[mu];"
                  f"[mu][sc]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=350[duck];"
                  f"[vo][duck]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=9[aout]")
            ins = ["-i", str(tmp / "voice.wav"), "-i", a.music]
        else:
            fc = f"[1:a]{voice_fx},loudnorm=I=-14:TP=-1.5:LRA=9[aout]"
            ins = ["-i", str(tmp / "voice.wav")]
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(tmp / "v.txt"), *ins,
                        "-filter_complex", fc, "-map", "0:v", "-map", "[aout]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k",
                        "-ar", "44100", "-ac", "2", "-movflags", "+faststart", "-shortest", a.out], check=True)
    print(f"OK {a.out} {total:.1f}s {n} slides")


if __name__ == "__main__":
    main()
