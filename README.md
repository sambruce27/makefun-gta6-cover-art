# Vice Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/sambruce27/makefun-gta6-cover-art/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/sambruce27/makefun-gta6-cover-art/reward.svg)](https://make.fun/c/gta6-cover-art-01)

A web app that turns your photos into a sunset-neon, multi-panel cover in the
style of GTA 6's posters — built for the
[Make GTA 6 Cover Art](https://make.fun/c/gta6-cover-art-01) bounty on
[make.fun](https://make.fun).

## What it does

- **Four layouts**: four panels, hero + three, three columns, or a single hero.
- **Four colour grades**: sunset, neon, vice pink, noir — plus film grain and a vignette.
- **Your photos**: place up to four photos into the panels, crop and position each one with zoom and pan sliders, or fill all panels at once.
- **Lettering**: editable kicker, bold title and subtitle, set in Anton (SIL Open Font License, shipped under `app/fonts/`).
- **Undo / redo** for every edit, with Ctrl+Z / Ctrl+Shift+Z.
- **Export PNG** in 1080×1080, 1080×1350 and 1920×1080.

## Run it

Static files, no build step, no network. Serve `app/` and open it:

```sh
node serve.ts
# then open http://localhost:8080
```

Everything runs offline in a desktop browser; photos are read on your own machine and never uploaded.

## Originality

All art and lettering is original. No Rockstar Games logo, wordmark, official artwork, character or font is used. The two sample photos under `app/samples/` were made with an image model for make.fun and are free to use.

## License

MIT — see [LICENSE](LICENSE).
