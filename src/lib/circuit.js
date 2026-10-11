import { System } from './solver.js';
import { CATALOG } from './catalog.js';

class UnionFind {
  constructor() { this.parent = new Map(); }
  add(k) { if (!this.parent.has(k)) this.parent.set(k, k); return k; }
  find(k) {
    this.add(k);
    let r = k;
    while (this.parent.get(r) !== r) r = this.parent.get(r);
    while (this.parent.get(k) !== r) { const nx = this.parent.get(k); this.parent.set(k, r); k = nx; }
    return r;
  }
  union(a, b) {
    const ra = this.find(a), rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

export const pinKey = (partId, pin) => `p:${partId}:${pin}`;
export const holeKey = (boardId, group) => `h:${boardId}:${group}`;

export function buildNets(parts, wires) {
  const uf = new UnionFind();

  for (const part of parts) {
    const def = CATALOG[part.type];
    if (!def) continue;
    for (const pin of def.pins) uf.add(pinKey(part.id, pin.name));
    if (part.inserted) {
      for (const [pinName, hk] of Object.entries(part.inserted)) {
        if (hk) uf.union(pinKey(part.id, pinName), hk);
      }
    }
  }

  for (const w of wires) {
    const a = endpointKey(w.a), b = endpointKey(w.b);
    if (a && b) uf.union(a, b);
  }

  const netOfRoot = new Map();
  const keyToNet = new Map();
  const allKeys = [...uf.parent.keys()];
  for (const k of allKeys) {
    const r = uf.find(k);
    if (!netOfRoot.has(r)) netOfRoot.set(r, netOfRoot.size);
    keyToNet.set(k, netOfRoot.get(r));
  }

  let ground = null;
  for (const part of parts) {
    if (part.type === 'ground') { ground = keyToNet.get(pinKey(part.id, 'gnd')); break; }
  }
  if (ground == null) {
    for (const part of parts) {
      const def = CATALOG[part.type];
      if (def?.groundPin) { ground = keyToNet.get(pinKey(part.id, def.groundPin)); break; }
    }
  }
  if (ground == null) ground = netOfRoot.size ? 0 : -1;

  return { keyToNet, netCount: netOfRoot.size, ground };
}

export function endpointKey(ep) {
  if (!ep) return null;
  return ep.kind === 'hole' ? holeKey(ep.boardId, ep.group) : pinKey(ep.partId, ep.pin);
}

export class Circuit {
  constructor(parts, wires) {
    this.parts = parts;
    this.wires = wires;
    const { keyToNet, netCount, ground } = buildNets(parts, wires);
    this.keyToNet = keyToNet;
    this.ground = ground;

    const remap = new Map();
    let next = 0;
    for (let i = 0; i < netCount; i++) {
      if (i === ground) remap.set(i, -1);
      else remap.set(i, next++);
    }
    this.netIndex = (key) => {
      const n = keyToNet.get(key);
      return n == null ? -1 : remap.get(n);
    };

    this.elements = [];
    let nodeCount = next;
    let vsCount = 0;
    for (const part of parts) {
      const def = CATALOG[part.type];
      if (!def || !def.stamp) continue;
      const nodes = {};
      for (const pin of def.pins) nodes[pin.name] = this.netIndex(pinKey(part.id, pin.name));
      const internal = [];
      const nInt = typeof def.internalNodes === 'function' ? def.internalNodes(part) : (def.internalNodes || 0);
      for (let i = 0; i < nInt; i++) internal.push(nodeCount++);
      const branches = [];
      const nVs = typeof def.vsCount === 'function' ? def.vsCount(part) : (def.vsCount || 0);
      for (let i = 0; i < nVs; i++) branches.push(vsCount++);
      if (!part.state) part.state = {};
      if (!part.mem) part.mem = {};
      this.elements.push({ part, def, nodes, internal, branches });
    }

    this.nodeCount = nodeCount;
    this.sys = new System(nodeCount, vsCount);
    this.time = 0;
    this.converged = true;
  }

  netVoltage(key) {
    const i = this.netIndex(key);
    return i < 0 ? 0 : this.sys.x[i];
  }

  step(dt) {
    const sys = this.sys;
    sys.dt = dt;
    const MAX_IT = 60;
    const TOL = 1e-7;
    let iter = 0;
    let ok = false;

    for (; iter < MAX_IT; iter++) {
      sys.clear();
      const ctx = { sys, dt, time: this.time };
      for (const el of this.elements) {
        ctx.nodes = el.nodes; ctx.internal = el.internal; ctx.branches = el.branches;
        ctx.props = el.part.props; ctx.state = el.part.state; ctx.mem = el.part.mem;
        el.def.stamp(ctx);
      }
      const x = sys.solve();
      let diff = 0;
      for (let i = 0; i < x.length; i++) {
        const d = Math.abs(x[i] - sys.x[i]);
        if (d > diff) diff = d;
      }
      sys.x = x;
      if (iter >= 1 && diff < TOL) { ok = true; iter++; break; }
    }

    this.converged = ok;
    this.iterations = iter;
    this.time += dt;

    const ctx = { sys, dt, time: this.time };
    for (const el of this.elements) {
      if (!el.def.post) continue;
      ctx.nodes = el.nodes; ctx.internal = el.internal; ctx.branches = el.branches;
      ctx.props = el.part.props; ctx.state = el.part.state; ctx.mem = el.part.mem;
      el.def.post(ctx);
    }
  }

  reset() {
    this.sys.x.fill(0);
    this.time = 0;
    for (const el of this.elements) {
      el.part.mem = {};
      if (el.def.resetState) el.def.resetState(el.part.state, el.part.props);
    }
  }
}
