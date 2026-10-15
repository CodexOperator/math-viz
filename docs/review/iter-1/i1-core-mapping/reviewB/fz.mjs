import * as S from '../../../../../js/core/shapes.js';
import * as M from '../../../../../js/core/mapping.js';
import { compile } from '../../../../../js/core/parse.js';
let seed=12345; const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const C=(re,im=0)=>({re,im});
const FUNCS={branch:['sqrt(z)','z^(1/3)','z^(2/3)','log(z)','z^(3/2)','z^(1/2)+1'], smooth:['z^2','z^3','exp(z)','sin(z)','conj(z)','(1+i)*z','i*z-2*i'], pole:['1/z','1/(z-0.3-0.2*i)','1/(z^2+1)','1/sin(z)','z+1/z','(z+1)/(z-1)']};
function strokes(){
  const out=[];
  for(let k=0;k<60;k++){
    const a=C((rnd()-.5)*5,(rnd()-.5)*5), b=C((rnd()-.5)*5,(rnd()-.5)*5);
    out.push(S.segment(a,b,{n:2+Math.floor(rnd()*100)}));
  }
  for(let k=0;k<30;k++) out.push(S.circle(C((rnd()-.5)*2,(rnd()-.5)*2),0.3+rnd()*2,{n:16+Math.floor(rnd()*200)}));
  for(let k=0;k<30;k++){const a=C((rnd()-.5)*4,(rnd()-.5)*4);out.push(S.rect(a,C(a.re+0.3+rnd()*3,a.im+0.3+rnd()*3),{nPerSide:2+Math.floor(rnd()*40)}));}
  // freehand: jittery nonuniform samples
  for(let k=0;k<30;k++){
    const pts=[];let x=(rnd()-.5)*4,y=(rnd()-.5)*4,th=rnd()*6.28;
    for(let i=0;i<40+Math.floor(rnd()*200);i++){th+=(rnd()-.5)*0.5;const st=0.01+rnd()*0.12;x+=st*Math.cos(th);y+=st*Math.sin(th);pts.push(C(x,y));}
    out.push(S.freehand(pts,{minDist:0.01}));
  }
  return out;
}
function badSteps(curve,pieces,f,clamp=40){
  let bad=0,tot=0;
  for(const pc of pieces){
    for(let i=0;i+1<pc.points.length;i++){
      tot++;
      const a=pc.points[i],b=pc.points[i+1];
      const chord=Math.hypot(b.re-a.re,b.im-a.im);
      let prev=null,mx=0,sum=0,leaves=false;
      const K=200;
      for(let s=0;s<=K;s++){
        const t=a.t+(b.t-a.t)*s/K; const z=S.pointAt(curve,t);
        let w; try{w=f(z);}catch(e){w=C(NaN,NaN);}
        if(!Number.isFinite(w.re)||!Number.isFinite(w.im)||Math.hypot(w.re,w.im)>clamp*1.0){leaves=true;}
        if(prev){const d=Math.hypot(w.re-prev.re,w.im-prev.im);mx=Math.max(mx,d);sum+=d;}
        prev=w;
      }
      if(leaves && chord>1e-9) {bad++;continue;}
      if(mx>0.3*sum && mx>0.3) bad++;
    }
  }
  return {bad,tot};
}
const ST=strokes();
for(const [grp,list] of Object.entries(FUNCS)){
  for(const src of list){
    const f=compile(src).f; let bad=0,tot=0,pieces=0,curvesWithBad=0;
    for(const c of ST){
      const pcs=M.pushForward(c,f); pieces+=pcs.length;
      const r=badSteps(c,pcs,f); bad+=r.bad;tot+=r.tot; if(r.bad) curvesWithBad++;
    }
    console.log(grp.padEnd(7),src.padEnd(20),'strokes',ST.length,'steps',tot,'bad steps',bad,'strokes with bad',curvesWithBad);
  }
}
