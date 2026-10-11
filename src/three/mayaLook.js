import * as THREE from 'three';


export const VIEWPORT = { top: '#68737f', mid: '#47505a', bottom: '#2b3036', fog: 0x474f59 };

export function gradientBackground(top = VIEWPORT.top, mid = VIEWPORT.mid, bottom = VIEWPORT.bottom) {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, top);
  g.addColorStop(0.55, mid);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 512);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function mayaGrid(size = 1000, minor = 10, major = 50) {
  const group = new THREE.Group();
  const minorGrid = new THREE.GridHelper(size, size / minor, 0x000000, 0x6b727b);
  minorGrid.material.transparent = true;
  minorGrid.material.opacity = 0.35;
  minorGrid.material.depthWrite = false;
  const majorGrid = new THREE.GridHelper(size, size / major, 0x000000, 0x8a919a);
  majorGrid.material.transparent = true;
  majorGrid.material.opacity = 0.55;
  majorGrid.material.depthWrite = false;
  majorGrid.position.y = 0.02;
  group.add(minorGrid, majorGrid);
  const half = size / 2;
  const axis = (color, a, b) => {
    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false }));
    line.position.y = 0.05;
    return line;
  };
  group.add(axis(0xc4483f, new THREE.Vector3(-half, 0, 0), new THREE.Vector3(half, 0, 0)));
  group.add(axis(0x3f78c4, new THREE.Vector3(0, 0, -half), new THREE.Vector3(0, 0, half)));
  return group;
}

export function contactShadow(width, depth, opacity = 0.5) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 20, 128, 128, 126);
  g.addColorStop(0, `rgba(0,0,0,${opacity})`);
  g.addColorStop(0.55, `rgba(0,0,0,${opacity * 0.45})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.1;
  mesh.renderOrder = -1;
  return mesh;
}

export function createAxisGizmo() {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1.7, 1.7, 1.7, -1.7, 0.1, 20);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.62, 40), new THREE.MeshBasicMaterial({ color: 0x15181c, transparent: true, opacity: 0.38, depthTest: false, toneMapped: false }));
  disc.renderOrder = -1;
  disc.onBeforeRender = (r, s, cam) => disc.quaternion.copy(cam.quaternion);
  scene.add(disc);
  const make = (label, color, dir) => {
    const mat = new THREE.MeshBasicMaterial({ color, toneMapped: false });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1, 10), mat);
    shaft.position.copy(dir).multiplyScalar(0.5);
    shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), mat);
    tip.position.copy(dir).multiplyScalar(1.06);
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#10130f';
    ctx.font = 'bold 40px Segoe UI, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 32, 35);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, toneMapped: false }));
    sprite.scale.setScalar(0.42);
    sprite.position.copy(dir).multiplyScalar(1.06);
    sprite.renderOrder = 3;
    const stub = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, toneMapped: false }));
    stub.position.copy(dir).multiplyScalar(-0.9);
    scene.add(shaft, tip, sprite, stub);
  };
  make('X', 0xe0594f, new THREE.Vector3(1, 0, 0));
  make('Y', 0x8bd14e, new THREE.Vector3(0, 1, 0));
  make('Z', 0x4f8fe6, new THREE.Vector3(0, 0, 1));
  return { scene, camera };
}
