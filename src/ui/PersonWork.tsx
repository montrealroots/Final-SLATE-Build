// A person's page in the catalog, as far as it is about working with them (the Creative Depth package, milestone D,
// 03-PEOPLE-CASTING-AND-HIRING.md). Their recorded credits, above this, are TMDB's and never change. This panel is the
// story's: bringing them into the save, what they can be asked to do, adding them to a project's list for a part or a
// job, and what they have done here. Everything in it that the game makes up says so.
import { useState } from 'react';
import type { PersonRecord } from '../catalog/model';
import { currentZone, dateKey, formatDateKey, money, roleLabel } from '../engine';
import { NO_JOB_FOR, asPerson, canApproach, considerFor, jobLabel, considerPerson, consideredOn, jobsOf, realId, realPerson, storyCredits, treatAsAdult, type Considered } from '../engine/guests';
import { EXPERIENCE, isAvailable } from '../engine/people';
import { productionWindow } from '../engine/hiring';
import { approvedCharacters, approvedScenes } from '../engine/projects';
import type { PerformanceMethod, Project } from '../engine/types';
import { Check, Panel, SelectField, plural } from './components';
import { store, useGame } from './store';

const STATUS: Record<string, string> = { offered: 'An offer is out', working: 'Working on it', credited: 'Credited', declined: 'The offer came to nothing', ended: 'Ended without a credit' };
const METHOD: Record<string, string> = { 'on-camera': 'on camera', voice: 'voice', 'motion-capture': 'performance capture' };

/** What they can be considered for on a project: each open part by how it is played, and each job they have a recorded credit in. */
function openings(p: Project, jobs: string[]): { key: string; label: string; c: Omit<Considered, 'personId'> }[] {
  const out: { key: string; label: string; c: Omit<Considered, 'personId'> }[] = [];
  if (jobs.includes('actor') || jobs.includes('voice-actor')) {
    for (const ch of approvedCharacters(p)) {
      if (ch.roleSize === 'background' || !approvedScenes(p).some((s) => s.participants.includes(ch.id))) continue;
      const methods: PerformanceMethod[] = p.axes.medium === 'animation' ? ['voice'] : ch.methods.filter((m): m is PerformanceMethod => m === 'on-camera' || m === 'voice' || m === 'motion-capture');
      for (const m of methods) {
        if (p.cast.some((a) => a.characterId === ch.id && a.method === m)) continue;
        out.push({ key: `part:${ch.id}:${m}`, label: `${ch.name} (${METHOD[m]})`, c: { roleId: m === 'voice' ? 'voice-actor' : 'actor', characterId: ch.id, method: m } });
      }
    }
  }
  for (const j of jobs) if (j !== 'actor' && j !== 'voice-actor') out.push({ key: `job:${j}`, label: `${jobLabel(p, j)} (a job)`, c: { roleId: j } });
  return out;
}

export function PersonWork({ record, gathered }: { record: PersonRecord; gathered: string }) {
  const g = useGame();
  const id = realId(record.id);
  const person = realPerson(g, id);
  const today = dateKey(g.now, currentZone(g));
  const [projectId, setProjectId] = useState('');
  const [opening, setOpening] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const died = record.details?.deathday && record.details.deathday <= today ? record.details.deathday : null;
  const open = g.projects.filter((p) => p.approvedDraft !== null && !p.delivered && !p.shelved);
  const subtitle = "Working with them in this story. Their recorded credits below are TMDB's and never change. Everything here is made by the game for this save: none of it is a fact about them.";
  if (died) {
    return <Panel title="In Your Story" subtitle={subtitle}><p className="muted">{record.name} died on {formatDateKey(died)}. Nobody is approached after that day; this page stays for reference.</p><Work id={id} /></Panel>;
  }
  if (!person?.rec) {
    return (
      <Panel title="In Your Story" subtitle={subtitle}>
        <p className="muted">{person ? `${record.name}'s record in your story was withdrawn when the film catalog's six months passed. Bring it back from the catalog installed now, and they can be approached again; what they did in your story is unchanged.` : `${record.name} isn't in your story yet. Consider them, and they can be asked to read for a part, offered one, or approached for a job they have a recorded credit in. Considering someone offers and costs nothing.`}</p>
        <button className="btn btn-primary" onClick={() => setErr(store.act((s) => void considerPerson(s, record, gathered)))}>{person ? `Bring Back ${record.name}'s Record` : `Consider ${record.name} For Your Projects`}</button>
        {err && <p role="alert" className="error">{err}</p>}
        <Work id={id} />
      </Panel>
    );
  }
  const jobs = jobsOf(person);
  // Recorded jobs the game has nothing to offer for (a producer's, casting), said rather than left out silently.
  const none = [...new Set(record.credits.filter((c) => (c.kind === 'crew' || c.kind === 'episode-crew') && NO_JOB_FOR.includes(c.role ?? '')).map((c) => c.role!))];
  const p = open.find((x) => x.id === projectId) ?? open[0];
  const choices = p ? openings(p, jobs) : [];
  const chosen = choices.find((x) => x.key === opening) ?? choices[0];
  const already = !!p && !!chosen && consideredOn(p).some((x) => x.personId === id && x.roleId === chosen.c.roleId && x.characterId === chosen.c.characterId);
  const check = chosen ? canApproach(g, id, chosen.c.roleId, today) : null;
  // Whether they are free for this project's weeks, by the same diary every hire is kept in.
  const win = p ? productionWindow(g, p) : null;
  const free = p && chosen && check?.ok && win ? isAvailable(g, asPerson(g, id, chosen.c.roleId), win.from, win.to, p.id) : null;
  const add = () => {
    if (!p || !chosen) return;
    const e = store.act((s) => considerFor(s, p, { personId: id, ...chosen.c }, today));
    setErr(e);
    setNote(e ? null : `${record.name} is on ${p.title}'s list for ${chosen.label.replace(' (a job)', '')}. Open its ${chosen.c.characterId ? 'Cast' : 'Crew'} page to ${chosen.c.characterId ? 'invite them to read or make an offer' : 'make an offer'}.`);
  };
  return (
    <Panel title="In Your Story" subtitle={subtitle}>
      <h3>What They Can Be Asked To Do</h3>
      {jobs.length ? (
        <ul className="list" aria-label="What They Can Be Asked To Do">
          {jobs.map((j) => {
            const sim = person.sim.jobs[j];
            const ev = person.rec!.ev[j];
            return (
              <li key={j} className="list-item">
                <span className="grow"><strong>{roleLabel(j)}</strong> <span className="chip">{EXPERIENCE[sim.exp - 1]}</span>
                  <div className="dim small">{ev ? `${plural(ev.n, 'recorded credit')} in this catalog${ev.first ? `, ${ev.first === ev.last ? `in ${ev.first}` : `${ev.first} to ${ev.last}`}` : ''}.` : 'No recorded credit of this kind: counted as new to it.'} In this story they ask about {money(sim.rate)} a day.</div>
                </span>
              </li>
            );
          })}
        </ul>
      ) : <p className="muted">The catalog records no credit for {record.name} in a job this game hires for, so there is nothing to approach them for. That isn't a judgement of them.</p>}
      {none.length > 0 && <p className="muted">The catalog also records these credits of theirs: {none.join(', ')}. This game has no job of that kind to offer, so they aren't approached for it: a job that is paid and changes nothing isn't offered.</p>}
      <p className="dim small">The level and the rate are this story's figures, drawn by the game from how many credits this catalog holds. Work it doesn't cover isn't counted. Their languages, background and nationality aren't recorded, and none is assumed.</p>
      {!person.rec.born && (
        <Check label="Treat As An Adult In This Story" checked={!!person.sim.adult} hint={`${record.name}'s date of birth isn't recorded, so the game can't tell whether the rules for children apply. Nothing can be offered until you say. This is your call for this story, not a fact about them.`}
          onChange={(v) => setErr(store.act((s) => treatAsAdult(s, id, v)))} />
      )}
      {jobs.length > 0 && (
        <>
          <h3 className="spaced">Add To A Project's List</h3>
          {!open.length ? <p className="muted">None of your projects is hiring yet. A project hires once a draft of its script is approved.</p> : (
            <>
              <div className="grid grid-2 form">
                <SelectField label="Project" value={p!.id} options={open.map((x) => ({ value: x.id, label: x.title }))} onChange={(v) => { setProjectId(v); setOpening(''); setNote(null); setErr(null); }} />
                {choices.length > 0 && <SelectField label="Consider Them For" value={chosen!.key} options={choices.map((x) => ({ value: x.key, label: x.label }))} onChange={(v) => { setOpening(v); setNote(null); setErr(null); }} />}
              </div>
              {!choices.length ? <p className="muted">{p!.title} has no open part, and no job they have a recorded credit in.</p> : (
                <>
                  {check && !check.ok && <p className="callout callout-info">{check.reason}</p>}
                  {free && !free.ok && <p className="callout callout-info">{free.reason} {p!.title} is planned for {formatDateKey(win!.from)} to {formatDateKey(win!.to)}: they can be on its list, and free once its dates move.</p>}
                  {check?.ok && check.notes.length > 0 && <ul className="dim small">{check.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
                  {already ? <p className="muted">They are on {p!.title}'s list for this already.</p> : <button className="btn btn-primary" onClick={add}>Consider For This</button>}
                </>
              )}
            </>
          )}
        </>
      )}
      {note && <p role="status" className="muted">{note}{' '}{p && <button className="btn btn-sm" onClick={() => { store.route = { view: 'project', projectId: p.id, tab: chosen?.c.characterId ? 'cast' : 'crew' }; store.emit(); }}>Open {p.title}</button>}</p>}
      {err && <p role="alert" className="error">{err}</p>}
      <Work id={id} />
    </Panel>
  );
}

/** What they have done in this save, kept apart from their recorded credits. */
function Work({ id }: { id: string }) {
  const g = useGame();
  const work = storyCredits(g, id);
  if (!work.length) return null;
  return (
    <>
      <h3 className="spaced">Their Work In Your Story</h3>
      <p className="dim small">Simulated, in this save only. It is never added to their recorded credits.</p>
      <ul className="list" aria-label="Their Work In Your Story">
        {work.map((w, i) => <li key={i} className="list-item"><span className="grow"><strong>{w.title}</strong> <span className="dim small">{w.as}</span></span><span className="chip">{STATUS[w.status]}</span></li>)}
      </ul>
    </>
  );
}
