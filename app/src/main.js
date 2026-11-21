// Vice Cover Studio — wires the page: pick photos, choose a layout and a
// colour grade, crop each panel, edit the lettering, undo/redo, and export
// the cover as a PNG in the common post sizes. A `?shot=` query sets up a
// fixed scene for a screenshot instead (./shots.js).
import { drawCover, renderCoverAt, layoutRects, panelAt, LAYOUTS, GRADES } from './cover.js';
import { freshState, createHistory } from './state.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const state = freshState();
const history = createHistory(state);

// The loaded photos, by slot. Slots start with the two bundled samples so
// the app opens with a finished-looking cover; slots 2 and 3 wait for the
// user's own photos. Photos are read on this machine and never uploaded.
const photos = [null, null, null, null];
let selectedPanel = 0;
let previewSize = '1080x1080';

const $ = (id) => document.getElementById(id);

function setStatus(text) {
  statusEl.textContent = text;
}

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function drawState() {
  return { ...state, photos };
}

function redraw() {
  drawCover(canvas, drawState());
  // Outline the selected panel so cropping has a visible target — never in
  // the cover-only screenshot scene, where the cover must stand alone.
  if (document.body.classList.contains('shot-cover')) {
    syncPanelControls();
    return;
  }
  const rects = layoutRects(state.layout, canvas.width, canvas.height);
  const rect = rects[selectedPanel];
  if (rect) {
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(3, canvas.width * 0.004);
    ctx.setLineDash([14, 10]);
    ctx.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
    ctx.restore();
  }
  syncPanelControls();
}

function syncPanelControls() {
  const panel = state.panels[selectedPanel];
  $('panelName').textContent = String(selectedPanel + 1);
  $('zoom').value = panel.scale;
  $('panX').value = panel.dx;
  $('panY').value = panel.dy;
  $('undo').disabled = !history.canUndo();
  $('redo').disabled = !history.canRedo();
}

// --- layout and grade buttons ---------------------------------------------

function buildChoiceButtons(hostId, choices, current, onPick) {
  const host = $(hostId);
  host.innerHTML = '';
  for (const [key, def] of Object.entries(choices)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = def.label;
    button.className = 'choice';
    button.setAttribute('aria-pressed', String(key === current));
    button.addEventListener('click', () => {
      onPick(key);
      host.querySelectorAll('.choice').forEach((b) => {
        b.setAttribute('aria-pressed', String(b === button));
      });
    });
    host.appendChild(button);
  }
}

buildChoiceButtons('layouts', LAYOUTS, state.layout, (key) => {
  history.commit();
  state.layout = key;
  const visible = layoutRects(key, canvas.width, canvas.height);
  if (!visible[selectedPanel]) selectedPanel = visible.findIndex(Boolean);
  redraw();
});

buildChoiceButtons('grades', GRADES, state.grade, (key) => {
  history.commit();
  state.grade = key;
  redraw();
});

// --- photo slots ------------------------------------------------------------

function renderSlots() {
  const host = $('slots');
  host.innerHTML = '';
  photos.forEach((photo, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'slot';
    button.title = photo ? `Photo ${i + 1}: place in the selected panel` : `Photo ${i + 1}: empty`;
    if (photo) {
      button.style.backgroundImage = `url(${photo.src})`;
      button.textContent = String(i + 1);
    } else {
      button.textContent = `+ ${i + 1}`;
    }
    button.addEventListener('click', () => {
      if (!photo) {
        $('photoFile').click();
        return;
      }
      history.commit();
      state.panels[selectedPanel].photo = i;
      redraw();
      setStatus(`Photo ${i + 1} placed in panel ${selectedPanel + 1}.`);
    });
    host.appendChild(button);
  });
}

async function addPhotoFiles(files) {
  let added = 0;
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const free = photos.findIndex((p) => !p);
    if (free === -1) break;
    photos[free] = await loadImage(URL.createObjectURL(file));
    added += 1;
  }
  renderSlots();
  if (added) {
    redraw();
    setStatus(`${added} photo${added > 1 ? 's' : ''} added. Click a slot, then a panel, to place it.`);
  } else {
    setStatus('All four photo slots are full — replace one by picking a new file after clearing it.');
  }
}

$('addPhoto').addEventListener('click', () => $('photoFile').click());
$('photoFile').addEventListener('change', (e) => {
  addPhotoFiles([...e.target.files]);
  e.target.value = '';
});

$('fillAll').addEventListener('click', () => {
  const loaded = photos.map((p, i) => (p ? i : -1)).filter((i) => i >= 0);
  if (!loaded.length) {
    setStatus('Add a photo first — the samples below already fill two panels.');
    return;
  }
  history.commit();
  const visible = layoutRects(state.layout, canvas.width, canvas.height);
  visible.forEach((rect, i) => {
    if (!rect) return;
    state.panels[i].photo = loaded[i % loaded.length];
  });
  redraw();
  setStatus('All panels filled.');
});

// --- panel cropping ---------------------------------------------------------

function bindPanelSlider(id, key) {
  const input = $(id);
  let beforeDrag = null;
  // Grab the pre-edit snapshot before the drag changes anything.
  const arm = () => { beforeDrag = JSON.stringify(state); };
  input.addEventListener('pointerdown', arm);
  input.addEventListener('keydown', arm);
  input.addEventListener('focus', arm);
  input.addEventListener('input', () => {
    if (beforeDrag === null) beforeDrag = JSON.stringify(state);
    state.panels[selectedPanel][key] = Number(input.value);
    redraw();
  });
  input.addEventListener('change', () => {
    // One history entry per drag, holding the state from before it.
    if (beforeDrag !== null && beforeDrag !== JSON.stringify(state)) {
      history.pushSnapshot(beforeDrag);
    }
    beforeDrag = null;
    syncPanelControls();
  });
}

bindPanelSlider('zoom', 'scale');
bindPanelSlider('panX', 'dx');
bindPanelSlider('panY', 'dy');

$('fitPanel').addEventListener('click', () => {
  history.commit();
  state.panels[selectedPanel].scale = 1;
  state.panels[selectedPanel].dx = 0;
  state.panels[selectedPanel].dy = 0;
  redraw();
});

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
  const hit = panelAt(state.layout, x, y, canvas.width, canvas.height);
  if (hit >= 0) {
    selectedPanel = hit;
    redraw();
    setStatus(`Panel ${hit + 1} selected — crop it with the sliders.`);
  }
});

// --- lettering --------------------------------------------------------------

function bindText(id, key) {
  let beforeEdit = null;
  $(id).addEventListener('focus', () => { beforeEdit = JSON.stringify(state); });
  $(id).addEventListener('input', () => {
    if (beforeEdit === null) beforeEdit = JSON.stringify(state);
    state[key] = $(id).value;
    redraw();
  });
  $(id).addEventListener('change', () => {
    if (beforeEdit !== null && beforeEdit !== JSON.stringify(state)) {
      history.pushSnapshot(beforeEdit);
    }
    beforeEdit = null;
    syncPanelControls();
  });
}

bindText('kicker', 'kicker');
bindText('title', 'title');
bindText('subtitle', 'subtitle');

// --- undo / redo --------------------------------------------------------------

$('undo').addEventListener('click', () => {
  if (history.undo()) {
    $('kicker').value = state.kicker;
    $('title').value = state.title;
    $('subtitle').value = state.subtitle;
    redraw();
  }
});
$('redo').addEventListener('click', () => {
  if (history.redo()) {
    $('kicker').value = state.kicker;
    $('title').value = state.title;
    $('subtitle').value = state.subtitle;
    redraw();
  }
});
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (e.shiftKey) $('redo').click();
    else $('undo').click();
  }
});

// --- preview size and export --------------------------------------------------

const PREVIEW_SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

function setPreviewSize(key) {
  previewSize = key;
  const [w, h] = PREVIEW_SIZES[key];
  canvas.width = w;
  canvas.height = h;
  document.querySelectorAll('.size').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.size === key));
  });
  redraw();
}

document.querySelectorAll('.size').forEach((button) => {
  button.addEventListener('click', () => setPreviewSize(button.dataset.size));
});

function exportCover(sizeKey) {
  const [w, h] = PREVIEW_SIZES[sizeKey];
  const out = renderCoverAt(w, h, drawState());
  out.toBlob((blob) => {
    if (!blob) {
      setStatus('Export failed — try again.');
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setStatus(`Saved vice-cover-${w}x${h}.png`);
  }, 'image/png');
}

document.querySelectorAll('.export').forEach((button) => {
  button.addEventListener('click', () => exportCover(button.dataset.size));
});

// --- boot ---------------------------------------------------------------------

async function boot() {
  renderSlots();
  // Bundled samples so the first screen already shows a finished cover.
  try {
    photos[0] = await loadImage('samples/pier.jpg');
    photos[1] = await loadImage('samples/boulevard.jpg');
  } catch {
    setStatus('Sample photos could not be loaded — add your own photo to begin.');
  }
  renderSlots();
  // The display font for the title: redraw once it arrives so the first
  // paint is not stuck in the fallback face.
  if (document.fonts) {
    document.fonts.load('100px Anton').catch(() => {});
    document.fonts.ready.then(redraw).catch(() => {});
  }
  const query = new URLSearchParams(location.search);
  if (query.get('shot')) {
    runShot(query.get('shot'), query, async (setup) => {
      Object.assign(state, setup.state || {});
      $('kicker').value = state.kicker;
      $('title').value = state.title;
      $('subtitle').value = state.subtitle;
      if (setup.size) setPreviewSize(setup.size);
      redraw();
    });
  } else {
    redraw();
  }
}

boot();
