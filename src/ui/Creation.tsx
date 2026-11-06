import { useLayoutEffect, useRef, useState } from 'react';
import { PRONOUNS, defaultActingTitle, languageName, searchHeritages, searchLanguages } from '../data/identity';
import { findPlace, isCatalogPlace, placeLabel, type Place } from '../data/places';
import { CREATION_STEPS, ageOn, creationStep, creationStepIndex, parseYmd, validateDraft, type DraftProblem } from '../engine';
import type { CreationDraft, CreationStepId, Proficiency } from '../engine/types';
import { Field, Professions, SelectField, TextField, Wordmark } from './components';
import { store, useStore } from './store';
import { WorldPlacePicker } from './WorldPicker';

// Section names and order from the 1221 adaptation (UI-1221-ADAPTATION.md); the order lives in CREATION_STEPS.
const DESCRIPTIONS: Record<CreationStepId, string> = {
  name: 'Choose the name people will know you by.',
  pronouns: "Choose how you'd like to be referred to, and the title you'd like as an actor.",
  background: 'Choose as many backgrounds as you need. You can describe your own.',
  languages: 'Choose the language you use most and any others you know.',
  birthday: 'Choose when and where you were born.',
  'start-date': 'Choose the date and local time your story begins. Any date in 2026.',
  'start-location': 'Choose where your story begins.',
  review: 'Take a look before you start. You can go back and change any choice.',
};
const PROFICIENCIES: Proficiency[] = ['Native', 'Fluent', 'Conversational', 'Basic'];

export function Creation() {
  const s = useStore();
  const d = s.draft!;
  const [shown, setShown] = useState<DraftProblem[]>([]);
  const [beginError, setBeginError] = useState<string | null>(null);
  const step = d.step;
  const index = creationStepIndex(step);
  const prev = CREATION_STEPS[index - 1];
  const next = CREATION_STEPS[index + 1];
  const set = (patch: Partial<CreationDraft>) => store.updateDraft(patch);
  const current = validateDraft(d);
  // Errors appear after a Next attempt and clear as soon as the field becomes valid.
  const err = (field: string) => (shown.some((p) => p.field === field) ? current.find((p) => p.field === field)?.message ?? null : null);

  // A new screen takes focus at its heading as it is shown, in the same commit, never a frame later: a deferred move
  // used to pull focus out of a field the player had already chosen, and what they typed next was lost (WebKit).
  const heading = useRef<HTMLHeadingElement>(null);
  const shownStep = useRef(step);
  useLayoutEffect(() => {
    if (shownStep.current !== step) heading.current?.focus();
    shownStep.current = step;
  }, [step]);

  /** Show another screen; `problems` are the messages to show there (none by default). */
  const goto = (id: CreationStepId, fromReview = false, problems: DraftProblem[] = []) => {
    setShown(problems);
    set({ step: id, returnToReview: id === 'review' ? undefined : fromReview || d.returnToReview || undefined });
  };
  /** Leaves this screen for another only if this screen's own choices are complete. */
  const leaveTo = (id: CreationStepId) => {
    const problems = validateDraft(d).filter((p) => p.step === step);
    if (problems.length) {
      setShown(problems);
      return;
    }
    goto(id);
  };

  return (
    <div className="startup">
      <div className="startup-card" style={{ width: 'min(760px, 100%)' }}>
        <Wordmark />
        <ol className="steps" aria-label="Character Creation Steps">
          {CREATION_STEPS.map((p, i) => <li key={p.id} aria-current={p.id === step ? 'step' : undefined}>{i + 1}. {p.title}</li>)}
        </ol>
        <section className="panel">
          <h1 id="creation-h" ref={heading} tabIndex={-1}>{creationStep(step).title}</h1>
          <p className="muted">{DESCRIPTIONS[step]}</p>
          {step === 'name' && <TextField label="Name" value={d.name} maxLength={80} autoComplete="off" error={err('name')} onChange={(v) => set({ name: v })} />}
          {step === 'pronouns' && (
            <>
              <SelectField label="Pronouns" value={d.pronouns} error={err('pronouns')}
                options={[{ value: '', label: 'Choose Pronouns' }, ...(['he', 'she', 'they'] as const).map((k) => ({ value: k, label: PRONOUNS[k].label }))]}
                onChange={(v) => set({ pronouns: v, actingTitle: d.actingTitle || (v ? defaultActingTitle(v) : '') })} />
              <SelectField label="Acting Title" value={d.actingTitle} error={err('actingTitle')} hint="Actor can be used by anyone. Your pronouns and your title are separate choices."
                options={[{ value: '', label: 'Choose A Title' }, { value: 'Actor', label: 'Actor' }, { value: 'Actress', label: 'Actress' }]}
                onChange={(v) => set({ actingTitle: v })} />
            </>
          )}
          {step === 'background' && <HeritageStep d={d} set={set} error={err('heritages')} />}
          {step === 'languages' && <LanguageStep d={d} set={set} error={err('mainLanguage')} />}
          {step === 'birthday' && (
            <>
              <TextField label="Birth Date" type="date" value={d.birthDate} error={err('birthDate')} hint="You must be at least 16 on your starting date." onChange={(v) => set({ birthDate: v })} />
              <PlacePicker label="Birthplace" value={d.birthplaceId} error={err('birthplaceId')} onChange={(id, pl) => set({ birthplaceId: id, places: keepPlaces(d, 'birthplaceId', pl) })} />
            </>
          )}
          {step === 'start-date' && (
            <div className="grid2">
              <TextField label="Starting Date" type="date" value={d.startDate} error={err('startDate')} hint="Any date in 2026." onChange={(v) => set({ startDate: v })} />
              <TextField label="Starting Time" type="time" value={d.startTime} error={err('startTime')} hint="Local time where you start." onChange={(v) => set({ startTime: v })} />
            </div>
          )}
          {step === 'start-location' && <PlacePicker label="Starting Location" value={d.startPlaceId} error={err('startPlaceId')} onChange={(id, pl) => set({ startPlaceId: id, places: keepPlaces(d, 'startPlaceId', pl) })} />}
          {step === 'review' && <Review d={d} edit={(id) => goto(id, true)} />}
          {beginError && <p role="alert" style={{ color: 'var(--negative)' }}>{beginError}</p>}
          <div className="btn-row spread spaced">
            {prev ? (
              <button className="btn" onClick={() => goto(prev.id)}>Back To {prev.title}</button>
            ) : (
              <button className="btn" onClick={() => store.backToStartup()}>Back To Start Screen</button>
            )}
            {d.returnToReview && step !== 'review' && <button className="btn" onClick={() => leaveTo('review')}>Save And Return To Review</button>}
            {next && <button className="btn btn-primary" onClick={() => leaveTo(next.id)}>Next: {next.title}</button>}
            {step === 'review' && (
              <button className="btn btn-primary" onClick={() => {
                const problems = validateDraft(d);
                if (problems.length) {
                  // Go to the first screen with something missing, with its messages showing.
                  goto(problems[0].step, true, problems);
                  return;
                }
                void store.begin().then(setBeginError);
              }}>Start My Story</button>
            )}
          </div>
        </section>
        <p className="dim">Your choices are saved as you go.</p>
      </div>
    </div>
  );
}

/** Picks any playable place; world places come back with their record so the draft and save can keep them. */
export function PlacePicker(props: { label: string; value: string; error?: string | null; onChange: (id: string, place: Place) => void }) {
  return <WorldPlacePicker label={props.label} value={props.value} error={props.error} onChoose={(pl) => props.onChange(pl.id, pl)} />;
}

/** The draft's world places, keeping only those still chosen. */
function keepPlaces(d: CreationDraft, field: 'birthplaceId' | 'startPlaceId', place: Place): Record<string, Place> {
  const next = { ...d, [field]: place.id };
  const all = { ...(d.places ?? {}), ...(isCatalogPlace(place.id) ? {} : { [place.id]: place }) };
  return Object.fromEntries(Object.entries(all).filter(([id]) => id === next.birthplaceId || id === next.startPlaceId));
}

function HeritageStep({ d, set, error }: { d: CreationDraft; set: (p: Partial<CreationDraft>) => void; error: string | null }) {
  const [q, setQ] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);
  const results = searchHeritages(q, 12).filter((h) => !d.heritages.some((x) => x.label === h));
  return (
    <>
      <TextField label="Search Backgrounds" type="search" value={q} onChange={setQ} />
      <div className="picklist" role="group" aria-label="Background Results">
        {results.map((h) => (
          <button key={h} type="button" onClick={() => set({ heritages: [...d.heritages, { id: h, label: h, custom: false }] })} aria-label={`Add A Background: ${h}`}>
            <span>{h}</span><span className="dim">Add A Background</span>
          </button>
        ))}
        {!results.length && <p className="muted" style={{ padding: 12 }}>Nothing matches. You can describe your background below.</p>}
      </div>
      <div className="inline-form spaced">
        <TextField label="Describe Your Background" value={d.heritageCustomText} maxLength={80} error={customError} onChange={(v) => set({ heritageCustomText: v })} />
        <button className="btn" type="button" onClick={() => {
          const t = d.heritageCustomText.trim();
          if (!t) return setCustomError('Write a description first.');
          if (d.heritages.some((x) => x.label.toLowerCase() === t.toLowerCase())) return setCustomError("You've already added that.");
          setCustomError(null);
          set({ heritages: [...d.heritages, { id: `custom_${Date.now().toString(36)}`, label: t, custom: true }], heritageCustomText: '' });
        }}>Add A Background</button>
      </div>
      <h2 className="spaced">Your Backgrounds</h2>
      {error && <p role="alert" style={{ color: 'var(--negative)' }}>{error}</p>}
      {d.heritages.length ? (
        <ul className="list">
          {d.heritages.map((h) => (
            <li key={h.id} className="row">
              <span className="grow">{h.label}{h.custom ? <span className="dim"> (in your words)</span> : null}</span>
              <button className="btn btn-small" onClick={() => set({ heritages: d.heritages.filter((x) => x.id !== h.id) })} aria-label={`Remove ${h.label}`}>Remove</button>
            </li>
          ))}
        </ul>
      ) : <p className="muted">None added yet.</p>}
    </>
  );
}

function LanguageStep({ d, set, error }: { d: CreationDraft; set: (p: Partial<CreationDraft>) => void; error: string | null }) {
  const [q, setQ] = useState('');
  const [mq, setMq] = useState('');
  const mainResults = searchLanguages(mq, 8);
  const addResults = searchLanguages(q, 8).filter((l) => l.code !== d.mainLanguage && !d.languages.some((x) => x.code === l.code));
  return (
    <>
      <Field label="Which language do you use most?" error={error} hint={d.mainLanguage ? `Chosen: ${languageName(d.mainLanguage)}` : 'Search, then choose one.'}>
        {(id, db) => (
          <>
            <input id={id} type="search" value={mq} aria-describedby={db} aria-invalid={!!error} onChange={(e) => setMq(e.target.value)} />
            <div className="picklist" role="group" aria-label="Language You Use Most Results">
              {mainResults.map((l) => (
                <button key={l.code} type="button" aria-pressed={l.code === d.mainLanguage} onClick={() => set({ mainLanguage: l.code, languages: d.languages.filter((x) => x.code !== l.code) })}>{l.name}</button>
              ))}
            </div>
          </>
        )}
      </Field>
      <TextField label="Add Language" type="search" value={q} onChange={setQ} hint="Search for other languages you know." />
      <div className="picklist" role="group" aria-label="Additional Language Results">
        {addResults.map((l) => (
          <button key={l.code} type="button" onClick={() => set({ languages: [...d.languages, { code: l.code, proficiency: 'Conversational' }] })} aria-label={`Add Language: ${l.name}`}>
            <span>{l.name}</span><span className="dim">Add Language</span>
          </button>
        ))}
      </div>
      <h2 className="spaced">Other Languages</h2>
      {d.languages.length ? (
        <ul className="list">
          {d.languages.map((l) => (
            <li key={l.code} className="row">
              <span className="grow">{languageName(l.code)}</span>
              <div style={{ minWidth: 200 }}>
                <SelectField label={`${languageName(l.code)} Proficiency`} value={l.proficiency} options={PROFICIENCIES.map((p) => ({ value: p, label: p }))}
                  onChange={(v) => set({ languages: d.languages.map((x) => (x.code === l.code ? { ...x, proficiency: v } : x)) })} />
              </div>
              <button className="btn btn-small" onClick={() => set({ languages: d.languages.filter((x) => x.code !== l.code) })} aria-label={`Remove ${languageName(l.code)}`}>Remove</button>
            </li>
          ))}
        </ul>
      ) : <p className="muted">No other languages added.</p>}
    </>
  );
}

/** What Review shows, each with the one screen where it is changed. */
const REVIEW_ROWS: { label: string; step: CreationStepId; edit: string }[] = [
  { label: 'Name', step: 'name', edit: 'Edit Name' },
  { label: 'Pronouns', step: 'pronouns', edit: 'Edit Pronouns And Acting Title' },
  { label: 'Backgrounds', step: 'background', edit: 'Edit Backgrounds' },
  { label: 'Languages', step: 'languages', edit: 'Edit Languages' },
  { label: 'Born', step: 'birthday', edit: 'Edit Birth Date And Birthplace' },
  { label: 'Starts On', step: 'start-date', edit: 'Edit Starting Date And Time' },
  { label: 'Starts In', step: 'start-location', edit: 'Edit Starting Location' },
];

function Review({ d, edit }: { d: CreationDraft; edit: (id: CreationStepId) => void }) {
  const birth = findPlace(d.birthplaceId);
  const start = findPlace(d.startPlaceId);
  const age = /^\d{4}-\d{2}-\d{2}$/.test(d.birthDate) && /^\d{4}-\d{2}-\d{2}$/.test(d.startDate) ? ageOn(parseYmd(d.birthDate), parseYmd(d.startDate)) : null;
  const value: Record<CreationStepId, string> = {
    name: d.name || 'Not chosen',
    pronouns: `${d.pronouns ? PRONOUNS[d.pronouns].label : 'Not chosen'}${d.actingTitle ? `; credited as ${d.actingTitle.toLowerCase()}` : ''}`,
    background: d.heritages.map((h) => h.label).join(', ') || 'None added',
    languages: `${d.mainLanguage ? `${languageName(d.mainLanguage)} (main)` : 'Not chosen'}${d.languages.map((l) => `, ${languageName(l.code)} (${l.proficiency.toLowerCase()})`).join('')}`,
    birthday: `${d.birthDate || 'Not chosen'}${birth ? ` in ${placeLabel(birth)}` : ''}${age !== null ? ` (age ${age} at the start)` : ''}`,
    'start-date': `${d.startDate} at ${d.startTime}`,
    'start-location': start ? placeLabel(start) : 'Not chosen',
    review: '',
  };
  return (
    <div className="stack">
      <div className="panel">
        <h2>{d.name || 'Unnamed'}</h2>
        <Professions actingTitle={d.actingTitle} />
        <dl className="kv review-list">
          {REVIEW_ROWS.map((r) => (
            <div key={r.step} className="review-row">
              <dt>{r.label}</dt>
              <dd>
                <span>{value[r.step]}</span>
                <button className="btn btn-small" onClick={() => edit(r.step)}>{r.edit}</button>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
