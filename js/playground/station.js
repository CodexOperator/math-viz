// The story map opens this place. The void is its own page, so the shell steps aside.

export function mount(el) {
  const href = new URL('playground.html', document.baseURI).href;
  const p = document.createElement('p');
  const a = document.createElement('a');
  a.id = 'playground-open';
  a.href = href;
  a.textContent = 'Playground';
  p.append(a);
  el.replaceChildren(p);
  try { location.replace(href); } catch { /* the link stays */ }
  return function unmount() {};
}
