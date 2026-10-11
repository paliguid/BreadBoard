import * as THREE from 'three';

export const toThreeV = (v) => new THREE.Vector3(v[0], v[1], v[2]);

export function matrixToThree(m) {
  return new THREE.Matrix4().set(
    m[0], m[4], m[8], m[12],
    m[1], m[5], m[9], m[13],
    m[2], m[6], m[10], m[14],
    0, 0, 0, 1,
  );
}

export function toGeometry(mesh) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(mesh.positions), 3));
  if (mesh.indices.length) g.setIndex(mesh.indices);
  g.computeVertexNormals();
  return g;
}
