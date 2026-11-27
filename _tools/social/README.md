# MITHQAL social studio

Source of truth for the content robots (cloud scheduled tasks).

- `gen.js` + `postsN.js`: slide templates (1080x1350 PNG) and a `.txt` of each slide's text.
  `npm install && BATCH=postsN.js node gen.js` (Playwright; pass the Chrome path if Chromium is missing).
- `reel_voice.py`: voiced 9:16 Short from the slides, Piper TTS voice SIWIS (CC BY 4.0) + optional
  music bed (`--music`), ducking and loudness for social apps. A `slideNN.say.txt` next to a slide
  replaces its narration with hand-written speech.
- `reel_silent.py`: old silent version (fallback only).
- Calendar: `social/index.json` (posts with date, time 13:00/20:00, caption, slides, video).
- Weekly report: `social/report.md`; weekly priorities: `social/strategy.md`.
