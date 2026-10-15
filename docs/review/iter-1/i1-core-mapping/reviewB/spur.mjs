import * as S from '../../../../../js/core/shapes.js';
import * as M from '../../../../../js/core/mapping.js';
import { compile } from '../../../../../js/core/parse.js';
let seed=777; const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const C=(re,im=0)=>({re,im});
const ST=[];
for(let k=0;k<400;k++){const a=C((rnd()-.5)*5,(rnd()-.5)*5), b=C((rnd()-.5)*5,(rnd()-.5)*5);ST.push(S.segment(a,b,{n:2+Math.floor(rnd()*100)}));}
for(let k=0;k<150;k++) ST.push(S.circle(C((rnd()-.5)*2,(rnd()-.5)*2),0.3+rnd()*2,{n:8+Math.floor(rnd()*200)}));
for(let k=0;k<150;k++){const a=C((rnd()-.5)*4,(rnd()-.5)*4);ST.push(S.rect(a,C(a.re+0.3+rnd()*3,a.im+0.3+rnd()*3),{nPerSide:1+Math.floor(rnd()*40)}));}
for(let k=0;k<150;k++){const pts=[];let x=(rnd()-.5)*4,y=(rnd()-.5)*4,th=rnd()*6.28;for(let i=0;i<20+Math.floor(rnd()*200);i++){th+=(rnd()-.5)*1.2;const st=0.01+rnd()*0.2;x+=st*Math.cos(th);y+=st*Math.sin(th);pts.push(C(x,y));}ST.push(S.freehand(pts,{minDist:0.01}));}
for(const src of ['z^2','z^3','z^4+z','exp(z)','sin(z)','cos(z)','conj(z)','z^2+i*z','(1+i)*z','abs(z)^2','Re(z)+0*i']){
  const f=compile(src).f; let spur=0,multi=0;
  for(const c of ST){
    const pcs=M.pushForward(c,f);
    if(pcs.length>1){multi++;
      // legit only if some densified sample exceeds clamp
      let over=false;for(const p of c.points){const w=f(p);if(!(Math.hypot(w.re,w.im)<=40))over=true;}
      // also refined points; test fine sampling
      if(!over){for(let s=0;s<=2000;s++){const w=f(S.pointAt(c,s/2000));if(!(Math.hypot(w.re,w.im)<=40)){over=true;break;}}}
      if(!over)spur++;}
  }
  console.log(src.padEnd(12),'strokes',ST.length,'multi-piece',multi,'spurious',spur);
}
