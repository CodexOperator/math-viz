// js/stations/map-switch.js — the "which test" control on the home page.
// The nav builds its own copy (app.js keeps its import list small). Both write the same store key.

import { MAPS, MAP_STORAGE_KEY, normalizeMapId } from '../registry.js';

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
      if (ctx && ctx.store) ctx.store.set(MAP_STORAGE_KEY, m.id);
      if (ctx && ctx.navigate) ctx.navigate('home');
    });
    wrap.append(b);
  }

  block.append(label, wrap);
  return block;
}
