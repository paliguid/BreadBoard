import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Stage } from './three/Stage.js';
import { Circuit, endpointKey } from './lib/circuit.js';
import { CATALOG } from './lib/catalog.js';
import { makePart, newId, getExample } from './lib/examples.js';
import { serialize, deserialize, download } from './lib/document.js';
import { computeInsertion } from './lib/placement.js';
import Palette from './ui/Palette.jsx';
import Inspector from './ui/Inspector.jsx';
import { TopBar, Toolbar, Dock, Transport, Legend, Banner } from './ui/Chrome.jsx';
import { Icon } from './ui/icons.jsx';

const DT = 1e-3;                       // 1 kHz solver step
const MAX_STEPS = 240;                 // never let a slow frame melt the tab
const WIRE_COLORS = ['#e8e8ec', '#ffd60a', '#30d158', '#64d2ff', '#bf5af2', '#ff9f0a'];

/** Snapshot of the solved circuit that the 3D stage paints holes and wires with. */
function makeProbe(circuit) {
  if (!circuit) return null;
  const voltage = new Map();
  const net = new Map();
  const live = new Set();
  let vmax = 1;

  for (const [key, n] of circuit.keyToNet) {
    const idx = circuit.netIndex(key);
    const v = idx < 0 ? 0 : circuit.sys.x[idx];
    voltage.set(key, v);
    net.set(key, n);
    if (Math.abs(v) > vmax) vmax = Math.abs(v);
  }
  // A net is "live" (worth colouring) if something is actually attached to it.
  const counts = new Map();
  for (const [, n] of circuit.keyToNet) counts.set(n, (counts.get(n) ?? 0) + 1);
  for (const [n, c] of counts) if (c > 1) live.add(n);

  const at = (map) => (ep) => {
    const k = endpointKey(ep);
    return k == null ? undefined : map.get(k);
  };
  return {
    voltage, net, live, vmax: Math.max(1, vmax),
    voltageOfEndpoint: at(voltage),
    netOfEndpoint: at(net),
  };
}

export default function App() {
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const docRef = useRef({ parts: [], wires: [] });
  const circuitRef = useRef(null);
  const past = useRef([]);
  const future = useRef([]);
  const audioRef = useRef(null);
  const statusClock = useRef(0);
  const wireColor = useRef(0);

  const [, force] = useReducer((n) => n + 1, 0);
  const [selection, setSelection] = useState(null);
  const [tool, setTool] = useState('select');
  const [mode, setMode] = useState('standard');
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [placing, setPlacing] = useState(null);
  const [sound, setSound] = useState(true);
  const [help, setHelp] = useState(false);
  const [intro, setIntro] = useState('show');
  const [status, setStatus] = useState({ time: 0, nodes: 0, converged: true });
  const [vmax, setVmax] = useState(9);

  const doc = docRef.current;

  // ----------------------------------------------------------- document ops

  const rebuild = useCallback(() => {
    circuitRef.current = new Circuit(docRef.current.parts, docRef.current.wires);
    force();
  }, []);

  const snapshot = useCallback(() => {
    past.current.push(JSON.stringify(serialize(docRef.current)));
    if (past.current.length > 80) past.current.shift();
    future.current.length = 0;
  }, []);

  const load = useCallback((next, { keepHistory = false } = {}) => {
    if (!keepHistory) { past.current.length = 0; future.current.length = 0; }
    docRef.current = next;
    setSelection(null);
    rebuild();
  }, [rebuild]);

  const loadExample = useCallback((id) => {
    load(getExample(id).build());
    requestAnimationFrame(() => stageRef.current?.frameAll());
  }, [load]);

  // ------------------------------------------------------------- edit verbs

  const placePart = useCallback((info) => {
    snapshot();
    const part = makePart(info.type, { x: info.x, z: info.z, y: info.y ?? 0, rot: info.rot ?? 0 });
    part.inserted = info.inserted ?? {};
    docRef.current.parts.push(part);
    setPlacing(null);
    setSelection(part.id);
    rebuild();
  }, [rebuild, snapshot]);

  const movePart = useCallback((id, result) => {
    const part = docRef.current.parts.find((p) => p.id === id);
    if (!part) return;
    snapshot();
    part.x = result.x; part.z = result.z; part.y = result.y ?? 0;
    part.inserted = result.inserted ?? {};
    rebuild();
  }, [rebuild, snapshot]);

  const rotatePart = useCallback((id) => {
    const part = docRef.current.parts.find((p) => p.id === id);
    if (!part || CATALOG[part.type].board) return;
    snapshot();
    part.rot = ((part.rot ?? 0) + Math.PI / 2) % (Math.PI * 2);
    const board = docRef.current.parts.find((p) => CATALOG[p.type].board);
    part.inserted = board ? computeInsertion(part, board) : {};
    rebuild();
  }, [rebuild, snapshot]);

  const duplicatePart = useCallback((id) => {
    const src = docRef.current.parts.find((p) => p.id === id);
    if (!src || CATALOG[src.type].board) return;
    snapshot();
    const copy = makePart(src.type, {
      x: src.x + 7.62, z: src.z, y: src.y, rot: src.rot, props: { ...src.props },
    });
    copy.inserted = {};
    docRef.current.parts.push(copy);
    setSelection(copy.id);
    rebuild();
  }, [rebuild, snapshot]);

  const deletePart = useCallback((id) => {
    snapshot();
    docRef.current.parts = docRef.current.parts.filter((p) => p.id !== id);
    docRef.current.wires = docRef.current.wires.filter(
      (w) => ![w.a, w.b].some((ep) => (ep.kind === 'pin' ? ep.partId : ep.boardId) === id));
    setSelection(null);
    rebuild();
  }, [rebuild, snapshot]);

  const addWire = useCallback((a, b) => {
    if (!a || !b) return;
    if (endpointKey(a) === endpointKey(b)) return;
    snapshot();
    const railOf = (ep) => (ep.kind === 'hole' ? ep.group : null);
    const rail = railOf(a) ?? railOf(b);
    let color;
    if (rail === 'tpos' || rail === 'bpos') color = '#ff453a';
    else if (rail === 'tneg' || rail === 'bneg') color = '#48484a';
    else color = WIRE_COLORS[wireColor.current++ % WIRE_COLORS.length];
    docRef.current.wires.push({ id: newId('w'), a, b, color });
    rebuild();
  }, [rebuild, snapshot]);

  const deleteWire = useCallback((id) => {
    snapshot();
    docRef.current.wires = docRef.current.wires.filter((w) => w.id !== id);
    rebuild();
  }, [rebuild, snapshot]);

  const setProp = useCallback((id, key, value) => {
    const part = docRef.current.parts.find((p) => p.id === id);
    if (!part) return;
    const schema = CATALOG[part.type].props.find((p) => p.key === key);
    if (!schema?.live) snapshot();
    part.props = { ...part.props, [key]: value };
    force();
  }, [snapshot]);

  const interact = useCallback((id, phase) => {
    const part = docRef.current.parts.find((p) => p.id === id);
    if (!part) return;
    const def = CATALOG[part.type];
    if (phase === 'press') def.onPress?.(part);
    else def.onRelease?.(part);
    force();
  }, []);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(JSON.stringify(serialize(docRef.current)));
    load(deserialize(JSON.parse(prev)), { keepHistory: true });
  }, [load]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(JSON.stringify(serialize(docRef.current)));
    load(deserialize(JSON.parse(next)), { keepHistory: true });
  }, [load]);

  const saveFile = useCallback(() => {
    download('circuit.BreadBai.json', JSON.stringify(serialize(docRef.current), null, 2));
  }, []);

  const openFile = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        load(deserialize(JSON.parse(await file.text())));
        requestAnimationFrame(() => stageRef.current?.frameAll());
      } catch (err) {
        alert(err.message ?? 'That file could not be opened.');
      }
    };
    input.click();
  }, [load]);

  // ----------------------------------------------------------------- audio

  const syncAudio = useCallback(() => {
    const ctx = audioRef.current;
    if (!ctx) return;
    let level = 0, freq = 2400;
    for (const part of docRef.current.parts) {
      if (part.type !== 'buzzer') continue;
      level = Math.max(level, part.state.level ?? 0);
      freq = part.props.freq ?? freq;
    }
    const target = sound ? Math.min(0.07, level * 0.07) : 0;
    ctx.gain.gain.setTargetAtTime(target, ctx.audio.currentTime, 0.02);
    ctx.osc.frequency.setTargetAtTime(freq, ctx.audio.currentTime, 0.02);
  }, [sound]);

  // ------------------------------------------------------------ frame loop

  const onFrame = useCallback((dt) => {
    const circuit = circuitRef.current;
    if (!circuit) return;
    if (running) {
      const steps = Math.min(MAX_STEPS, Math.max(1, Math.round((dt * speed) / DT)));
      for (let i = 0; i < steps; i++) circuit.step(DT);
    }
    syncAudio();

    if (mode !== 'standard') {
      const probe = makeProbe(circuit);
      stageRef.current?.updateProbe(probe);
      if (probe && Math.abs(probe.vmax - vmax) > 0.25) setVmax(probe.vmax);
    }

    statusClock.current += dt;
    if (statusClock.current > 0.12) {
      statusClock.current = 0;
      setStatus({ time: circuit.time, nodes: circuit.nodeCount, converged: circuit.converged });
    }
  }, [mode, running, speed, syncAudio, vmax]);

  // Stage callbacks are registered once; this ref keeps them pointing at the
  // latest closures without tearing down the WebGL context every render.
  const handlers = useRef({});
  handlers.current = {
    onSelect: setSelection,
    onFocus: (id) => { setSelection(id); },
    onMove: movePart,
    onWire: addWire,
    onDeleteWire: deleteWire,
    onInteract: interact,
    onProp: setProp,
    onPlace: placePart,
    onFrame,
  };

  // ------------------------------------------------------------------ mount

  useEffect(() => {
    const stage = new Stage(canvasRef.current);
    stageRef.current = stage;
    for (const name of ['onSelect', 'onFocus', 'onMove', 'onWire', 'onDeleteWire',
      'onInteract', 'onProp', 'onPlace', 'onFrame']) {
      stage.on(name, (...args) => handlers.current[name]?.(...args));
    }

    const onResize = () => stage.resize();
    window.addEventListener('resize', onResize);
    stage.resize();

    docRef.current = getExample('first-light').build();
    circuitRef.current = new Circuit(docRef.current.parts, docRef.current.wires);
    force();
    requestAnimationFrame(() => stage.frameAll());

    const startAudio = () => {
      if (audioRef.current) return;
      try {
        const audio = new (window.AudioContext ?? window.webkitAudioContext)();
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = 'square';
        osc.frequency.value = 2400;
        gain.gain.value = 0;
        osc.connect(gain).connect(audio.destination);
        osc.start();
        audioRef.current = { audio, osc, gain };
      } catch { /* audio is a nicety, not a requirement */ }
    };
    window.addEventListener('pointerdown', startAudio, { once: true });

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointerdown', startAudio);
      audioRef.current?.audio.close();
      stage.dispose();
    };
  }, []);

  // Push the document at the stage after every render.
  useEffect(() => {
    stageRef.current?.sync(doc.parts, doc.wires, selection, tool, mode);
    if (mode === 'standard') stageRef.current?.updateProbe(null);
  });

  // ------------------------------------------------------------- shortcuts

  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if (meta && e.key.toLowerCase() === 'd') { e.preventDefault(); if (selection) duplicatePart(selection); return; }
      if (meta && e.key.toLowerCase() === 's') { e.preventDefault(); saveFile(); return; }
      if (meta) return;
      switch (e.key) {
        case 'Escape':
          setHelp(false);
          setPlacing(null);
          stageRef.current?.cancelPlacement();
          stageRef.current?.cancelWire();
          setSelection(null);
          break;
        case 'Delete': case 'Backspace':
          if (selection) { e.preventDefault(); deletePart(selection); }
          break;
        case 'r': case 'R': if (selection) rotatePart(selection); break;
        case 'v': case 'V': setTool('select'); break;
        case 'w': case 'W': setTool('wire'); break;
        case 'f': case 'F': stageRef.current?.frameAll(); break;
        case ' ': e.preventDefault(); setRunning((v) => !v); break;
        case '1': stageRef.current?.setView('iso'); break;
        case '2': stageRef.current?.setView('top'); break;
        case '3': stageRef.current?.setView('front'); break;
        case '4': stageRef.current?.setView('side'); break;
        default: break;
      }
      if ((e.key === 'r' || e.key === 'R') && placing) stageRef.current?.rotatePlacement();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deletePart, duplicatePart, placing, redo, rotatePart, saveFile, selection, undo]);

  // ---------------------------------------------------------------- actions

  const pick = useCallback((type) => {
    if (placing === type) { setPlacing(null); stageRef.current?.cancelPlacement(); return; }
    setPlacing(type);
    setTool('select');
    stageRef.current?.beginPlacement(type);
  }, [placing]);

  const stepOnce = useCallback(() => {
    for (let i = 0; i < 10; i++) circuitRef.current?.step(DT);
    force();
  }, []);

  const resetSim = useCallback(() => {
    circuitRef.current?.reset();
    for (const part of docRef.current.parts) {
      const def = CATALOG[part.type];
      part.state = def.state();
      part.mem = {};
    }
    rebuild();
  }, [rebuild]);

  // Recomputed every render on purpose: the status tick re-renders at ~8 Hz so
  // the inspector readout tracks the live solution.
  const selected = doc.parts.find((p) => p.id === selection) ?? null;

  // ------------------------------------------------------------------ view

  return (
    <div className="app">
      <TopBar
        onExample={loadExample}
        onSave={saveFile}
        onOpen={openFile}
        onUndo={undo}
        onRedo={redo}
        canUndo={past.current.length > 0}
        canRedo={future.current.length > 0}
        sound={sound}
        onSound={() => setSound((v) => !v)}
        onHelp={() => setHelp((v) => !v)}
      />

      <div className="stage-wrap">
        <canvas ref={canvasRef} />

        <Palette placing={placing} onPick={pick} />
        <Toolbar tool={tool} setTool={setTool} mode={mode} setMode={setMode} />
        <Dock onView={(v) => stageRef.current?.setView(v)} onFrame={() => stageRef.current?.frameAll()} />
        <Legend mode={mode} vmax={vmax} />

        {selected && (
          <Inspector
            part={selected}
            onProp={(key, value) => setProp(selected.id, key, value)}
            onRotate={() => rotatePart(selected.id)}
            onDuplicate={() => duplicatePart(selected.id)}
            onDelete={() => deletePart(selected.id)}
            onClose={() => setSelection(null)}
          />
        )}

        {placing && (
          <Banner>
            <b>{CATALOG[placing].name}</b> — click the board to seat it, <kbd>R</kbd> to rotate, <kbd>Esc</kbd> to cancel.
          </Banner>
        )}

        <Transport
          running={running}
          onToggle={() => setRunning((v) => !v)}
          onStep={stepOnce}
          onReset={resetSim}
          speed={speed}
          setSpeed={setSpeed}
          status={status}
        />
      </div>

      {help && <Help onClose={() => setHelp(false)} />}
      {intro !== 'gone' && (
        <Intro
          leaving={intro === 'leaving'}
          onStart={(id) => {
            if (id) loadExample(id);
            setIntro('leaving');
            setTimeout(() => setIntro('gone'), 700);
          }}
        />
      )}
    </div>
  );
}

function Intro({ leaving, onStart }) {
  return (
    <div className={`intro${leaving ? ' leaving' : ''}`}>
      <div className="intro-fade">
        <h1>BreadBai</h1>
        <p>
           A 3d Circuit Simulator.
        </p>
        <img src="src\assets\bread3.png" width={450} alt="Splash Screen"/>
        <div className="cta">
          <button className="btn primary" onClick={() => onStart('first-light')}>START</button>
          <button className="btn ghost" onClick={() => onStart('blank')}>Start from an empty board</button>
        </div>
      </div>
    </div>
  );
}

const SHORTCUTS = [
  ['V / W', 'Select tool / wire tool'],
  ['R', 'Rotate the selected part'],
  ['⌘D', 'Duplicate'],
  ['Delete', 'Remove the selected part'],
  ['Space', 'Run or pause the simulation'],
  ['F', 'Frame everything'],
  ['1 – 4', 'Iso, top, front, side views'],
  ['⌘Z / ⇧⌘Z', 'Undo / redo'],
  ['⌘S', 'Save the circuit to a file'],
  ['Drag', 'Left mouse orbits, right mouse pans, scroll zooms'],
];

function Help({ onClose }) {
  return (
    <div className="intro" style={{ background: 'rgba(8,8,10,0.72)' }} onClick={onClose}>
      <div className="panel glass" style={{ position: 'static', width: 440, maxWidth: '90vw' }}
        onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <div style={{ flex: 1 }}><h2>Shortcuts</h2><p>Everything has a key.</p></div>
          <button className="btn icon ghost" onClick={onClose} aria-label="Close"><Icon.close size={17} /></button>
        </div>
        <div className="body">
          <div className="pinlist">
            {SHORTCUTS.map(([k, v]) => (
              <div key={k}><span className="k">{k}</span><span className="v">{v}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
