import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from './icons.jsx';
import { Inline } from './richtext.jsx';
import { KimmyActor, KimmyHead, KIMMY_ASPECT } from './KimmyActor.jsx';
import {
  SELECTORS, buildTour, dockSpot, measure, nextActionFor, readTourDone, standBeside, targetForLessonStep, trimText, writeTourDone,
} from './kimmyTour.js';

const WELCOME = {
  id: 'welcome',
  role: 'assistant',
  content: 'Hi, I’m Kimmy. Ask me anything about electronics, or tap a button below.',
};

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function Lines({ text }) {
  const lines = String(text).split('\n');
  return lines.map((line, index) => {
    if (!line.trim()) return <div className="pip-gap" key={index} />;
    const item = /^\s*(\d+[.)]|[-•*])\s+/.test(line);
    return <div className={`pip-line${item ? ' is-item' : ''}`} key={index}><Inline text={line.trim()} /></div>;
  });
}

function Reveal({ text, onTick, onDone }) {
  const [count, setCount] = useState(() => (prefersReducedMotion() ? text.length : 0));
  const callbacks = useRef({ onTick, onDone });
  useEffect(() => { callbacks.current = { onTick, onDone }; });
  useEffect(() => {
    if (prefersReducedMotion()) {
      callbacks.current.onDone();
      return undefined;
    }
    const total = text.length;
    const duration = Math.min(2400, Math.max(450, total * 8));
    let start;
    let frame = requestAnimationFrame(function step(now) {
      start ??= now;
      const progress = Math.min(1, (now - start) / duration);
      setCount(Math.ceil(progress * total));
      callbacks.current.onTick();
      if (progress < 1) frame = requestAnimationFrame(step);
      else callbacks.current.onDone();
    });
    return () => cancelAnimationFrame(frame);
  }, [text]);
  let shown = text.slice(0, count);
  if ((shown.match(/\*\*/g) || []).length % 2) shown += '**';
  if ((shown.match(/`/g) || []).length % 2) shown += '`';
  return <Lines text={shown} />;
}


const speakable = (card) => [card.title, ...card.body].join('. ').replace(/\*\*/g, '').replace(/`/g, '');
const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';

function sameRect(a, b) {
  if (!a || !b) return a === b;
  return Math.abs(a.left - b.left) < 1.5 && Math.abs(a.top - b.top) < 1.5 && Math.abs(a.right - b.right) < 1.5 && Math.abs(a.bottom - b.bottom) < 1.5;
}

function GuideBotView({ context }) {
  const hasLesson = Boolean(context?.lessonTitle && !context?.lessonFinished);
  const lessonKey = context?.lessonId ? `${context.lessonId}:${context.stepIndex ?? 0}` : null;
  const bench = String(context?.bench || 'breadboard');

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState(null);
  const [unread, setUnread] = useState(false);
  const [lastAsk, setLastAsk] = useState(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const previousLesson = useRef(null);
  const sequence = useRef(1);
  const openRef = useRef(false);
  const flashTimer = useRef(0);

  const [scene, setScene] = useState(() => {
    if (!readTourDone() && !hasLesson) return { kind: 'tour', index: 0, nonce: 0 };
    return { kind: 'hello', nonce: 0 };
  });
  const [landed, setLanded] = useState(false);
  const [rect, setRect] = useState(null);
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  const [bp, setBp] = useState(null);
  const bubbleRef = useRef(null);
  const nonce = useRef(1);
  const sceneRef = useRef(scene);
  sceneRef.current = scene;

  useEffect(() => { openRef.current = open; }, [open]);

  const stopVoice = useCallback(() => { if (canSpeak()) window.speechSynthesis.cancel(); }, []);
  useEffect(() => () => stopVoice(), [stopVoice]);

  const tour = buildTour(bench);
  const compact = vp.w < 560;
  const size = compact ? 104 : 140;
  const panelMode = open && vp.w >= 760;

  const go = useCallback((next) => setScene({ ...next, nonce: nonce.current++ }), []);
  const dock = useCallback(() => go({ kind: 'dock' }), [go]);
  const startTour = useCallback(() => { setOpen(false); go({ kind: 'tour', index: 0 }); }, [go]);
  const finishTour = useCallback(() => { writeTourDone(); go({ kind: 'dock' }); }, [go]);

  const showMood = useCallback((value, ms) => {
    window.clearTimeout(flashTimer.current);
    setFlash(value);
    flashTimer.current = window.setTimeout(() => setFlash(null), ms);
  }, []);
  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  const scrollDown = useCallback((smooth = false) => {
    const list = listRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  const addKimmyMessage = useCallback((message) => {
    setMessages((prev) => [...prev, message].slice(-20));
    if (!openRef.current) setUnread(true);
  }, []);

  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const tourStep = scene.kind === 'tour' ? tour[Math.min(scene.index, tour.length - 1)] : null;
  const sceneSelector = scene.kind === 'tour' ? tourStep?.selector : scene.kind === 'tip' ? scene.tip.selector : null;
  const activeSelector = open ? null : sceneSelector;

  useEffect(() => {
    if (!activeSelector) { setRect(null); return undefined; }
    const update = () => setRect((prev) => { const next = measure(activeSelector); return sameRect(prev, next) ? prev : next; });
    update();
    const id = window.setInterval(update, 320);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => { window.clearInterval(id); window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); };
  }, [activeSelector, scene.nonce]);

  const showLessonTip = useCallback(() => {
    if (!context?.lessonTitle || context.lessonFinished) return;
    const target = targetForLessonStep(context);
    const n = (Number(context.stepIndex) || 0) + 1;
    const body = trimText(context.stepBody, 170);
    const instruction = context.stepKind === 'read' || context.stepKind === 'quiz' || !body
      ? [target.lead]
      : [`${body}${body.length >= 170 ? '…' : ''}`, target.lead];
    go({
      kind: 'tip',
      tip: {
        key: `step:${lessonKey}`, selector: target.selector, label: target.label, gesture: 'point', eyebrow: 'Your turn',
        title: `Step ${n}${context.stepCount ? ` of ${context.stepCount}` : ''}: ${context.stepTitle || 'Try this'}`,
        body: instruction, withHint: true, autoHide: 45000,
      },
    });
  }, [context, go, lessonKey]);

  const showNextAction = useCallback(() => {
    if (hasLesson) { showLessonTip(); return; }
    const a = nextActionFor(context);
    go({ kind: 'tip', tip: { key: `next:${a.selector}`, selector: a.selector, label: a.label, gesture: 'point', eyebrow: 'Next step', title: a.title, body: a.body, autoHide: 40000 } });
  }, [context, go, hasLesson, showLessonTip]);

  useEffect(() => {
    if (!lessonKey) { previousLesson.current = null; return; }
    if (previousLesson.current === lessonKey) return;
    previousLesson.current = lessonKey;
    if (context?.lessonFinished) return;
    const stepNumber = (Number(context.stepIndex) || 0) + 1;
    const body = trimText(context.stepBody, 235);
    const idea = body ? `${body}${body.length >= 235 ? '…' : ''}` : 'Read the step, try it in the simulator, and ask me if anything is unclear.';
    addKimmyMessage({
      id: `step-${sequence.current++}`,
      role: 'assistant',
      content: `Step ${stepNumber}${context.stepTitle ? `: ${context.stepTitle}` : ''}\n${idea}\nTap Hint if you want a small clue.`,
    });
    if (sceneRef.current.kind !== 'tour') showLessonTip();
  }, [lessonKey, context, addKimmyMessage, showLessonTip]);

  const stepDone = Boolean(context?.stepDone);
  const doneKey = useRef(null);
  useEffect(() => {
    if (!stepDone || !lessonKey || context?.lessonFinished) { if (!stepDone) doneKey.current = null; return; }
    if (doneKey.current === lessonKey || sceneRef.current.kind === 'tour') return;
    doneKey.current = lessonKey;
    showMood('happy', 2400);
    go({ kind: 'tip', tip: { key: `done:${lessonKey}`, selector: SELECTORS.coachNext, label: 'Next', gesture: 'point', eyebrow: 'Nice work!', title: 'That step is done ✅', body: ['Click **Next** in the lesson panel to move on.'], autoHide: 14000 } });
  }, [stepDone, lessonKey, context?.lessonFinished, go, showMood]);

  useEffect(() => {
    if (context?.lessonFinished && lessonKey && previousLesson.current === `${context.lessonId}:${context.stepIndex ?? 0}`) {
      setMessages((prev) => {
        if (prev.some((message) => message.id === `finish-${context.lessonId}`)) return prev;
        return [...prev, { id: `finish-${context.lessonId}`, role: 'assistant', content: 'Lesson complete. Nice work. Want to try the next one, or go over anything that felt tricky?' }].slice(-20);
      });
      showMood('happy', 2600);
      if (!openRef.current) setUnread(true);
      if (sceneRef.current.kind !== 'tour') {
        go({ kind: 'tip', tip: { key: `finish:${context.lessonId}`, selector: SELECTORS.lesson, label: 'Lesson', gesture: 'cheer', eyebrow: 'Lesson complete', title: 'You did it! 🎉', body: ['Pick **Next lesson** in the lesson panel, or keep experimenting with your circuit.'], autoHide: 16000 } });
      }
    }
  }, [context?.lessonFinished, context?.lessonId, context?.stepIndex, lessonKey, showMood, go]);

  useEffect(() => {
    const ms = scene.kind === 'tip' ? scene.tip.autoHide : scene.kind === 'hello' ? 6500 : 0;
    if (!ms || !landed || open) return undefined;
    const id = window.setTimeout(() => dock(), ms);
    return () => window.clearTimeout(id);
  }, [scene, landed, open, dock]);

  let card = null;
  if (scene.kind === 'tour' && tourStep) {
    card = { ...tourStep, eyebrow: `Step ${scene.index + 1} of ${tour.length}`, kind: 'tour' };
  } else if (scene.kind === 'tip') {
    card = { ...scene.tip, kind: 'tip' };
  } else if (scene.kind === 'menu') {
    card = { kind: 'menu', selector: null, gesture: 'wave', eyebrow: 'Kimmy', title: 'How can I help?', body: [hasLesson ? 'Pick one, or just keep building.' : 'Pick one, or just keep exploring.'] };
  } else if (scene.kind === 'hello') {
    card = { kind: 'hello', selector: null, gesture: 'wave', eyebrow: '', title: '', body: ['Need a hand? **Click me!**'] };
  }
  if (open) card = null;

  const small = size;
  let pos;
  let aim = null;
  if (panelMode) {
    pos = { x: vp.w - 20 - Math.min(372, vp.w - 24) - small / 2 - 6, y: vp.h - 72 - (small * KIMMY_ASPECT) / 2 - 18 };
  } else if (card && card.selector && rect) {
    pos = standBeside(rect, small, vp.w, vp.h, card.prefer);
    aim = { x: rect.left + rect.width / 2, y: rect.top + Math.min(rect.height / 2, 150) };
  } else if (card && scene.kind === 'tour') {
    pos = { x: Math.max(small / 2 + 16, vp.w * 0.34), y: Math.max(vp.h * 0.5, 220) };
  } else {
    pos = dockSpot(small, vp.w, vp.h);
  }
  const hidden = open && !panelMode;
  const gesture = open
    ? (busy ? 'think' : flash === 'happy' ? 'cheer' : 'idle')
    : (card?.gesture === 'point' && !aim ? 'idle' : card?.gesture || 'idle');
  const mood = busy ? 'thinking' : flash || (card?.gesture === 'cheer' ? 'happy' : 'idle');
  const destKey = `${scene.kind}:${scene.nonce}${panelMode ? ':panel' : ''}${hidden ? ':hidden' : ''}`;
  const dest = { key: destKey, x: pos.x, y: pos.y, aimX: aim?.x, aimY: aim?.y, talking: landed && Boolean(card) };

  useEffect(() => { setLanded(false); }, [destKey]);
  const onLanded = useCallback(() => setLanded(true), []);

  const cardId = card ? destKey : '';
  const posX = Math.round(pos.x / 6);
  const posY = Math.round(pos.y / 6);
  const tipKey = scene.tip?.key;
  const tourId = tourStep?.id;
  useLayoutEffect(() => {
    const el = bubbleRef.current;
    if (!landed || !card || !el) { setBp(null); return; }
    const bw = el.offsetWidth;
    const bh = el.offsetHeight;
    const half = small / 2;
    const h = small * KIMMY_ASPECT;
    const m = 10;
    const headY = pos.y - h * 0.12;
    const roomRight = vp.w - (pos.x + half) - m;
    const roomLeft = pos.x - half - m;
    let side = aim ? (aim.x >= pos.x ? 'left' : 'right') : (pos.x < vp.w / 2 ? 'right' : 'left');
    if (side === 'right' && roomRight < bw) side = roomLeft >= bw ? 'left' : 'center';
    else if (side === 'left' && roomLeft < bw) side = roomRight >= bw ? 'right' : 'center';
    if (side === 'center') {
      const above = pos.y - h / 2 - bh - 14;
      const top = above >= 52 ? above : Math.min(vp.h - bh - m, pos.y + h / 2 + 12);
      setBp({ side, left: Math.max(m, Math.min(vp.w - bw - m, pos.x - bw / 2)), top, tail: 0 });
      return;
    }
    const left = side === 'right' ? pos.x + half + 4 : pos.x - half - 4 - bw;
    const top = Math.max(52, Math.min(vp.h - bh - m, headY - bh * 0.3));
    setBp({ side, left, top, tail: Math.max(22, Math.min(bh - 26, headY - top)) });
  }, [landed, cardId, vp.w, vp.h, posX, posY, tipKey, tourId]);

  useEffect(() => {
    if (scene.kind === 'tour' && landed) bubbleRef.current?.querySelector('[data-primary]')?.focus({ preventScroll: true });
  }, [scene, landed]);

  const spoken = card && landed && !open ? speakable(card) : '';
  useEffect(() => {
    if (!voiceEnabled || !spoken || !canSpeak()) return undefined;
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(spoken);
    utterance.rate = 0.98; utterance.pitch = 1.08; utterance.volume = 0.85;
    window.speechSynthesis.speak(utterance);
    return () => window.speechSynthesis.cancel();
  }, [spoken, voiceEnabled]);

  const latestMessage = messages.at(-1);
  useEffect(() => {
    if (!voiceEnabled || !open || latestMessage?.role !== 'assistant' || !canSpeak()) return undefined;
    window.speechSynthesis.cancel();
    const text = String(latestMessage.content || '').replace(/\*\*/g, '').replace(/`/g, '').trim();
    if (!text) return undefined;
    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.rate = 0.98; utterance.pitch = 1.08; utterance.volume = 0.85;
    window.speechSynthesis.speak(utterance);
    return () => window.speechSynthesis.cancel();
  }, [latestMessage?.id, latestMessage?.content, latestMessage?.role, voiceEnabled, open]);

  const toggleVoice = () => {
    if (voiceEnabled) { stopVoice(); setVoiceEnabled(false); }
    else if (canSpeak()) setVoiceEnabled(true);
    else setError('Read-aloud is not supported by this browser. You can still read Kimmy’s tips on screen.');
  };

  useEffect(() => { scrollDown(true); }, [messages, busy, error, open, scrollDown]);

  const openPanel = useCallback(() => {
    stopVoice();
    setOpen(true);
    setUnread(false);
  }, [stopVoice]);

  useEffect(() => {
    if (!open) return undefined;
    const id = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(id);
  }, [open]);

  const ask = async (rawMessage, action = 'chat', retry = false) => {
    const message = String(rawMessage || '').trim();
    if (!message || busy) return;
    setLastAsk({ message, action });
    const earlier = retry && messages.at(-1)?.role === 'user' ? messages.slice(0, -1) : messages;
    const history = earlier.filter((item) => item.role === 'user' || item.role === 'assistant').slice(-6).map(({ role, content }) => ({ role, content: String(content).slice(0, 700) }));
    if (!retry) setMessages((prev) => [...prev, { id: `user-${sequence.current++}`, role: 'user', content: message }].slice(-20));
    setDraft('');
    setBusy(true);
    setError('');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 38_000);
    try {
      const response = await fetch('/api/guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, action, context, history }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Kimmy could not answer just now. Please try again.');
      addKimmyMessage({ id: `pip-${sequence.current++}`, role: 'assistant', fresh: true, content: data.reply || 'I didn’t get a clear answer. Could you ask that a different way?' });
      setLastAsk(null);
      showMood('happy', 2600);
    } catch (err) {
      setError(err?.name === 'AbortError'
        ? 'That took too long. Try again in a moment.'
        : (err?.message || 'Kimmy can’t connect right now. Check that the app server is running.'));
      showMood('oops', 3200);
    } finally {
      window.clearTimeout(timeout);
      setBusy(false);
    }
  };

  const quickAction = (action) => {
    const prompts = {
      explain: hasLesson ? 'Explain my current lesson step in simple words and give one everyday analogy.' : 'Explain how this electronics simulator works to a complete beginner.',
      hint: hasLesson ? 'Give me one small hint for my current lesson step. Do not give the full solution yet.' : 'Give me one easy first step for learning electronics in this app.',
      check: 'Check my current work using the simulator snapshot and diagnostic messages provided. Tell me what seems okay, what may be wrong, and the single best next fix. Be honest about anything you cannot verify from the snapshot.',
    };
    openPanel();
    ask(prompts[action], action);
  };

  const finishReveal = useCallback((id) => {
    setMessages((prev) => prev.map((message) => (message.id === id ? { ...message, fresh: false } : message)));
  }, []);

  const status = busy ? 'Thinking…' : (context?.lessonFinished ? 'Lesson complete' : (hasLesson ? (context.stepTitle || context.lessonTitle) : 'Your kyot bot'));

  const actions = [];
  if (card?.kind === 'tour') {
    actions.push({ label: 'Back', ghost: true, hidden: scene.index === 0, run: () => go({ kind: 'tour', index: scene.index - 1 }) });
    actions.push(scene.index >= tour.length - 1
      ? { label: 'Done', primary: true, run: finishTour }
      : { label: scene.index === 0 ? 'Start tour' : 'Next', primary: true, run: () => go({ kind: 'tour', index: scene.index + 1 }) });
  } else if (card?.kind === 'tip') {
    actions.push({ label: 'Got it', primary: true, run: dock });
    if (card.withHint) actions.push({ label: 'Hint', run: () => quickAction('hint') });
  } else if (card?.kind === 'menu') {
    actions.push({ label: 'Show me around', run: startTour });
    actions.push({ label: 'What should I do next?', run: showNextAction });
    actions.push({ label: 'Ask a question', run: openPanel });
    actions.push({ label: 'Close', ghost: true, run: dock });
  }

  const onBubbleKey = (event) => {
    if (card?.kind === 'tour') {
      if (event.key === 'ArrowRight') { event.preventDefault(); actions.find((a) => a.primary)?.run(); }
      if (event.key === 'ArrowLeft' && scene.index > 0) { event.preventDefault(); go({ kind: 'tour', index: scene.index - 1 }); }
      if (event.key === 'Escape') finishTour();
    } else if (event.key === 'Escape') dock();
  };

  const onKimmyClick = () => {
    if (scene.kind === 'tour') return;
    if (scene.kind === 'menu') { dock(); return; }
    if (open) { setOpen(false); return; }
    go({ kind: 'menu' });
  };

  const ring = !open && card?.selector && rect ? {
    left: Math.max(4, rect.left - 6),
    top: Math.max(48, rect.top - 6),
    width: Math.min(vp.w - 8, rect.right + 6) - Math.max(4, rect.left - 6),
    height: Math.min(vp.h - 6, rect.bottom + 6) - Math.max(48, rect.top - 6),
  } : null;

  return (
    <>
      {open && (
        <section
          className="pip-panel"
          role="dialog"
          aria-label="Ask Kimmy, your AI electronics guide"
          aria-modal="false"
          onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false); }}
        >
          <header className="pip-head">
            <KimmyHead mood={busy ? 'thinking' : flash || 'idle'} size={42} lookDown={Boolean(draft) && !busy} />
            <div className="pip-title">
              <strong>Kimmy</strong>
              <span className={busy ? 'is-live' : ''}>{status}</span>
            </div>
            <button className="pip-icon-btn" onClick={() => { setMessages([WELCOME]); setError(''); setLastAsk(null); }} aria-label="Clear conversation" title="Clear conversation"><Icon.reset size={15} /></button>
            <button
              className={`pip-icon-btn${voiceEnabled ? ' is-voice-on' : ''}`}
              onClick={toggleVoice}
              aria-label={voiceEnabled ? 'Turn Kimmy voice off' : 'Read Kimmy answers aloud'}
              title={voiceEnabled ? 'Turn voice off' : 'Read answers aloud'}
            >{voiceEnabled ? '🔊' : '🔈'}</button>
            <button className="pip-icon-btn" onClick={() => setOpen(false)} aria-label="Minimize Kimmy" title="Minimize"><Icon.close size={16} /></button>
          </header>

          <div className="pip-feed" ref={listRef} aria-live="polite" aria-relevant="additions text">
            {messages.map((message) => (
              <div key={message.id} className={`pip-msg ${message.role === 'user' ? 'from-user' : 'from-pip'}`}>
                {message.role === 'assistant' && message.fresh
                  ? <Reveal text={message.content} onTick={scrollDown} onDone={() => finishReveal(message.id)} />
                  : <Lines text={message.content} />}
              </div>
            ))}
            {busy && <div className="pip-msg from-pip pip-typing" aria-label="Kimmy is thinking"><i /><i /><i /></div>}
            {error && !busy && (
              <div className="pip-notice" role="status">
                <span>{error}</span>
                {lastAsk && <button onClick={() => ask(lastAsk.message, lastAsk.action, true)}>Try again</button>}
              </div>
            )}
          </div>

          <div className="pip-foot">
            <div className="pip-chips" aria-label="Quick help">
              <button disabled={busy} onClick={() => quickAction('explain')}>Explain this step</button>
              <button disabled={busy} onClick={() => quickAction('hint')}>Hint</button>
              <button disabled={busy} onClick={() => quickAction('check')}>Check my work</button>
              <button onClick={() => { setOpen(false); showNextAction(); }}>What’s next?</button>
              <button onClick={startTour}>Show me around</button>
            </div>
            <form className="pip-compose" onSubmit={(event) => { event.preventDefault(); ask(draft); }}>
              <input ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask Kimmy anything" aria-label="Ask Kimmy a question" maxLength={2000} />
              <button type="submit" disabled={busy || !draft.trim()} aria-label="Send question" title="Send"><Icon.arrowUp size={16} /></button>
            </form>
          </div>
        </section>
      )}

      <div className="kimmy-layer">
        {ring && (
          <div key={`ring-${destKey}`} className="kimmy-ring" style={ring} aria-hidden="true">
            {card.label && <span>{card.label}</span>}
          </div>
        )}

        <KimmyActor
          size={small}
          mood={mood}
          gesture={gesture}
          dest={dest}
          hidden={hidden}
          onLanded={onLanded}
          onClick={onKimmyClick}
          label={unread ? 'Kimmy has a new message. Click for help' : 'Kimmy, your guide. Click for help'}
        />

        {card && landed && (
          <div
            ref={bubbleRef}
            key={`bubble-${destKey}`}
            className={`kimmy-bubble kind-${card.kind} side-${bp?.side || 'right'}`}
            style={bp ? { left: bp.left, top: bp.top, '--tail': `${bp.tail}px` } : { left: 0, top: 0, visibility: 'hidden' }}
            role="dialog"
            aria-modal="false"
            aria-live="polite"
            aria-label={`Kimmy says: ${card.title || 'hello'}`}
            onKeyDown={onBubbleKey}
          >
            {card.kind !== 'hello' && (
              <div className="kb-top">
                <span className="kb-eyebrow">{card.eyebrow}</span>
                {canSpeak() && (
                  <button className={`kb-voice${voiceEnabled ? ' is-on' : ''}`} onClick={toggleVoice} aria-label={voiceEnabled ? 'Turn Kimmy voice off' : 'Read this aloud'} title={voiceEnabled ? 'Turn voice off' : 'Read this aloud'}>
                    {voiceEnabled ? '🔊' : '🔈'}
                  </button>
                )}
                {card.kind === 'tour' && <button className="kb-skip" onClick={finishTour}>Skip tour</button>}
              </div>
            )}
            {card.title && <h3 className="kb-title">{card.title}</h3>}
            {card.body.map((line, i) => <p key={i} className="kb-line"><Inline text={line} /></p>)}
            {card.kind === 'tour' && (
              <div className="kb-dots" aria-hidden="true">
                {tour.map((s, i) => <i key={s.id + i} className={i === scene.index ? 'on' : i < scene.index ? 'past' : ''} />)}
              </div>
            )}
            {actions.length > 0 && (
              <div className={`kb-actions${card.kind === 'menu' ? ' is-menu' : ''}`}>
                {actions.filter((a) => !a.hidden).map((a) => (
                  <button key={a.label} data-primary={a.primary ? '' : undefined} className={a.primary ? 'is-primary' : a.ghost ? 'is-ghost' : ''} onClick={a.run}>{a.label}</button>
                ))}
              </div>
            )}
            {card.kind === 'hello' && <button className="kb-hello-hit" onClick={onKimmyClick} aria-label="Open Kimmy's help menu" />}
          </div>
        )}
      </div>
    </>
  );
}

export default memo(GuideBotView);
