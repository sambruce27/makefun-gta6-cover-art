// Vice Cover Studio — the program that hands this entry in (Node 22,
// standard library only). The app is this directory's app/ folder: plain
// static files a desktop browser loads offline (app/index.html and its ES
// modules, no library and no network request). This program copies app/ and
// screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored
// make.fun library.
//
// The app itself: a multi-panel, GTA-poster-style cover maker. Pick one of
// four layouts (four panels, hero plus three, three columns, single hero),
// a colour grade (sunset, neon, vice pink, noir), place up to four of your
// own photos into the panels, crop and position each panel, edit the
// kicker, title and subtitle, undo and redo, and export the cover as a PNG
// in 1080 x 1080, 1080 x 1350 or 1920 x 1080. Its two sample photos
// (app/samples/) were made for make.fun with an image model and are free to
// use; its title font, Anton, ships under app/fonts/ under the SIL Open
// Font License. No Rockstar logo, artwork or font is used.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of app
// files, in all, or a path under app/ over 1000 bytes: app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

// One line on stdout so the run can be checked at a glance: how many app
// files were handed in and how big the dossier came out.
const appFiles = readdirSync(join(out, 'app'), { recursive: true })
  .filter((f) => statSync(join(out, 'app', String(f))).isFile());
console.log(
  `vice-cover-studio: ${appFiles.length} app files, ` +
  `dossier ${statSync(join(out, 'dossier.json')).size} bytes -> ${out}`,
);
