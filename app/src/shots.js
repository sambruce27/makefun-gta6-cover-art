// Fixed scenes for screenshots. `?shot=editor` shows the page with sample
// photos loaded; `?shot=cover` shows the cover alone, filling the viewport.
// `photo` picks which sample leads the panels (samples/<photo>.jpg),
// `caption` the title, `layout` and `grade` pick those, `size` picks the
// preview/export size. window.__shotReady is set once the cover is painted.
export async function runShot(shot, query, apply) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const caption = query.get('caption') ?? 'Sunset Heist';
  const lead = query.get('photo') ?? 'pier';
  const other = lead === 'boulevard' ? 0 : 1;
  const leadIdx = lead === 'boulevard' ? 1 : 0;

  await apply({
    state: {
      layout: query.get('layout') ?? 'quad',
      grade: query.get('grade') ?? 'sunset',
      kicker: query.get('kicker') ?? 'VICE HEAT',
      title: caption,
      subtitle: query.get('subtitle') ?? 'LEONIDA - ONE LAST SCORE',
      panels: [
        { photo: leadIdx, scale: 1, dx: 0, dy: 0 },
        { photo: other, scale: 1, dx: 0, dy: 0 },
        { photo: leadIdx, scale: 1.1, dx: 0, dy: 0 },
        { photo: other, scale: 1, dx: 0, dy: 0 },
      ],
    },
    size: query.get('size') ?? '1080x1080',
  });

  if (document.fonts) {
    try { await document.fonts.load('100px Anton'); } catch { /* fallback face */ }
    try { await document.fonts.ready; } catch { /* fallback face */ }
  }
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
