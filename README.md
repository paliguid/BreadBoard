# BreadBai — a 3D electronics lab

A browser-based 3D BreadBai simulator built with React and three.js. Every part is a
procedural 3D model wired into a real circuit solver, so components behave the way their
physical counterparts do rather than playing an animation.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
```

Production build:

```bash
npm run build
npm run preview
```

`dist/` must be served over HTTP (the ES modules will not load from a `file://` URL).

## How the simulation works

- `src/lib/solver.js` — modified nodal analysis with a Gaussian-elimination linear solver,
  voltage-source branch stamping, a VCCS stamp and a pn-junction limiter for Newton stability.
- `src/lib/circuit.js` — turns parts and jumper wires into nets with union-find (BreadBai
  strips are pre-fused), allocates internal nodes, then runs a Newton loop per 1 ms timestep
  followed by a `post()` pass where parts integrate their own physics (motor inertia, LED
  thermal history, capacitor charge).
- `src/lib/catalog.js` — the 19 component models: Ebers-Moll transistor, Shockley diode with
  series resistance, backward-Euler capacitor, back-EMF DC motor, LDR with a log-linear light
  curve, function generator, meters, and so on. Each one declares its pins, its editable
  properties and its live readout.

Verified against textbook values: an LED on a 9 V battery through 470 Ω draws 14.8 mA at
Vf 2.01 V with the cell sagging to 8.97 V; a 10 kΩ × 100 µF RC reaches 5.686 V at one time
constant (theory: 5.693 V); a 2N2222 saturates at Vce 54 mV.

## Controls

| | |
|---|---|
| Left drag | Orbit · Right drag pans · Scroll zooms |
| V / W | Select tool / wire tool |
| R | Rotate the selected part (also rotates a part being placed) |
| ⌘D / Delete | Duplicate / remove |
| Space | Run or pause |
| F, 1–4 | Frame all, then iso / top / front / side |
| ⌘Z, ⇧⌘Z, ⌘S | Undo, redo, save |

Pick a part from the left palette and click the board to seat it — leads snap to the 0.1"
hole grid and the strips they land in are listed in the inspector. Switch to the wire tool
and click two holes to run a jumper; click a jumper to remove it. Buttons and switches are
clickable in 3D, potentiometer knobs are draggable, and the Voltage / Connections view modes
recolour every hole and wire by node potential or by net.

## Layout

```
src/lib/      solver, netlist, component catalog, BreadBai geometry, file format
src/three/    procedural 3D models and the scene / picking / snapping stage
src/ui/       palette, inspector, chrome, icons
src/App.jsx   document state, undo stack, simulation loop
```
