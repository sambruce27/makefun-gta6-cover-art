// Vice Cover Studio — cover renderer.
//
// Draws a multi-panel, GTA-poster-style cover onto a canvas: the photos are
// placed into a layout of panels, each panel gets a colour grade (sunset,
// neon, vice pink or noir), then grain, a vignette and bold lettering are
// laid over the top. Everything is drawn with the canvas 2D API, no network
// and no library; the same draw path renders the on-screen preview and the
// exported PNGs, so what you see is what you get.
//
// The lettering uses Anton, an open font shipped under app/fonts/ (SIL Open
// Font License). No Rockstar logo, artwork or font is used anywhere.

export const LAYOUTS = {
  quad: {
    label: 'Four panels',
    // Four equal panels, two by two.
    rects: [
      [0, 0, 0.5, 0.5],
      [0.5, 0, 0.5, 0.5],
      [0, 0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5, 0.5],
    ],
  },
  hero3: {
    label: 'Hero + three',
    // One tall hero on the left, three stacked panels on the right.
    rects: [
      [0, 0, 0.62, 1],
      [0.62, 0, 0.38, 1 / 3],
      [0.62, 1 / 3, 0.38, 1 / 3],
      [0.62, 2 / 3, 0.38, 1 / 3],
    ],
  },
  trio: {
    label: 'Three columns',
    // Three tall panels side by side.
    rects: [
      [0, 0, 1 / 3, 1],
      [1 / 3, 0, 1 / 3, 1],
      [2 / 3, 0, 1 / 3, 1],
      null, // the fourth slot stays empty in this layout
    ],
  },
  single: {
    label: 'Single hero',
    // One photo filling the whole cover, lettering over the foot.
    rects: [
      [0, 0, 1, 1],
      null,
      null,
      null,
    ],
  },
};

export const GRADES = {
  sunset: {
    label: 'Sunset',
    filter: 'saturate(1.25) contrast(1.06)',
    accent: '#ffb347',
    // Warm orange rising from the foot into magenta.
    overlay(ctx, w, h) {
      const g = ctx.createLinearGradient(0, h * 0.3, 0, h);
      g.addColorStop(0, 'rgba(255, 120, 60, 0)');
      g.addColorStop(0.6, 'rgba(255, 110, 60, 0.22)');
      g.addColorStop(1, 'rgba(190, 30, 110, 0.48)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },
  neon: {
    label: 'Neon',
    filter: 'saturate(1.45) contrast(1.1)',
    accent: '#00e5ff',
    // Cyan from one corner, magenta from the other.
    overlay(ctx, w, h) {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, 'rgba(0, 229, 255, 0.20)');
      g.addColorStop(0.5, 'rgba(120, 40, 220, 0.10)');
      g.addColorStop(1, 'rgba(255, 0, 128, 0.34)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },
  vice: {
    label: 'Vice pink',
    filter: 'saturate(1.3) contrast(1.05)',
    accent: '#ff2d95',
    overlay(ctx, w, h) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(150, 40, 200, 0.28)');
      g.addColorStop(0.55, 'rgba(255, 45, 149, 0.12)');
      g.addColorStop(1, 'rgba(255, 45, 149, 0.42)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },
  noir: {
    label: 'Noir',
    filter: 'saturate(0.5) contrast(1.18) brightness(0.94)',
    accent: '#7fe7d2',
    overlay(ctx, w, h) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(0, 60, 80, 0.30)');
      g.addColorStop(1, 'rgba(5, 5, 15, 0.55)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },
};

// The panel rectangles of a layout, in canvas pixels, with a thin gutter
// between panels so the grid reads as separate frames.
export function layoutRects(layout, w, h) {
  const gutter = Math.max(4, Math.round(w * 0.006));
  return LAYOUTS[layout].rects.map((r) => {
    if (!r) return null;
    const x = r[0] * w + (r[0] > 0 ? gutter / 2 : 0);
    const y = r[1] * h + (r[1] > 0 ? gutter / 2 : 0);
    const rw = r[2] * w - (r[0] > 0 ? gutter / 2 : 0) - (r[0] + r[2] < 1 ? gutter / 2 : 0);
    const rh = r[3] * h - (r[1] > 0 ? gutter / 2 : 0) - (r[1] + r[3] < 1 ? gutter / 2 : 0);
    return { x, y, w: rw, h: rh };
  });
}

// Which panel, if any, holds the point (x, y) in canvas pixels.
export function panelAt(layout, x, y, w, h) {
  const rects = layoutRects(layout, w, h);
  for (let i = 0; i < rects.length; i += 1) {
    const r = rects[i];
    if (r && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return i;
  }
  return -1;
}

// One noise tile, built once and stamped over the cover for film grain.
let noiseTile = null;
function getNoiseTile() {
  if (noiseTile) return noiseTile;
  const size = 192;
  noiseTile = document.createElement('canvas');
  noiseTile.width = size;
  noiseTile.height = size;
  const nctx = noiseTile.getContext('2d');
  const img = nctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  nctx.putImageData(img, 0, 0);
  return noiseTile;
}

// Draws one photo into one panel rect: cover-fit, then the panel's zoom and
// pan (dx, dy are fractions of the panel size, -0.5..0.5).
function drawPanel(ctx, photo, rect, panel, grade) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.fillStyle = '#241a30';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  if (photo) {
    const base = Math.max(rect.w / photo.naturalWidth, rect.h / photo.naturalHeight);
    const scale = base * (panel.scale || 1);
    const dw = photo.naturalWidth * scale;
    const dh = photo.naturalHeight * scale;
    const dx = rect.x + (rect.w - dw) / 2 + (panel.dx || 0) * rect.w;
    const dy = rect.y + (rect.h - dh) / 2 + (panel.dy || 0) * rect.h;
    ctx.filter = grade.filter;
    ctx.drawImage(photo, dx, dy, dw, dh);
    ctx.filter = 'none';
  }
  grade.overlay(ctx, rect.w, rect.h);
  ctx.restore();
}

// Bold display type with a heavy outline and a hard drop shadow, fitted to
// one line across `maxWidth` by shrinking the size.
function drawTitle(ctx, text, cx, baselineY, maxWidth, size) {
  let s = size;
  ctx.font = `${s}px Anton, 'Arial Narrow', sans-serif`;
  while (ctx.measureText(text).width > maxWidth && s > 14) {
    s -= 2;
    ctx.font = `${s}px Anton, 'Arial Narrow', sans-serif`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#160409';
  ctx.lineWidth = Math.max(3, s * 0.09);
  ctx.strokeText(text, cx, baselineY);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, cx, baselineY);
  return s;
}

/**
 * Draws the whole cover for `state` onto `canvas` (at the canvas's own
 * size). state: { layout, grade, title, subtitle, kicker, panels, photos }
 * panels[i] = { photo, scale, dx, dy }; photos[j] is an image or null.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const rects = layoutRects(state.layout, w, h);

  ctx.fillStyle = '#0e0a14';
  ctx.fillRect(0, 0, w, h);
  rects.forEach((rect, i) => {
    if (!rect) return;
    const panel = state.panels[i] || { photo: -1, scale: 1, dx: 0, dy: 0 };
    const photo = panel.photo >= 0 ? state.photos[panel.photo] : null;
    drawPanel(ctx, photo, rect, panel, grade);
  });

  // Grain over the whole cover, then a vignette to pull the edges in.
  const tile = getNoiseTile();
  const pattern = ctx.createPattern(tile, 'repeat');
  ctx.save();
  ctx.globalAlpha = 0.09;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  const vig = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  vig.addColorStop(0, 'rgba(8, 2, 16, 0)');
  vig.addColorStop(1, 'rgba(8, 2, 16, 0.55)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  // Lettering band: a dark gradient rising from the foot, an accent rule,
  // kicker, big title and subtitle.
  const band = ctx.createLinearGradient(0, h * 0.62, 0, h);
  band.addColorStop(0, 'rgba(10, 4, 18, 0)');
  band.addColorStop(1, 'rgba(10, 4, 18, 0.88)');
  ctx.fillStyle = band;
  ctx.fillRect(0, h * 0.62, w, h * 0.38);

  const pad = w * 0.05;
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim().toUpperCase();
  const kicker = (state.kicker || '').trim().toUpperCase();
  const titleY = h - h * 0.085;

  ctx.fillStyle = grade.accent;
  ctx.fillRect(pad, titleY - h * 0.155, Math.min(w * 0.16, 150), Math.max(3, h * 0.008));
  if (kicker) {
    const ks = Math.max(12, h * 0.026);
    ctx.font = `700 ${ks}px system-ui, sans-serif`;
    try { ctx.letterSpacing = `${Math.max(2, ks * 0.22)}px`; } catch { /* older canvas */ }
    ctx.textAlign = 'left';
    ctx.fillStyle = grade.accent;
    ctx.fillText(kicker, pad, titleY - h * 0.125);
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  }
  if (title) {
    drawTitle(ctx, title, w / 2, titleY, w - pad * 2, h * 0.115);
  }
  if (subtitle) {
    const ss = Math.max(11, h * 0.024);
    ctx.font = `600 ${ss}px system-ui, sans-serif`;
    try { ctx.letterSpacing = `${Math.max(2, ss * 0.18)}px`; } catch { /* older canvas */ }
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.fillText(subtitle, w / 2, h - h * 0.028);
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  }
}

// Renders the cover for `state` at an export size and returns the canvas.
export function renderCoverAt(width, height, state) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawCover(canvas, state);
  return canvas;
}
