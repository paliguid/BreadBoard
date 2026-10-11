import { byId, componentMatrix, isShaftMounted, isSliderLike, restMatrix, shaftMatrix, sliderMatrix } from './assembly.js';
import { mul, trans } from './math3.js';

export function worldMatrixFor(doc, part, poses) {
  if (part.type === 'shaft') {
    const theta = poses.shaft[part.id] ?? 0;
    const disp = carrierDisp(doc, part, poses);
    return spinZ(shaftMatrix(doc, part, disp), theta);
  }
  if (isShaftMounted(part)) {
    const shaft = byId(doc, part.shaft);
    if (!shaft) return restMatrix(part);
    const theta = poses.shaft[shaft.id] ?? 0;
    const disp = carrierDisp(doc, shaft, poses);
    return componentMatrix(doc, part, theta, disp);
  }
  if (isSliderLike(part)) {
    const q = poses.slider[part.id] ?? part.x0 ?? 0;
    return sliderMatrix(part, q);
  }
  if (part.type === 'planetary' || part.type === 'differential') {
    const refId = part.type === 'planetary' ? (part.sun || part.carrier || part.ring) : part.cage;
    const shaft = byId(doc, refId);
    if (!shaft) return restMatrix(part);
    const disp = carrierDisp(doc, shaft, poses);
    return mul(shaftMatrix(doc, shaft, disp), trans(0, 0, part.axial ?? 0));
  }
  return restMatrix(part);
}

function carrierDisp(doc, shaft, poses) {
  if (!shaft.carrier) return 0;
  const carrier = byId(doc, shaft.carrier);
  if (!carrier) return 0;
  const rest = carrier.x0 ?? 0;
  const now = poses.slider[carrier.id] ?? rest;
  return now - rest;
}

function spinZ(M, theta) {
  const c = Math.cos(theta), s = Math.sin(theta);
  const rz = [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const o = new Array(16).fill(0);
  for (let col = 0; col < 4; col++) for (let row = 0; row < 4; row++) { let sum = 0; for (let k = 0; k < 4; k++) sum += M[k * 4 + row] * rz[col * 4 + k]; o[col * 4 + row] = sum; }
  return o;
}
