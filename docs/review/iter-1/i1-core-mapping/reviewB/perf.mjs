import * as S from '../../../../../js/core/shapes.js';
import * as M from '../../../../../js/core/mapping.js';
import { compile } from '../../../../../js/core/parse.js';
const C=(re,im=0)=>({re,im});
const time=(label,fn,reps=20)=>{fn();const t0=performance.now();for(let i=0;i<reps;i++)fn();const ms=(performance.now()-t0)/reps;console.log(label.padEnd(48),ms.toFixed(2),'ms');};
const grid=[...S.cartGrid({xRange:[-3,3],yRange:[-3,3],step:0.5}),...S.polarGrid({rMax:3,rings:6,rays:16})];
console.log('grid curves',grid.length);
for(const src of ['z^2','sin(z)','1/z','sqrt(z)','exp(z)','z^3','log(z)']){
  const f=compile(src).f;
  time(`pushForwardAll grid  ${src}`,()=>M.pushForwardAll(grid,f));
  time(`morph s=.5 all grid  ${src}`,()=>{for(const c of grid)M.morph(c,0.5,f);});
}
const pts=[];let x=0,y=0,th=0;for(let i=0;i<5000;i++){th+=(Math.random()-.5)*.4;x+=0.01*Math.cos(th);y+=0.01*Math.sin(th);pts.push(C(x,y));}
const fh=S.freehand(pts,{minDist:0});console.log('freehand pts',fh.points.length);
for(const src of ['z^2','1/z','sqrt(z)','sin(z)']){const f=compile(src).f;time(`pushForward 5000-pt freehand ${src}`,()=>M.pushForward(fh,f),10);}
const rc=S.rect(C(-2,-2),C(2,2),{nPerSide:500});
time('classify rect 2000pts',()=>S.classify(rc));
// morph near-seam band
const f=compile('sqrt(z)').f; const v=S.verticalLine(-1,{yRange:[-1,1]});
for(const s of [0.02,0.05,0.1,0.2,0.3,0.5,0.9]) console.log('morph sqrt x=-1 s=',s,'pieces',M.morph(v,s,f).length);
