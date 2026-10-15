import { internals } from '/home/user/math-viz/js/core/plane.js';
const { polarOf, formatAngle, formatNumber, handleAriaLabel } = internals;
let bad = 0;
const g = (a,b)=>b?g(b,a%b):a;
for (let q=1;q<=12;q++) for (let p=-24;p<=24;p++){ if(!p) continue; const d=g(Math.abs(p),q); const pp=p/d, qq=q/d; const exp=(pp<0?'-':'')+(Math.abs(pp)===1?'π':Math.abs(pp)+'π')+(qq===1?'':'/'+qq); const got=formatAngle(p*Math.PI/q); if(got!==exp){bad++; if(bad<5) console.log('mismatch',p,q,got,exp);} }
console.log('formatAngle mismatches', bad);
// Arg values for the review problems
const cases = {
 '1.3.1 -1+i√3': {re:-1,im:Math.sqrt(3)}, '1.3.2 √3+i': {re:Math.sqrt(3),im:1}, '3-2i':{re:3,im:-2}, '-1+4i':{re:-1,im:4}, '2i':{re:0,im:2}, '-16':{re:-16,im:-0}, '-16 (+0)':{re:-16,im:0}, '-2-1e-15i':{re:-2,im:-1e-15},
};
for (const [k,z] of Object.entries(cases)) { const {r,theta}=polarOf(z); console.log(k.padEnd(14), 'r=',formatNumber(r), 'Arg=',formatAngle(theta), '|', handleAriaLabel(z)); }
// independent: Arg in (-pi, pi] for random points
let violations=0; for(let i=0;i<100000;i++){const z={re:(Math.random()*2-1)*5,im:(Math.random()*2-1)*5}; const {r,theta}=polarOf(z); if(!(theta>-Math.PI&&theta<=Math.PI)) violations++; const rr=r*Math.cos(theta), ii=r*Math.sin(theta); if(Math.abs(rr-z.re)>1e-9||Math.abs(ii-z.im)>1e-9) violations++; }
console.log('Arg range / roundtrip violations', violations);
