import { memo, useEffect, useId, useRef } from 'react';


const VB_W = 220;
const VB_H = 250;
export const KIMMY_ASPECT = VB_H / VB_W;

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const deg = (rad) => (rad * 180) / Math.PI;
const reduced = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

const spring = (x = 0) => ({ x, v: 0 });
function step(s, target, k, c, dt) {
  s.v += (k * (target - s.x) - c * s.v) * dt;
  s.x += s.v * dt;
  return s.x;
}
const easeInOut = (u) => (u < 0.5 ? 4 * u * u * u : 1 - ((-2 * u + 2) ** 3) / 2);
const bezier = (a, b, c, d, t) => {
  const m = 1 - t;
  return m * m * m * a + 3 * m * m * t * b + 3 * m * t * t * c + t * t * t * d;
};

function HeadArt({ ids, earRef }) {
  return (
    <>
      <defs>
        <linearGradient id={ids.head} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff6d2e" />
          <stop offset="1" stopColor="#f24e0e" />
        </linearGradient>
        <linearGradient id={ids.body} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff6226" />
          <stop offset="1" stopColor="#e9460a" />
        </linearGradient>
      </defs>
      <g className="kimmy-ear" ref={earRef}>
        <rect x="4" y="104" width="25" height="32" rx="12.5" transform="rotate(32 16 120)" fill="#ff5a1c" />
        <rect x="9" y="111" width="9" height="15" rx="4.5" transform="rotate(32 16 120)" fill="#c93a06" opacity=".55" />
      </g>
      <rect x="20" y="38" width="156" height="126" rx="52" fill={`url(#${ids.head})`} />
      <path d="M26 128q0 36 40 36h60q50 0 50-44-14 24-52 24H70q-34 0-44-16z" fill="#c93a06" opacity=".28" />
      <rect x="52" y="60" width="108" height="96" rx="33" fill="#221d33" />
      <path d="M62 72q6-8 20-8" fill="none" stroke="#fff" strokeOpacity=".1" strokeWidth="4" strokeLinecap="round" />
    </>
  );
}

function Tuft() {
  return (
    <g className="kimmy-tuft">
      <path d="M112 44C124 28 140 18 160 16c-5 10-4 20 2 30-18-8-34-8-50-2z" fill="#ff6226" />
      <path d="M126 36c8-6 16-9 26-11-2 6-2 11 0 16-8-4-17-6-26-5z" fill="#ff8a54" opacity=".6" />
    </g>
  );
}

function KimmyActorView({ size = 150, mood = 'idle', gesture = 'idle', dest = null, hidden = false, onLanded, onClick, label = 'Kimmy', children }) {
  const uid = useId().replace(/:/g, '');
  const ids = { head: `kh${uid}`, body: `kb${uid}` };
  const root = useRef(null);
  const r = useRef({});
  const rig = useRef(null);
  const live = useRef({});
  useEffect(() => { live.current = { size, mood, gesture, dest, hidden, onLanded }; });
  const happy = mood === 'happy';
  const oops = mood === 'oops';

  useEffect(() => {
    const isReduced = reduced();
    const S = {
      x: -400, y: -400, vx: 0, vy: 0, phase: 'hidden', t: 0, ft: 0, dur: 1, time: 0, last: 0,
      p0: { x: 0, y: 0 }, c1: { x: 0, y: 0 }, c2: { x: 0, y: 0 },
      faceT: 1, keySeen: null, waveUntil: 0, frame: 0, talk: 0,
      blinkIn: 2.2, blink: 0,
      pointer: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
      sp: {
        bank: spring(), head: spring(), tuft: spring(), armR: spring(-34), armL: spring(6), ear: spring(),
        sy: spring(1), hop: spring(), face: spring(1), curve: spring(8), thrust: spring(), gx: spring(), gy: spring(),
        stretch: spring(),
      },
    };
    rig.current = S;

    const onMove = (e) => { S.pointer.x = e.clientX; S.pointer.y = e.clientY; };
    window.addEventListener('pointermove', onMove, { passive: true });

    const place = () => {
      const L = live.current;
      const w = L.size;
      const h = w * KIMMY_ASPECT;
      const bob = S.sp.hop.x;
      if (root.current) root.current.style.transform = `translate3d(${(S.x - w / 2).toFixed(1)}px, ${(S.y - h / 2 + bob).toFixed(1)}px, 0)`;
    };

    const startFlight = () => {
      const d = live.current.dest;
      if (!d) return;
      S.p0 = { x: S.x, y: S.y };
      const dx = d.x - S.x;
      const dy = d.y - S.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = -dy / dist;
      const ny = dx / dist;
      const sign = ny > 0 ? -1 : 1;
      const bow = Math.min(120, dist * 0.2) * sign;
      S.c1 = { x: S.x + dx * 0.28 + nx * bow, y: S.y + dy * 0.28 + ny * bow };
      S.c2 = { x: S.x + dx * 0.72 + nx * bow * 0.6, y: S.y + dy * 0.72 + ny * bow * 0.6 };
      S.dur = clamp(0.62 + dist / 820, 0.8, 1.9);
      S.ft = 0;
      S.phase = 'fly';
      if (Math.abs(dx) > 24) S.faceT = dx > 0 ? 1 : -1;
    };

    const arrive = () => {
      S.phase = 'land';
      S.t = 0;
      S.sp.sy.v = -3.2;
      S.sp.hop.v = 60;
      live.current.onLanded?.();
    };

    const frame = (now) => {
      S.frame = requestAnimationFrame(frame);
      const dt = clamp((now - (S.last || now)) / 1000, 0.001, 0.25);
      S.last = now;
      S.time += dt;
      const L = live.current;
      const d = L.dest;
      const sc = L.size / VB_W;

      if (d && d.key !== S.keySeen) {
        S.keySeen = d.key;
        if (S.phase === 'hidden') {
          S.x = d.x < window.innerWidth / 2 ? -L.size : window.innerWidth + L.size;
          S.y = clamp(d.y - 160, 60, window.innerHeight * 0.5);
          if (isReduced) { S.x = d.x; S.y = d.y; S.phase = 'idle'; arrive(); S.phase = 'idle'; }
          else startFlight();
        } else if (isReduced) {
          S.x = d.x; S.y = d.y; S.phase = 'idle'; L.onLanded?.();
        } else if (S.phase === 'fly') {
          startFlight();
        } else if (Math.hypot(d.x - S.x, d.y - S.y) < 8) {
          S.phase = 'idle'; L.onLanded?.();
        } else {
          S.phase = 'antic'; S.t = 0; S.faceT = d.x - S.x > 24 ? 1 : d.x - S.x < -24 ? -1 : S.faceT;
        }
      }

      const sp = S.sp;
      let speed = 0;

      if (S.phase === 'antic') {
        S.t += dt;
        if (S.t > 0.2) startFlight();
      }
      if (S.phase === 'fly' && d) {
        S.ft += dt;
        const u = Math.min(1, S.ft / S.dur);
        const e = easeInOut(u);
        const target = { x: d.x, y: d.y };
        const nx = bezier(S.p0.x, S.c1.x, S.c2.x, target.x, e);
        const ny = bezier(S.p0.y, S.c1.y, S.c2.y, target.y, e);
        const rvx = (nx - S.x) / dt;
        const rvy = (ny - S.y) / dt;
        const k = 1 - Math.exp(-dt * 12);
        S.vx += (rvx - S.vx) * k;
        S.vy += (rvy - S.vy) * k;
        S.x = nx;
        S.y = ny;
        speed = Math.hypot(S.vx, S.vy);
        if (u >= 1) { S.vx = 0; S.vy = 0; arrive(); }
      } else {
        S.vx *= 0.8; S.vy *= 0.8;
        if (S.phase === 'land') { S.t += dt; if (S.t > 0.55) S.phase = 'idle'; }
        if ((S.phase === 'idle' || S.phase === 'land') && d) {
          const k = 1 - Math.exp(-dt * 9);
          S.x += (d.x - S.x) * k;
          S.y += (d.y - S.y) * k;
        }
      }

      const flying = S.phase === 'fly';
      const anticipating = S.phase === 'antic';
      const calm = isReduced ? 0 : 1;
      const tm = S.time;
      const g = L.gesture;
      const waving = tm < S.waveUntil;

      if (!flying && d && Number.isFinite(d.aimX) && Math.abs(d.aimX - S.x) > 30) S.faceT = d.aimX > S.x ? 1 : -1;
      const faceDir = S.faceT;

      const bankT = flying ? clamp(S.vx * 0.026, -26, 26) : Math.sin(tm * 1.1) * 1.6 * calm;
      const pitch = flying ? clamp(S.vy * 0.012, -9, 9) : 0;
      const stretchT = flying ? clamp(speed / 2400, 0, 0.1) : 0;
      const syT = anticipating ? 0.82 : 1 + stretchT + (flying ? 0 : Math.sin(tm * 2.2) * 0.012 * calm);

      let armRT = -34 + Math.sin(tm * 2.2 + 1) * 4 * calm;
      let armLT = 6 + Math.sin(tm * 2.2) * 3 * calm;
      let headT = Math.sin(tm * 1.4 + 0.6) * 2.4 * calm;
      let curveT = 8;
      let gazeX = 0;
      let gazeY = 0;

      const headX = S.x;
      const headY = S.y - 18 * sc;
      let lookX = S.pointer.x;
      let lookY = S.pointer.y;
      if (d && Number.isFinite(d.aimX) && !flying) { lookX = d.aimX; lookY = d.aimY; }
      const ldx = (lookX - headX) * faceDir;
      const ldy = lookY - headY;
      const ld = Math.hypot(ldx, ldy) || 1;
      const reach = Math.min(1, ld / 220);
      gazeX = (ldx / ld) * reach * 8;
      gazeY = (ldy / ld) * reach * 6;

      if (flying) {
        const p = clamp(speed / 900, 0, 1);
        armRT = lerpTo(-20, 150, p) + Math.sin(tm * 14) * 2;
        armLT = lerpTo(8, 30, p);
        headT = bankT * 0.55 + pitch * 0.4;
        gazeX = clamp(S.vx * faceDir * 0.006, -8, 8);
        gazeY = clamp(S.vy * 0.006, -6, 6);
        curveT = 11;
      } else if (anticipating) {
        armRT = 62; armLT = -8; headT = -6 * faceDir; curveT = 4;
      } else if (L.mood === 'thinking' || g === 'think') {
        headT = 10 + Math.sin(tm * 1.8) * 3 * calm;
        armRT = -118 + Math.sin(tm * 3) * 3 * calm;
        gazeX = Math.sin(tm * 1.6) * 7; gazeY = -4;
        curveT = 1;
      } else if (g === 'point' && d && Number.isFinite(d.aimX)) {
        const sx = S.x + sc * (146 - 110) * faceDir;
        const sy = S.y + sc * (192 - 125);
        const ang = deg(Math.atan2(d.aimY - sy, (d.aimX - sx) * faceDir));
        armRT = clamp(ang, -88, 62) + Math.sin(tm * 6) * 3 * calm;
        headT = clamp(ang * 0.12, -6, 8);
        curveT = 10;
      } else if (g === 'cheer' || L.mood === 'happy') {
        armRT = -80 + Math.sin(tm * 12) * 9 * calm;
        armLT = 128 + Math.sin(tm * 12 + 1) * 9 * calm;
        headT = Math.sin(tm * 6) * 4 * calm;
        curveT = 13;
      } else if (g === 'wave' || waving) {
        armRT = -66 + Math.sin(tm * 10) * 22 * calm;
        headT = 5 + Math.sin(tm * 5) * 2 * calm;
        curveT = 11;
      }
      if (L.mood === 'oops') { curveT = -5; headT = -6; armRT = -10; }

      const hopTarget = flying ? 0 : (Math.sin(tm * 2.2) * 3.4 * calm) + (g === 'cheer' || L.mood === 'happy' ? -Math.abs(Math.sin(tm * 6)) * 9 * calm : 0);
      const n = Math.max(1, Math.ceil(dt / 0.016));
      const sdt = dt / n;
      for (let i = 0; i < n; i += 1) {
        step(sp.bank, bankT, 70, 10, sdt);
        step(sp.head, headT + sp.bank.x * 0.2, 110, 11, sdt);
        step(sp.tuft, -sp.bank.x * 1.5 - S.vx * 0.012 + Math.sin(tm * 3.1) * 3 * calm, 130, 5.5, sdt);
        step(sp.armR, armRT, 160, 12, sdt);
        step(sp.armL, armLT, 150, 12, sdt);
        step(sp.ear, Math.sin(tm * 4) * 4 * calm - sp.head.v * 0.05 - S.vx * 0.01, 180, 7, sdt);
        step(sp.sy, syT, 190, 11, sdt);
        step(sp.hop, hopTarget, 160, 12, sdt);
        step(sp.face, faceDir, 150, 15, sdt);
        step(sp.curve, curveT, 200, 16, sdt);
        step(sp.thrust, flying ? clamp(speed / 700, 0.2, 1) : 0, 120, 14, sdt);
        step(sp.gx, gazeX, 160, 18, sdt);
        step(sp.gy, gazeY, 160, 18, sdt);
      }

      S.blinkIn -= dt;
      if (S.blinkIn <= 0 && S.blink <= 0) { S.blink = 0.0001; S.blinkIn = 2.4 + Math.random() * 3; }
      if (S.blink > 0) { S.blink += dt; if (S.blink > 0.16) S.blink = 0; }
      const blinkScale = S.blink > 0 ? 1 - Math.sin((S.blink / 0.16) * Math.PI) * 0.92 : 1;

      const talking = Boolean(d && d.talking) && !flying;
      S.talk += ((talking ? (0.5 + 0.5 * Math.sin(tm * 17)) * (0.6 + 0.4 * Math.sin(tm * 5.3)) : 0) - S.talk) * (1 - Math.exp(-dt * 20));

      const e = r.current;
      const sy = sp.sy.x;
      const sx = 1 / Math.sqrt(Math.max(sy, 0.5));
      const faceX = sp.face.x;
      e.bank?.setAttribute('transform', `rotate(${sp.bank.x.toFixed(2)} 110 130)`);
      e.face?.setAttribute('transform', `translate(110 0) scale(${faceX.toFixed(3)} 1) translate(-110 0)`);
      e.body?.setAttribute('transform', `translate(110 232) scale(${sx.toFixed(3)} ${sy.toFixed(3)}) translate(-110 -232)`);
      const headDrop = (1 - sy) * 130 + Math.sin(tm * 2.2 - 0.7) * 2.2 * calm * (flying ? 0.3 : 1);
      e.head?.setAttribute('transform', `translate(0 ${headDrop.toFixed(2)}) rotate(${sp.head.x.toFixed(2)} 98 164)`);
      e.tuft?.setAttribute('transform', `rotate(${sp.tuft.x.toFixed(2)} 118 48)`);
      e.ear?.setAttribute('transform', `rotate(${sp.ear.x.toFixed(2)} 22 120)`);
      e.armR?.setAttribute('transform', `rotate(${sp.armR.x.toFixed(2)} 148 194)`);
      e.armL?.setAttribute('transform', `rotate(${sp.armL.x.toFixed(2)} 50 190)`);
      e.eyes?.setAttribute('transform', `translate(${sp.gx.x.toFixed(2)} ${sp.gy.x.toFixed(2)}) translate(0 111) scale(1 ${blinkScale.toFixed(3)}) translate(0 -111)`);
      e.mouth?.setAttribute('transform', `translate(${(sp.gx.x * 0.7).toFixed(2)} ${(sp.gy.x * 0.7).toFixed(2)})`);
      const cv = sp.curve.x;
      e.smile?.setAttribute('d', `M105 127Q113.5 ${(127 + cv).toFixed(2)} 122 127`);
      if (e.talk) {
        e.talk.setAttribute('d', `M107 128Q113.5 ${(128 + 4 + S.talk * 11).toFixed(2)} 121 128Z`);
        e.talk.style.opacity = S.talk > 0.06 ? '1' : '0';
      }
      if (e.thrust) {
        const t = sp.thrust.x;
        e.thrust.setAttribute('transform', `translate(110 232) scale(${(0.5 + t * 0.7).toFixed(3)} ${(0.4 + t * 1.5).toFixed(3)}) translate(-110 -232)`);
        e.thrust.style.opacity = String(clamp(t * 1.2, 0, 0.95));
      }
      if (e.streaks) {
        const a = flying ? deg(Math.atan2(S.vy, S.vx)) : 0;
        const o = flying ? clamp((speed - 260) / 650, 0, 1) : 0;
        e.streaks.setAttribute('transform', `rotate(${a.toFixed(1)} 110 130)`);
        e.streaks.style.opacity = String(o * 0.85);
      }
      if (root.current) root.current.style.visibility = S.phase === 'hidden' || live.current.hidden ? 'hidden' : 'visible';
      place();
    };
    S.frame = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(S.frame);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  const w = size;
  const h = size * KIMMY_ASPECT;
  const ref = (name) => (el) => { r.current[name] = el; };

  return (
    <div ref={root} className={`kimmy-actor mood-${mood}`} style={{ width: w, height: h, visibility: 'hidden' }}>
      <button
        className="kimmy-hit"
        onClick={onClick}
        onPointerEnter={() => { if (rig.current) rig.current.waveUntil = rig.current.time + 1.5; }}
        aria-label={label}
        title={label}
      >
        <svg width={w} height={h} viewBox={`0 0 ${VB_W} ${VB_H}`} role="img" aria-hidden="true" focusable="false">
          <g ref={ref('bank')}>
            <g ref={ref('streaks')} className="kimmy-streaks" style={{ opacity: 0 }}>
              <line x1="34" y1="96" x2="-30" y2="96" />
              <line x1="22" y1="128" x2="-52" y2="128" />
              <line x1="40" y1="160" x2="-20" y2="160" />
              <line x1="46" y1="192" x2="-8" y2="192" />
            </g>
            <g ref={ref('face')}>
              <g ref={ref('body')}>
                <g ref={ref('thrust')} className="kimmy-thrust" style={{ opacity: 0 }}>
                  <ellipse cx="110" cy="236" rx="15" ry="10" fill="#ffb347" />
                  <ellipse cx="110" cy="234" rx="8" ry="6" fill="#fff3c4" />
                </g>
                <g ref={ref('armL')}>
                  <rect x="40" y="188" width="19" height="44" rx="9.5" fill={`url(#${ids.body})`} />
                </g>
                <path
                  d="M88 180h46q15 0 15 15v22q0 15-15 15h-9q-6 0-6-6v-5q0-6-6-6h-4q-6 0-6 6v5q0 6-6 6h-9q-15 0-15-15v-22q0-15 15-15z"
                  fill={`url(#${ids.body})`}
                  transform="translate(-1 0)"
                />
                <path d="M92 188q4-4 12-4" fill="none" stroke="#fff" strokeOpacity=".25" strokeWidth="3" strokeLinecap="round" />
                <g ref={ref('armR')}>
                  <rect x="140" y="186" width="50" height="17" rx="8.5" fill={`url(#${ids.body})`} />
                  <circle cx="183" cy="194.5" r="3" fill="#fff" opacity=".28" />
                </g>
              </g>
              <g ref={ref('head')}>
                <HeadArt ids={ids} earRef={ref('ear')} />
                <g ref={ref('tuft')}><Tuft /></g>
                <g ref={ref('eyes')}>
                  {happy ? (
                    <>
                      <path d="M81 114q10-15 20 0" className="kimmy-eye-arc" />
                      <path d="M120 112q9-13 18 0" className="kimmy-eye-arc" />
                    </>
                  ) : (
                    <>
                      <ellipse cx="91" cy="112" rx="9.5" ry={oops ? 8 : 11} fill="#fff" />
                      <ellipse cx="129" cy="110" rx="8" ry={oops ? 7 : 9.5} fill="#fff" transform="rotate(-9 129 110)" />
                    </>
                  )}
                </g>
                <g ref={ref('mouth')}>
                  <path ref={ref('smile')} className="kimmy-smile" d="M105 127Q113.5 135 122 127" />
                  <path ref={ref('talk')} className="kimmy-talk" d="M107 128Q113.5 132 121 128Z" style={{ opacity: 0 }} />
                </g>
              </g>
            </g>
          </g>
        </svg>
      </button>
      {children}
    </div>
  );
}

function lerpTo(a, b, t) { return a + (b - a) * t; }

export const KimmyActor = memo(KimmyActorView);

export function KimmyHead({ mood = 'idle', size = 40, lookDown = false }) {
  const uid = useId().replace(/:/g, '');
  const ids = { head: `kh${uid}`, body: `kb${uid}` };
  const eyes = useRef(null);
  useEffect(() => {
    const el = eyes.current;
    if (!el) return undefined;
    if (lookDown) { el.style.transform = 'translate(0px, 5px)'; return undefined; }
    let frame = 0;
    let px = 0;
    let py = 0;
    const apply = () => {
      frame = 0;
      const box = el.ownerSVGElement?.getBoundingClientRect();
      if (!box) return;
      const dx = px - (box.left + box.width / 2);
      const dy = py - (box.top + box.height / 2);
      const dist = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, dist / 200);
      el.style.transform = `translate(${((dx / dist) * reach * 8).toFixed(1)}px, ${((dy / dist) * reach * 6).toFixed(1)}px)`;
    };
    const onMove = (e) => { px = e.clientX; py = e.clientY; if (!frame) frame = requestAnimationFrame(apply); };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => { window.removeEventListener('pointermove', onMove); if (frame) cancelAnimationFrame(frame); };
  }, [lookDown]);
  const happy = mood === 'happy';
  const oops = mood === 'oops';
  return (
    <svg className={`kimmy-head-icon mood-${mood}`} width={size} height={size * 0.9} viewBox="0 6 196 176" role="img" aria-label="Kimmy the robot">
      <HeadArt ids={ids} />
      <Tuft />
      <g ref={eyes} className="kimmy-head-eyes">
        {happy ? (
          <>
            <path d="M81 114q10-15 20 0" className="kimmy-eye-arc" />
            <path d="M120 112q9-13 18 0" className="kimmy-eye-arc" />
          </>
        ) : (
          <g className="kimmy-head-blink">
            <ellipse cx="91" cy="112" rx="9.5" ry={oops ? 8 : 11} fill="#fff" />
            <ellipse cx="129" cy="110" rx="8" ry={oops ? 7 : 9.5} fill="#fff" transform="rotate(-9 129 110)" />
          </g>
        )}
      </g>
      <path className="kimmy-smile" d={oops ? 'M105 131Q113.5 124 122 131' : happy ? 'M103 126Q113.5 140 124 126' : 'M105 127Q113.5 135 122 127'} />
    </svg>
  );
}
