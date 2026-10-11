import { useMemo, useState } from 'react';
import { CATALOG } from '../lib/catalog.js';
import { GUIDES } from '../lib/guides.js';
import { LESSONS, CORE_LESSON_ORDER } from '../lib/lessons.js';
import { PartIcon, Icon } from './icons.jsx';
import { Inline } from './richtext.jsx';
import { Anatomy, ColorReader, Formulas, LedCalculator } from './Tools.jsx';

const MODULES = [
  {
    title: 'Introduction to Electronics',
    description: 'Meet electronic devices, common components, and the electrical quantities that make circuits work.',
    lessons: ['intro-electronics', 'components-basics', 'ohms-law'],
  },
  {
    title: 'Circuit Fundamentals',
    description: 'Learn how current travels, compare series and parallel paths, and control a circuit with switches.',
    lessons: ['circuit-fundamentals', 'series-parallel', 'switch-control'],
  },
  {
    title: 'Breadboard Development',
    description: 'Discover the hidden breadboard connections, learn to connect components, and build an LED circuit.',
    lessons: ['basics', 'component-connections', 'first-led'],
  },
  {
    title: 'Logic Gates and Applications',
    description: 'Use AND, OR, and NOT rules, read truth tables, and plan a simple two-input logic circuit.',
    lessons: ['logic-gates', 'truth-tables', 'basic-logic-circuit'],
  },
];

function LessonsTab({ progress, onStart }) {
  const coreLessons = CORE_LESSON_ORDER.map((id) => LESSONS.find((lesson) => lesson.id === id)).filter(Boolean);
  const coreIds = new Set(CORE_LESSON_ORDER);
  const workshops = LESSONS.filter((lesson) => !coreIds.has(lesson.id));
  const [moduleIndex, setModuleIndex] = useState(() => {
    const firstIncomplete = MODULES.findIndex((module) => module.lessons.some((id) => !progress[id]));
    return firstIncomplete < 0 ? 0 : firstIncomplete;
  });
  const [showWorkshops, setShowWorkshops] = useState(false);
  const [search, setSearch] = useState('');

  const finishedCore = coreLessons.filter((lesson) => progress[lesson.id]).length;
  const finishedWorkshops = workshops.filter((lesson) => progress[lesson.id]).length;
  const nextLesson = coreLessons.find((lesson) => !progress[lesson.id]) ?? coreLessons[0];
  const activeModule = MODULES[moduleIndex] ?? MODULES[0];
  const query = search.trim().toLowerCase();
  const searchResults = query
    ? [...coreLessons, ...workshops].filter((lesson) =>
        `${lesson.title} ${lesson.summary} ${lesson.learn.join(' ')}`.toLowerCase().includes(query))
    : null;

  const renderLesson = (lesson, { isCore = true } = {}) => {
    const done = !!progress[lesson.id];
    const recommended = isCore && !done && lesson.id === nextLesson?.id;
    const courseNumber = CORE_LESSON_ORDER.indexOf(lesson.id) + 1;
    const label = isCore ? `LESSON ${String(courseNumber).padStart(2, '0')}` : (lesson.bench === 'pcb' ? 'PCB WORKSHOP' : lesson.bench === 'mech' ? 'MECHANICAL WORKSHOP' : 'CIRCUIT WORKSHOP');
    return (
      <article key={lesson.id} className={`course-lesson${done ? ' is-done' : ''}${recommended ? ' is-next' : ''}`}>
        <div className="course-lesson-index" aria-hidden="true">
          {done ? <span>✓</span> : isCore ? String(courseNumber).padStart(2, '0') : <Icon.play size={15} />}
        </div>
        <div className="course-lesson-copy">
          <div className="course-lesson-eyebrow">
            <span>{label}</span>
            {recommended && <span className="next-label">UP NEXT</span>}
            {done && <span className="completed-label">COMPLETED</span>}
          </div>
          <h4>{lesson.title}</h4>
          <p>{lesson.summary}</p>
          <div className="lesson-chips">
            {(lesson.learn ?? []).slice(0, 2).map((item) => <span key={item}>{item}</span>)}
            <span>{lesson.minutes} min</span>
          </div>
        </div>
        <button className={`btn course-start${recommended ? ' primary' : ''}`} onClick={() => onStart(lesson.id)}>
          {done ? 'Review' : recommended ? 'Continue' : 'Start'} <span aria-hidden="true">→</span>
        </button>
      </article>
    );
  };

  return (
    <div className="learning-path">
      <section className="course-banner">
        <div className="course-banner-copy">
          <span className="course-eyebrow">YOUR LEARNING PATH</span>
          <h3>Learn electronics, one step at a time.</h3>
          <p>Short explanations, quick checks, and guided practice. No prior electronics experience needed.</p>
        </div>
        <div className="course-banner-progress">
          <div className="course-progress-count"><strong>{finishedCore}</strong><span> / 12 lessons</span></div>
          <div className="course-progress-track" role="progressbar" aria-label="Core course progress" aria-valuemin={0} aria-valuemax={12} aria-valuenow={finishedCore}>
            <span style={{ width: `${finishedCore / 12 * 100}%` }} />
          </div>
          <button className="btn primary" onClick={() => onStart(nextLesson.id)}>
            {finishedCore === 12 ? 'Review course' : 'Continue learning'} <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>

      <div className="curriculum-toolbar">
        <div>
          <h3>{query ? 'Search results' : showWorkshops ? 'Workshop library' : 'Course modules'}</h3>
          <p>{query ? `Matching lessons for “${search.trim()}”` : showWorkshops ? 'Optional hands-on projects for extra practice.' : 'Follow the modules in order, or revisit any lesson whenever you need.'}</p>
        </div>
        {showWorkshops && !query && <button className="btn ghost workshop-back" onClick={() => setShowWorkshops(false)}><span aria-hidden="true">←</span> Course modules</button>}
        <label className="lesson-search">
          <Icon.search size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search all lessons" aria-label="Search all lessons" />
          {search && <button onClick={() => setSearch('')} aria-label="Clear search">×</button>}
        </label>
      </div>

      {searchResults ? (
        <div className="course-lesson-list search-results">
          {searchResults.length ? searchResults.map((lesson) => renderLesson(lesson, { isCore: coreIds.has(lesson.id) })) : (
            <div className="empty-search"><span>⌕</span><strong>No matching lessons</strong><p>Try a topic like “LED”, “current”, “breadboard”, or “logic”.</p></div>
          )}
        </div>
      ) : showWorkshops ? (
        <>
          <div className="workshop-summary"><span><Icon.library size={16} /> {workshops.length} optional workshops</span><span>{finishedWorkshops} completed</span></div>
          <div className="course-lesson-list workshop-list">
            {workshops.map((lesson) => renderLesson(lesson, { isCore: false }))}
          </div>
        </>
      ) : (
        <div className="curriculum-explorer">
          <nav className="module-nav" aria-label="Course modules">
            <div className="module-nav-label">LEARNING PATH</div>
            {MODULES.map((module, i) => {
              const complete = module.lessons.filter((id) => progress[id]).length;
              const isComplete = complete === module.lessons.length;
              return (
                <button key={module.title} className={`module-nav-item${moduleIndex === i ? ' active' : ''}${isComplete ? ' complete' : ''}`} aria-current={moduleIndex === i ? 'step' : undefined} onClick={() => setModuleIndex(i)}>
                  <span className="module-nav-number">{isComplete ? '✓' : `0${i + 1}`}</span>
                  <span className="module-nav-text"><strong>{module.title}</strong><small>{complete} of 3 lessons</small></span>
                  <span className="module-nav-arrow" aria-hidden="true">›</span>
                </button>
              );
            })}
            <button className="workshop-nav-button" onClick={() => setShowWorkshops(true)}>
              <span className="workshop-nav-icon"><Icon.library size={16} /></span>
              <span><strong>Workshop library</strong><small>{workshops.length} extra projects</small></span>
              <span aria-hidden="true">→</span>
            </button>
          </nav>

          <section className="module-detail" aria-live="polite">
            <div className="module-detail-head">
              <div>
                <span className="module-kicker">MODULE {String(moduleIndex + 1).padStart(2, '0')} · 3 LESSONS</span>
                <h3>{activeModule.title}</h3>
                <p>{activeModule.description}</p>
              </div>
              <div className="module-completion">
                <strong>{activeModule.lessons.filter((id) => progress[id]).length}/3</strong>
                <span>complete</span>
              </div>
            </div>
            <div className="course-lesson-list">
              {activeModule.lessons.map((id) => {
                const lesson = LESSONS.find((item) => item.id === id);
                return lesson ? renderLesson(lesson, { isCore: true }) : null;
              })}
            </div>
            <div className="module-footer-note"><Icon.learn size={15} /><span>Tip: read each step, answer the quick check, then use <b>Next</b> to continue.</span></div>
          </section>
        </div>
      )}
    </div>
  );
}
function GuideTab({ type, onType, onPlace }) {
  const entries = useMemo(() => Object.values(CATALOG).filter((d) => GUIDES[d.id]), []);
  const def = CATALOG[type] ?? entries[0];
  const g = GUIDES[def.id];

  return (
    <div className="guide">
      <nav className="guide-list" aria-label="Components">
        {entries.map((d) => (
          <button key={d.id} aria-current={d.id === def.id} onClick={() => onType(d.id)}>
            <PartIcon type={d.id} size={18} />{d.name}
          </button>
        ))}
      </nav>
      <div className="guide-detail">
        <header>
          <span className="big"><PartIcon type={def.id} size={30} /></span>
          <div>
            <h3>{def.name}</h3>
            <p>{def.group}</p>
          </div>
          {!def.board && <button className="btn primary" onClick={() => onPlace(def.id)}>Add to board</button>}
        </header>
        <h4>What it is</h4>
        <p>{g.what}</p>
        <h4>How to use it</h4>
        <ul>{g.how.map((t) => <li key={t}><Inline text={t} /></li>)}</ul>
        <h4>Watch out for</h4>
        <ul className="warn">{g.watch.map((t) => <li key={t}><Inline text={t} /></li>)}</ul>
        {g.formula && <div className="formula-box">{g.formula}</div>}
      </div>
    </div>
  );
}

function CheatTab() {
  return (
    <div className="cheat">
      <Anatomy />
      <div className="col">
        <LedCalculator />
        <ColorReader />
      </div>
      <Formulas />
    </div>
  );
}

const TABS = [['lessons', 'Lessons'], ['guide', 'Component guide'], ['cheat', 'Cheat sheet']];

export default function LearnHub({ tab, guideType, progress, onTab, onGuideType, onStartLesson, onPlace, onClose }) {
  const coreIds = new Set(CORE_LESSON_ORDER);
  const finished = CORE_LESSON_ORDER.filter((id) => progress[id]).length;
  const workshopCount = LESSONS.filter((lesson) => !coreIds.has(lesson.id)).length;
  return (
    <div className="hub-backdrop" onClick={onClose}>
      <div className="hub glass" role="dialog" aria-modal="true" aria-label="Learn" onClick={(e) => e.stopPropagation()}>
        <div className="hub-head">
          <div>
            <h2>Learn electronics</h2>
            <p>{finished} of 12 core lessons complete · {workshopCount} optional workshops</p>
          </div>
          <div className="seg">
            {TABS.map(([id, label]) => (
              <button key={id} aria-pressed={tab === id} onClick={() => onTab(id)}>{label}</button>
            ))}
          </div>
          <button className="btn icon ghost" onClick={onClose} aria-label="Close"><Icon.close size={17} /></button>
        </div>
        <div className="hub-body">
          {tab === 'lessons' && <LessonsTab progress={progress} onStart={onStartLesson} />}
          {tab === 'guide' && <GuideTab type={guideType} onType={onGuideType} onPlace={onPlace} />}
          {tab === 'cheat' && <CheatTab />}
        </div>
      </div>
    </div>
  );
}
