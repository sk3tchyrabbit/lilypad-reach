import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { makeTextures, buildInterior, makeDoor, makeKiosk } from './interior.js';
import BAKE from './bake.json';
THREE.Mesh.prototype.raycast=acceleratedRaycast;

const canvas=document.getElementById('c'), loadEl=document.getElementById('load'), barEl=document.getElementById('bar'), tipEl=document.getElementById('tip');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
const low=/swiftshader|llvmpipe/i.test(renderer.getContext().getParameter(renderer.getContext().VERSION))||false;
let pr=Math.min(devicePixelRatio,1.5); renderer.setPixelRatio(pr);
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=.95; renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene(); const camera=new THREE.PerspectiveCamera(58,1,.2,1800);
const SUN=new THREE.Vector3(.55,.62,.42).normalize();
const SKYC={top:new THREE.Color(.13,.34,.5),hor:new THREE.Color(.78,.82,.74),sun:new THREE.Color(1,.93,.78)};
const FOG=new THREE.Color(.52,.67,.69); scene.fog=new THREE.FogExp2(FOG,.0026);

// ---------- sky with drifting clouds
const noiseGLSL=`float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*vn(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}`;
const skyU={uT:{value:0},uSun:{value:SUN},uTop:{value:SKYC.top},uHor:{value:SKYC.hor},uSunC:{value:SKYC.sun},uN:{value:0}};
const skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:skyU,
 vertexShader:`varying vec3 d;void main(){d=position;vec4 p=projectionMatrix*mat4(mat3(viewMatrix))*vec4(position,1.);gl_Position=p.xyww;}`,
 fragmentShader:`varying vec3 d;uniform float uT,uN;uniform vec3 uSun,uTop,uHor,uSunC;${noiseGLSL}
 float star(vec3 v){vec3 c=floor(v*170.);float h=fract(sin(dot(c,vec3(12.9,78.2,37.7)))*43758.5);float k=step(.9965,h);vec3 f=fract(v*170.)-.5;return k*smoothstep(.45,.0,length(f))*(.45+.55*sin(uT*2.+h*90.));}
 void main(){vec3 v=normalize(d);float h=max(v.y,0.);vec3 c=mix(uHor,uTop,pow(h,.55));float s=max(dot(v,uSun),0.);c+=uSunC*(pow(s,600.)*3.+pow(s,18.)*.28)*(1.-uN*.72);if(uN>.01){c+=vec3(.9,.93,1.)*star(v)*uN*smoothstep(.02,.3,v.y)*1.5;c+=vec3(.92,.94,1.)*smoothstep(.99955,.9997,s)*uN*2.6;}
 if(v.y>.015){vec2 q=v.xz/(v.y+.14)*1.5+vec2(uT*.012,0.);float n=fbm(q);float n2=fbm(q*2.1+7.);float m=smoothstep(.47,.7,n+.18*n2);float lit=smoothstep(.45,.85,fbm(q+uSun.xz*.22));
 vec3 cl=mix(vec3(.62,.66,.68),vec3(1.,.985,.94),lit)*mix(vec3(1.),vec3(.055,.07,.115),uN);c=mix(c,cl,m*smoothstep(.015,.14,v.y));}
 gl_FragColor=vec4(c,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
const sky=new THREE.Mesh(new THREE.SphereGeometry(1,32,20),skyMat); sky.frustumCulled=false; sky.renderOrder=-1; scene.add(sky);

// ---------- light
const hemi=new THREE.HemisphereLight(0xcfe4e6,0x2f5560,.85); scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff0d8,3.1); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048);
const sc=sun.shadow.camera; sc.left=-70;sc.right=70;sc.top=70;sc.bottom=-70;sc.near=1;sc.far=320; sun.shadow.bias=-.0006; sun.shadow.normalBias=.04; scene.add(sun,sun.target);

// ---------- water
const waterU={uT:{value:0},uSun:{value:SUN},uCam:{value:new THREE.Vector3()},uTop:{value:SKYC.top},uHor:{value:SKYC.hor},uFog:{value:FOG},uN:{value:0}};
const waterMat=new THREE.ShaderMaterial({uniforms:waterU,transparent:false,
 vertexShader:`varying vec3 w;uniform float uT;
 float wave(vec2 p,vec2 d,float f,float s){return sin(dot(p,d)*f+uT*s);}
 void main(){vec4 wp=modelMatrix*vec4(position,1.);float h=.14*wave(wp.xz,vec2(.8,.6),.21,1.1)+.1*wave(wp.xz,vec2(-.5,.86),.33,1.5)+.05*wave(wp.xz,vec2(.2,-.98),.71,2.2);wp.y+=h;w=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}`,
 fragmentShader:`varying vec3 w;uniform float uT,uN;uniform vec3 uSun,uCam,uTop,uHor,uFog;${noiseGLSL}
 float H(vec2 p){float t=uT;return fbm(p*.13+vec2(t*.05,t*.03))*1.6+fbm(p*.41-vec2(t*.09,-t*.06))*.7+fbm(p*1.4+vec2(-t*.2,t*.17))*.2;}
 void main(){vec3 V=normalize(uCam-w);float dist=length(uCam-w);float e=.12+dist*.004;float h0=H(w.xz);vec3 N=normalize(vec3(h0-H(w.xz+vec2(e,0.)),e*2.6/(1.+dist*.012),h0-H(w.xz+vec2(0.,e))));
 float F=.02+.98*pow(1.-max(dot(N,V),0.),5.);vec3 R=reflect(-V,N);R.y=abs(R.y);vec3 sk=mix(uHor,uTop,pow(R.y,.55));
 vec3 deep=vec3(.012,.115,.17),shal=vec3(.03,.33,.36);float sss=pow(max(dot(normalize(vec3(-uSun.x,.25,-uSun.z)),-V),0.),3.)*.35+ (h0-1.)*.28;vec3 c=mix(deep,shal,clamp(sss,0.,1.))*mix(1.,.16,uN);
 c=mix(c,sk,F);float sp=pow(max(dot(R,uSun),0.),360.);c+=mix(vec3(1.,.93,.8),vec3(.6,.7,.95),uN)*sp*mix(5.,1.6,uN);
 float cau=smoothstep(.76,.97,1.-abs(fbm(w.xz*.35+uT*.1)-fbm(w.xz*.35-uT*.08+4.))*5.);c+=vec3(.1,.2,.2)*cau*.12*(1.-uN*.8);
 float f=1.-exp(-pow(dist*.0026,2.));c=mix(c,uFog,f);gl_FragColor=vec4(c,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
const water=new THREE.Mesh(new THREE.PlaneGeometry(1600,1600,160,160).rotateX(-Math.PI/2),waterMat); water.frustumCulled=false; scene.add(water);

// ---------- world
const colliders=[]; const ray=new THREE.Raycaster();
const shipGroup=new THREE.Group(); scene.add(shipGroup);
const SHIP={x:150,z:50,yaw:.7,scale:1.45};
const CITY={scale:200,y:-7.5};
const spawn=new THREE.Vector3(0,6,60);
function addShipColliders(){
  const m=new THREE.MeshBasicMaterial({visible:false});
  const add=(sx,sy,sz,x,y,z)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),m);b.position.set(x,y,z);shipGroup.add(b);colliders.push(b)};
  add(32,5,8.4,2.5,0,0);      // hull + main deck
  add(7.5,2.6,8,13,3.5,0);    // stern castle
  add(4.4,1.6,7,-11,3,0);     // bow
  shipGroup.updateMatrixWorld(true);
}
const loader=new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
async function load(n){const r=await fetch(n+'.json');if(!r.ok)throw new Error('load '+n);const g=await r.json();
  const ib=g.buffers.findIndex(b=>b.uri);const t=await (await fetch(g.buffers[ib].uri)).text();const s=atob(t),bin=new Uint8Array(s.length);for(let i=0;i<s.length;i++)bin[i]=s.charCodeAt(i);
  delete g.buffers[ib].uri;
  if(ib!==0){const sw=x=>x===ib?0:x===0?ib:x;[g.buffers[0],g.buffers[ib]]=[g.buffers[ib],g.buffers[0]];for(const v of g.bufferViews){v.buffer=sw(v.buffer);const e=v.extensions&&v.extensions.EXT_meshopt_compression;if(e)e.buffer=sw(e.buffer)}}
  const enc=new TextEncoder().encode(JSON.stringify(g)),jl=(enc.length+3)&~3,bl=(bin.length+3)&~3,out=new Uint8Array(12+8+jl+8+bl),d=new DataView(out.buffer);
  d.setUint32(0,0x46546C67,true);d.setUint32(4,2,true);d.setUint32(8,out.length,true);d.setUint32(12,jl,true);d.setUint32(16,0x4E4F534A,true);out.set(enc,20);out.fill(32,20+enc.length,20+jl);d.setUint32(20+jl,bl,true);d.setUint32(24+jl,0x004E4942,true);out.set(bin,28+jl);
  prog[n]=1;barEl.style.width=(Object.keys(prog).length*50)+'%';return new Promise((res,rej)=>loader.parse(out.buffer,'./',res,rej))}
const prog={};
let cityAdd=[];
async function init(){
  const [city,ship]=await Promise.all([load('city'),load('ship')]);
  city.scene.scale.setScalar(CITY.scale);city.scene.position.y=CITY.y;city.scene.updateMatrixWorld(true);
  city.scene.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;o.material.side=THREE.DoubleSide;o.material.envMapIntensity=.9;matsEnv.push([o.material,.9]);hookCity(o.material);cityMeshes.push(o);
    if(o.material.map)o.material.map.anisotropy=8;
    const cg=new THREE.BufferGeometry();cg.setAttribute('position',o.geometry.attributes.position);cg.setIndex(o.geometry.index);cg.boundsTree=new MeshBVH(cg);const cm=new THREE.Mesh(cg,new THREE.MeshBasicMaterial({visible:false,side:THREE.DoubleSide}));(cityAdd=[...cityAdd,[o.parent,cm]]);cm.position.copy(o.position);cm.quaternion.copy(o.quaternion);cm.scale.copy(o.scale);colliders.push(cm)});
  cityAdd.forEach(([q,cm])=>{q.add(cm);cm.updateWorldMatrix(true,false)});
  scene.add(city.scene);
  shipGroup.position.set(SHIP.x,0,SHIP.z);shipGroup.rotation.y=SHIP.yaw;
  ship.scene.scale.setScalar(SHIP.scale);ship.scene.position.y=-.2;
  ship.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;matsEnv.push([o.material,1]);
    if(/sail/i.test(o.name)||/sail/i.test(o.material.name)){o.material.side=THREE.DoubleSide}
    if(/rigging/i.test(o.name)){o.material.alphaTest=Math.max(o.material.alphaTest,.3)}}});
  shipGroup.add(ship.scene); addShipColliders();
  city.scene.updateMatrixWorld(true);
  // sky reflections on glass and water-side PBR
  const pm=new THREE.PMREMGenerator(renderer); const env=new THREE.Scene(); const s2=sky.clone(); s2.scale.setScalar(50); env.add(s2);
  scene.environment=pm.fromScene(env,.02).texture; pm.dispose();
  // spawn on the lowest broad walkable spot facing the city
  let best=null;for(let x=-60;x<=60;x+=4)for(let z=95;z>=-10;z-=4){let ok=0,yy=0;for(const[a,b]of[[0,0],[2,0],[-2,0],[0,2],[0,-2]]){const y=groundAt(new THREE.Vector3(x+a,70,z+b),1);if(y>1&&y<24){ok++;yy+=y}}if(ok===5){const s_=z*2-(yy/5)*3;if(!best||s_>best.s)best={s:s_,x,z,y:yy/5}}}
  if(best){spawn.set(best.x,best.y+2,best.z);pos.copy(spawn)}
  setupDoors();await setupGrass();setupLanterns();setupFairies();
  loadEl.hidden=true; start();
}

// ---------- forms
const P=new THREE.Group(); scene.add(P);
const mat=(c,o={})=>new THREE.MeshStandardMaterial({color:c,roughness:.6,...o});
function part(g,geo,m,x=0,y=0,z=0,sx=1,sy=1,sz=1){const k=new THREE.Mesh(geo,m);k.position.set(x,y,z);k.scale.set(sx,sy,sz);k.castShadow=true;g.add(k);return k}
const sph=new THREE.SphereGeometry(1,20,14), cap=(r,l)=>new THREE.CapsuleGeometry(r,l,6,12);
// slime: soft body in the vertex shader
const slimeU={uT:{value:0},uJig:{value:0},uDir:{value:new THREE.Vector3()},uPress:{value:0}};
const slimeMat=new THREE.MeshPhysicalMaterial({color:0x12b184,roughness:.14,metalness:0,clearcoat:1,clearcoatRoughness:.1,transparent:true,opacity:.9});
slimeMat.onBeforeCompile=s=>{Object.assign(s.uniforms,slimeU);
 s.vertexShader=`uniform float uT,uJig,uPress;uniform vec3 uDir;\n`+s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 float wob=sin(position.y*5.+uT*9.)*.06+sin(position.x*6.-uT*7.)*.05+sin(position.z*7.+uT*8.)*.05;
 transformed+=normal*wob*(.25+uJig);
 float low=smoothstep(.2,-1.,position.y); transformed.xz*=1.+low*(.14+uPress*.5);
 transformed-=uDir*(position.y+1.)*.22*uJig;`)};
const forms=[];
{const g=new THREE.Group(); const b=part(g,new THREE.IcosahedronGeometry(1,5),slimeMat,0,.9,0,.95,.9,.95); b.castShadow=true; b.name='body';
 const core=part(g,sph,new THREE.MeshStandardMaterial({color:0x0f9c78,emissive:0x0a5a44,roughness:.4}),0,.72,0,.28,.28,.28);
 const eye=mat(0x08201c,{roughness:.1});const w=new THREE.MeshStandardMaterial({color:0xffffff,emissive:0x444444});
 for(const s of[-1,1]){part(g,sph,eye,s*.3,1.14,-.8,.15,.19,.1);part(g,sph,w,s*.3+.04,1.2,-.88,.05,.06,.03)}
 forms.push({key:'1',name:'Slime',g,speed:10,jump:24,far:12,swim:9,air:.75,h:.9,r:.85,land:1,charge:true})}
{const g=new THREE.Group(),skin=mat(0xd9a57f),cl=mat(0x28536b),cl2=mat(0x6e4a2e),hair=mat(0x2a1a12);
 const leg=[],arm=[];part(g,cap(.2,.5),cl,0,1.25,0);part(g,sph,skin,0,1.92,0,.21,.24,.22);part(g,sph,hair,0,2.0,.04,.23,.2,.23);
 for(const s of[-1,1]){const l=new THREE.Group();l.position.set(s*.11,.95,0);part(l,cap(.09,.6),cl2,0,-.42,0);g.add(l);leg.push(l);const a=new THREE.Group();a.position.set(s*.28,1.55,0);part(a,cap(.07,.5),cl,0,-.3,0);g.add(a);arm.push(a)}
 forms.push({key:'2',name:'Person',g,speed:7.5,jump:10,far:0,swim:4.5,air:.6,h:1,r:.45,land:1,leg,arm})}
{const g=new THREE.Group(),m=mat(0x4f9a3e,{roughness:.4}),b=mat(0xd8e2a0);
 part(g,sph,m,0,.45,0,.62,.42,.8);part(g,sph,b,0,.32,-.1,.5,.3,.66);for(const s of[-1,1]){part(g,sph,m,s*.3,.84,-.42,.16,.16,.16);part(g,sph,mat(0x101510),s*.34,.87,-.54,.08,.08,.05);part(g,sph,m,s*.58,.28,.3,.2,.3,.5);part(g,sph,m,s*.7,.08,.0,.2,.07,.5);part(g,sph,m,s*.42,.14,-.5,.1,.14,.1)}
 forms.push({key:'3',name:'Frog',g,speed:7,jump:30,far:15,swim:8,air:.9,h:.6,r:.6,land:1})}
{const g=new THREE.Group(),m=mat(0xeef0e4),d=mat(0x4a5a66),o=mat(0xe2a33a);
 part(g,sph,m,0,.5,0,.3,.3,.62);part(g,sph,m,0,.74,-.5,.22,.22,.24);part(g,new THREE.ConeGeometry(.08,.3,8).rotateX(-Math.PI/2),o,0,.72,-.8);
 const wg=[];for(const s of[-1,1]){const w=new THREE.Group();w.position.set(s*.25,.62,0);part(w,sph,d,s*.75,0,.05,.82,.05,.32);g.add(w);wg.push(w)}
 part(g,sph,d,0,.5,.68,.16,.05,.34);forms.push({key:'4',name:'Gull',g,speed:9,jump:8,far:0,swim:3,air:1,h:.5,r:.5,land:1,fly:true,wg})}
{const g=new THREE.Group(),m=mat(0x5f7f92,{roughness:.25}),b=mat(0xdfe6ea,{roughness:.3});
 part(g,sph,m,0,.5,0,.44,.44,1.25);part(g,sph,b,0,.36,-.1,.33,.3,1.05);part(g,new THREE.ConeGeometry(.15,.5,8).rotateX(-Math.PI/2),m,0,.46,-1.4);
 part(g,new THREE.ConeGeometry(.3,.6,4),m,0,1,.15,.2,1,1).rotation.x=.4;for(const s of[-1,1]){const f=part(g,sph,m,s*.48,.3,-.3,.42,.05,.2);f.rotation.z=s*.5}
 part(g,sph,m,0,.5,1.3,.42,.06,.2);forms.push({key:'5',name:'Dolphin',g,speed:3.5,jump:7,far:0,swim:22,air:.45,h:.5,r:.6,land:.4,leap:true})}
forms.forEach((f,i)=>{f.g.visible=false;P.add(f.g);f.wj=[36,28,38,24,42][i]});
let form=forms[0]; form.g.visible=true;
const hud=document.getElementById('forms');
forms.forEach(f=>{const b=document.createElement('button');b.type='button';b.innerHTML=`<kbd>${f.key}</kbd>${f.name}`;b.onclick=()=>{setForm(f);canvas.focus()};f.btn=b;hud.appendChild(b)});

// ---------- the blacksmith: replaces the blocky Person once his model has loaded
{const f=forms[1];
 loader.load('blacksmith.glb',gl=>{const m=gl.scene;m.scale.setScalar(2.15/.98);m.rotation.y=Math.PI;m.traverse(o=>{if(o.isMesh){o.castShadow=true;o.frustumCulled=false}});
  f.g.children.forEach(c=>c.visible=false);f.g.add(m);
  const mx=new THREE.AnimationMixer(m),A={};gl.animations.forEach(c=>{const a=mx.clipAction(c);a.play();a.setEffectiveWeight(c.name==='idle'?1:0);A[c.name]=a});
  f.rig={mx,A,w:{idle:1,walk:0,run:0,swim:0}}},undefined,e=>console.warn('blacksmith model failed, keeping the simple person',e))}
// idle, walk, run and swim are Tripo clips; mid-air he holds a slowed run stride
function animateRig(r,dt,hs){const air=!ground&&!inWater,want=inWater?'swim':air?'run':hs<.6?'idle':hs<5?'walk':'run',k=Math.min(1,dt*9);
 for(const n in r.w){r.w[n]+=((n===want?1:0)-r.w[n])*k;r.A[n].setEffectiveWeight(r.w[n])}
 r.A.run.timeScale=air?.12:THREE.MathUtils.clamp(hs/7.5,.6,1.5);r.A.walk.timeScale=THREE.MathUtils.clamp(hs/3.5,.6,1.5);
 r.mx.update(dt)}

// splash particles
const PN=160, pPos=new Float32Array(PN*3), pVel=[], pGeo=new THREE.BufferGeometry(); pGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3));
for(let i=0;i<PN;i++){pVel.push({v:new THREE.Vector3(),t:0});pPos[i*3+1]=-999}
const pts=new THREE.Points(pGeo,new THREE.PointsMaterial({color:0xe8fff4,size:.22,transparent:true,opacity:.85,depthWrite:false})); pts.frustumCulled=false; scene.add(pts); let pI=0;
function burst(p,n,sp,up){for(let i=0;i<n;i++){const k=pI++%PN,a=Math.random()*6.28,r=Math.random()*sp;pVel[k].v.set(Math.cos(a)*r,up*(.4+Math.random()),Math.sin(a)*r);pVel[k].t=.9+Math.random()*.5;pPos[k*3]=p.x;pPos[k*3+1]=p.y;pPos[k*3+2]=p.z}}

// ---------- state
const pos=spawn.clone(),vel=new THREE.Vector3(); let ground=false,yaw=0,pitch=.2,dist=11,facing=0,charge=0,squash=1,squashV=0,morph=0,inWater=false,flap=0,t0=0,coyote=0,walk=0,last=performance.now(),started=false;
const keys={}; const down=c=>keys[c];
const fadeEl=document.getElementById('fade'),promptEl=document.getElementById('prompt'),nightBtn=document.getElementById('nightBtn');nightBtn.onclick=()=>{setNight(!nightT);canvas.focus()};
// ---------- bake data, doors, towers
const TOWERS=[
 {k:'A',name:'The Bellhouse',c:[9,-50.5],R:18.6,levels:7,roof:[{level:6,x:11,z:-77,y:50.3},{level:1,x:0,z:-62,y:13}],stairA:.4},
 {k:'B',name:'Ministry of Tides',c:[35.8,-38],R:11.8,levels:7,roof:[{level:6,x:38,z:-47,y:67.9}],stairA:2.2},
 {k:'C',name:'The Clerks’ Ward',c:[40.7,-11.4],R:16.5,levels:8,roof:[{level:7,x:41,z:-4,y:50.7},{level:1,x:49,z:-34,y:13}],stairA:1},
 {k:'D',name:'Lamplighters’ Hall',c:[16,33.7],R:9,levels:5,roof:[{level:4,x:10,z:21,y:34.6},{level:1,x:47,z:28,y:12}],stairA:3},
 {k:'E',name:'The Workhouse',c:[-38.9,48.6],R:11,levels:5,roof:[{level:4,x:-41,z:33,y:35.5}],stairA:5}];
let act=colliders,indoor=null,cityMeshes=[],fading=false,grassQ=1;const portals=[];
const matsEnv=[];const cityU={uCut:{value:new THREE.Vector4(0,0,0,0)},uCutY:{value:new THREE.Vector2()},uNight:{value:0},uT:{value:0}};
const NIGHT={top:new THREE.Color(.006,.012,.04),hor:new THREE.Color(.035,.055,.11),fog:new THREE.Color(.02,.035,.07),moon:new THREE.Vector3(-.45,.72,.52).normalize()};
const DAY={top:SKYC.top.clone(),hor:SKYC.hor.clone(),fog:FOG.clone(),sun:SUN.clone(),sunC:SKYC.sun.clone()};
let night=0,nightT=0,nightApplied=-1;
function applyNight(n){nightApplied=n;SKYC.top.lerpColors(DAY.top,NIGHT.top,n);SKYC.hor.lerpColors(DAY.hor,NIGHT.hor,n);FOG.lerpColors(DAY.fog,NIGHT.fog,n);scene.fog.color.copy(FOG);SUN.lerpVectors(DAY.sun,NIGHT.moon,n).normalize();
 SKYC.sun.setRGB(1-n*.25,.93-n*.1,.78+n*.17);skyU.uN.value=n;waterU.uN.value=n;cityU.uNight.value=n;
 sun.intensity=3.1*(1-n)+.42*n;sun.color.setRGB(1-n*.52,.94-n*.3,.85+n*.15);hemi.intensity=indoor?.5*(1-n*.42):.85*(1-n*.72);hemi.color.setRGB(.81-n*.45,.89-n*.45,.9-n*.3);
 for(const[m,e]of matsEnv)m.envMapIntensity=e*(1-n*.82)}
function hookCity(m){m.onBeforeCompile=s=>{Object.assign(s.uniforms,cityU);
 s.vertexShader='varying vec3 vWP;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vWP=(modelMatrix*vec4(transformed,1.)).xyz;');
 s.fragmentShader='varying vec3 vWP;uniform vec4 uCut;uniform vec2 uCutY;uniform float uNight,uT;\n'+s.fragmentShader
  .replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\n if(uCut.w>.5&&vWP.y>uCutY.x&&vWP.y<uCutY.y&&length(vWP.xz-uCut.xy)<uCut.z)discard;')
  .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
  float wr=smoothstep(.05,.2,diffuseColor.r-max(diffuseColor.g,diffuseColor.b)*1.1)*step(6.5,vWP.y);float teal=smoothstep(.02,.12,diffuseColor.b-diffuseColor.r)*smoothstep(.1,.3,diffuseColor.g)*step(6.5,vWP.y)*step(diffuseColor.g,diffuseColor.b*1.15);
  float fl=.82+.18*sin(uT*2.1+vWP.x*.7+vWP.y*.9);totalEmissiveRadiance+=(vec3(1.,.5,.16)*wr*2.4*fl+vec3(.95,.62,.26)*teal*.8*fl)*uNight;`)}}

// ---------- interiors, doors
const imat=makeTextures();
for(const k of['paper','wood','iron','brick','glass','brass'])matsEnv.push([imat[k],k==='iron'||k==='brass'?.9:.5]);
const doorProto=makeDoor(imat),kioskProto=makeKiosk(imat);
const keepOut=[];
function setupDoors(){
 for(const T of TOWERS){const d=BAKE.door[T.k],nl=Math.hypot(d.nx,d.nz),nx=d.nx/nl,nz=d.nz/nl;
  T.y0=d.y;T.doorA=Math.atan2(nz,nx);T.out=new THREE.Vector3(d.wx+nx*3.4,d.y+.3,d.wz+nz*3.4);
  const D=doorProto.clone();D.position.set(d.wx+nx*.05,d.y,d.wz+nz*.05);D.rotation.y=Math.atan2(nx,nz);scene.add(D);T.doorObj=D;keepOut.push([D.position.x,D.position.z,4]);
  lanternSpots.push({x:d.wx+nx*.7,y:d.y+4.8,z:d.wz+nz*.7,L:.1});
  portals.push({p:new THREE.Vector3(d.wx+nx*2.2,d.y+.5,d.wz+nz*2.2),r:3.2,label:'Enter '+T.name,go:()=>goIn(T,0)});
  T.roofDoors=[];
  for(const q of T.roof){let y=q.y,x=q.x,z=q.z,ok=false;
   outer:for(let rad=0;rad<20;rad+=2)for(let a=0;a<6.28;a+=.8){const X=q.x+Math.cos(a)*rad,Z=q.z+Math.sin(a)*rad,g=groundAt({x:X,y:q.y+5,z:Z},.5);if(Math.abs(g-q.y)<4.5){x=X;z=Z;y=g;ok=true;break outer}}
   let best=null;for(let i=0;i<8;i++){const a=i/8*6.283,gx=x+Math.sin(a)*4.6,gz=z+Math.cos(a)*4.6,g=groundAt({x:gx,y:y+3,z:gz},.5);const s=Math.abs(g-y);if(!best||s<best.s)best={s,a,gy:g,gx,gz}}
   const K=kioskProto.clone();K.position.set(x,y-.15,z);K.rotation.y=best.a;scene.add(K);K.traverse(o=>o.castShadow=false);keepOut.push([x,z,4.4]);
   const col=new THREE.Mesh(new THREE.BoxGeometry(4.8,6,4.8),new THREE.MeshBasicMaterial({visible:false}));col.position.set(x,y+2.6,z);col.rotation.y=best.a;col.updateMatrixWorld(true);colliders.push(col);
   const outP=new THREE.Vector3(best.gx,Math.max(best.gy,y)+.4,best.gz);lanternSpots.push({x:x+Math.sin(best.a)*3,y:y+3.9,z:z+Math.cos(best.a)*3,L:.2});
   const a=Math.atan2(z-T.c[1],x-T.c[0]);const rd={level:q.level,a,outP,yaw:best.a};T.roofDoors.push(rd);
   portals.push({p:outP.clone(),r:3.1,label:'Go inside to '+T.name,go:()=>goIn(T,1+T.roofDoors.indexOf(rd))})}
 }}
function ensureBuilt(T,i){if(T.built)return;const seed=T.k.charCodeAt(0)*131;T.built=buildInterior(imat,{c:T.c,R:T.R,y0:T.y0,levels:T.levels,doorA:T.doorA,seed,stairA:T.stairA,turn:5.25,roof:T.roofDoors.map(d=>({level:d.level,a:d.a}))});scene.add(T.built.group);T.built.group.visible=false;{const q=new Float32Array(T.built.lamps.length*3);T.built.lamps.forEach((v,i)=>v.toArray(q,i*3));const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(q,3));const hp=new THREE.Points(g,new THREE.PointsMaterial({map:softTex(),size:3,sizeAttenuation:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.75,fog:false}));hp.frustumCulled=false;T.built.group.add(hp)}
 T.iportal=T.built.doors.map(d=>{if(d.type==='exit')return{door:d,label:'Leave '+T.name,go:()=>goOut(T,T.out,Math.atan2(Math.cos(T.doorA),Math.sin(T.doorA))+Math.PI)};const rd=T.roofDoors.find(r=>r.level===d.d.level&&Math.abs(r.a-d.d.a)<1e-6);return{door:d,rd,label:'Step out onto the lily pad',go:()=>goOut(T,rd.outP,rd.yaw+Math.PI)}})}
function fade(fn){if(fading)return;fading=true;fadeEl.classList.add('on');setTimeout(()=>{fn();setTimeout(()=>{fadeEl.classList.remove('on');fading=false},60)},240)}
function enterNow(T,i){ensureBuilt(T,i);const b=T.built;b.group.visible=true;T.doorObj.visible=false;indoor=T;act=[b.collider];cityU.uCut.value.set(T.c[0],T.c[1],T.R+.45,1);cityU.uCutY.value.set(T.y0-1,b.top+1);cityMeshes.forEach(m=>m.castShadow=false);hemi.intensity=.5*(1-night*.42);
 const p=T.iportal[i===0?T.iportal.findIndex(q=>q.door.type==='exit'):T.iportal.findIndex(q=>q.rd===T.roofDoors[i-1])],a=p.door.a;pos.set(T.c[0]+Math.cos(a)*(T.R-2.6),p.door.p.y+.3,T.c[1]+Math.sin(a)*(T.R-2.6));vel.set(0,0,0);yaw=Math.atan2(Math.cos(a),Math.sin(a));pitch=.16;facing=yaw;camD=Math.min(camD,6);lightT=0}
function goIn(T,i){fade(()=>enterNow(T,i))}
function exitNow(T,p,yy){T.built.group.visible=false;T.doorObj.visible=true;indoor=null;act=colliders;cityU.uCut.value.w=0;cityMeshes.forEach(m=>m.castShadow=true);hemi.intensity=.85*(1-night*.72);pos.copy(p);vel.set(0,0,0);if(yy!==undefined){yaw=yy;facing=yy}lightT=0}
function goOut(T,p,yy){fade(()=>exitNow(T,p,yy))}

// ---------- grass
const grassU={uT:{value:0},uP:{value:new THREE.Vector3()}};const grassChunks=[];
async function setupGrass(){const buf=await (await fetch('grass.bin')).arrayBuffer();const n=new Uint32Array(buf,0,1)[0],hdr=new Uint32Array(buf,0,1+n*2),off=4*(1+n*2),dv=new DataView(buf,off);
 const blades=[];for(let i=0;i<5;i++){const a=i*1.26+.3,w=.042,g=new THREE.BufferGeometry(),ox=Math.cos(a*2.3)*.2,oz=Math.sin(a*2.3)*.2,lean=.28;const dx=Math.cos(a),dz=Math.sin(a),lx=-dz*lean,lz=dx*lean;
  const P=[-w,0,0,w,0,0,-w*.72,.5,lean*.3,w*.72,.5,lean*.3,0,1,lean];g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute([0,1,0,0,1,0,0,1,0,0,1,0,0,1,0],3));g.setIndex([0,1,2,2,1,3,2,3,4]);g.applyMatrix4(new THREE.Matrix4().makeRotationY(a));g.translate(ox,0,oz);blades.push(g)}
 const tuft=mergeGeometries(blades,false);
 const m=new THREE.MeshLambertMaterial({color:0xffffff,side:THREE.DoubleSide});
 m.onBeforeCompile=s=>{Object.assign(s.uniforms,grassU);
  s.uniforms.uCut=cityU.uCut;s.uniforms.uCutY=cityU.uCutY;s.vertexShader=`uniform float uT;uniform vec3 uP;uniform vec4 uCut;uniform vec2 uCutY;varying float vH;\n`+s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   vH=position.y;vec3 ip=instanceMatrix[3].xyz;float sc=length(instanceMatrix[0].xyz);mat3 irot=transpose(mat3(instanceMatrix))/(sc*sc);
   float gust=sin(ip.x*.075+uT*1.35+sin(ip.z*.05+uT*.31)*2.2)*.5+.5;float gust2=sin(ip.z*.21-ip.x*.13+uT*2.6)*.5+.5;float w=.22+gust*gust*.85+gust2*.16;
   float fl=sin(uT*7.+ip.x*3.1+ip.z*2.3+position.x*9.)*.07*(.4+gust);
   vec3 wd=vec3(.82*w+fl,0.,.57*w-fl);
   vec3 tp=ip-uP;float dp=length(tp.xz);if(abs(tp.y)<3.){float k=smoothstep(2.3,.4,dp);wd.xz+=normalize(tp.xz+.001)*k*1.25;}
   float bend=vH*vH;transformed+=irot*vec3(wd.x*bend*sc,-(length(wd)*.32)*bend*sc,wd.z*bend*sc)*.5;if(uCut.w>.5&&ip.y>uCutY.x&&ip.y<uCutY.y+1.5&&length(ip.xz-uCut.xy)<uCut.z+.5)transformed*=0.;`);
  s.fragmentShader='varying float vH;\n'+s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.rgb*=mix(.42,1.2,vH*vH*.5+vH*.5);').replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\n normal=normalize(vNormal);')};
 const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(),V=new THREE.Vector3(),U=new THREE.Vector3(0,1,0),col=new THREE.Color();
 let seed=11;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
 for(let c=0;c<n;c++){const st=hdr[1+c*2],ct=hdr[2+c*2];if(ct<30)continue;const im=new THREE.InstancedMesh(tuft,m,ct);im.frustumCulled=true;im.receiveShadow=true;im.castShadow=false;let k=0,cx=0,cy=0,cz=0;
  for(let i=0;i<ct;i++){const o=(st+i)*8,x=dv.getInt16(o,true)/10,y=dv.getInt16(o+2,true)/10,z=dv.getInt16(o+4,true)/10,r=dv.getUint8(o+6)/255,g=dv.getUint8(o+7)/255;
   if(rnd()<.3)continue;if(keepOut.some(q=>Math.hypot(q[0]-x,q[1]-z)<q[2]&&Math.abs(y-groundY(q))<30))continue;
   Q.setFromAxisAngle(U,rnd()*6.283);const s=1.3+rnd()*1.4;M.compose(V.set(x,y-.05,z),Q,S.set(s*(.9+rnd()*.5),s*(.85+rnd()*.6),s*(.9+rnd()*.5)));im.setMatrixAt(k,M);
   const v=rnd();col.setRGB(r*.36+.03+v*.08,g*.52+.07+v*.1,(r*.14+.03)*(1-v*.3));im.setColorAt(k,col);k++;cx+=x;cy+=y;cz+=z}
  if(!k)continue;im.count=k;im.instanceMatrix.needsUpdate=true;im.instanceColor.needsUpdate=true;im.computeBoundingSphere();scene.add(im);grassChunks.push({m:im,n:k,c:new THREE.Vector3(cx/k,cy/k,cz/k)})}
 matsEnv.push([m,0])}
const groundY=()=>0;
function lodGrass(){for(const g of grassChunks){const d=g.c.distanceTo(camera.position),f=Math.min(1,Math.max(.1,1.2-d/135))*grassQ;g.m.count=Math.max(1,g.n*f|0);g.m.visible=d<300}}

// ---------- lanterns
const lanternSpots=[];let lanternI,lanternG,haloPts,haloGeo,lanterns=[];
const glowMat=new THREE.MeshStandardMaterial({color:0xcf9a55,emissive:0xff9a3c,emissiveIntensity:.05,roughness:.3,transparent:true,opacity:.92});
function softTex(a=[[0,'rgba(255,240,205,1)'],[.18,'rgba(255,190,110,.65)'],[.5,'rgba(255,150,60,.13)'],[1,'rgba(255,130,40,0)']]){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),r=g.createRadialGradient(64,64,0,64,64,64);a.forEach(q=>r.addColorStop(q[0],q[1]));g.fillStyle=r;g.fillRect(0,0,128,128);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
function setupLanterns(){
 for(const l of BAKE.ls){if(lanternSpots.length>=86)break;lanternSpots.push({x:l.x,y:l.y-.15,z:l.z,L:Math.min(2.6,1+l.g*.12)})}
 for(const q of[[-9,8,0],[3,9.5,3],[12,7,-2.4]]){const v=new THREE.Vector3(...q);shipGroup.updateMatrixWorld(true);v.applyMatrix4(shipGroup.matrixWorld);lanternSpots.push({x:v.x,y:v.y,z:v.z,L:.5})}
 const n=lanternSpots.length,parts=[];const cage=(g,x=0,y=0,z=0)=>{g.translate(x,y,z);parts.push(g.index?g.toNonIndexed():g)};
 cage(new THREE.CylinderGeometry(.24,.32,.09,6),0,-.22,0);cage(new THREE.ConeGeometry(.3,.26,6),0,-.1,0);cage(new THREE.CylinderGeometry(.3,.24,.06,6),0,-.98,0);for(let i=0;i<6;i++){const a=i/6*6.283;const b=new THREE.BoxGeometry(.03,.68,.03);b.translate(Math.cos(a)*.27,-.6,Math.sin(a)*.27);parts.push(b.toNonIndexed())}
 parts.forEach(p=>{if(!p.attributes.uv)p.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(p.attributes.position.count*2),2))});
 const ch=new THREE.BoxGeometry(.035,1,.035);ch.translate(0,.5,0);lanternG=new THREE.InstancedMesh(mergeGeometries(parts,false),imat.iron,n);const chain=new THREE.InstancedMesh(ch,imat.iron,n);
 lanternI=new THREE.InstancedMesh(new THREE.CylinderGeometry(.22,.22,.64,6).translate(0,-.6,0),glowMat,n);
 lanternG.castShadow=true;[lanternG,lanternI,chain].forEach(m=>{m.frustumCulled=false;scene.add(m)});lanternG.chain=chain;
 haloGeo=new THREE.BufferGeometry();haloGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(n*3),3));haloPts=new THREE.Points(haloGeo,new THREE.PointsMaterial({map:softTex(),size:7,sizeAttenuation:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:0,fog:false}));haloPts.frustumCulled=false;scene.add(haloPts);
 lanterns=lanternSpots.map((l,i)=>({...l,ph:i*1.7,w:.75+(i%5)*.11}))}
const LM=new THREE.Matrix4(),LC=new THREE.Matrix4(),LE=new THREE.Euler(),LQ=new THREE.Quaternion(),LV=new THREE.Vector3(),LS=new THREE.Vector3(1.5,1.5,1.5),LD=new THREE.Vector3();
function updLanterns(t,n){const ha=haloGeo.attributes.position;const on=n>.01||true;
 lanterns.forEach((l,i)=>{const g=.5+.5*Math.sin(t*.42+l.x*.04),sw=(.1+.2*g)*Math.sin(t*l.w*1.6+l.ph),sw2=(.05+.1*g)*Math.cos(t*l.w*1.17+l.ph*1.3);LE.set(sw2,0,sw);LQ.setFromEuler(LE);LV.set(l.x,l.y,l.z);
  LD.set(0,-l.L,0).applyQuaternion(LQ);LS.set(.05*20,l.L,.05*20);LC.compose(LV.set(l.x,l.y,l.z).add(LD),LQ,LS);lanternG.chain.setMatrixAt(i,LC);
  const cut=indoor&&Math.hypot(l.x-indoor.c[0],l.z-indoor.c[1])<indoor.R+1.5&&l.y>indoor.y0&&l.y<indoor.built.top+1.5;LS.setScalar(cut?0:1.5);LM.compose(LV,LQ,LS);if(cut){LS.set(0,0,0);LC.compose(LV,LQ,LS);lanternG.chain.setMatrixAt(i,LC)}lanternG.setMatrixAt(i,LM);lanternI.setMatrixAt(i,LM);LD.set(0,-.9,0).applyQuaternion(LQ);ha.setXYZ(i,LV.x+LD.x,cut?-999:LV.y+LD.y,LV.z+LD.z);l.gx=LV.x+LD.x;l.gy=LV.y+LD.y;l.gz=LV.z+LD.z});
 lanternG.instanceMatrix.needsUpdate=true;lanternI.instanceMatrix.needsUpdate=true;lanternG.chain.instanceMatrix.needsUpdate=true;ha.needsUpdate=true;
 const fl=.92+.08*Math.sin(t*11)*Math.sin(t*7.3);glowMat.emissiveIntensity=.04+n*n*5*fl;haloPts.material.opacity=n*.85*fl;haloPts.visible=n>.01}

// ---------- pooled real lights near the player
const pool=[];for(let i=0;i<4;i++){const l=new THREE.PointLight(0xffa858,0,34,1.7);scene.add(l);pool.push(l)}let lightT=0;
function updLights(dt,n,t){lightT-=dt;
 if(lightT<=0){lightT=.35;const src=indoor?indoor.built.lamps.map(v=>({gx:v.x,gy:v.y,gz:v.z,s:1})):lanterns.filter(l=>l.gx!==undefined).map(l=>l);const dq=q=>(q.gx-pos.x)**2+(q.gy-pos.y)**2*(indoor?2.2:1)+(q.gz-pos.z)**2;src.sort((a,b)=>dq(a)-dq(b));pool.forEach((p,i)=>{p.src=src[i]})}
 const fl=.9+.1*Math.sin(t*9.1)*Math.sin(t*5.3);pool.forEach((p,i)=>{if(!p.src){p.intensity=0;return}p.position.set(p.src.gx,p.src.gy,p.src.gz);p.intensity=indoor?(24+40*n)*fl:n*24*fl;p.distance=indoor?20:40})}

// ---------- fairies
const fairies=[];const FA=[[23,72,-46,26],[0,55,-74,18],[42,56,-9,18],[19,40,34,18],[-40,41,48,16],[47,17,28,15],[-52,9,47,28],[0,10,-30,20],[28,12,10,20],[8,8,-84,18],[60,8,-25,14],[-83,12,70,10],[150,10,50,16]];
function fairyTex(c1){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');const h=g.createRadialGradient(64,64,0,64,64,62);h.addColorStop(0,'#fff');h.addColorStop(.1,c1);h.addColorStop(.42,c1+'44');h.addColorStop(1,c1+'00');g.fillStyle=h;g.fillRect(0,0,128,128);g.globalCompositeOperation='lighter';g.fillStyle=c1+'66';for(const s of[-1,1]){g.beginPath();g.ellipse(64+s*22,50,24,11,s*-.6,0,7);g.fill();g.beginPath();g.ellipse(64+s*16,76,15,7,s*.55,0,7);g.fill()}return Object.assign(new THREE.CanvasTexture(c),{colorSpace:THREE.SRGBColorSpace})}
function setupFairies(){const tx=['#9dffd8','#ffe68a','#a8d4ff','#ffb4e6'].map(c=>new THREE.SpriteMaterial({map:fairyTex(c),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false,opacity:0}));let s=5;const rn=()=>(s=(s*16807)%2147483647)/2147483647;
 for(let i=0;i<84;i++){const a=i<10?null:FA[i%FA.length],sp=new THREE.Sprite(tx[i%4]);sp.scale.setScalar(1);sp.visible=false;scene.add(sp);fairies.push({sp,a,w:.25+rn()*.55,w2:.3+rn()*.7,p:rn()*6.28,r:(a?a[3]:4.5)*(.35+rn()*.75),ry:1+rn()*5,z:.45+rn()*.45})}fairies.mats=tx}
const FV=new THREE.Vector3();function updFairies(t,n){fairies.mats.forEach(m=>m.opacity=n);const vis=n>.02;for(const f of fairies){f.sp.visible=vis;if(!vis)continue;const a=f.a;
 if(a)f.sp.position.set(a[0]+Math.sin(t*f.w+f.p)*f.r+Math.sin(t*f.w*2.7+f.p)*1.6,a[1]+Math.sin(t*f.w2+f.p*2)*f.ry+Math.sin(t*5+f.p)*.14,a[2]+Math.cos(t*f.w*.87+f.p)*f.r+Math.cos(t*f.w*3.1)*1.6);
 else f.sp.position.set(pos.x+Math.sin(t*f.w*1.8+f.p)*f.r,pos.y+2.1+Math.sin(t*f.w2*1.5+f.p)*1.4+Math.sin(t*6+f.p)*.1,pos.z+Math.cos(t*f.w*1.5+f.p)*f.r);
 const b=.72+.28*Math.sin(t*(3+f.w*4)+f.p*3);FV.setScalar(1);const fs=a?1:.55;f.sp.scale.set((.72+.26*Math.abs(Math.sin(t*30+f.p)))*1.15*b*fs,.95*b*fs,1)}}

function updPortals(){let best=null,bd=1e9;
 if(indoor){for(const p of indoor.iportal){const d=Math.hypot(p.door.p.x-pos.x,p.door.p.z-pos.z);if(Math.abs(p.door.p.y-pos.y)<2.4&&d<3&&d<bd){bd=d;best=p}}}
 else for(const p of portals){const d=Math.hypot(p.p.x-pos.x,p.p.z-pos.z);if(Math.abs(p.p.y-pos.y)<3.2&&d<p.r&&d<bd){bd=d;best=p}}
 curPortal=best;promptEl.hidden=!best;if(best)promptEl.lastChild.textContent=' '+best.label}
let curPortal=null;
const setNight=v=>{nightT=v?1:0;nightBtn.classList.toggle('on',!!v);nightBtn.lastChild.textContent=v?'Night':'Day'};

function setForm(f){if(f===form)return;form.g.visible=false;form.btn.classList.remove('on');form=f;f.g.visible=true;f.btn.classList.add('on');morph=1;burst(pos.clone().add(new THREE.Vector3(0,1,0)),60,6,7);pos.y+=.25}
forms[0].btn.classList.add('on');
addEventListener('keydown',e=>{if(e.repeat)return;keys[e.code]=1;
 const n=+e.key;if(n>=1&&n<=5)setForm(forms[n-1]);
 if(e.code==='KeyE'&&curPortal)curPortal.go();if(e.code==='KeyN')setNight(!nightT);
 if(e.code==='KeyR'){if(indoor)exitNow(indoor,spawn);pos.copy(spawn);vel.set(0,0,0);yaw=0;pitch=.2;charge=0;facing=0}
 if(['Space','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();
 if(e.code==='Space'&&form.charge&&(ground||coyote>0)&&!inWater)charge=.001;
 else if(e.code==='Space')tryJump(1)});
addEventListener('keyup',e=>{keys[e.code]=0;if(e.code==='Space'&&charge>0){tryJump(.72+charge*.75);charge=0}});
function tryJump(p){
  if(inWater){if(pos.y>-3.2){vel.y=form.wj;pos.y=Math.max(pos.y,-.2);const f=dirInput();vel.x+=f.x*8;vel.z+=f.z*8;burst(pos,40,5,9)}return}
  if(form.fly&&!ground){vel.y=Math.max(vel.y,0)+7;flap=1;return}
  if(ground||coyote>0){vel.y=form.jump*p;const f=dirInput();if(form.far){vel.x+=f.x*form.far*p;vel.z+=f.z*p*form.far}ground=false;coyote=0;squashV=4.5;burst(pos,14,3,2)}
}
function dirInput(){const f=(down('KeyW')||down('ArrowUp')?1:0)-(down('KeyS')||down('ArrowDown')?1:0),r=(down('KeyD')||down('ArrowRight')?1:0)-(down('KeyA')||down('ArrowLeft')?1:0);const s=Math.sin(yaw),c=Math.cos(yaw);const v=new THREE.Vector3(-s*f+c*r*1,0,-c*f-s*r);if(v.lengthSq()>1)v.normalize();return v}
canvas.addEventListener('click',()=>{tipEl.classList.add('dim');canvas.requestPointerLock&&Promise.resolve(canvas.requestPointerLock()).catch(()=>{})});
addEventListener('mousemove',e=>{if(document.pointerLockElement!==canvas&&!(e.buttons&1))return;yaw-=e.movementX*.0026;pitch=THREE.MathUtils.clamp(pitch+e.movementY*.0022,-.35,1.2)});
addEventListener('wheel',e=>{dist=THREE.MathUtils.clamp(dist+e.deltaY*.01,5,30)},{passive:true});
function size(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}addEventListener('resize',size);size();

const down3=new THREE.Vector3(0,-1,0),tmp=new THREE.Vector3(),hdirs=[...Array(12).keys()].map(i=>new THREE.Vector3(Math.cos(i*Math.PI/6),0,Math.sin(i*Math.PI/6))),up3=new THREE.Vector3(0,1,0);
function groundAt(p,up=1.2){ray.set(tmp.set(p.x,p.y+up,p.z),down3);ray.far=up+60;ray.firstHitOnly=true;const h=ray.intersectObjects(act,false);return h.length?h[0].point.y:-Infinity}
function push(){const r=form.r;for(const hy of[.55,1.1,1.7])for(const d of hdirs){ray.set(tmp.set(pos.x,pos.y+hy,pos.z),d);ray.far=r+.15;const h=ray.intersectObjects(act,false);if(h.length&&Math.abs(h[0].face.normal.clone().transformDirection(h[0].object.matrixWorld).y)<.6){const n=r+.15-h[0].distance;pos.addScaledVector(d,-n);const vn=vel.dot(d);if(vn>0)vel.addScaledVector(d,-vn)}}}
function step(dt){
  const t=performance.now()/1000-t0;
  const inp=dirInput(),moving=inp.lengthSq()>.01; inWater=pos.y<-.25;
  const sp=(inWater?form.swim:form.speed*form.land)*(down('ShiftLeft')?1.45:1);
  const ac=ground||inWater?11:form.air*(form.fly?4:3.5);
  vel.x+=(inp.x*sp-vel.x)*Math.min(1,ac*dt);vel.z+=(inp.z*sp-vel.z)*Math.min(1,ac*dt);
  if(inWater){
    const b=(-.45-pos.y)*18;vel.y+=(b-vel.y*3.2)*dt;
    if(down('KeyC')||down('ControlLeft'))vel.y-=34*dt; if(down('Space')&&pos.y<-1.3)vel.y+=30*dt;
    if(Math.random()<dt*(moving?26:3))burst(tmp.set(pos.x,.1,pos.z).clone(),1,1.6,1.2);
  } else {
    let g=form.fly&&vel.y<0&&down('Space')?10:32; if(charge>0)g=32;
    vel.y-=g*dt; if(form.fly&&vel.y<-6&&down('Space'))vel.y=-6;
  }
  if(charge>0)charge=Math.min(1,charge+dt*1.5);
  const wasAir=!ground,prevVy=vel.y,wasGround=ground,ns=Math.min(14,Math.ceil(Math.max(Math.hypot(vel.x,vel.z),Math.abs(vel.y))*dt/.2)||1),sd=dt/ns;ground=false;
  for(let i=0;i<ns;i++){pos.x+=vel.x*sd;pos.z+=vel.z*sd;push();
    if(vel.y>0){ray.set(tmp.set(pos.x,pos.y+.3,pos.z),up3);ray.far=Math.max(.2,form.h*1.1-.3)+vel.y*sd+.05;const h=ray.intersectObjects(act,false);if(h.length)vel.y=0}
    pos.y+=vel.y*sd;const gy=groundAt(pos,.7);
    if(vel.y<=0&&gy>-1&&(pos.y<=gy+.04||(wasGround&&pos.y-gy<.4))){pos.y=gy;vel.y=0;ground=true;coyote=.12;if(wasAir&&prevVy<-6){squashV=-Math.min(9,-prevVy*.42);burst(pos,Math.min(40,-prevVy*2|0),5,3)}break}}
  if(!ground)coyote=Math.max(0,coyote-dt);
  if(indoor){const dx=pos.x-indoor.c[0],dz=pos.z-indoor.c[1],rr=Math.hypot(dx,dz),mx=indoor.R-.5-form.r;if(rr>mx){pos.x=indoor.c[0]+dx/rr*mx;pos.z=indoor.c[1]+dz/rr*mx}const f=indoor.built;if(pos.y<f.y0)pos.y=f.y0}
  if(!wasInWater&&inWater&&prevVy<-5)burst(pos,70,6,9); wasInWater=inWater;
  if(Math.hypot(pos.x,pos.z)>420){pos.x*=.995;pos.z*=.995}
  // soft-body spring
  const tgt=charge>0?.62-charge*.2:1;squashV+=(tgt-squash)*170*dt;squashV*=Math.exp(-11*dt);squash+=squashV*dt;
  const hs=Math.hypot(vel.x,vel.z);
  if(moving){const want=Math.atan2(-inp.x,-inp.z);let d=want-facing;d=Math.atan2(Math.sin(d),Math.cos(d));facing+=d*Math.min(1,dt*11)}
  P.position.copy(pos);P.rotation.y=facing;
  morph=Math.max(0,morph-dt*3.2);const mk=1+Math.sin(morph*Math.PI)*.35;
  const f=form;
  if(f===forms[0]){const st=THREE.MathUtils.clamp(squash+Math.abs(vel.y)*.012,.4,1.7);f.g.scale.set(mk/Math.sqrt(st),mk*st,mk/Math.sqrt(st));slimeU.uT.value=t;const j=Math.min(1,hs*.05+Math.abs(squashV)*.1+Math.abs(vel.y)*.02);slimeU.uJig.value+=(j-slimeU.uJig.value)*Math.min(1,dt*7);slimeU.uPress.value=charge;slimeU.uDir.value.set(0,0,-hs*.05).applyAxisAngle(new THREE.Vector3(0,1,0),0)}
  else f.g.scale.setScalar(mk);
  if(ground)walk+=hs*dt*2.4;
  if(f.leg){const s=Math.sin(walk)*Math.min(1,hs*.2);f.leg[0].rotation.x=s;f.leg[1].rotation.x=-s;f.arm[0].rotation.x=-s;f.arm[1].rotation.x=s;f.g.rotation.x=inWater?-1.2:0;f.g.position.y=inWater?.3:0}
  if(f.rig){f.g.rotation.x=0;f.g.position.y=0;animateRig(f.rig,dt,hs)}
  if(f===forms[2]){f.g.rotation.x=ground?0:THREE.MathUtils.clamp(vel.y*.03,-.5,.5);f.g.scale.y=mk*(ground?1+Math.abs(Math.sin(walk))*.0:1.15)}
  if(f.wg){flap*=Math.exp(-5*dt);const a=(ground?-.9:Math.sin(t*(flap>.1?26:4))*(.2+flap*.7)+.05);f.wg[0].rotation.z=-a;f.wg[1].rotation.z=a;f.g.rotation.x=ground?0:THREE.MathUtils.clamp(vel.y*.03,-.5,.4)}
  if(f.leap){f.g.rotation.x=inWater?Math.sin(t*9)*.13:THREE.MathUtils.clamp(vel.y*.05,-.9,.9)}
  // ship bob
  shipGroup.position.y=Math.sin(t*.7)*.14;shipGroup.rotation.z=Math.sin(t*.53)*.012;shipGroup.rotation.x=Math.sin(t*.41)*.009;
  // camera
  const look=pos.clone().add(new THREE.Vector3(0,1.5,0));const cd=new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));
  let want=indoor?Math.min(dist,6.5):dist;ray.set(look,cd);ray.far=want;const hit=ray.intersectObjects(act,false);if(hit.length)want=Math.max(2.4,hit[0].distance-.5);
  camD+=(want-camD)*Math.min(1,dt*(want<camD?14:4));
  camera.position.copy(look).addScaledVector(cd,camD);if(camera.position.y<.5&&!inWater)camera.position.y=.5;camera.lookAt(look);
  sky.position.copy(camera.position);waterU.uT.value=t;skyU.uT.value=t;waterU.uCam.value.copy(camera.position);water.position.x=Math.round(camera.position.x/8)*8;water.position.z=Math.round(camera.position.z/8)*8;
  sun.position.copy(pos).addScaledVector(SUN,150);sun.target.position.copy(pos);
  document.getElementById('under').hidden=!(camera.position.y<.0);
  for(let i=0;i<PN;i++){const q=pVel[i];if(q.t<=0)continue;q.t-=dt;q.v.y-=16*dt;pPos[i*3]+=q.v.x*dt;pPos[i*3+1]+=q.v.y*dt;pPos[i*3+2]+=q.v.z*dt;if(q.t<=0)pPos[i*3+1]=-999}
  pGeo.attributes.position.needsUpdate=true;
  if(night!==nightT){night+=Math.sign(nightT-night)*Math.min(Math.abs(nightT-night),dt/2.2)}if(night!==nightApplied)applyNight(night);
  grassU.uT.value=t;grassU.uP.value.copy(pos);cityU.uT.value=t;updLanterns(t,night);updFairies(t,night);updLights(dt,night,t);updPortals();
  lodT-=dt;if(lodT<=0){lodT=.5;lodGrass()}
}
let lodT=0;
let camD=11,wasInWater=false,fps=60,fc=0,ft=0;
function frame(n){requestAnimationFrame(frame);if(window.__noRender){last=n;return}const dt=Math.max(0,Math.min(.05,(n-last)/1000));last=n;step(dt);renderer.render(scene,camera);
 fc++;ft+=dt;if(ft>2){fps=fc/ft;fc=0;ft=0;if(fps<32&&pr>.75){pr=Math.max(.75,pr-.25);renderer.setPixelRatio(pr);size()}else if(fps<32&&grassQ>.3){grassQ*=.72;lodGrass()}}}
function start(){t0=performance.now()/1000;last=performance.now();requestAnimationFrame(frame);
 window.__T=THREE;window.__g={info(){return JSON.stringify(renderer.info.render)+JSON.stringify(renderer.info.memory)},snap(){renderer.render(scene,camera);return canvas.toDataURL('image/jpeg',.85)},colliders,ray,setNight,TOWERS,enterNow,exitNow,get indoor(){return indoor},get portal(){return curPortal},get nightV(){return night},set nightV(v){night=v;nightT=v},lanterns:()=>lanterns,portals,pos,vel,keys,setForm,forms,get form(){return form},get ground(){return ground},get yaw(){return yaw},set yaw(v){yaw=v},set pitch(v){pitch=v},set dist(v){dist=v;camD=v},tryJump,step,spawn,groundAt,get fps(){return fps}}}
init().catch(e=>{loadEl.querySelector('p').textContent='The world could not load. Reload the page to try again.';console.error(e)});
