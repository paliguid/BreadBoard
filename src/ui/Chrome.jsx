import { useEffect, useRef, useState } from 'react';
import { EXAMPLES } from '../lib/examples.js';
import { Icon } from './icons.jsx';

function useDismiss(ref, close) {
  useEffect(() => {
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) close(); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [ref, close]);
}

export function TopBar({ onExample, onSave, onOpen, onUndo, onRedo, canUndo, canRedo, sound, onSound, onHelp }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  useDismiss(wrap, () => setOpen(false));

  return (
    <header className="topbar">
      <div className="wordmark">
        <span className="spark" />
        <b>BreadBai</b>
        <span>3D BreadBai simulator</span>
      </div>

      <div className="menu-wrap" ref={wrap}>
        <button className="btn" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          <Icon.library size={16} />Circuits
        </button>
        {open && (
          <div className="menu glass" role="menu">
            {EXAMPLES.map((ex) => (
              <button key={ex.id} role="menuitem" onClick={() => { setOpen(false); onExample(ex.id); }}>
                <span className="t">{ex.name}</span>
                <span className="d">{ex.blurb}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button className="btn ghost" onClick={onSave} title="Save circuit to a file"><Icon.save size={16} />Save</button>
      <button className="btn ghost" onClick={onOpen} title="Open a saved circuit"><Icon.open size={16} />Open</button>

      <div className="divider" style={{ width: 1, height: 22, background: 'var(--stroke)' }} />

      <button className="btn icon ghost" onClick={onUndo} disabled={!canUndo} title="Undo (⌘Z)"><Icon.undo size={17} /></button>
      <button className="btn icon ghost" onClick={onRedo} disabled={!canRedo} title="Redo (⇧⌘Z)"><Icon.redo size={17} /></button>

      <div className="spacer" />

      <button className="btn ghost" aria-pressed={sound} onClick={onSound} title="Buzzer audio">
        {sound ? 'Sound on' : 'Sound off'}
      </button>
      <button className="btn icon ghost" onClick={onHelp} title="Keyboard shortcuts">?</button>
    </header>
  );
}

export function Toolbar({ tool, setTool, mode, setMode }) {
  return (
    <div className="toolbar glass">
      <div className="seg">
        <button aria-pressed={tool === 'select'} onClick={() => setTool('select')} title="Select and move (V)">Select</button>
        <button aria-pressed={tool === 'wire'} onClick={() => setTool('wire')} title="Draw jumper wires (W)">Wire</button>
      </div>
      <div style={{ width: 1, height: 20, background: 'var(--stroke)' }} />
      <div className="seg">
        <button aria-pressed={mode === 'standard'} onClick={() => setMode('standard')}>Standard</button>
        <button aria-pressed={mode === 'voltage'} onClick={() => setMode('voltage')}>Voltage</button>
        <button aria-pressed={mode === 'nets'} onClick={() => setMode('nets')}>Connections</button>
      </div>
    </div>
  );
}

export function Dock({ onView, onFrame }) {
  return (
    <div className="dock glass">
      <button onClick={onFrame} title="Frame everything (F)"><Icon.frame size={19} /></button>
      <div className="sep" />
      <button onClick={() => onView('iso')} title="Default view (1)"><Icon.home size={19} /></button>
      <button onClick={() => onView('top')} title="Top view (2)" style={{ fontSize: 12 }}>T</button>
      <button onClick={() => onView('front')} title="Front view (3)" style={{ fontSize: 12 }}>F</button>
      <button onClick={() => onView('side')} title="Side view (4)" style={{ fontSize: 12 }}>S</button>
    </div>
  );
}

export function Transport({ running, onToggle, onStep, onReset, speed, setSpeed, status }) {
  return (
    <div className="transport glass">
      <button className="play" onClick={onToggle} title={running ? 'Pause (space)' : 'Run (space)'}
        aria-label={running ? 'Pause simulation' : 'Run simulation'}>
        {running ? <Icon.pause size={18} /> : <Icon.play size={18} />}
      </button>
      <button className="btn icon ghost" onClick={onStep} title="Advance one step"><Icon.step size={17} /></button>
      <button className="btn icon ghost" onClick={onReset} title="Reset to a cold start"><Icon.reset size={17} /></button>

      <div className="divider" />

      <span className="clock">{status.time.toFixed(2)} s</span>

      <div className="seg">
        {[0.25, 1, 4].map((s) => (
          <button key={s} aria-pressed={speed === s} onClick={() => setSpeed(s)}>{s}×</button>
        ))}
      </div>

      <div className="divider" />

      <span className="stat">
        <span className={`dot${status.converged ? '' : ' warn'}`} />
        {status.nodes} node{status.nodes === 1 ? '' : 's'}
      </span>
    </div>
  );
}

export function Legend({ mode, vmax }) {
  if (mode === 'standard') return null;
  return (
    <div className="legend glass">
      {mode === 'voltage' ? (
        <>
          <span>−{vmax.toFixed(1)} V</span>
          <span className="bar" />
          <span>+{vmax.toFixed(1)} V</span>
        </>
      ) : (
        <span>Holes sharing a colour are the same electrical node</span>
      )}
    </div>
  );
}

export function Banner({ children }) {
  return <div className="banner glass">{children}</div>;
}
