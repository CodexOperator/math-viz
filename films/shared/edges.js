// drawEdges('#svg'): draw child->parent links between elements with data-id, from <svg data-edges="child>parent,*hot>parent">.
// Default grammar = the Manim tree (M3.1b): ELBOW edges, no arrowheads: up from the child's top to a bus just above the
// child row, across to the parent's centre, up into the parent's bottom. data-mode="straight" draws direct lines;
// data-arrows="1" adds arrowheads at the parent. Edges get class "edge" so qa.js can test them against text boxes.
// Re-run after layout changes (it measures the DOM). A '*' marks a hot (highlighted) edge.
function drawEdges(svgSel){const svg=document.querySelector(svgSel);const host=svg.parentElement.getBoundingClientRect();
 const mode=svg.dataset.mode||'elbow',arrows=svg.dataset.arrows==='1',NS='http://www.w3.org/2000/svg';
 svg.innerHTML=arrows?'<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#8C8F98"/></marker><marker id="ahy" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#E7CE6C"/></marker></defs>':'';
 for(const pair of (svg.dataset.edges||'').split(',').filter(Boolean)){const hot=pair.startsWith('*');const [c,p]=pair.replace('*','').split('>');
  const ce=document.querySelector('[data-id="'+CSS.escape(c)+'"]'),pe=document.querySelector('[data-id="'+CSS.escape(p)+'"]');
  if(!ce||!pe)throw new Error('drawEdges: no element for '+(!ce?c:p));
  const a=ce.getBoundingClientRect(),b=pe.getBoundingClientRect();
  const x1=a.left+a.width/2-host.left,y1=a.top-host.top-1,x2=b.left+b.width/2-host.left,y2=b.bottom-host.top+(arrows?3:1);
  const el=document.createElementNS(NS,'path');
  const d=mode==='straight'?`M${x1},${y1}L${x2},${y2}`:`M${x1},${y1}V${a.top-host.top-18}H${x2}V${y2}`;   // bus 18 px above the child
  const at={d,fill:'none',stroke:hot?'#E7CE6C':'#8C8F98','stroke-width':hot?2.6:1.8};if(arrows)at['marker-end']=hot?'url(#ahy)':'url(#ah)';
  Object.entries(at).forEach(([k,v])=>el.setAttribute(k,v));el.setAttribute('class','edge'+(hot?' hot':''));svg.appendChild(el);}}
