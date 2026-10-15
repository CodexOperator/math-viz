import * as S from '../../../../../js/core/shapes.js';
import * as M from '../../../../../js/core/mapping.js';
import { compile } from '../../../../../js/core/parse.js';
const C=(re,im=0)=>({re,im});
const f=compile('sqrt(z)').f;
let seed=5;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
// hand-drawn stroke along the negative real axis with jitter
for(const jit of [0.002,0.01,0.03]){
 const pts=[];for(let i=0;i<60;i++)pts.push(C(-3+i*0.04,(rnd()-.5)*2*jit));
 const c=S.freehand(pts,{minDist:0.01});const o=M.pushForward(c,f);
 console.log('jitter',jit,'pts',c.points.length,'pieces',o.length,o.map(p=>p.points.length).join(','));
}
// stroke that wanders across the cut a few times
const pts=[];for(let i=0;i<80;i++)pts.push(C(-2+0.03*i*Math.cos(0.1),0.5*Math.sin(i*0.35)));
const c=S.freehand(pts,{minDist:0.01});const o=M.pushForward(c,f);
let crossings=0;for(let i=1;i<c.points.length;i++){const a=c.points[i-1],b=c.points[i];if(a.re<0&&b.re<0&&(a.im>0)!==(b.im>0))crossings++;}
console.log('wavy stroke crossings of neg axis',crossings,'pieces',o.length);
// largest step in output pieces
console.log('max step',Math.max(...o.flatMap(p=>p.points.slice(1).map((q,i)=>Math.hypot(q.re-p.points[i].re,q.im-p.points[i].im)))).toFixed(3));
const ct=[];for(let i=1;i<c.points.length;i++){const a=c.points[i-1],b=c.points[i];if(a.re<0&&b.re<0&&(a.im>0)!==(b.im>0))ct.push([i-1,i,+a.t.toFixed(3)]);}
console.log('crossing at indexes/t',JSON.stringify(ct));
console.log('piece t-ranges',o.map(p=>[+p.points[0].t.toFixed(3),+p.points[p.points.length-1].t.toFixed(3),p.points.length]).map(x=>x.join('-')).join(' | '));
console.log('input points',c.points.length, 'first/last',c.points[0],c.points[c.points.length-1]);
