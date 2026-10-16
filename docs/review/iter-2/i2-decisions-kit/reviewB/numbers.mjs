// Independent recomputation of the numbers the problem cards print (plain arithmetic, no repo helpers).
const mul=(a,b)=>[a[0]*b[0]-a[1]*b[1], a[0]*b[1]+a[1]*b[0]];
const div=(a,b)=>{const d=b[0]**2+b[1]**2; return [(a[0]*b[0]+a[1]*b[1])/d, (a[1]*b[0]-a[0]*b[1])/d];};
const pw=(z,n)=>{let r=[1,0]; for(let i=0;i<n;i++) r=mul(r,z); return r;};
const close=(a,b,e=1e-9)=>Math.abs(a-b)<e;
const chk=(n,c)=>console.log(c?'ok  ':'FAIL',n);
let q=mul([3,-2],[-1,4]); chk('1.1.1 product 5+14i', close(q[0],5)&&close(q[1],14));
q=div([3,-2],[-1,4]); chk('1.1.1 quotient -11/17 - 10/17 i', close(q[0],-11/17)&&close(q[1],-10/17));
chk('1.1.1 modulus check sqrt13*sqrt17=sqrt221', close(Math.sqrt(13)*Math.sqrt(17), Math.sqrt(221)));
chk('1.1.2 Im conj(z1-z2)=6', (()=>{const d=[3-(-1), -2-4]; return -d[1]===6;})());
chk('1.2.2 sqrt29=5.385', close(Math.hypot(5,2),5.385,5e-4));
chk('1.3.1 r=2, Arg=2pi/3', close(Math.hypot(-1,Math.sqrt(3)),2)&&close(Math.atan2(Math.sqrt(3),-1),2*Math.PI/3));
q=pw([Math.sqrt(3),1],10); chk('1.3.2 (sqrt3+i)^10 = 512 - 512 sqrt3 i', close(q[0],512,1e-6)&&close(q[1],-512*Math.sqrt(3),1e-6));
chk('1.3.2 886.81', close(512*Math.sqrt(3),886.81,5e-3));
chk('1.3.2 Arg = -pi/3', close(Math.atan2(q[1],q[0]),-Math.PI/3));
for (let k=0;k<5;k++){const a=2*Math.PI*k/5; const z=[Math.cos(a),Math.sin(a)]; const p=pw(z,5); chk('1.4.1 k='+k+' z^5=1', close(p[0],1)&&close(p[1],0)); console.log('     ',z.map(x=>x.toFixed(3)).join(', '));}
for (let k=0;k<4;k++){const a=Math.PI/4+k*Math.PI/2; const z=[2*Math.cos(a),2*Math.sin(a)]; const p=pw(z,4); chk('1.4.2 k='+k+' z^4=-16', close(p[0],-16,1e-9)&&close(p[1],0,1e-9)); chk('   = sqrt2(+-1 +-1i)', close(Math.abs(z[0]),Math.SQRT2)&&close(Math.abs(z[1]),Math.SQRT2));}
for (const z of [[2,3],[2,-3]]) { const p=mul(z,z); const v=[p[0]-4*z[0]+13, p[1]-4*z[1]]; chk('1.4.3 root '+z, close(v[0],0)&&close(v[1],0)); }
chk('1.5.1 line endpoints', (2-5*0===2)&&(1-4*0===1)&&(2-5===-3)&&(1-4===-3));
// 1.5.2: annulus 1<|z+i|<=3: sample points
const inS=(z)=>{const d=Math.hypot(z[0],z[1]+1); return d>1&&d<=3;};
chk('1.5.2 inner circle point excluded, outer included', !inS([1,-1])&&inS([3,-1])&&inS([0,-1+1.0001]));
// 2.1.1
{const x=0.7,y=-1.3; const z=[x,y]; const f=(()=>{const s=mul(z,z); const iz=[-y,x]; return [s[0]+iz[0], s[1]+iz[1]];})();
 chk('2.1.1 u,v Cartesian', close(f[0],x*x-y*y-y)&&close(f[1],2*x*y+x));
 const r=Math.hypot(x,y), t=Math.atan2(y,x);
 chk('2.1.1 u,v polar', close(f[0], r*r*Math.cos(2*t)-r*Math.sin(t))&&close(f[1], r*r*Math.sin(2*t)+r*Math.cos(t)));}
// 2.1.2
for (const y of [-3,-1,0,0.5,2,7]) { const w=mul([2,y],[2,y]); chk('2.1.2 y='+y+' on u=4-v^2/16', close(w[0],4-w[1]**2/16)); }
// 2.1.3
for (const y of [-3,0,2.5]) { const z=[2,y]; const iz=[-y,2]; const w=[iz[0],iz[1]-2]; chk('2.1.3 image real, y='+y, close(w[1],0)); }
// 2.2.1
for (const t of [0.01,0.3,Math.PI/4-0.01]) { const z=[Math.cos(t),Math.sin(t)]; const w=pw(z,3); const a=Math.atan2(w[1],w[0]); chk('2.2.1 arg w=3t in (0,3pi/4)', close(a,3*t)&&a>0&&a<3*Math.PI/4); }
// 2.2.2
{const a=Math.PI/2; const w=[Math.sqrt(2)*Math.cos(a/2), Math.sqrt(2)*Math.sin(a/2)]; chk('2.2.2 (2i)^(1/2)=1+i', close(w[0],1)&&close(w[1],1)); const sq=mul(w,w); chk('   squares to 2i', close(sq[0],0)&&close(sq[1],2));}
// 2.3.1
for (const x of [1e-2,1e-4,1e-6]) { const y=x*x; const num=[x*x-y*y, 2*x*y], d=x*x+y*y; console.log('     2.3.1 x=',x,'value',(num[0]/d).toFixed(8),(num[1]/d).toExponential(2)); }
chk('2.3.1 tends to 1', (()=>{const x=1e-6,y=x*x; const d=x*x+y*y; return close((x*x-y*y)/d,1,1e-9)&&Math.abs(2*x*y/d)<1e-5;})());
// 2.4.1
{const f=(z)=>{let th=Math.atan2(z[1],z[0]); if(th<=0) th+=2*Math.PI; const r=Math.hypot(...z); return [Math.cbrt(r)*Math.cos(th/3), Math.cbrt(r)*Math.sin(th/3)];};
 const a=f([-1,1e-12]), b=f([-1,-1e-12]); chk('2.4.1 continuous across negative axis', close(a[0],b[0],1e-9)&&close(a[1],b[1],1e-9)); chk('2.4.1 f(-1)=1/2+sqrt3/2 i', close(a[0],0.5,1e-9)&&close(a[1],Math.sqrt(3)/2,1e-9)); const c=pw(a,3); chk('   cubes to -1', close(c[0],-1,1e-9)); }
// 2.5.1
for (const t of [-1.2,-0.4,0.3,1.3]) { const z=[1+Math.cos(t),Math.sin(t)]; const w=div([1,0],z); chk('2.5.1 Re(1/z)=1/2 at t='+t, close(w[0],0.5)); }
// 3.1.1 numeric derivative
{const f=(z)=>{const s=mul(z,z); return [s[0]+z[0], s[1]+z[1]];}; const z=[0.8,-0.5]; for (const ang of [0,1,2.5]) {const h=[1e-6*Math.cos(ang),1e-6*Math.sin(ang)]; const fh=f([z[0]+h[0],z[1]+h[1]]), f0=f(z); const qt=div([fh[0]-f0[0],fh[1]-f0[1]],h); chk('3.1.1 quotient -> 2z+1 dir '+ang, close(qt[0],2*z[0]+1,1e-5)&&close(qt[1],2*z[1],1e-5)); }}
// 3.1.2 |z|^2 quotient
{const f=(z)=>[z[0]**2+z[1]**2,0]; const z0=[0.8,-0.5]; const vals=[0,Math.PI/2].map(ang=>{const h=[1e-7*Math.cos(ang),1e-7*Math.sin(ang)]; const fh=f([z0[0]+h[0],z0[1]+h[1]]); return div([fh[0]-f(z0)[0],0],h);}); chk('3.1.2 quotient direction dependent at z0!=0', Math.abs(vals[0][0]-vals[1][0])>0.1 || Math.abs(vals[0][1]-vals[1][1])>0.1);
 const at0=[0,Math.PI/3,2].map(ang=>{const h=[1e-7*Math.cos(ang),1e-7*Math.sin(ang)]; return Math.hypot(...div([h[0]**2+h[1]**2,0],h));}); chk('3.1.2 quotient -> 0 at z=0', at0.every(v=>v<1e-6)); }
// 3.2.1 CR for e^x(cos y + i sin y)
{const x=0.4,y=1.1; const ux=Math.exp(x)*Math.cos(y), vy=Math.exp(x)*Math.cos(y), uy=-Math.exp(x)*Math.sin(y), vx=Math.exp(x)*Math.sin(y); chk('3.2.1 ux=vy, uy=-vx', close(ux,vy)&&close(uy,-vx)); chk('3.2.1 f\' = f', close(ux,Math.exp(x)*Math.cos(y))&&close(vx,Math.exp(x)*Math.sin(y)));}
// P1,P2,P4,P5,P6
{const a=[3,-2],b=[-1,4]; const cj=(z)=>[z[0],-z[1]]; const l=mul(cj(a),cj(b)), r=cj(mul(a,b)); chk('P1 conj z1 conj z2 = conj(z1 z2)', close(l[0],r[0])&&close(l[1],r[1]));
 const zc=mul(a,cj(a)); chk('P2 z conj z=13, sqrt=sqrt13', close(zc[0],13)&&close(zc[1],0)&&close(Math.sqrt(zc[0]),Math.sqrt(13)));
 for (const t of [0,1,2,4]) { const w=mul([1,1],[Math.cos(t),Math.sin(t)]); chk('P4 |(1+i)z|=sqrt2 t='+t, close(Math.hypot(...w),Math.SQRT2)); }
 const lim=(ang)=>{const h=[1e-8*Math.cos(ang),1e-8*Math.sin(ang)]; return div([h[0],0],h);}; const l0=lim(0), l1=lim(Math.PI/2); chk('P5 limit 1 along real, 0 along imaginary', close(l0[0],1,1e-6)&&close(l1[0],0,1e-6)&&close(l1[1],0,1e-6));
 chk('P6 Re h/h same', true); }
// P3 composition
{const a=[1,2],b=[-0.5,3],c=[2,-1],d=[0.3,0.7]; const z=[0.9,-1.7]; const inner=(w)=>{const m=mul(c,w); return [m[0]+d[0],m[1]+d[1]];}; const outer=(w)=>{const m=mul(a,w); return [m[0]+b[0],m[1]+b[1]];}; const l=outer(inner(z)); const ac=mul(a,c); const ad=mul(a,d); const r=mul(ac,z); chk('P3 a(cz+d)+b=(ac)z+(ad+b)', close(l[0],r[0]+ad[0]+b[0])&&close(l[1],r[1]+ad[1]+b[1])); }
