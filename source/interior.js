// Procedural 1800s dystopian tower interiors: arched iron-and-glass galleries round a stair atrium.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshBVH } from 'three-mesh-bvh';

function rng(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function cv(w,h,f){const c=document.createElement('canvas');c.width=w;c.height=h;f(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t}
function grime(g,w,h,r,n,col,a){for(let i=0;i<n;i++){g.globalAlpha=a*r();g.fillStyle=col;const x=r()*w,y=r()*h,s=8+r()*90;const gr=g.createRadialGradient(x,y,0,x,y,s);gr.addColorStop(0,col);gr.addColorStop(1,'transparent');g.fillStyle=gr;g.fillRect(x-s,y-s,s*2,s*2)}g.globalAlpha=1}

export function makeTextures(){
  const r=rng(7);
  const paper=cv(512,512,(g,w,h)=>{g.fillStyle='#3b4a44';g.fillRect(0,0,w,h);
    g.strokeStyle='#55665b';g.lineWidth=3;
    for(let y=0;y<4;y++)for(let x=0;x<4;x++){const cx=(x+.5*(y%2))*128,cy=y*128+64;g.save();g.translate(cx,cy);for(let i=0;i<6;i++){g.rotate(Math.PI/3);g.beginPath();g.moveTo(0,8);g.bezierCurveTo(26,20,18,50,0,56);g.bezierCurveTo(-18,50,-26,20,0,8);g.stroke()}g.restore()}
    for(let i=0;i<9;i++){g.fillStyle='rgba(12,16,14,.5)';g.fillRect(i*57+r()*20,0,1.5,h)}
    grime(g,w,h,r,60,'#141a17',.55);grime(g,w,h,r,14,'#6b5a35',.35);
    // peeling strips showing brick
    for(let i=0;i<5;i++){const x=r()*w,y=r()*h,ww=20+r()*50,hh=40+r()*120;g.fillStyle='#5a3a30';g.fillRect(x,y,ww,hh);g.strokeStyle='#2a1a16';g.lineWidth=2;for(let k=0;k<hh;k+=14){g.beginPath();g.moveTo(x,y+k);g.lineTo(x+ww,y+k);g.stroke()}}});
  const wood=cv(512,512,(g,w,h)=>{for(let i=0;i<8;i++){const c=46+r()*22;g.fillStyle=`rgb(${c+14},${c-3},${c-18})`;g.fillRect(0,i*64,w,64);g.strokeStyle='rgba(10,6,4,.35)';for(let k=0;k<26;k++){g.beginPath();const y=i*64+r()*64;g.moveTo(0,y);g.bezierCurveTo(170,y+r()*8-4,340,y+r()*8-4,w,y);g.stroke()}g.fillStyle='#120b07';g.fillRect(0,i*64,w,2);const o=r()*w;g.fillRect(o,i*64,2,64)}grime(g,w,h,r,40,'#0b0806',.6)});
  const iron=cv(256,256,(g,w,h)=>{g.fillStyle='#2c3234';g.fillRect(0,0,w,h);grime(g,w,h,r,50,'#111516',.7);grime(g,w,h,r,26,'#6d3a1e',.5);grime(g,w,h,r,12,'#3f7a6c',.28);g.fillStyle='#50585a';for(let y=16;y<h;y+=56)for(let x=16;x<w;x+=56){g.beginPath();g.arc(x,y,3.5,0,7);g.fill()}});
  const brick=cv(256,256,(g,w,h)=>{g.fillStyle='#1d1614';g.fillRect(0,0,w,h);for(let y=0;y<8;y++)for(let x=-1;x<5;x++){const c=46+r()*30;g.fillStyle=`rgb(${c},${c*.74},${c*.66})`;g.fillRect(x*64+(y%2)*32+2,y*32+2,60,28)}grime(g,w,h,r,40,'#0d0a09',.6)});
  const glass=cv(512,512,(g,w,h)=>{g.clearRect(0,0,w,h);g.fillStyle='rgba(150,190,175,.14)';g.fillRect(0,0,w,h);grime(g,w,h,r,50,'rgba(40,46,34,.9)',.42);
    for(let i=0;i<4;i++){const x=r()*w,y=r()*h;g.strokeStyle='rgba(230,240,235,.65)';g.lineWidth=1.2;for(let k=0;k<9;k++){const a=r()*6.3,l=30+r()*130;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l*.5+r()*14,y+Math.sin(a)*l*.5+r()*14);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke()}}});
  const poster=(a,b,c1,c2)=>cv(256,360,(g,w,h)=>{g.fillStyle=c1;g.fillRect(0,0,w,h);g.fillStyle=c2;g.beginPath();g.arc(128,150,70,0,7);g.fill();g.fillStyle=c1;g.beginPath();g.arc(128,150,32,0,7);g.fill();g.fillStyle=c2;g.beginPath();g.arc(128,150,12,0,7);g.fill();for(let i=0;i<16;i++){g.save();g.translate(128,150);g.rotate(i/16*6.283);g.fillRect(-3,-100,6,24);g.restore()}
    g.textAlign='center';g.font='bold 32px Georgia,serif';g.fillText(a,128,44);g.font='bold 26px Georgia,serif';g.fillText(b,128,308);grime(g,w,h,r,16,'#14100c',.55);g.fillStyle='rgba(0,0,0,.25)';g.fillRect(0,0,w,5)});
  const posters=[poster('THE WORKS','PROVIDE','#b8a578','#27211a'),poster('OBEY','THE BELL','#7b2a20','#e0cfa4'),poster('REPORT','IDLE HANDS','#2b3b3a','#d7c490'),poster('CURFEW','AT DUSK','#1d2226','#b98d3e')];
  const clock=cv(256,256,(g,w,h)=>{g.fillStyle='#d3c7a3';g.fillRect(0,0,w,h);g.translate(128,128);g.strokeStyle='#201a12';g.lineWidth=7;g.beginPath();g.arc(0,0,118,0,7);g.stroke();g.fillStyle='#201a12';g.font='bold 24px Georgia,serif';g.textAlign='center';g.textBaseline='middle';['XII','III','VI','IX'].forEach((s,i)=>{const a=i*Math.PI/2;g.fillText(s,Math.sin(a)*90,-Math.cos(a)*90)});g.lineWidth=8;g.beginPath();g.moveTo(0,0);g.lineTo(46,-30);g.stroke();g.lineWidth=5;g.beginPath();g.moveTo(0,0);g.lineTo(-40,-80);g.stroke();g.translate(-128,-128);grime(g,w,h,r,18,'#3a2b1a',.4)});
  const m={
    paper:new THREE.MeshStandardMaterial({map:paper,roughness:.95}),
    wood:new THREE.MeshStandardMaterial({map:wood,roughness:.72}),
    iron:new THREE.MeshStandardMaterial({map:iron,roughness:.62,metalness:.62}),
    brick:new THREE.MeshStandardMaterial({map:brick,roughness:.95}),
    ceil:new THREE.MeshStandardMaterial({color:0x3a3a33,roughness:1}),
    glass:new THREE.MeshStandardMaterial({map:glass,transparent:true,roughness:.14,metalness:.1,depthWrite:false,side:THREE.DoubleSide}),
    brass:new THREE.MeshStandardMaterial({color:0x8d6a2a,roughness:.36,metalness:.9}),
    lamp:new THREE.MeshStandardMaterial({color:0xffdca0,emissive:0xffa648,emissiveIntensity:3.2}),
    paperWhite:new THREE.MeshStandardMaterial({color:0xb4a98c,roughness:1}),
    rag:new THREE.MeshStandardMaterial({color:0x4a2622,roughness:1,side:THREE.DoubleSide}),
    posters:posters.map(t=>new THREE.MeshStandardMaterial({map:t,roughness:.9})),
    clock:new THREE.MeshStandardMaterial({map:clock,roughness:.7}),
  };
  m.posters.forEach(p=>{p.polygonOffset=true;p.polygonOffsetFactor=-2});
  return m;
}

const box=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
const mtx=new THREE.Matrix4(),quat=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0),sc=new THREE.Vector3(1,1,1);
// polar placer: a = angle round the tower, faces the centre
function at(geo,cx,cz,r,y,a,extra){const g=geo.clone();quat.setFromAxisAngle(up,Math.PI/2-a+Math.PI);if(extra)g.applyMatrix4(extra);mtx.compose(new THREE.Vector3(cx+Math.cos(a)*r,y,cz+Math.sin(a)*r),quat,sc);g.applyMatrix4(mtx);return g}
function archShape(w,h,withHole,sill){const s=new THREE.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(w/2,h);s.lineTo(-w/2,h);s.closePath();if(withHole){const a=archPath(w*.72,h-.45,sill);s.holes.push(a)}return s}
function archPath(w,top,sill){const p=new THREE.Path();const r=w/2,spring=top-r;p.moveTo(-r,sill);p.lineTo(r,sill);p.lineTo(r,spring);p.absarc(0,spring,r,0,Math.PI,false);p.lineTo(-r,sill);return p}
function archGlass(w,top,sill){const s=new THREE.Shape();const r=w/2,spring=top-r;s.moveTo(-r,sill);s.lineTo(r,sill);s.lineTo(r,spring);s.absarc(0,spring,r,0,Math.PI,false);s.lineTo(-r,sill);return s}
// y-up wall arc with quads; inward=true gives normals pointing at the axis
function arc(cx,cz,r,y0,y1,a0,a1,inward){const n=Math.max(4,Math.ceil((a1-a0)/.15)),p=[],ix=[];for(let i=0;i<=n;i++){const a=a0+(a1-a0)*i/n,x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;p.push(x,y0,z,x,y1,z)}for(let i=0;i<n;i++){const k=i*2;inward?ix.push(k,k+1,k+2,k+2,k+1,k+3):ix.push(k,k+2,k+1,k+2,k+3,k+1)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(ix);return g}
// flat annulus at height y (facing up), full circle
function ring(cx,cz,r0,r1,y){const n=64,p=[],ix=[],uv=[];for(let i=0;i<=n;i++){const a=i/n*Math.PI*2,c=Math.cos(a),s=Math.sin(a);p.push(cx+c*r0,y,cz+s*r0,cx+c*r1,y,cz+s*r1);uv.push(c*r0/4,s*r0/4,c*r1/4,s*r1/4)}for(let i=0;i<n;i++){const k=i*2;ix.push(k,k+2,k+1,k+1,k+2,k+3)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g}
// helical ribbon from a0 to a1 rising y0 → y1
function helix(cx,cz,r0,r1,y0,y1,a0,a1){const n=56,p=[],ix=[];for(let i=0;i<=n;i++){const t=i/n,a=a0+(a1-a0)*t,y=y0+(y1-y0)*t,c=Math.cos(a),s=Math.sin(a);p.push(cx+c*r0,y,cz+s*r0,cx+c*r1,y,cz+s*r1)}for(let i=0;i<n;i++){const k=i*2;ix.push(k,k+2,k+1,k+1,k+2,k+3)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(ix);return g}
function helixWall(cx,cz,r,y0,y1,a0,a1,h){const n=40,p=[],ix=[];for(let i=0;i<=n;i++){const t=i/n,a=a0+(a1-a0)*t,y=y0+(y1-y0)*t,x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;p.push(x,y,z,x,y+h,z)}for(let i=0;i<n;i++){const k=i*2;ix.push(k,k+1,k+2,k+2,k+1,k+3)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(ix);return g}
const norm=g=>{const n=g.index?g.toNonIndexed():g;n.deleteAttribute('uv');n.deleteAttribute('normal');n.computeVertexNormals();return n};

export const H=4.6;
export function buildInterior(m,o){ // o:{c:[x,z],R,y0,levels,doorA,roof:[{level,a}],seed}
  const r=rng(o.seed),[cx,cz]=o.c,R=o.R,L=o.levels,y0=o.y0,R0=Math.max(4,R*.46);
  const bk={paper:[],wood:[],iron:[],brick:[],ceil:[],glass:[],brass:[],lamp:[],paperWhite:[],rag:[],clock:[]},pst=[[],[],[],[]],col=[];
  const N=Math.max(8,Math.round(Math.PI*2*R/4.6)),da=Math.PI*2/N,panelW=2*R*Math.sin(da/2)+.12;
  const snap=a=>Math.round(a/da)*da; const lamps=[]; const doors=[];
  const doorPanels=new Map();doorPanels.set('0:'+((Math.round(snap(o.doorA)/da)%N+N)%N),{type:'exit'});
  for(const d of o.roof)doorPanels.set(d.level+':'+((Math.round(snap(d.a)/da)%N+N)%N),{type:'roof',d});
  const sill=.95,top=H-.32;
  const wallShape=new THREE.ExtrudeGeometry(archShape(panelW,H,true,sill),{depth:.42,bevelEnabled:false,curveSegments:14});wallShape.translate(0,0,-.21);
  const solidShape=box(panelW,H,.42).translate(0,H/2,0);
  const wUV=s=>{const a=s.attributes.position,u=s.attributes.uv;for(let i=0;i<u.count;i++)u.setXY(i,a.getX(i)*.33,a.getY(i)*.33);return s};wUV(wallShape);wUV(solidShape);
  const gw=panelW*.72,gl=new THREE.ShapeGeometry(archGlass(gw,top-.12,sill),14);{const a=gl.attributes.position,u=gl.attributes.uv;for(let i=0;i<u.count;i++)u.setXY(i,a.getX(i)/4+.5,a.getY(i)/4)}
  const spring=top-.12-gw/2;
  for(let l=0;l<L;l++){const y=y0+l*H;
    for(let i=0;i<N;i++){const a=i*da,dp=doorPanels.get(l+':'+i);
      bk.paper.push(at(dp?solidShape:wallShape,cx,cz,R,y,a));
      // iron pilaster between panels, gas lamp on alternate ones
      const pa=a+da/2;bk.iron.push(at(box(.34,H,.3).translate(0,H/2,0),cx,cz,R-.26,y,pa));bk.iron.push(at(box(.56,.2,.42).translate(0,H-.22,0),cx,cz,R-.26,y,pa));
      if((i+l)%2===0){const rr=R-.72,yy=y+2.75;bk.brass.push(at(box(.08,.08,.5),cx,cz,R-.46,yy,pa));bk.lamp.push(at(new THREE.SphereGeometry(.17,10,8),cx,cz,rr,yy,pa));bk.iron.push(at(new THREE.CylinderGeometry(.2,.13,.14,8).translate(0,-.2,0),cx,cz,rr,yy,pa));lamps.push(new THREE.Vector3(cx+Math.cos(pa)*rr,yy,cz+Math.sin(pa)*rr))}
      if(dp){const dw=2.3,dh=3.5;bk.wood.push(at(box(dw,dh,.14).translate(0,dh/2,0),cx,cz,R-.3,y,a));bk.iron.push(at(box(dw+.3,.24,.26).translate(0,dh+.08,0),cx,cz,R-.3,y,a));for(const s of[-1,1])bk.iron.push(at(box(.2,dh,.26).translate(s*(dw/2+.1),dh/2,0),cx,cz,R-.3,y,a));for(const h of[.7,1.75,2.8])bk.iron.push(at(box(dw,.12,.2).translate(0,h,0),cx,cz,R-.34,y,a));bk.brass.push(at(new THREE.SphereGeometry(.1,8,6).translate(.82,1.25,.14),cx,cz,R-.34,y,a));
        const dl=new THREE.Vector3(cx+Math.cos(a)*(R-.8),y+.2,cz+Math.sin(a)*(R-.8));doors.push({p:dl,a,...dp})
        bk.lamp.push(at(new THREE.SphereGeometry(.2,10,8).translate(0,3.85,.1),cx,cz,R-.45,y,a));lamps.push(new THREE.Vector3(cx+Math.cos(a)*(R-.9),y+3.85,cz+Math.sin(a)*(R-.9)))}
      else{bk.glass.push(at(gl,cx,cz,R,y,a));
        // mullions
        for(const s of[-.5,-.17,.17,.5])bk.iron.push(at(box(.07,spring-sill,.1).translate(s*gw,sill+(spring-sill)/2,0),cx,cz,R,y,a));
        for(let h=sill;h<spring+.01;h+=.82)bk.iron.push(at(box(gw,.06,.1).translate(0,h,0),cx,cz,R,y,a));
        for(let k=1;k<6;k++){const t=k/6*Math.PI,s=Math.sin(t),c=Math.cos(t),ln=gw/2;const mt=new THREE.Matrix4().makeRotationZ(t-Math.PI/2);const g=box(.06,ln,.08).translate(0,ln/2,0).applyMatrix4(mt).translate(0,spring,0);bk.iron.push(at(g,cx,cz,R,y,a))}
        bk.iron.push(at(new THREE.TorusGeometry(gw/2,.05,6,18,Math.PI).translate(0,spring,0),cx,cz,R,y,a));
        // brick dado under the sill
      }
      if(!dp)bk.brick.push(at(box(panelW*.74,sill,.08).translate(0,sill/2,0),cx,cz,R-.24,y,a));
    }
    // floor
    const inner=l===0?0:R0;bk.wood.push(ring(cx,cz,Math.max(inner,.001),R+.2,y+.01));col.push(norm(ring(cx,cz,Math.max(inner,.001),R+.2,y)));
    // ceiling above this level + radial beams
    const yc=y+H-.08,c=ring(cx,cz,l===L-1?.001:R0,R+.2,yc);{const ix=c.index.array;for(let i=0;i<ix.length;i+=3){const t=ix[i+1];ix[i+1]=ix[i+2];ix[i+2]=t}c.computeVertexNormals()}bk.ceil.push(c);
    for(let i=0;i<N;i++){const a=(i+.5)*da,ln=R-(l===L-1?.2:R0);bk.iron.push(at(box(.22,.3,ln).translate(0,0,0),cx,cz,(R+(l===L-1?.2:R0))/2,yc-.15,a))}
    // gallery rail with a gap at the stairs
    if(l>0){const ga=o.stairA+(l-1)*o.turn+o.turn,g0=ga%(Math.PI*2);
      bk.iron.push(new THREE.TorusGeometry(R0+.1,.05,6,64).rotateX(Math.PI/2).translate(cx,y+1.1,cz));
      for(let i=0;i<48;i++){const a=i/48*Math.PI*2,d=Math.atan2(Math.sin(a-g0),Math.cos(a-g0));if(Math.abs(d)<.62)continue;bk.iron.push(box(.045,1.1,.045).translate(cx+Math.cos(a)*(R0+.1),y+.55,cz+Math.sin(a)*(R0+.1)))}
      col.push(norm(arc(cx,cz,R0+.1,y,y+1.25,g0+.62,g0+Math.PI*2-.62,false)))}
    // stairs up
    if(l<L-1){const a0=o.stairA+l*o.turn,a1=a0+o.turn,ri=Math.max(1.5,R0-2.6),ro=R0+.02;col.push(norm(helix(cx,cz,ri,ro,y+.02,y+H,a0,a1)));col.push(norm(helixWall(cx,cz,ri,y,y+H,a0,a1,1.3)));{const t0=.13,t1=.87;col.push(norm(helixWall(cx,cz,ro,y+H*t0,y+H*t1,a0+o.turn*t0,a0+o.turn*t1,1.3)))}
      const n=Math.ceil(o.turn*(ri+ro)/2/.55);for(let k=0;k<n;k++){const t=(k+.5)/n,a=a0+(a1-a0)*t,ang=-a;const st=box(ro-ri,.16,o.turn*ro/n+.08).translate((ri+ro)/2,0,0).applyMatrix4(new THREE.Matrix4().makeRotationY(ang)).translate(cx,y+t*H-.06,cz);bk.wood.push(st)}
      const under=helix(cx,cz,ri,ro,y-.18,y+H-.18,a0,a1);{const ix=under.index.array;for(let i=0;i<ix.length;i+=3){const t=ix[i+1];ix[i+1]=ix[i+2];ix[i+2]=t}under.computeVertexNormals()}bk.ceil.push(under);
      for(let k=0;k<26;k++){const t=k/26,a=a0+(a1-a0)*t;bk.iron.push(box(.05,1.15,.05).translate(cx+Math.cos(a)*(ri+.06),y+t*H+.55,cz+Math.sin(a)*(ri+.06)))}
    }
    // props round the gallery
    const pr=l===0?R-1.4:R-1.35;
    for(let i=0;i<N;i++){const a=i*da;if(doorPanels.has(l+':'+i))continue;const ap=a+(r()-.5)*.3,k=r(),ppa=(i+.5)*da;
      if(k<.2&&R-R0>2.2){ // clerk's desk and papers
        bk.wood.push(at(box(2,.1,.9).translate(0,.86,0),cx,cz,pr,y,ap));for(const s of[-.88,.88])for(const d of[-.36,.36])bk.iron.push(at(box(.08,.84,.08).translate(s,.42,d),cx,cz,pr,y,ap));
        for(let q=0;q<4;q++)bk.paperWhite.push(at(box(.32,.03+r()*.2,.42).translate(-.6+q*.4,.96,(r()-.5)*.3),cx,cz,pr,y,ap));bk.lamp.push(at(new THREE.SphereGeometry(.09,8,6).translate(.7,1.16,-.2),cx,cz,pr,y,ap));
        col.push(norm(at(box(2,1,.9).translate(0,.5,0),cx,cz,pr,y,ap)));
      }else if(k<.36){ // filing cabinets
        const n=2+(r()*3|0);for(let q=0;q<n;q++){const h=1.9+r()*.3;bk.iron.push(at(box(.8,h,.7).translate((q-n/2)*.86,h/2,0),cx,cz,R-.85,y,ap));for(let d=0;d<4;d++)bk.brass.push(at(box(.22,.05,.04).translate((q-n/2)*.86,.32+d*.46,.37),cx,cz,R-.85,y,ap))}col.push(norm(at(box(n*.9,2,.8).translate(-.4,1,0),cx,cz,R-.85,y,ap)));
      }else if(k<.5){ // crates
        const n=1+(r()*3|0);for(let q=0;q<n;q++){const s=.8+r()*.5;bk.wood.push(at(box(s,s,s).rotateY(r()).translate((q-1)*1,s/2,r()*.2),cx,cz,pr,y,ap))}col.push(norm(at(box(n*1.1,1,1).translate((n-1)*.5-1,.5,0),cx,cz,pr,y,ap)));
      }else if(k<.62){ // boiler
        bk.iron.push(at(new THREE.CylinderGeometry(.62,.62,2.6,14).translate(0,1.45,0),cx,cz,R-1.15,y,ap));bk.brass.push(at(new THREE.TorusGeometry(.64,.05,6,16).rotateX(Math.PI/2).translate(0,2.1,0),cx,cz,R-1.15,y,ap));bk.iron.push(at(new THREE.CylinderGeometry(.09,.09,H-2.6,8).translate(0,2.6+(H-2.6)/2,0),cx,cz,R-1.15,y,ap));col.push(norm(at(box(1.3,3,1.3).translate(0,1.5,0),cx,cz,R-1.15,y,ap)));
      }else if(k<.72){ // toppled chair
        const t=new THREE.Matrix4().makeRotationZ(1.3);bk.wood.push(at(box(.55,.07,.55).applyMatrix4(t).translate(0,.3,0),cx,cz,pr,y,ap));bk.wood.push(at(box(.5,.65,.05).translate(0,.3,.3).applyMatrix4(t).translate(0,.3,0),cx,cz,pr,y,ap));
      }else if(k<.82){ // torn drape
        bk.rag.push(at(new THREE.PlaneGeometry(panelW*.4,H-1.1,4,6).translate(-.6,(H-1)/2+.8,.05),cx,cz,R-.34,y,a));
      }
      if(r()<.3){const pi=r()*4|0;const pg=at(new THREE.PlaneGeometry(.78,1.1).translate(0,2.0,.02),cx,cz,R-.46,y,ppa);pst[pi].push(pg)}
      if(l%2===1&&i===((l*3)%N)){const cg=at(new THREE.CircleGeometry(.85,24).translate(0,2.9,.02),cx,cz,R-.56,y,ppa+da*2);bk.clock.push(cg);bk.brass.push(at(new THREE.TorusGeometry(.85,.08,6,24).translate(0,2.9,0),cx,cz,R-.56,y,ppa+da*2))}
    }
    // pipework running round the wall
    bk.iron.push(new THREE.TorusGeometry(R-.62,.07,6,64).rotateX(Math.PI/2).translate(cx,y+H-.55,cz));bk.brass.push(new THREE.TorusGeometry(R-.74,.04,6,64).rotateX(Math.PI/2).translate(cx,y+H-.72,cz));
  }
  // atrium chandelier hanging on chains from the top
  const yT=y0+L*H-.2,chainR=Math.max(.4,R0-3.1);
  bk.iron.push(new THREE.CylinderGeometry(.03,.03,L*H-3,6).translate(cx,yT-(L*H-3)/2,cz));
  for(let l=0;l<L;l++){const yy=y0+l*H+3.3;bk.iron.push(new THREE.TorusGeometry(.8,.05,6,20).rotateX(Math.PI/2).translate(cx,yy,cz));for(let i=0;i<6;i++){const a=i/6*6.283;bk.lamp.push(new THREE.SphereGeometry(.12,8,6).translate(cx+Math.cos(a)*.8,yy+.1,cz+Math.sin(a)*.8))}lamps.push(new THREE.Vector3(cx,yy,cz))}
  // solid outer wall collider, door panels are triggers only
  const T=y0+L*H;col.push(norm(arc(cx,cz,R-.42,y0-1,T+1,0,Math.PI*2+.01,true)));col.push(norm(ring(cx,cz,.001,R+.3,T-.1)));
  const grp=new THREE.Group();
  for(const k in bk){if(!bk[k].length)continue;const list=bk[k].map(g=>{const q=g.index?g.toNonIndexed():g;for(const n of Object.keys(q.attributes))if(!['position','normal','uv'].includes(n))q.deleteAttribute(n);if(!q.attributes.uv)q.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(q.attributes.position.count*2),2));if(!q.attributes.normal)q.computeVertexNormals();return q});const mg=mergeGeometries(list,false);const me=new THREE.Mesh(mg,m[k]);me.castShadow=k!=='glass'&&k!=='lamp';me.receiveShadow=k!=='glass';grp.add(me)}
  pst.forEach((a,i)=>{if(!a.length)return;const me=new THREE.Mesh(mergeGeometries(a.map(g=>g.index?g.toNonIndexed():g),false),m.posters[i]);me.receiveShadow=true;grp.add(me)});
  const cg=mergeGeometries(col.map(g=>{for(const n of Object.keys(g.attributes))if(n!=='position')g.deleteAttribute(n);return g}),false);cg.boundsTree=new MeshBVH(cg);
  const cm=new THREE.Mesh(cg,new THREE.MeshBasicMaterial({visible:false,side:THREE.DoubleSide}));grp.add(cm);grp.updateMatrixWorld(true);
  return{group:grp,collider:cm,lamps,doors,top:T,R,c:o.c,y0,R0};
}

// exterior iron door in an arched surround, facing +z before placement
export function makeDoor(m){const g=new THREE.Group();const add=(geo,mat,x=0,y=0,z=0)=>{const k=new THREE.Mesh(geo,mat);k.position.set(x,y,z);k.castShadow=true;k.receiveShadow=true;g.add(k);return k};
  const w=2.6,h=3.5;const s=new THREE.Shape();s.moveTo(-w/2-.55,0);s.lineTo(w/2+.55,0);s.lineTo(w/2+.55,h+1.8);s.lineTo(-w/2-.55,h+1.8);s.closePath();s.holes.push(archPath(w,h+1.2,0));
  add(new THREE.ExtrudeGeometry(s,{depth:.5,bevelEnabled:false,curveSegments:16}),m.brick,0,0,-.25);
  add(new THREE.ShapeGeometry(archGlass(w,h+1.2,h)),m.lamp.clone(),0,0,-.02).material.emissiveIntensity=.3;
  add(box(w,h,.16),m.wood,0,h/2,.02);for(const y of[.6,1.75,2.9])add(box(w,.13,.1),m.iron,0,y,.14);for(const x of[-w/2+.1,0,w/2-.1])add(box(.12,h,.1),m.iron,x,h/2,.14);add(new THREE.SphereGeometry(.11,8,6),m.brass,.95,1.3,.22);
  add(box(.08,.08,.42),m.brass,0,h+1.5,.42);add(new THREE.CylinderGeometry(.2,.13,.12,8),m.iron,0,h+1.28,.6);
  add(box(w+1.4,.26,1.3),m.brick,0,.1,.5);
  const sig=add(box(1.9,.42,.06),m.iron,0,h+1.72,.3);return g}

// glass stair-head that stands on a lily pad
export function makeKiosk(m){const g=new THREE.Group();const add=(geo,mat,x=0,y=0,z=0)=>{const k=new THREE.Mesh(geo,mat);k.position.set(x,y,z);k.castShadow=mat!==m.glass;k.receiveShadow=true;g.add(k);return k};
  const n=8,R=2.7,h=3.9;add(new THREE.CylinderGeometry(R+.3,R+.5,.5,n).rotateY(Math.PI/8),m.brick,0,.05,0);
  for(let i=0;i<n;i++){const a=i/n*6.283;add(box(.16,h,.16),m.iron,Math.cos(a)*R,.2+h/2,Math.sin(a)*R)}
  add(new THREE.CylinderGeometry(R-.1,R-.1,h,n,1,true).rotateY(Math.PI/8),m.glass,0,.2+h/2,0);
  add(new THREE.ConeGeometry(R+.45,2.1,n).rotateY(Math.PI/8),m.iron,0,.2+h+1.05,0);add(new THREE.SphereGeometry(.2,8,6),m.brass,0,.2+h+2.2,0);add(new THREE.CylinderGeometry(R+.06,R+.06,.2,n).rotateY(Math.PI/8),m.brass,0,.2+h,0);
  add(box(2.3,3.5,.18),m.wood,0,1.95,R*.93);for(const y of[1,2.1,3.2])add(box(2.3,.12,.08),m.iron,0,y,R*.93+.12);add(new THREE.SphereGeometry(.1,8,6),m.brass,.85,1.6,R*.93+.16);
  return g}
