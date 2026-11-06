import { useState } from 'react';
import { PRONOUNS, defaultActingTitle, languageName, searchHeritages, searchLanguages } from '../data/identity';
import { findPlace, isCatalogPlace, placeLabel, type Place } from '../data/places';
import { ageOn, parseYmd, validateDraft, type DraftProblem } from '../engine';
import type { CreationDraft, Proficiency } from '../engine/types';
import { Field, SelectField, TextField, Wordmark } from './components';
import { store, useStore } from './store';
import { WorldPlacePicker } from './WorldPicker';

const PAGES = ['Name And Pronouns', 'Birth Date And Birthplace', 'Ethnicity And Heritage', 'Languages', 'Starting Location And Date', 'Review Character'];
const DESCRIPTIONS = [
  "Choose your name and how you'd like to be referred to.",
  'Choose when and where you were born.',
  'Choose as many backgrounds as you need. You can describe your own.',
  'Choose your main language and any others you know.',
  'Choose where your story begins and the date and local time.',
  'Take a look before you begin. You can go back and change any choice.',
];
const PROFICIENCIES: Proficiency[] = ['Native', 'Fluent', 'Conversational', 'Basic'];

export function Creation() {
  const s = useStore();
  const d = s.draft!;
  const [shown, setShown] = useState<DraftProblem[]>([]);
  const [beginError, setBeginError] = useState<string | null>(null);
  const step = Math.min(d.step, 5);
  const set = (patch: Partial<CreationDraft>) => store.updateDraft(patch);
  const current = validateDraft(d);
  // Errors appear after a Next attempt and clear as soon as the field becomes valid.
  const err = (field: string) => (shown.some((p) => p.field === field) ? current.find((p) => p.field === field)?.message ?? null : null);
  const goto = (n: number) => {
    setShown([]);
    set({ step: n });
    requestAnimationFrame(() => document.getElementById('creation-h')?.focus());
  };
  const next = () => {
    const problems = validateDraft(d).filter((p) => p.step === step);
    if (problems.length) {
      setShown(problems);
      return;
    }
    goto(step + 1);
  };

  return (
    <div className="startup">
      <div className="startup-card" style={{ width: 'min(760px, 100%)' }}>
        <Wordmark />
        <ol className="steps" aria-label="Character Creation Steps">
          {PAGES.map((p, i) => <li key={p} aria-current={i === step ? 'step' : undefined}>{i + 1}. {p}</li>)}
        </ol>
        <section className="panel">
          <h1 id="creation-h" tabIndex={-1}>{PAGES[step]}</h1>
          <p className="muted">{DESCRIPTIONS[step]}</p>
          {step === 0 && (
            <>
              <TextField label="Name" value={d.name} maxLength={80} autoComplete="off" error={err('name')} onChange={(v) => set({ name: v })} />
              <SelectField label="Pronouns" value={d.pronouns} error={err('pronouns')}
                options={[{ value: '', label: 'Choose Pronouns' }, ...(['he', 'she', 'they'] as const).map((k) => ({ value: k, label: PRONOUNS[k].label }))]}
                onChange={(v) => set({ pronouns: v, actingTitle: d.actingTitle || (v ? defaultActingTitle(v) : '') })} />
              <SelectField label="Acting Title" value={d.actingTitle} error={err('actingTitle')} hint="Actor can be used by anyone."
                options={[{ value: '', label: 'Choose A Title' }, { value: 'Actor', label: 'Actor' }, { value: 'Actress', label: 'Actress' }]}
                onChange={(v) => set({ actingTitle: v })} />
            </>
          )}
          {step === 1 && (
            <>
              <TextField label="Birth Date" type="date" value={d.birthDate} error={err('birthDate')} hint="You must be at least 16 on your starting date." onChange={(v) => set({ birthDate: v })} />
              <PlacePicker label="Birthplace" value={d.birthplaceId} error={err('birthplaceId')} onChange={(id, pl) => set({ birthplaceId: id, places: keepPlaces(d, 'birthplaceId', pl) })} />
            </>
          )}
          {step === 2 && <HeritageStep d={d} set={set} error={err('heritages')} />}
          {step === 3 && <LanguageStep d={d} set={set} error={err('mainLanguage')} />}
          {step === 4 && (
            <>
              <PlacePicker label="Starting Location" value={d.startPlaceId} error={err('startPlaceId')} onChange={(id, pl) => set({ startPlaceId: id, places: keepPlaces(d, 'startPlaceId', pl) })} />
              <div className="grid2">
                <TextField label="Starting Date" type="date" value={d.startDate} error={err('startDate')} hint="Any date in 2026." onChange={(v) => set({ startDate: v })} />
                <TextField label="Starting Time" type="time" value={d.startTime} error={err('startTime')} hint="Local time where you start." onChange={(v) => set({ startTime: v })} />
              </div>
            </>
          )}
          {step === 5 && <Review d={d} goto={goto} />}
          {beginError && <p role="alert" style={{ color: 'var(--negative)' }}>{beginError}</p>}
          <div className="btn-row spread spaced">
            {step === 0 ? (
              <button className="btn" onClick={() => store.backToStartup()}>Back To Start Screen</button>
            ) : (
              <button className="btn" onClick={() => goto(step - 1)}>Back To {PAGES[step - 1]}</button>
            )}
            {step < 4 && <button className="btn btn-primary" onClick={next}>Next: {PAGES[step + 1]}</button>}
            {step === 4 && <button className="btn btn-primary" onClick={next}>Review Character</button>}
            {step === 5 && (
              <button className="btn btn-primary" onClick={() => {
                const problems = validateDraft(d);
                if (problems.length) {
                  setShown(problems);
                  goto(problems[0].step);
                  return;
                }
                setBeginError(store.begin());
              }}>Begin</button>
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
      <Field label="Main Language" error={error} hint={d.mainLanguage ? `Chosen: ${languageName(d.mainLanguage)}` : 'Search, then choose one.'}>
        {(id, db) => (
          <>
            <input id={id} type="search" value={mq} aria-describedby={db} aria-invalid={!!error} onChange={(e) => setMq(e.target.value)} />
            <div className="picklist" role="group" aria-label="Main Language Results">
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

function Review({ d, goto }: { d: CreationDraft; goto: (n: number) => void }) {
  const birth = findPlace(d.birthplaceId);
  const start = findPlace(d.startPlaceId);
  const age = /^\d{4}-\d{2}-\d{2}$/.test(d.birthDate) && /^\d{4}-\d{2}-\d{2}$/.test(d.startDate) ? ageOn(parseYmd(d.birthDate), parseYmd(d.startDate)) : null;
  const pron = d.pronouns ? PRONOUNS[d.pronouns].label : 'Not chosen';
  return (
    <div className="stack">
      <div className="panel">
        <h2>{d.name || 'Unnamed'}</h2>
        <p className="chips"><span className="chip gold">{d.actingTitle || 'Actor'}</span><span aria-hidden="true">·</span><span className="chip gold">Screenwriter</span><span aria-hidden="true">·</span><span className="chip gold">Producer</span><span aria-hidden="true">·</span><span className="chip gold">Director</span></p>
        <dl className="kv">
          <dt>Pronouns</dt><dd>{pron}</dd>
          <dt>Born</dt><dd>{d.birthDate || 'Not chosen'}{birth ? ` in ${placeLabel(birth)}` : ''}{age !== null ? ` (age ${age} at the start)` : ''}</dd>
          <dt>Backgrounds</dt><dd>{d.heritages.map((h) => h.label).join(', ') || 'None added'}</dd>
          <dt>Languages</dt><dd>{d.mainLanguage ? `${languageName(d.mainLanguage)} (main)` : 'Not chosen'}{d.languages.map((l) => `, ${languageName(l.code)} (${l.proficiency.toLowerCase()})`).join('')}</dd>
          <dt>Starts In</dt><dd>{start ? placeLabel(start) : 'Not chosen'}</dd>
          <dt>Starts On</dt><dd>{d.startDate} at {d.startTime}</dd>
        </dl>
      </div>
      <div className="btn-row">
        <button className="btn btn-small" onClick={() => goto(0)}>Edit Name And Pronouns</button>
        <button className="btn btn-small" onClick={() => goto(1)}>Edit Birth Date And Birthplace</button>
        <button className="btn btn-small" onClick={() => goto(2)}>Edit Ethnicity And Heritage</button>
        <button className="btn btn-small" onClick={() => goto(3)}>Edit Languages</button>
        <button className="btn btn-small" onClick={() => goto(4)}>Edit Starting Location And Date</button>
      </div>
    </div>
  );
}
