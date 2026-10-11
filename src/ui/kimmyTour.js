
import { KIMMY_ASPECT } from './KimmyActor.jsx';

export const TOUR_KEY = 'breadbai.kimmy.tour.v1';

export const readTourDone = () => {
  try { return localStorage.getItem(TOUR_KEY) === 'done'; } catch { return false; }
};
export const writeTourDone = () => {
  try { localStorage.setItem(TOUR_KEY, 'done'); } catch {}
};

export const SELECTORS = {
  palette: '.palette',
  workspace: '.stage-wrap canvas',
  toolbar: '.toolbar',
  transport: '.transport',
  learn: '.learn-btn',
  lesson: '.coach',
  coachNext: '.coach .coach-actions .btn.primary',
  pcb: '.pcb-shell',
  bench: '.bench-switch',
};

const trimText = (value, limit = 260) => String(value || '').replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim().slice(0, limit);
export { trimText };

export function buildTour(bench) {
  const hello = {
    id: 'hello', selector: null, gesture: 'wave',
    title: 'Hi, I’m Kimmy! 👋',
    body: ['I’ll show you how to build and test your first circuit in a few quick steps.', 'Press **Next** when you’re ready. You can stop any time with **Skip**.'],
  };
  const finish = {
    id: 'finish', selector: null, gesture: 'cheer',
    title: 'You’re ready! 🎉',
    body: ['I’ll hover in the corner. Click me whenever you want to be shown around again, get a hint, or ask a question.', 'Tip: the best place to start is **Learn → Lessons**.'],
  };

  if (bench === 'pcb' || bench === 'mech') {
    return [
      hello,
      {
        id: 'work', selector: SELECTORS.pcb, gesture: 'point', label: bench === 'pcb' ? 'PCB workspace' : 'Mechanical workspace',
        title: 'This is your workspace',
        body: bench === 'pcb'
          ? ['Use the tools along the top of this area to place parts, then draw traces to connect them.', 'Drag with the mouse to move around. Scroll to zoom.']
          : ['Add parts with the tools along the top, then connect them so they can move together.', 'Press **Run** in the same bar to watch your mechanism work.'],
      },
      {
        id: 'bench', selector: SELECTORS.bench, gesture: 'point', label: 'Workbenches',
        title: 'Switch workbenches here',
        body: ['Click **Breadboard**, **PCB** or **Mechanical** to change what you’re building.', 'Your work in each one is kept while you switch.'],
      },
      {
        id: 'learn', selector: SELECTORS.learn, gesture: 'point', label: 'Learn',
        title: 'Stuck? Open Learn',
        body: ['Click **Learn** for step-by-step lessons, a part guide and a cheat sheet.'],
      },
      finish,
    ];
  }

  return [
    hello,
    {
      id: 'palette', selector: SELECTORS.palette, gesture: 'point', label: 'Components',
      title: '1 · Pick a part',
      body: ['Click a part in the **Components** list, for example **9 V battery** or **LED**.', 'Can’t find it? Type its name in the **Search** box.'],
    },
    {
      id: 'place', selector: SELECTORS.workspace, gesture: 'point', label: 'Breadboard',
      title: '2 · Place it on the board',
      body: ['Click an empty spot on the breadboard. Your part appears in 3D.', 'Look around: **drag** to turn the view, **scroll** to zoom, **right-drag** to slide it.'],
    },
    {
      id: 'wire', selector: SELECTORS.toolbar, gesture: 'point', label: 'Tools',
      title: '3 · Connect with wires',
      body: ['Click **Wire** (or press `W`), then click one hole and a second hole to join them.', 'Press `V` or click **Select** to go back to moving parts.'],
    },
    {
      id: 'run', selector: SELECTORS.transport, gesture: 'point', label: 'Run controls',
      title: '4 · Run your circuit',
      body: ['Click the **▶ Play** button (or press `Space`). Lights glow and the numbers update.', 'The **↺ Reset** button starts over from a cold circuit.'],
    },
    {
      id: 'learn', selector: SELECTORS.learn, gesture: 'point', label: 'Learn',
      title: '5 · Learn step by step',
      body: ['Click **Learn** and choose a lesson. I’ll guide you through every step and tell you what to click.'],
    },
    finish,
  ];
}

const STEP_TARGETS = {
  palette: { selector: SELECTORS.palette, label: 'Components', lead: 'Click the part in the **Components** list, then click the board.' },
  workspace: { selector: SELECTORS.workspace, label: 'Breadboard', lead: 'Do this on the **breadboard**.' },
  transport: { selector: SELECTORS.transport, label: 'Run controls', lead: 'Use the **run controls** to test it.' },
  pcb: { selector: SELECTORS.pcb, label: 'Workspace', lead: 'Do this in the **workspace**.' },
  read: { selector: SELECTORS.lesson, label: 'Lesson', lead: 'Read the step in the **lesson panel**, then click **Got it**.' },
  quiz: { selector: SELECTORS.lesson, label: 'Lesson', lead: 'Choose an answer in the **lesson panel**.' },
};

export function targetForLessonStep(context) {
  if (context?.stepKind === 'read') return STEP_TARGETS.read;
  if (context?.stepKind === 'quiz') return STEP_TARGETS.quiz;
  const text = `${context?.stepTitle || ''} ${context?.stepBody || ''}`.toLowerCase();
  const bench = String(context?.bench || 'breadboard').toLowerCase();
  if (bench === 'pcb' || bench === 'mech' || /\bpcb\b|footprint|trace routing|mechanic|gear|joint|assembly/.test(text)) return STEP_TARGETS.pcb;
  if (/simulat|press run|click run|run it|run your|voltage|current|measure|test the circuit|power the|\bplay\b/.test(text)) return STEP_TARGETS.transport;
  if (/resistor|capacitor|\bled\b|component|part palette|choose a part|select a part|place a|pick a part|add a/.test(text)) return STEP_TARGETS.palette;
  return STEP_TARGETS.workspace;
}

export function nextActionFor(context) {
  const bench = String(context?.bench || 'breadboard');
  if (bench === 'pcb' || bench === 'mech') {
    return { selector: SELECTORS.pcb, label: 'Workspace', title: 'Try this next', body: ['Use the tools along the top to add something, then ask me to **Check my work** when you’re done.'] };
  }
  if (!context?.partCount) {
    return { selector: SELECTORS.palette, label: 'Components', title: 'Start here', body: ['Your board is empty. Click a part in **Components**, then click the breadboard to place it.', 'Good first parts: **9 V battery**, **Resistor**, **LED**.'] };
  }
  if (!context?.wireCount) {
    return { selector: SELECTORS.toolbar, label: 'Tools', title: 'Now connect them', body: ['Click **Wire** (or press `W`), then click one hole and another hole to join your parts.'] };
  }
  return { selector: SELECTORS.transport, label: 'Run controls', title: 'Try running it', body: ['Click **▶ Play** to test your circuit. If nothing happens, click **Check my work** and I’ll look for problems.'] };
}

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi));

export function measure(selector) {
  if (!selector || typeof document === 'undefined') return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 4 || r.height < 4) return null;
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
}

export function standBeside(rect, size, vw, vh, prefer = 'auto') {
  const half = size / 2;
  const h = (size * KIMMY_ASPECT) / 2;
  const m = 10;
  const fits = (p) => p.x - half >= m && p.x + half <= vw - m && p.y - h >= m + 44 && p.y + h <= vh - m;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + Math.min(rect.height / 2, 160);
  const gap = 26;
  const big = rect.width > vw * 0.55 && rect.height > vh * 0.45;
  const options = {
    right: { x: rect.right + half + gap, y: cy, side: 'right' },
    left: { x: rect.left - half - gap, y: cy, side: 'left' },
    above: { x: cx, y: rect.top - h - gap, side: 'above' },
    below: { x: cx, y: rect.bottom + h + gap, side: 'below' },
  };
  const order = prefer === 'auto' ? ['right', 'left', 'above', 'below'] : [prefer, 'right', 'left', 'above', 'below'];
  if (!big) {
    for (const key of order) if (fits(options[key])) return { x: options[key].x, y: options[key].y };
  }
  return {
    x: clamp(rect.left + rect.width * 0.28, half + m, vw - half - m),
    y: clamp(rect.top + rect.height * 0.62, h + m + 44, vh - h - m),
  };
}

export function dockSpot(size, vw, vh) {
  const half = size / 2;
  const h = (size * KIMMY_ASPECT) / 2;
  return { x: vw - half - 22, y: vh - h - 84 };
}
