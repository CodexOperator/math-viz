import * as S from '../../../../../js/core/shapes.js';
import * as M from '../../../../../js/core/mapping.js';
import * as D from '../../../../../js/core/domaincolor.js';
const C=(re,im=0)=>({re,im});
// independent colour computation (own implementation, HSL->RGB)
function hsl2rgb(h,s,l){const c=(1-Math.abs(2*l-1))*s;const hp=h*6;const x=c*(1-Math.abs(hp%2-1));let r=0,g=0,b=0;
 if(hp<1)[r,g,b]=[c,x,0];else if(hp<2)[r,g,b]=[x,c,0];else if(hp<3)[r,g,b]=[0,c,x];else if(hp<4)[r,g,b]=[0,x,c];else if(hp<5)[r,g,b]=[x,0,c];else [r,g,b]=[c,0,x];
 const m=l-c/2;return [r+m,g+m,b+m].map(v=>Math.round(v*255));}
function mine(re,im,rings=true){const m=Math.hypot(re,im);let l=1-1/(1+Math.sqrt(m));if(rings){const lg=Math.log2(m);l*=0.88+0.12*(lg-Math.floor(lg));}let h=Math.atan2(im,re)/(2*Math.PI);if(h<0)h+=1;return hsl2rgb(h,0.8,l);}
const table=[[1,0],[0,1],[-1,0],[0,-1],[2,0],[0.5,0],[4,0],[1,1],[-1,-1],[0,0]];
const expect={ '1,0':[202,22,22], '0,1':[112,202,22], '-1,0':[22,202,202], '0,-1':[112,22,202], '2,0':[230,33,33], '0.5,0':[167,19,19], '4,0':[234,65,65], '1,1':[230,180,30], '-1,-1':[30,80,230]};
for(const [x,y] of table){ const got=D.colorOf(C(x,y)); const ind=(x===0&&y===0)?[0,0,0]:mine(x,y); const exp=expect[x+','+y];
 const off=got.map((v,i)=>Math.abs(v-ind[i])); const offd=exp?got.map((v,i)=>Math.abs(v-exp[i])):[];
 console.log(x,y,'code',got.join(','),'indep',ind.join(','),'doc',exp?exp.join(','):'-','maxdiff vs indep',Math.max(...off),'vs doc',offd.length?Math.max(...offd):'-');}
console.log('lightness 1/4,9,1e12',D.lightnessOf(0.25),D.lightnessOf(9),D.lightnessOf(1e12));
console.log('sum 2 vs .5',D.colorOf(2).reduce((a,b)=>a+b),D.colorOf(.5).reduce((a,b)=>a+b));
// 6.2 table
for(const t of [0,0.25,0.4,14/41,0.5,1]){const x=2-5*t,y=1-4*t;console.log('t',t.toFixed(6),x.toFixed(6),y.toFixed(6),Math.hypot(x,y).toFixed(6),Math.atan2(y,x).toFixed(6));}
const seg=S.segment(C(2,1),C(-3,-3)); console.log('points',seg.points.length, S.pointAt(seg,.25), S.pointAt(seg,.4));
// 6.6
const inv=z=>{const d=z.re*z.re+z.im*z.im;return {re:z.re/d,im:-z.im/d};};
const circ=S.circle(C(1,0),1,{n:256}); const o=M.pushForward(circ,inv);
console.log(o.map(p=>[p.points.length,p.points[0].t,p.points[p.points.length-1].t]));
console.log('pointOnPieces .25',M.pointOnPieces(o,.25),'.5',M.pointOnPieces(o,.5));
console.log('max|w|',Math.max(...o.flatMap(p=>p.points.map(q=>Math.hypot(q.re,q.im)))));
// sector z^3
const cube=z=>{const a=z.re*z.re-z.im*z.im, b=2*z.re*z.im;return {re:a*z.re-b*z.im,im:a*z.im+b*z.re};};
const sec=S.sector({r1:2,theta0:0,theta1:Math.PI/4}); const sp=M.pushForwardAll(sec,cube);
let mx=0,mn=9,mr=0;for(const p of sp)for(const q of p.points){let a=Math.atan2(q.im,q.re);if(Math.abs(a)<1e-12)a=0;mx=Math.max(mx,a);mn=Math.min(mn,a);mr=Math.max(mr,Math.hypot(q.re,q.im));}
console.log('sector image arg range',mn,mx,3*Math.PI/4,'maxr',mr, 'pieces',sp.length,'closed boundary',sp[0].closed, sec[0].points.length);
console.log('b idx 96', sp[0].points[96],' idx48',sp[0].points[48]);
// z^2 on x=2
const sq=z=>({re:z.re*z.re-z.im*z.im,im:2*z.re*z.im});
const vp=M.pushForward(S.verticalLine(2),sq); console.log('vline pieces',vp.length,vp[0].points.length, M.bounds(vp));
// rho+u=8
console.log('rho+u max err',Math.max(...vp[0].points.map(q=>Math.abs(Math.hypot(q.re,q.im)+q.re-8))));
// P4 values
const lin=z=>({re:z.re-z.im,im:z.re+z.im}); const pp=M.pushForward(S.circle(C(0),1),lin); console.log(pp.length,pp[0].points.length,pp[0].closed,pp[0].points[16],pp[0].points[32],pp[0].points[96]);
// 1/z orientation
const ip=M.pushForward(S.circle(C(0),1),inv); console.log('orient',S.classify(ip[0]));
// classify table
const T={ lopsided:S.polygon([C(0),C(2,2),C(3),C(0,3)]), L:S.polygon([C(0),C(2),C(2,1),C(1,1),C(1,2),C(0,2)]), openpoly:S.polygon([C(0),C(1),C(1,1)],{closed:false}), half:S.circle(C(0),1,{from:0,to:Math.PI}), sectorB:S.sector({r0:0,r1:2,theta0:0,theta1:Math.PI/4})[0]};
for(const [k,v] of Object.entries(T)) console.log(k,JSON.stringify(S.classify(v)));
// limacon
const lim=S.freehand(Array.from({length:401},(_,i)=>{const th=2*Math.PI*i/400;const r=0.5+Math.cos(th);return C(r*Math.cos(th),r*Math.sin(th));}),{minDist:0.001});
console.log('limacon',JSON.stringify(S.classify(lim)));
const eight=S.freehand(Array.from({length:401},(_,i)=>{const t=2*Math.PI*i/400;return C(Math.sin(t),Math.sin(t)*Math.cos(t));}),{minDist:0.001});
console.log('eight',JSON.stringify(S.classify(eight)));
