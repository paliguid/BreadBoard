import { CATALOG } from '../lib/catalog.js';


export function makeLink(bbPart, mechPartId, opts = {}) {
  return { id: `${bbPart.id}:${mechPartId}`, bbId: bbPart.id, mechId: mechPartId, gear: opts.gear ?? 1, sign: opts.sign ?? 1 };
}

export function armLink(bbPart) { bbPart.state.linked = true; }
export function disarmLink(bbPart) { bbPart.state.linked = false; }

export function syncToCircuit(links, bbDoc, circuit, mechDoc, machine) {
  for (const link of links) {
    const part = bbDoc.parts.find((p) => p.id === link.bbId);
    const mechPart = mechDoc.parts.find((p) => p.id === link.mechId);
    if (!part || !CATALOG[part.type] || !mechPart) continue;
    armLink(part);
    const w = machine.speed(mechPart.shaft) ?? 0;
    part.state.omega = link.sign * link.gear * w;
  }
}

export function syncToMechanism(links, doc, machine) {
  for (const link of links) {
    const part = doc.parts.find((p) => p.id === link.bbId);
    if (!part) continue;
    const i = part.state.current ?? 0;
    const ke = part.props?.ke ?? 0;
    const torque = link.sign * link.gear * ke * i;
    machine.setMotorTorque(link.mechId, torque);
  }
}

export function coupledStep(links, bbDoc, circuit, mechDoc, machine, dt) {
  syncToCircuit(links, bbDoc, circuit, mechDoc, machine);
  circuit.step(dt);
  syncToMechanism(links, bbDoc, machine);
  machine.step(dt);
}

export function linkReadout(link, doc, machine) {
  const part = doc.parts.find((p) => p.id === link.bbId);
  if (!part) return null;
  const r = machine.readout();
  return {
    current: part.state.current ?? 0,
    voltage: (part.state.current ?? 0) * (part.props?.resistance ?? 0) + (part.props?.ke ?? 0) * (part.state.omega ?? 0),
    rpm: r[`${link.mechId}.rpm`],
    torque: r[`${link.mechId}.torque`] ?? r[`${link.mechId}.power`],
  };
}
