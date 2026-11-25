import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const stage = document.querySelector('#stage');
if (!stage) throw new Error('Не найден элемент #stage');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0, 8.5);

const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(pixelRatio);
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x000000, 0);
stage.appendChild(renderer.domElement);

const flower = new THREE.Group();
scene.add(flower);

const positions = [];
const particleColors = [];
const sizes = [];
const seeds = [];
const rand = (a, b) => a + Math.random() * (b - a);

// Шесть широких лепестков из светящихся точек.
const petals = 6;
const particlesPerPetal = 3100;
for (let k = 0; k < petals; k++) {
  const angle = k * Math.PI * 2 / petals + 0.12;
  for (let i = 0; i < particlesPerPetal; i++) {
    const u = Math.sqrt(Math.random());
    const v = rand(-1, 1);
    const width = 0.43 * Math.sin(Math.PI * (0.08 + 0.88 * u)) ** 0.72;
    const radial = 0.16 + u * 0.98;
    const across = v * width;
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const x = ca * radial - sa * across;
    const y = sa * radial + ca * across;
    let z = 0.16 + 0.20 * Math.sin(Math.PI * u) + 0.12 * (1 - v * v) + 0.035 * Math.sin(u * 18 + v * 5);
    z += rand(-0.035, 0.035);

    positions.push(x, y, z);
    const color = new THREE.Color().setHSL(rand(0.88, 0.96), rand(0.48, 0.78), rand(0.57, 0.82));
    if (Math.random() < 0.1) color.setHSL(0.94, 0.55, 0.9);
    particleColors.push(color.r, color.g, color.b);
    sizes.push(rand(0.012, 0.029));
    seeds.push(rand(0, 6.28), rand(0.4, 1.6), rand(0.5, 1.8));
  }
}

// Жёлтая сердцевина цветка.
for (let i = 0; i < 2400; i++) {
  const r = 0.28 * Math.sqrt(Math.random());
  const a = rand(0, Math.PI * 2);
  positions.push(
    Math.cos(a) * r,
    Math.sin(a) * r,
    0.31 + 0.10 * Math.sqrt(Math.max(0, 1 - (r / 0.3) ** 2)) + rand(-0.025, 0.025),
  );
  const color = new THREE.Color().setHSL(rand(0.105, 0.16), rand(0.78, 1), rand(0.48, 0.72));
  particleColors.push(color.r, color.g, color.b);
  sizes.push(rand(0.012, 0.027));
  seeds.push(rand(0, 6.28), rand(0.4, 1.6), rand(0.5, 1.8));
}

// Несколько отдельных пылинок вокруг сердцевины.
for (let i = 0; i < 380; i++) {
  const a = rand(0, Math.PI * 2);
  const r = rand(0.10, 0.34);
  positions.push(Math.cos(a) * r, Math.sin(a) * r, rand(0.34, 0.52));
  const color = new THREE.Color(0xffd85a);
  particleColors.push(color.r, color.g, color.b);
  sizes.push(rand(0.012, 0.024));
  seeds.push(rand(0, 6.28), rand(0.4, 1.6), rand(0.5, 1.8));
}

// Атлас символов: каждой частице назначается буква, цифра или знак.
const glyphs = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&*+=<>?/{}[]';
const atlasCols = 8;
const atlasRows = Math.ceil(glyphs.length / atlasCols);
const cellSize = 128;
const atlasCanvas = document.createElement('canvas');
atlasCanvas.width = atlasCols * cellSize;
atlasCanvas.height = atlasRows * cellSize;
const context = atlasCanvas.getContext('2d');
if (!context) throw new Error('Не удалось создать холст для символов');
context.clearRect(0, 0, atlasCanvas.width, atlasCanvas.height);
context.textAlign = 'center';
context.textBaseline = 'middle';
context.font = 'bold 84px monospace';
for (let i = 0; i < glyphs.length; i++) {
  const x = (i % atlasCols) * cellSize + cellSize / 2;
  const y = Math.floor(i / atlasCols) * cellSize + cellSize / 2;
  context.shadowColor = '#ff64c7';
  context.shadowBlur = 22;
  context.fillStyle = '#ffd5ef';
  context.fillText(glyphs[i], x, y);
  context.shadowBlur = 0;
  context.fillStyle = 'rgba(255,105,202,.75)';
  context.fillText(glyphs[i], x, y);
}

const atlas = new THREE.CanvasTexture(atlasCanvas);
atlas.colorSpace = THREE.SRGBColorSpace;
atlas.magFilter = THREE.LinearFilter;
atlas.minFilter = THREE.LinearMipmapLinearFilter;

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.Float32BufferAttribute(particleColors, 3));
geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
geometry.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 3));
const glyphIds = new Float32Array(positions.length / 3);
for (let i = 0; i < glyphIds.length; i++) glyphIds[i] = Math.floor(Math.random() * glyphs.length);
geometry.setAttribute('aGlyph', new THREE.BufferAttribute(glyphIds, 1));

const material = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  uniforms: {
    uTime: { value: 0 },
    uExplode: { value: 0 },
    uPixelRatio: { value: pixelRatio },
    uAtlas: { value: atlas },
    uAtlasCols: { value: atlasCols },
    uAtlasRows: { value: atlasRows },
  },
  vertexShader: `
    attribute float aSize;
    attribute vec3 aSeed;
    attribute vec3 color;
    attribute float aGlyph;
    varying vec3 vColor;
    varying float vAlpha;
    varying float vGlyph;
    uniform float uTime;
    uniform float uExplode;
    uniform float uPixelRatio;
    void main() {
      vColor = color;
      vGlyph = aGlyph;
      vec3 p = position;
      p += normalize(position + vec3(0.001)) * sin(uTime * 1.5 + aSeed.x) * 0.009;
      vec3 dir = normalize(position + vec3(aSeed.x * 0.12, aSeed.y * 0.1, aSeed.z * 0.1));
      p += dir * uExplode * (0.8 + aSeed.y * 1.3);
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = clamp(aSize * uPixelRatio * 720.0 / (-mv.z), 3.0, 15.0);
      vAlpha = (0.72 + 0.28 * sin(uTime * 2.0 + aSeed.x * 3.0)) * (1.0 - uExplode * 0.62);
    }
  `,
  fragmentShader: `
    uniform sampler2D uAtlas;
    uniform float uAtlasCols;
    uniform float uAtlasRows;
    varying vec3 vColor;
    varying float vAlpha;
    varying float vGlyph;
    void main() {
      float gx = mod(vGlyph, uAtlasCols);
      float gy = floor(vGlyph / uAtlasCols);
      vec2 uv = vec2((gx + gl_PointCoord.x) / uAtlasCols,
                     1.0 - (gy + 1.0 - gl_PointCoord.y) / uAtlasRows);
      vec4 glyph = texture2D(uAtlas, uv);
      if (glyph.a < 0.12) discard;
      float scan = 0.82 + 0.18 * sin(gl_FragCoord.y * 1.3);
      gl_FragColor = vec4(glyph.rgb * vColor * 1.55, glyph.a * vAlpha * scan);
    }
  `,
});
flower.add(new THREE.Points(geometry, material));

// Редкие парящие символы вокруг цветка.
const dustPositions = [];
for (let i = 0; i < 700; i++) {
  const a = rand(0, 6.28);
  const r = rand(1.25, 2.2);
  dustPositions.push(Math.cos(a) * r, rand(-1.5, 1.5), rand(-0.5, 0.8));
}
const dustGeometry = new THREE.BufferGeometry();
dustGeometry.setAttribute('position', new THREE.Float32BufferAttribute(dustPositions, 3));
const dustCount = dustPositions.length / 3;
const dustGlyphIds = new Float32Array(dustCount);
const dustSizes = new Float32Array(dustCount);
const dustSeeds = new Float32Array(dustCount * 3);
const dustColors = new Float32Array(dustCount * 3);
for (let i = 0; i < dustCount; i++) {
  dustGlyphIds[i] = Math.floor(Math.random() * glyphs.length);
  dustSizes[i] = 0.012;
  dustSeeds[i * 3] = Math.random() * 6.28;
  dustSeeds[i * 3 + 1] = 1;
  dustSeeds[i * 3 + 2] = 1;
  dustColors[i * 3] = 1;
  dustColors[i * 3 + 1] = 1;
  dustColors[i * 3 + 2] = 1;
}
dustGeometry.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));
dustGeometry.setAttribute('aGlyph', new THREE.BufferAttribute(dustGlyphIds, 1));
dustGeometry.setAttribute('aSize', new THREE.BufferAttribute(dustSizes, 1));
dustGeometry.setAttribute('aSeed', new THREE.BufferAttribute(dustSeeds, 3));
const dust = new THREE.Points(dustGeometry, material);
flower.add(dust);

const pointer = { x: 0, y: 0 };
window.addEventListener('pointermove', (event) => {
  pointer.x = (event.clientX / innerWidth - 0.5) * 2;
  pointer.y = (event.clientY / innerHeight - 0.5) * 2;
}, { passive: true });
window.addEventListener('pointerleave', () => {
  pointer.x = 0;
  pointer.y = 0;
});

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const time = clock.getElapsedTime();
  const cycle = time % 12.5;
  const bloom = THREE.MathUtils.smoothstep(cycle, 0.35, 3.8);
  const fade = 1 - THREE.MathUtils.smoothstep(cycle, 9.1, 10.7);
  const burst = THREE.MathUtils.smoothstep(cycle, 8.6, 10.5);

  flower.scale.setScalar((0.035 + bloom * 0.98) * fade + 0.02);
  flower.rotation.z = Math.sin(time * 0.27) * 0.035;
  flower.rotation.y = time * 0.20 + pointer.x * 0.15;
  flower.rotation.x = -0.10 + pointer.y * 0.12 + Math.sin(time * 0.4) * 0.035;
  material.uniforms.uTime.value = time;
  material.uniforms.uExplode.value = burst;
  dust.rotation.y = -time * 0.08;
  dust.rotation.x = Math.sin(time * 0.3) * 0.08;
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  const nextPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(nextPixelRatio);
  material.uniforms.uPixelRatio.value = nextPixelRatio;
});
