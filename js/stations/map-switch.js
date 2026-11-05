// js/stations/map-switch.js — the "which test" control on a thread home.
// Each test is a hash, so Back returns to the page you left.

import { MAPS, normalizeMapId } from '../registry.js';

export function mapSwitch(ctx, idPrefix) {
  const current = normalizeMapId(ctx && ctx.map);
  const block = document.createElement('div');
  block.className = 'map-switch-block';

  const label = document.createElement('p');
  label.className = 'map-switch-label';
  label.id = `${idPrefix}-label`;
  label.textContent = 'Which test';

  const wrap = document.createElement('div');
  wrap.className = 'map-switch';
  wrap.id = idPrefix;
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-labelledby', label.id);

  for (const m of MAPS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.id = `${idPrefix}-${m.id}`;
    b.title = m.note;
    b.setAttribute('aria-pressed', m.id === current ? 'true' : 'false');
    b.dataset.map = m.id;
    b.textContent = m.title;
    b.addEventListener('click', () => {
      if (m.id === current) return;
      const hash = m.id === 'test2' ? '#home-f2' : '#home-t1';
      if (location.hash === hash) {
        if (ctx && ctx.navigate) ctx.navigate(hash);
      } else {
        location.hash = hash;
      }
    });
    wrap.append(b);
  }

  block.append(label, wrap);
  return block;
}
