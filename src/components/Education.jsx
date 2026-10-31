import { useEffect, useId, useRef, useState } from 'react';
import { educationData, certificationsData } from '../data/portfolioData';
import EducationElectricity from './EducationElectricity';
import { updateCircuitMotion } from '../lib/educationCircuit.js';

const labelFor = item => typeof item === 'string' ? item : item?.title || item?.name || item?.label || item?.code || '';
const validCredential = value => typeof value === 'string' && /^https?:\/\//i.test(value);

function CourseList({ items = [] }) {
  const courses = items.filter(item => labelFor(item));
  if (!courses.length) return null;
  return (
    <ul className="education-course-list">
      {courses.map((course, index) => (
        <li key={course.id || `${labelFor(course)}-${index}`}>
          {typeof course === 'object' && course.code && course.code !== labelFor(course) && <span className="education-module-code">{course.code}</span>}
          <span>{labelFor(course)}</span>
          {course.type && <span className="education-module-type">{course.type}</span>}
          {course.credits != null && <span className="education-module-credits">{course.credits} credits</span>}
          {course.description && <p>{course.description}</p>}
        </li>
      ))}
    </ul>
  );
}

function SemesterDetails({ semesters }) {
  const selectId = useId();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = semesters[selectedIndex] || semesters[0];
  if (!selected) return null;
  const title = labelFor(selected) || `Semester ${selectedIndex + 1}`;
  return (
    <details className="education-semesters education-details">
      <summary>Semester breakdown</summary>
      <div className="education-semester-select">
        <label htmlFor={selectId}>View semester</label>
        <select id={selectId} value={selectedIndex} onChange={event => setSelectedIndex(Number(event.target.value))}>
          {semesters.map((semester, index) => (
            <option key={semester.id || index} value={index}>{labelFor(semester) || `Semester ${index + 1}`}</option>
          ))}
        </select>
      </div>
      <div className="education-semester-content" aria-live="polite">
        <h5>{title}</h5>
        {selected.summary && <p>{selected.summary}</p>}
        <CourseList items={selected.courses || selected.items || selected.modules || []} />
      </div>
    </details>
  );
}

function EducationCard({ entry, index }) {
  const title = entry.qualification || entry.title || entry.name;
  const institution = entry.institution || entry.issuer;
  const metadata = [
    [entry.issuer && !entry.institution ? 'Issuer' : 'Institution', institution],
    ['Location', entry.location],
    ['Period', entry.period || entry.date],
  ].filter(([, value]) => value);
  const curriculum = entry.curriculum || [];
  const semesters = entry.semesters || [];
  const highlights = entry.highlights || [];
  return (
    <article className="education-card timeline-item" style={{ '--card-delay': `${Math.min(index, 6) * 80}ms` }}>
      {(entry.level || entry.category || entry.status) && (
        <div className="education-card-topline">
          {(entry.level || entry.category) && <span className="education-level">{entry.level || entry.category}</span>}
          {entry.status && <span className="education-status">{entry.status}</span>}
        </div>
      )}
      <h4>{title}</h4>
      {metadata.length > 0 && (
        <dl className="education-meta">
          {metadata.map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>
      )}
      {entry.summary && <p className="education-summary">{entry.summary}</p>}
      {highlights.length > 0 && (
        <ul className="education-highlights" aria-label="Topics and skills">
          {highlights.map((highlight, highlightIndex) => (
            <li key={`${labelFor(highlight)}-${highlightIndex}`}>{labelFor(highlight)}</li>
          ))}
        </ul>
      )}
      {curriculum.map((group, groupIndex) => (
        <details className="education-details" key={group.id || groupIndex}>
          <summary>{labelFor(group) || 'Coursework'}</summary>
          {group.summary && <p>{group.summary}</p>}
          <CourseList items={group.items || group.courses || group.modules || []} />
        </details>
      ))}
      {semesters.length > 0 && <SemesterDetails semesters={semesters} />}
      {validCredential(entry.credentialUrl) && (
        <a className="education-credential" href={entry.credentialUrl} target="_blank" rel="noopener noreferrer"
          aria-label={`View credential for ${title}`}>View credential</a>
      )}
    </article>
  );
}

function CircuitCardGroup({ entries, layout = 'timeline', label = 'Education timeline' }) {
  const timelineRef = useRef(null);
  const timeoutRef = useRef(null);
  const motionRef = useRef(null);
  const touchedEntryRef = useRef(null);
  const axisRef = useRef('y');
  const [energized, setEnergized] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [direction, setDirection] = useState('down');
  useEffect(() => () => clearTimeout(timeoutRef.current), []);
  const entryIndex = (target, x, y) => {
    const entry = target.closest?.('.education-timeline-entry');
    if (entry) return Number(entry.dataset.educationIndex);
    if (!Number.isFinite(y)) return 0;
    // Crossing a wrapped-row gutter must not count as visiting a third card.
    if (layout === 'grid' && motionRef.current) return motionRef.current.index;
    const positions = [...timelineRef.current.children].map(item => {
      const rect = item.getBoundingClientRect();
      const dy = y - rect.top - rect.height / 2;
      return layout === 'grid' ? Math.hypot(x - rect.left - rect.width / 2, dy) : Math.abs(dy);
    });
    return positions.indexOf(Math.min(...positions));
  };
  const track = (y, index) => {
    const next = updateCircuitMotion(motionRef.current, y, index);
    if (motionRef.current?.direction !== next.direction) setDirection(next.direction);
    motionRef.current = next;
  };
  const trackPointer = event => {
    const [first, second] = timelineRef.current.children;
    const axis = layout === 'grid' && second && Math.abs(first.offsetTop - second.offsetTop) < 2 ? 'x' : 'y';
    if (axis !== axisRef.current) motionRef.current = null;
    axisRef.current = axis;
    track(axis === 'x' ? event.clientX : event.clientY, entryIndex(event.target, event.clientX, event.clientY));
  };
  const enter = event => {
    if (event.pointerType !== 'mouse') return;
    motionRef.current = null;
    trackPointer(event);
    setHovered(true);
  };
  const move = event => {
    if (event.pointerType === 'mouse') trackPointer(event);
  };
  const leave = event => {
    if (event.pointerType !== 'mouse') return;
    motionRef.current = null;
    setHovered(false);
  };
  const energize = event => {
    if (event.pointerType === 'mouse') return;
    const index = entryIndex(event.target, event.clientX, event.clientY);
    setDirection(touchedEntryRef.current === null ? (index > 0 ? 'up' : 'down') : (index >= touchedEntryRef.current ? 'down' : 'up'));
    touchedEntryRef.current = index;
    motionRef.current = null;
    clearTimeout(timeoutRef.current);
    setEnergized(true);
    timeoutRef.current = window.setTimeout(() => setEnergized(false), 1800);
  };
  const focus = event => {
    const keyboardFocus = event.target.matches(':focus-visible');
    setFocused(keyboardFocus);
    if (keyboardFocus) {
      motionRef.current = null;
      track(null, entryIndex(event.target));
    }
  };
  const blur = event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
  };
  const key = event => {
    const arrows = layout === 'grid' ? ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'] : ['ArrowUp', 'ArrowDown'];
    if (event.target !== event.currentTarget || !arrows.includes(event.key)) return;
    event.preventDefault();
    setFocused(true);
    const nextDirection = ['ArrowUp', 'ArrowLeft'].includes(event.key) ? 'up' : 'down';
    setDirection(nextDirection);
    if (motionRef.current) motionRef.current = { ...motionRef.current, direction: nextDirection };
  };
  return (
    <div className={`education-timeline-wrap${layout === 'grid' ? ' education-certification-wrap' : ''}`} role="group" tabIndex={entries.length > 1 ? 0 : undefined}
      aria-label={`${label}. Use ${layout === 'grid' ? 'the arrow keys' : 'the up and down arrow keys'} to change circuit direction.`}
      onPointerEnter={enter} onPointerMove={move} onPointerLeave={leave} onPointerDown={energize}
      onFocusCapture={focus} onBlurCapture={blur} onKeyDown={key}>
      {entries.length > 1 && <EducationElectricity timelineRef={timelineRef} count={entries.length}
        active={hovered || focused || energized} direction={direction} layout={layout} />}
      <ol className={layout === 'grid' ? 'education-certification-grid' : 'education-timeline'} ref={timelineRef}>
        {entries.map((entry, index) => (
          <li className="education-timeline-entry" key={entry.id || index} data-education-index={index}>
            <EducationCard entry={entry} index={index} />
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function Education({ education = educationData, certifications = certificationsData } = {}) {
  return (
    <section id="education" className="education" aria-labelledby="education-heading">
      <header className="education-header">
        <h2 className="heading" id="education-heading">Education &amp; <span>Certifications</span></h2>
        <p>My academic journey and continued learning.</p>
      </header>
      <div className="education-groups">
        <div className="education-group" aria-labelledby="education-study-heading">
          <h3 className="education-group-title" id="education-study-heading">Education</h3>
          {education.length > 0 ? (
            <CircuitCardGroup entries={education} />
          ) : <p className="education-empty">No education details listed yet.</p>}
        </div>
        <div className="education-group education-certifications" aria-labelledby="education-certifications-heading">
          <h3 className="education-group-title" id="education-certifications-heading">Certifications &amp; Achievements</h3>
          {certifications.length > 0 ? (
            <CircuitCardGroup entries={certifications} layout="grid" label="Certifications and achievements" />
          ) : <p className="education-empty">No certifications listed yet.</p>}
        </div>
      </div>
    </section>
  );
}
