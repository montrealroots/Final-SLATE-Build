import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { PRONOUNS, languageName, searchHeritages, searchLanguages, settledTitle } from '../data/identity';
import { findPlace, isCatalogPlace, placeLabel, type Place } from '../data/places';
import { CREATION_STEPS, ageOn, creationStepIndex, formatZoneAbbrev, parseYmd, validateDraft, type DraftProblem } from '../engine';
import type { CreationDraft, CreationStepId, Proficiency } from '../engine/types';
import { Field, Professions, SelectField, TextField } from './components';
import { store, useStore } from './store';
import { WorldPlacePicker } from './WorldPicker';

const PROFICIENCIES: Proficiency[] = ['Native', 'Fluent', 'Conversational', 'Basic'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
type Set = (patch: Partial<CreationDraft>) => void;

/** Age on the starting date, once both dates are whole. */
function ageAtStart(d: CreationDraft): number | null {
  return /^\d{4}-\d{2}-\d{2}$/.test(d.birthDate) && /^\d{4}-\d{2}-\d{2}$/.test(d.startDate) ? ageOn(parseYmd(d.birthDate), parseYmd(d.startDate)) : null;
}

/**
 * Character creation, laid out as 1221's (`ui/creation/CharacterCreation.tsx`): the steps as a row across the top, each
 * step's cards, and Back and Next under them. Only what Final SLATE's engine keeps is asked: 1221's portrait, middle and
 * preferred names, dispositions and traits, genres, body, money and citizenship are 1221's systems, not this game's.
 */
export function Creation() {
  const s = useStore();
  const d = s.draft!;
  const [shown, setShown] = useState<DraftProblem[]>([]);
  const [beginError, setBeginError] = useState<string | null>(null);
  const step = d.step;
  const index = creationStepIndex(step);
  const prev = CREATION_STEPS[index - 1];
  const next = CREATION_STEPS[index + 1];
  const set: Set = (patch) => store.updateDraft(patch);
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
  const h1 = (text: string, line: string) => (
    <div className="panel-head">
      <div>
        <h1 id="creation-h" ref={heading} tabIndex={-1} style={{ fontSize: 'var(--size-lg)' }}>{text}</h1>
        <p className="muted small" style={{ margin: 0 }}>{line}</p>
      </div>
    </div>
  );

  return (
    <div className="start-page">
      <div className="creation" style={{ padding: 0 }}>
        <div className="row-between" style={{ marginBottom: 'var(--s5)', alignItems: 'flex-start' }}>
          <div className="row gap-2" style={{ alignItems: 'flex-start' }}>
            <span role="img" aria-label="SLATE" style={{ fontSize: 22 }}>🎬</span>
            <div>
              <div className="eyebrow">New Game</div>
              <div className="creation-title">Who Are You Going To Be?</div>
              <p className="muted small" style={{ marginTop: 2 }}>Here you create the screenwriter, producer, director and {(d.actingTitle || 'actor').toLowerCase()} you’ll play.</p>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => store.backToStartup()}>Cancel</button>
        </div>
        <div className="creation-steps" role="list" aria-label="Character Creation Steps">
          {CREATION_STEPS.map((p, i) => (
            <div key={p.id} className="creation-step" role="listitem" aria-current={p.id === step ? 'step' : undefined} data-state={p.id === step ? 'active' : i < index ? 'done' : 'waiting'}>
              {p.title.replace(' & ', ' & ')}
            </div>
          ))}
        </div>

        {step === 'identity' && <IdentityStep d={d} set={set} err={err} head={h1('Identity', 'Your name is the one your credits carry. Your pronouns decide how you’re billed: He/Him as Actor, She/Her as Actress, and with They/Them you choose.')} />}
        {step === 'background' && (
          <div className="col gap-5">
            <section className="card">
              {h1('Background', 'Who you come from. Choose as many backgrounds as are true, or describe your own.')}
              <HeritageStep d={d} set={set} error={err('heritages')} />
            </section>
            <section className="card">
              <div className="panel-head"><div><h2>Languages</h2><p className="muted small" style={{ margin: 0 }}>The language you use most, and any others you speak.</p></div></div>
              <LanguageStep d={d} set={set} error={err('mainLanguage')} />
            </section>
          </div>
        )}
        {step === 'starting-point' && <StartingPointStep d={d} set={set} err={err} head={h1('Where You Live', 'Where your story begins decides whose holidays you keep, the weather you shoot in and how far everything is.')} />}
        {step === 'review' && <Review d={d} edit={(id) => goto(id, true)} heading={heading} />}

        {beginError && <div className="callout callout-negative" role="alert" style={{ marginTop: 'var(--s5)' }}>{beginError}</div>}

        <div className="row-between wrap creation-foot">
          {prev ? (
            <button className="btn" onClick={() => goto(prev.id)}>Back To {prev.title}</button>
          ) : (
            <button className="btn" onClick={() => store.backToStartup()}>Back To Start Screen</button>
          )}
          <div className="row gap-2 wrap">
            {d.returnToReview && step !== 'review' && <button className="btn" onClick={() => leaveTo('review')}>Save And Return To Review</button>}
            {next && <button className="btn btn-primary" onClick={() => leaveTo(next.id)}>Next: {next.title}</button>}
            {step === 'review' && (
              <button className="btn btn-primary btn-lg" onClick={() => {
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
        </div>
        <p className="dim xs center" style={{ marginTop: 'var(--s5)' }}>Your choices are saved as you go.</p>
      </div>
    </div>
  );
}

/** Identity, as 1221's: name and pronouns, Billed As, the date of birth in three fields, the place of birth, the age. */
function IdentityStep({ d, set, err, head }: { d: CreationDraft; set: Set; err: (f: string) => string | null; head: ReactNode }) {
  const [y = '', m = '', day = ''] = d.birthDate.split('-');
  const setBirth = (yy: string, mm: string, dd: string) => set({ birthDate: yy || mm || dd ? `${yy}-${mm}-${dd}` : '' });
  const age = ageAtStart(d);
  const billedError = err('actingTitle');
  const settled = settledTitle(d.pronouns);
  return (
    <section className="card">
      {head}
      <div className="field-row">
        <TextField label="Name" value={d.name} maxLength={80} autoComplete="off" error={err('name')} hint="The name people know you by, and the one your credits carry." onChange={(v) => set({ name: v })} />
        <SelectField label="Pronouns" value={d.pronouns} error={err('pronouns')}
          options={[{ value: '', label: 'Choose Pronouns' }, ...(['she', 'he', 'they'] as const).map((k) => ({ value: k, label: PRONOUNS[k].label }))]}
          // The title moves with the pronouns: settled where they settle it, and cleared where they don't, so a pick made
          // under They/Them can't survive behind He/Him (as 1221's Identity step does).
          onChange={(v) => set({ pronouns: v, actingTitle: settledTitle(v) ?? '' })} />
      </div>
      <div className="field">
        <span className="label" id="billed-as">Billed As</span>
        {settled ? (
          <>
            <output className="settled-title" aria-labelledby="billed-as">{settled}</output>
            <p className="xs dim" style={{ marginTop: 4 }}>Your pronouns decide this, so there’s nothing to pick. Change your pronouns and it changes too.</p>
          </>
        ) : (
          <>
            <div className="row gap-2" role="group" aria-labelledby="billed-as">
              {(['Actor', 'Actress'] as const).map((t) => (
                <button key={t} type="button" className="trait grow" aria-pressed={d.actingTitle === t} disabled={!d.pronouns} onClick={() => set({ actingTitle: t })}>
                  <div className="trait-name">{t}</div>
                </button>
              ))}
            </div>
            {billedError && <span className="error" role="alert">{billedError}</span>}
            <p className="xs dim" style={{ marginTop: 4 }}>
              {d.pronouns
                ? 'With They/Them, you choose. Actor and Actress are two words for the same craft, and neither counts for more. Awards that split their acting categories consider you under the one you pick.'
                : 'Choose your pronouns first. He/Him is billed as Actor and She/Her as Actress; with They/Them, you choose.'}
            </p>
          </>
        )}
      </div>

      <hr className="divider" />

      <div className="field-row">
        <TextField label="Year Of Birth" type="number" inputMode="numeric" value={y} onChange={(v) => setBirth(v.slice(0, 4), m, day)} />
        <SelectField label="Month" value={m} options={[{ value: '', label: 'Choose A Month' }, ...MONTHS.map((name, i) => ({ value: String(i + 1).padStart(2, '0'), label: name }))]} onChange={(v) => setBirth(y, v, day)} />
        <TextField label="Day" type="number" inputMode="numeric" value={day ? String(Number(day)) : ''} onChange={(v) => setBirth(y, m, v ? v.slice(0, 2).padStart(2, '0') : '')} />
      </div>
      {err('birthDate') ? <p className="error" role="alert" style={{ color: 'var(--negative)' }}>{err('birthDate')}</p> : <p className="xs dim">You must be at least 16 on your starting date.</p>}

      <hr className="divider" />

      <div className="panel-head">
        <div>
          <h3>Place Of Birth</h3>
          <p className="muted small" style={{ margin: 0 }}>Where you’re from, which isn’t always where you live now. It’s what you tell people when they ask.</p>
        </div>
      </div>
      <PlacePicker label="Place Of Birth" value={d.birthplaceId} error={err('birthplaceId')} map onChange={(id, pl) => set({ birthplaceId: id, places: keepPlaces(d, 'birthplaceId', pl) })} />

      {age !== null && age >= 0 && (
        <div className="callout" style={{ marginTop: 'var(--s4)' }}>You’ll be <strong>{age}</strong> when you start.</div>
      )}
    </section>
  );
}

/** Starting Point, as 1221's: where you live (where you were born, or somewhere else), what that place is, and when it begins. */
function StartingPointStep({ d, set, err, head }: { d: CreationDraft; set: Set; err: (f: string) => string | null; head: ReactNode }) {
  const birthplace = findPlace(d.birthplaceId);
  const city = findPlace(d.startPlaceId);
  const [elsewhere, setElsewhere] = useState(!d.startPlaceId || d.startPlaceId !== d.birthplaceId);
  const zoneAt = (() => {
    if (!city || !/^\d{4}-\d{2}-\d{2}$/.test(d.startDate)) return null;
    const { year, month, day } = parseYmd(d.startDate);
    return formatZoneAbbrev(Date.UTC(year, month - 1, day, 12), city.zone);
  })();
  return (
    <div className="col gap-5">
      <section className="card">
        {head}
        {birthplace && (
          <label className="check" htmlFor="live-here">
            <input id="live-here" type="checkbox" checked={!elsewhere} onChange={(e) => {
              if (e.target.checked) { setElsewhere(false); set({ startPlaceId: birthplace.id, places: keepPlaces(d, 'startPlaceId', birthplace) }); }
              else setElsewhere(true);
            }} />
            <span>I Still Live Where I Was Born<span className="dim"> — {placeLabel(birthplace)}</span></span>
          </label>
        )}
        {(elsewhere || !birthplace) && (
          <PlacePicker label="Where You Live" value={d.startPlaceId} error={err('startPlaceId')} map onChange={(id, pl) => set({ startPlaceId: id, places: keepPlaces(d, 'startPlaceId', pl) })} />
        )}
        {!elsewhere && err('startPlaceId') && <p className="error" role="alert" style={{ color: 'var(--negative)' }}>{err('startPlaceId')}</p>}
        {city && (
          <div className="grid grid-3" style={{ marginTop: 'var(--s4)' }}>
            <div className="stat">
              <span className="stat-label">Place</span>
              <span className="stat-value" style={{ fontSize: 'var(--size-md)' }}>{city.name}</span>
              <span className="stat-note">{[city.region !== city.name ? city.region : '', city.countryName].filter(Boolean).join(', ')}</span>
            </div>
            {typeof city.population === 'number' && city.population > 0 && (
              <div className="stat">
                <span className="stat-label">Population</span>
                <span className="stat-value">{city.population.toLocaleString('en')}</span>
              </div>
            )}
            <div className="stat">
              <span className="stat-label">Time Zone</span>
              <span className="stat-value" style={{ fontSize: 'var(--size-md)' }}>{zoneAt ?? city.zone}</span>
              <span className="stat-note">{city.zone}</span>
            </div>
          </div>
        )}
      </section>
      <section className="card">
        <div className="panel-head"><div><h2>When It Begins</h2><p className="muted small" style={{ margin: 0 }}>The date and the local time where you live when your story starts. Any date in 2026.</p></div></div>
        <div className="field-row">
          <TextField label="Starting Date" type="date" value={d.startDate} error={err('startDate')} onChange={(v) => set({ startDate: v })} />
          <TextField label="Starting Time" type="time" value={d.startTime} error={err('startTime')} hint="Local time where you start." onChange={(v) => set({ startTime: v })} />
        </div>
      </section>
    </div>
  );
}

/** Picks any playable place; world places come back with their record so the draft and save can keep them. */
export function PlacePicker(props: { label: string; value: string; error?: string | null; map?: boolean; onChange: (id: string, place: Place) => void }) {
  return <WorldPlacePicker label={props.label} value={props.value} error={props.error} map={props.map} onChoose={(pl) => props.onChange(pl.id, pl)} />;
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
      <h3 className="spaced">Your Backgrounds</h3>
      {error && <p role="alert" style={{ color: 'var(--negative)' }}>{error}</p>}
      {d.heritages.length ? (
        <ul className="list">
          {d.heritages.map((h) => (
            <li key={h.id} className="row-wrap">
              <span className="grow">{h.label}{h.custom ? <span className="dim"> (in your words)</span> : null}</span>
              <button className="btn btn-sm" onClick={() => set({ heritages: d.heritages.filter((x) => x.id !== h.id) })} aria-label={`Remove ${h.label}`}>Remove</button>
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
      <h3 className="spaced">Other Languages</h3>
      {d.languages.length ? (
        <ul className="list">
          {d.languages.map((l) => (
            <li key={l.code} className="row-wrap">
              <span className="grow">{languageName(l.code)}</span>
              <div style={{ minWidth: 200 }}>
                <SelectField label={`${languageName(l.code)} Proficiency`} value={l.proficiency} options={PROFICIENCIES.map((p) => ({ value: p, label: p }))}
                  onChange={(v) => set({ languages: d.languages.map((x) => (x.code === l.code ? { ...x, proficiency: v } : x)) })} />
              </div>
              <button className="btn btn-sm" onClick={() => set({ languages: d.languages.filter((x) => x.code !== l.code) })} aria-label={`Remove ${languageName(l.code)}`}>Remove</button>
            </li>
          ))}
        </ul>
      ) : <p className="muted">No other languages added.</p>}
    </>
  );
}

/** One line of Review, as 1221's: the label on the left, the value against the right edge. */
function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="row-between" style={{ padding: '3px 0', gap: 'var(--s3)', alignItems: 'baseline' }}>
      <span className="small muted" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>{label}</span>
      <span className="small strong" style={{ textAlign: 'right' }}>{value}</span>
    </div>
  );
}

/** A Review card: what one step chose, with the button that goes back to that step. */
function ReviewCard({ title, edit, onEdit, children }: { title: string; edit: string; onEdit: () => void; children: ReactNode }) {
  return (
    <section className="card">
      <div className="row-between wrap" style={{ marginBottom: 'var(--s3)' }}>
        <h2 className="eyebrow" style={{ margin: 0 }}>{title}</h2>
        <button className="btn btn-sm" onClick={onEdit}>{edit}</button>
      </div>
      {children}
    </section>
  );
}

/** Review, as 1221's: who you'll be at the top, then each step's choices in its own card. */
function Review({ d, edit, heading }: { d: CreationDraft; edit: (id: CreationStepId) => void; heading: RefObject<HTMLHeadingElement | null> }) {
  const birth = findPlace(d.birthplaceId);
  const start = findPlace(d.startPlaceId);
  const age = ageAtStart(d);
  const born = /^\d{4}-\d{2}-\d{2}$/.test(d.birthDate) ? (() => { const b = parseYmd(d.birthDate); return `${MONTHS[b.month - 1]} ${b.day}, ${b.year}`; })() : 'Not chosen';
  const starts = /^\d{4}-\d{2}-\d{2}$/.test(d.startDate) ? (() => { const b = parseYmd(d.startDate); return `${MONTHS[b.month - 1]} ${b.day}, ${b.year} at ${d.startTime}`; })() : 'Not chosen';
  return (
    <div className="col gap-5">
      <section className="card">
        <div className="center" style={{ padding: 'var(--s4) 0' }}>
          <div className="eyebrow">Ready To Begin</div>
          <h1 id="creation-h" ref={heading} tabIndex={-1} style={{ fontSize: 'var(--size-2xl)', margin: 'var(--s2) 0' }}>{d.name || 'Unnamed'}</h1>
          <p className="muted">{[age !== null ? String(age) : '', d.actingTitle, start?.name].filter(Boolean).join(' · ')}</p>
          <div className="row" style={{ justifyContent: 'center' }}><Professions actingTitle={d.actingTitle} /></div>
        </div>
      </section>
      <div className="grid grid-2">
        <ReviewCard title="Identity" edit="Edit Identity" onEdit={() => edit('identity')}>
          <Line label="Name" value={d.name || 'Not chosen'} />
          <Line label="Pronouns" value={d.pronouns ? PRONOUNS[d.pronouns].label : 'Not chosen'} />
          <Line label="Billed As" value={d.actingTitle || 'Not chosen'} />
          <Line label="Born" value={born} />
          <Line label="Place Of Birth" value={birth ? placeLabel(birth) : 'Not chosen'} />
        </ReviewCard>
        <ReviewCard title="Starting Point" edit="Edit Starting Point" onEdit={() => edit('starting-point')}>
          <Line label="Where You Live" value={start ? placeLabel(start) : 'Not chosen'} />
          <Line label="Starts On" value={starts} />
          {age !== null && <Line label="Age At The Start" value={String(age)} />}
        </ReviewCard>
      </div>
      <ReviewCard title="Background & Languages" edit="Edit Background And Languages" onEdit={() => edit('background')}>
        <Line label="Backgrounds" value={d.heritages.map((h) => h.label).join(', ') || 'None added'} />
        <Line label="Main Language" value={d.mainLanguage ? languageName(d.mainLanguage) : 'Not chosen'} />
        <Line label="Other Languages" value={d.languages.map((l) => `${languageName(l.code)} (${l.proficiency.toLowerCase()})`).join(', ') || 'None'} />
      </ReviewCard>
      <div className="callout callout-accent">
        Once you start, the clock runs while you play. Sleep and Advance move it on faster, and Advance stops early if something needs you.
      </div>
    </div>
  );
}
