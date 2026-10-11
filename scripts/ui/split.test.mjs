import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import path from 'node:path';

const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true });
const g = globalThis;
g.window = dom.window; g.document = dom.window.document; g.localStorage = dom.window.localStorage;
Object.defineProperty(g, 'navigator', { value: dom.window.navigator, configurable: true });
for (const k of ['HTMLElement', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent', 'requestAnimationFrame', 'cancelAnimationFrame', 'getComputedStyle', 'HTMLInputElement', 'Blob', 'ResizeObserver']) {
  g[k] = dom.window[k] ?? (k === 'ResizeObserver' ? class { observe() {} disconnect() {} } : undefined);
}
g.IS_REACT_ACT_ENVIRONMENT = true;
dom.window.AudioContext = undefined;

const bbStub = path.resolve('scripts/ui/StageStub.js');
const mechStub = path.resolve('scripts/ui/MechStageStub.js');
const server = await createServer({
  root: path.resolve('.'), logLevel: 'error', appType: 'custom', server: { middlewareMode: true },
  plugins: [{ name: 'stub-stages', enforce: 'pre', resolveId(id) { if (id.endsWith('three/Stage.js')) return bbStub; if (id.endsWith('MechStage.js')) return mechStub; } }],
});
const React = (await import('react')).default ?? (await import('react'));
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { default: App } = await server.ssrLoadModule('/src/App.jsx');
const { seat } = await server.ssrLoadModule('/src/lib/examples.js');

let fails = 0;
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) fails++; };
const $ = (s) => document.querySelector(s);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const byText = (sel, t) => $$(sel).find((e) => e.textContent.trim().startsWith(t));
const click = async (el) => act(async () => { el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); });
const flush = async (n = 3) => { for (let i = 0; i < n; i++) await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); };
const clickText = async (sel, t) => { const el = byText(sel, t); if (!el) throw new Error(`no ${sel} "${t}"`); await click(el); await flush(); };

const errors = [];
const origError = console.error;
console.error = (...a) => { errors.push(a.map(String).join(' ')); origError(...a); };

const container = document.getElementById('root');
let rootEl;
await act(async () => { rootEl = createRoot(container); rootEl.render(React.createElement(App)); });
await flush();

console.log('Entering Split view');
await clickText('button', 'Open the lab'); await flush(3);
const motSeat = seat('resistor', 'B10');
await act(async () => { __stage.emit('onPlace', { type: 'resistor', x: motSeat.x, y: motSeat.y, z: motSeat.z, rot: motSeat.rot, inserted: motSeat.inserted }); });
await flush(2);
await clickText('.bench-switch button', 'Split'); await flush(3);

ok(!!$('.app.is-split'), 'the app root carries the split modifier class');
ok(!!$('.stage-wrap canvas'), 'the breadboard canvas is present');
ok(!!$('.mech-app'), 'the mechanical workbench is present at the same time');
ok(!!$('.split-divider'), 'a divider is rendered between the two panes');
ok(!!byText('.palette button', 'Add') && !!byText('.palette button', 'Items'), 'breadboard Add/Items tabs are present');

console.log('\nBreadboard Items tab lists what is actually on the board, and stays live');
await clickText('.palette button', 'Items');
const before = $$('.palette .item-row').length;
ok(before === 4, `Items tab lists all 4 non-board parts on mount (battery, 2 resistors, LED) — saw ${before}`);
const badgeBefore = $('.palette .palette-tabs .count-badge')?.textContent.trim();
ok(badgeBefore === String(before), `the tab badge (${badgeBefore}) matches the row count (${before})`);

console.log('\nPlacing a new part while the Items tab is open updates the list live');
await clickText('.palette button', 'Add');
const capSeat = seat('capacitor', 'B10');
await act(async () => { __stage.emit('onPlace', { type: 'capacitor', x: capSeat.x, y: capSeat.y, z: capSeat.z, rot: capSeat.rot, inserted: capSeat.inserted }); });
await flush(2);
await clickText('.palette button', 'Items');
ok($$('.palette .item-row').length === before + 1, 'the newly placed capacitor appears in Items immediately (this used to require a stale useMemo fix)');
ok($('.palette .palette-tabs .count-badge')?.textContent.trim() === String(before + 1), 'the badge count keeps up too');

console.log('\nDeleting one specific part from Items removes only that part, and does not disturb an unrelated selection');
const otherPart = __stage.parts.find((p) => p.type === 'led');
await act(async () => { __stage.emit('onSelect', otherPart.id); });
await flush(2);
ok($$('.inspector').length > 0 && $$('.inspector')[0].textContent.includes('LED'), 'selecting the LED opens the Inspector');
const capRow = [...document.querySelectorAll('.palette .item-row')].find((r) => r.textContent.includes('Capacitor'));
await click(capRow.querySelector('.item-row-del'));
await flush(2);
ok(__stage.parts.every((p) => p.type !== 'capacitor'), 'the capacitor is gone from the document');
ok($$('.palette .item-row').length === before, 'the Items list reflects the deletion immediately');
ok($$('.inspector').length > 0, 'deleting an unrelated part from Items did NOT close the Inspector for the still-selected LED');

console.log('\nMechanical Items tab');
await clickText('.pcb-tabs button', 'Parts');
await clickText('.fp-item', 'Shaft');
await act(async () => { __mechStage.emit('click', { hit: null, shift: false, point: { x: 0, y: 0, z: 0 } }); }); await flush(2);
await clickText('.pcb-tabs button', 'Items');
ok($$('.pcb-side.left .fp-item').length === 1, 'the placed shaft shows up in the mechanical Items list');
const mechItemsBadge = byText('.pcb-tabs button', 'Items')?.querySelector('.count-badge');
ok(!!mechItemsBadge && mechItemsBadge.textContent.trim() === '1', `mechanical Items tab badge shows 1 (was "${mechItemsBadge?.textContent}")`);

console.log('\nDeleting from the mechanical Items tab');
const mechDel = $('.pcb-side.left .fp-item .item-row-del');
await click(mechDel); await flush(2);
ok(__mechStage.doc.parts.length === 0, 'the shaft is gone from the mechanism after clicking delete in Items');

console.log('\nKeyboard shortcuts go to one pane, not both');
const bbRunning = () => !!$$('.stage-wrap .transport button').find((b) => /pause/i.test(b.getAttribute('aria-label') ?? b.title ?? b.textContent));
const key = async (k, extra = {}) => act(async () => { window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: k, bubbles: true, ...extra })); });
await act(async () => { $('.stage-wrap').dispatchEvent(new dom.window.Event('pointerdown', { bubbles: true })); });
const bbBefore = bbRunning();
await key(' '); await flush(1);
ok(bbRunning() !== bbBefore, 'Space toggles the breadboard simulation when the breadboard pane has focus');
await key(' '); await flush(1);
await act(async () => { $('.pcb-shell.split-pane').dispatchEvent(new dom.window.Event('pointerdown', { bubbles: true })); });
const bbMid = bbRunning();
await key(' '); await flush(1);
ok(bbRunning() === bbMid, 'Space does NOT toggle the breadboard once the mechanical pane has focus');

console.log('\nBoth stages stay usable together');
await act(async () => { __mechStage.emit('onFrame', 0.016); });
ok(true, 'mech onFrame does not throw while split is open');
ok(!errors.length, `no console errors were logged during the split-view flow (${errors.length ? errors[0] : ''})`);

console.log(fails ? `\n${fails} FAILURES` : '\nAll split-view checks passed');
await server.close();
process.exit(fails ? 1 : 0);
