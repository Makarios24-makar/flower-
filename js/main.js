import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
const stage=document.querySelector('#stage'),scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(38,innerWidth/innerHeight,.1,100);camera.position.set(0,0,8.5);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.setClearColor(0,0);stage.appendChild(renderer.domElement);
const flower=new THREE.Group();scene.add(flower);
const pos=[],cols=[],sizes=[],seeds=[];
const rand=(a,b)=>a+Math.random()*(b-a);

// Six broad, overlapping petals. Each is a curved, softly tapered oval.
const petals=6, perPetal=3100;
for(let k=0;k<petals;k++){
  const angle=k*Math.PI*2/petals + .12;
  for(let i=0;i<perPetal;i++){
    const u=Math.sqrt(Math.random());             // distance from petal base to tip
    const v=rand(-1,1);                           // across petal
    const length=.98, width=.43*Math.sin(Math.PI*(.08+.88*u))**.72;
    const radial=.16+u*length;
    const across=v*width;
    const ca=Math.cos(angle),sa=Math.sin(angle);
    let x=ca*radial-sa*across;
    let y=sa*radial+ca*across;
    // A shallow cup, with a slight ridge down the petal.
    let z=.16 + .20*Math.sin(Math.PI*u) + .12*(1-v*v) + .035*Math.sin(u*18+v*5);
    z += rand(-.035,.035);
    pos.push(x,y,z);
    const c=new THREE.Color().setHSL(rand(.88,.96),rand(.48,.78),rand(.57,.82));
    if(Math.random()<.10)c.setHSL(.94,.55,.9);
    cols.push(c.r,c.g,c.b);
    sizes.push(rand(.012,.029));
    seeds.push(rand(0,6.28),rand(.4,1.6),rand(.5,1.8));
  }
}
// Warm yellow pollen centre, built as a dense little dome.
for(let i=0;i<2400;i++){
  const r=.28*Math.sqrt(Math.random()),a=rand(0,Math.PI*2);
  const x=Math.cos(a)*r,y=Math.sin(a)*r,z=.31+.10*Math.sqrt(Math.max(0,1-(r/.3)**2))+rand(-.025,.025);
  pos.push(x,y,z);
  const c=new THREE.Color().setHSL(rand(.105,.16),rand(.78,1),rand(.48,.72));
  cols.push(c.r,c.g,c.b);sizes.push(rand(.012,.027));seeds.push(rand(0,6.28),rand(.4,1.6),rand(.5,1.8));
}
// A few tiny pollen specks around the centre.
for(let i=0;i<380;i++){
  const a=rand(0,Math.PI*2),r=rand(.10,.34);
  pos.push(Math.cos(a)*r,Math.sin(a)*r,rand(.34,.52));
  const c=new THREE.Color(0xffd85a);cols.push(c.r,c.g,c.b);sizes.push(rand(.012,.024));seeds.push(rand(0,6.28),rand(.4,1.6),rand(.5,1.8));
}
const geo=new THREE.BufferGeometry();
geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));
geo.setAttribute('aSize',new THREE.Float32BufferAttribute(sizes,1));
geo.setAttribute('aSeed',new THREE.Float32BufferAttribute(seeds,3));
// Build a character atlas: every visible particle is a digit / keyboard symbol.
const glyphs = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&*+=<>?/{}[]";
const cols = 8, rows = Math.ceil(glyphs.length / cols), cell = 128;
const atlasCanvas = document.createElement('canvas');
atlasCanvas.width = cols * cell; atlasCanvas.height = rows * cell;
const ctx = atlasCanvas.getContext('2d');
ctx.clearRect(0,0,atlasCanvas.width,atlasCanvas.height);
ctx.textAlign='center'; ctx.textBaseline='middle';
ctx.font='bold 84px monospace';
for(let i=0;i<glyphs.length;i++){
  const x=(i%cols)*cell+cell/2, y=Math.floor(i/cols)*cell+cell/2;
  ctx.shadowColor='#ff64c7'; ctx.shadowBlur=22;
  ctx.fillStyle='#ffd5ef'; ctx.fillText(glyphs[i],x,y);
  ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,105,202,.75)'; ctx.fillText(glyphs[i],x,y);
}
const atlas = new THREE.CanvasTexture(atlasCanvas);
atlas.colorSpace = THREE.SRGBColorSpace;
atlas.magFilter = THREE.LinearFilter;
atlas.minFilter = THREE.LinearMipmapLinearFilter;

// Give each point its own randomly selected character from the atlas.
const glyphIds = new Float32Array(pos.length/3);
for(let i=0;i<glyphIds.length;i++) glyphIds[i]=Math.floor(Math.random()*glyphs.length);
geo.setAttribute('aGlyph',new THREE.BufferAttribute(glyphIds,1));

const mat=new THREE.ShaderMaterial({
 transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
 uniforms:{
   uTime:{value:0},uExplode:{value:0},uPixelRatio:{value:Math.min(devicePixelRatio,2)},
   uAtlas:{value:atlas},uAtlasCols:{value:cols},uAtlasRows:{value:rows},uGlyphCount:{value:glyphs.length}
 },
 vertexShader:`
 attribute float aSize; attribute vec3 aSeed; attribute vec3 color; attribute float aGlyph;
 varying vec3 vColor; varying float vAlpha; varying float vGlyph;
 uniform float uTime,uExplode,uPixelRatio;
 void main(){
   vColor=color; vGlyph=aGlyph;
   vec3 p=position;
   p += normalize(position+vec3(.001))*sin(uTime*1.5+aSeed.x)*.009;
   vec3 dir=normalize(position+vec3(aSeed.x*.12,aSeed.y*.1,aSeed.z*.1));
   p += dir*uExplode*(.8+aSeed.y*1.3);
   vec4 mv=modelViewMatrix*vec4(p,1.0); gl_Position=projectionMatrix*mv;
   gl_PointSize=clamp(aSize*uPixelRatio*720.0/(-mv.z),3.0,15.0);
   vAlpha=(.72+.28*sin(uTime*2.0+aSeed.x*3.0))*(1.0-uExplode*.62);
 }`,
 fragmentShader:`
 uniform sampler2D uAtlas; uniform float uAtlasCols,uAtlasRows;
 varying vec3 vColor; varying float vAlpha; varying float vGlyph;
 void main(){
   float gx=mod(vGlyph,uAtlasCols);
   float gy=floor(vGlyph/uAtlasCols);
   vec2 uv=vec2((gx+gl_PointCoord.x)/uAtlasCols,1.0-(gy+1.0-gl_PointCoord.y)/uAtlasRows);
   vec4 glyph=texture2D(uAtlas,uv);
   if(glyph.a<.12) discard;
   float scan=.82+.18*sin(gl_FragCoord.y*1.3);
   gl_FragColor=vec4(glyph.rgb*vColor*1.55,glyph.a*vAlpha*scan);
 }`
});
flower.add(new THREE.Points(geo,mat));
// Sparse drifting particles surrounding the bloom.
const dustPos=[];for(let i=0;i<700;i++){let a=rand(0,6.28),r=rand(1.25,2.2);dustPos.push(Math.cos(a)*r,rand(-1.5,1.5),rand(-.5,.8));}
const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.Float32BufferAttribute(dustPos,3));
const dustGlyphIds=new Float32Array(dustPos.length/3);
for(let i=0;i<dustGlyphIds.length;i++) dustGlyphIds[i]=Math.floor(Math.random()*glyphs.length);
dustGeo.setAttribute('aGlyph',new THREE.BufferAttribute(dustGlyphIds,1));
const dustSizes=new Float32Array(dustGlyphIds.length); dustSizes.fill(.012);
const dustSeeds=new Float32Array(dustGlyphIds.length*3);
for(let i=0;i<dustGlyphIds.length;i++){dustSeeds[i*3]=Math.random()*6.28;dustSeeds[i*3+1]=1;dustSeeds[i*3+2]=1;}
dustGeo.setAttribute('aSize',new THREE.BufferAttribute(dustSizes,1));
dustGeo.setAttribute('aSeed',new THREE.BufferAttribute(dustSeeds,3));
const dust=new THREE.Points(dustGeo,mat);flower.add(dust);
let pointer={x:0,y:0};
addEventListener('pointermove',e=>{pointer.x=(e.clientX/innerWidth-.5)*2;pointer.y=(e.clientY/innerHeight-.5)*2},{passive:true});
addEventListener('pointerleave',()=>pointer={x:0,y:0});
addEventListener('touchmove',e=>{const touch=e.touches[0];if(touch){pointer.x=(touch.clientX/innerWidth-.5)*2;pointer.y=(touch.clientY/innerHeight-.5)*2;}},{passive:true});
addEventListener('touchend',()=>pointer={x:0,y:0},{passive:true});
const clock=new THREE.Clock();
function animate(){
 requestAnimationFrame(animate);const t=clock.getElapsedTime(),cycle=t%12.5;
 const bloom=THREE.MathUtils.smoothstep(cycle,.35,3.8);
 const fade=1-THREE.MathUtils.smoothstep(cycle,9.1,10.7);
 const burst=THREE.MathUtils.smoothstep(cycle,8.6,10.5);
 flower.scale.setScalar((.035+bloom*.98)*fade+.02);
 flower.rotation.z=Math.sin(t*.27)*.035;
 flower.rotation.y=t*.20+pointer.x*.15;
 flower.rotation.x=-.10+pointer.y*.12+Math.sin(t*.4)*.035;
 mat.uniforms.uTime.value=t;mat.uniforms.uExplode.value=burst;
 dust.rotation.y=-t*.08;dust.rotation.x=Math.sin(t*.3)*.08;
 renderer.render(scene,camera);
}
animate();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));mat.uniforms.uPixelRatio.value=Math.min(devicePixelRatio,2)});
