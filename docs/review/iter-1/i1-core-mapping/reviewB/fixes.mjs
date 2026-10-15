import * as S from '../../../../../js/core/shapes.js';
import * as M from '../../../../../js/core/mapping.js';
import * as D from '../../../../../js/core/domaincolor.js';
import { compile } from '../../../../../js/core/parse.js';
const C=(re,im=0)=>({re,im});
const f=(s)=>compile(s).f;
const maxStep=(pcs)=>Math.max(...pcs.flatMap(p=>p.points.slice(1).map((q,i)=>Math.hypot(q.re-p.points[i].re,q.im-p.points[i].im))));
// 1
for(const src of ['sqrt(z)','z^(1/3)','z^(2/3)']){
 const v=S.verticalLine(-1,{yRange:[-1,1]});const o=M.pushForward(v,f(src));
 console.log(src,'x=-1 pieces',o.length,'longest step',maxStep(o).toFixed(3));
}
let o=M.pushForward(S.rect(C(-1,-.8),C(1,.8)),f('sqrt(z)')); console.log('rect sqrt',o.length,o.map(p=>p.closed),'gap',M.pointOnPieces(o,0.5));
o=M.pushForward(S.circle(C(0),1),f('sqrt(z)')); console.log('circle sqrt',o.length,o.map(p=>[p.closed,p.points.length]), 'maxstep',maxStep(o).toFixed(3));
// find t of gap: circle: t=.5 is theta=pi
console.log('pointOnPieces at .5',M.pointOnPieces(o,0.5),'at .25',M.pointOnPieces(o,.25));
o=M.pushForward(S.segment(C(-2,-2),C(0,2)),f('z^(1/3)'));console.log('diag through -1 z^(1/3)',o.length);
o=M.pushForward(S.segment(C(-3,-1),C(1,1)),f('z^(1/3)'));console.log('diag crossing neg axis -1 z^(1/3)',o.length, maxStep(o).toFixed(3));
// M4
o=M.pushForward(S.segment(C(-1),C(1),{n:3}),z=>{const d=z.re*z.re+z.im*z.im;return {re:z.re/d,im:-z.im/d};});console.log('M4 seg n3 1/z pieces',o.length,o.map(p=>p.points.length));
// 3 refine flags
// 4
console.log('colorXY big',D.colorXY(1e155,0),D.colorXY(1e200,1e200),D.colorXY(1e155,0,[0,0,0],false),D.colorXY(Infinity,0),D.colorXY(NaN,1), D.colorXY(1e-300,1e-300));
console.log('colorOf huge',D.colorOf({re:1e308,im:1e308}));
// 5 perf
const big=S.circle(C(0),1,{n:5000}); let t0=performance.now(); let k=S.classify(big); console.log('classify 5000 circle ms',(performance.now()-t0).toFixed(1),JSON.stringify(k));
t0=performance.now();k=S.classify(big);console.log('warm',(performance.now()-t0).toFixed(1));
// spiral
const sp=S.freehand(Array.from({length:5000},(_,i)=>{const th=i*0.02;const r=0.01*th;return C(r*Math.cos(th),r*Math.sin(th));}),{minDist:0}); t0=performance.now();k=S.classify(sp);console.log('spiral 5000 ms',(performance.now()-t0).toFixed(1),JSON.stringify(k));
// a self-crossing in a 5000-pt stroke must still be detected (cap decimation issue)
const pts=[];for(let i=0;i<=5000;i++){const t=2*Math.PI*i/5000;pts.push(C(Math.sin(t),Math.sin(t)*Math.cos(t)));}
t0=performance.now();k=S.classify(S.freehand(pts,{minDist:0}));console.log('figure-eight 5000 ms',(performance.now()-t0).toFixed(1),JSON.stringify(k));
// small loop on long stroke: lasso
// 6
console.log('lopsided',S.classify(S.polygon([C(0),C(2,2),C(3),C(0,3)])).orientation);
// 7 null guards
const calls=[()=>S.segment(),()=>S.circle(),()=>S.rect(),()=>S.polygon(),()=>S.polygon(null),()=>S.verticalLine(),()=>S.horizontalLine(),()=>S.ray(),()=>S.cartGrid(),()=>S.polarGrid(),()=>S.sector(),()=>S.sector(null),()=>S.annulus(),()=>S.freehand(),()=>S.freehand(null),()=>S.reverse(),()=>S.reverse(null),()=>S.resample(),()=>S.resample(null,5),()=>S.pointAt(),()=>S.pointAt(null,.5),()=>S.classify(),()=>S.classify(null),()=>S.classify({}),()=>M.pushForward(),()=>M.pushForward(null,null),()=>M.pushForwardAll(),()=>M.pushForwardAll(null,null),()=>M.morph(),()=>M.morph(null,.5,null),()=>M.morph(null,0,null),()=>M.morphPoint(),()=>M.bounds(),()=>M.bounds(null),()=>M.lift(),()=>M.lift(null,null),()=>M.pointOnPieces(),()=>D.hueOf(),()=>D.hueOf(null),()=>D.lightnessOf(),()=>D.colorOf(),()=>D.colorOf(null),()=>D.rangesFromView(),()=>D.colorXY()];
let thr=0;calls.forEach((c,i)=>{try{c();}catch(e){thr++;console.log('THROWS',i,c.toString(),e.message);}});console.log('guards throws',thr);
// 8
const cc=S.circle(C(0),1);cc.id='c1';console.log('morph0 id',M.morph(cc,0,f('z^2'))[0].id,M.morph(cc,0.5,f('z^2'))[0].id);
// 10
console.log(S.polygon([C(1,1)]).label,'| sector n=1:',S.sector({theta0:0,theta1:1,n:1})[0].points.length);
