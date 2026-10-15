import * as S from '../../../../../js/core/shapes.js';
import * as M from '../../../../../js/core/mapping.js';
const C=(re,im=0)=>({re,im});
const inv=z=>{const d=z.re*z.re+z.im*z.im;return {re:z.re/d,im:-z.im/d};};
for(const n of [16,32,64,96,128,200,256,512]){
  const o=M.pushForward(S.circle(C(1),1,{n}),inv);
  const err=Math.max(...o.flatMap(p=>p.points.map(q=>Math.abs(q.re-0.5))));
  console.log('n',n,'pieces',o.length,'pts',o.reduce((a,p)=>a+p.points.length,0),'max |Re w-0.5|',err.toExponential(2),'max|w|',Math.max(...o.flatMap(p=>p.points.map(q=>Math.hypot(q.re,q.im)))).toFixed(1));
}
