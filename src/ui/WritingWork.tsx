// The work of hired writers, on the Crew page (writing-jobs.ts): a pass is commissioned with a scope, worked and paid
// by the day, delivered, and accepted or sent back with a note. The brief and the notes are the player's own words,
// kept as written; the game says plainly that it doesn't read them.
import { useState } from 'react';
import { formatDateKey, money, personById, qualityWords } from '../engine';
import { jobLabel } from '../engine/guests';
import { REVISION_FOCUS, SCOPE, SCOPES_FOR, WRITER_ROLES, acceptWriting, cancelWriting, commissionRefusal, commissionWriting, requestRevision, revisionRefusal, revisionTerms, standing, writingTerms } from '../engine/writing-jobs';
import type { Hire, Project, WritingJob, WritingScope } from '../engine/types';
import { SelectField, TextField, plural } from './components';
import { store, useGame } from './store';

const live = (s: { projects: Project[] }, p: Project) => s.projects.find((x) => x.id === p.id)!;
const scopeWords = (j: WritingJob) => SCOPE[j.scope].label.toLowerCase().replace('their own draft', 'a draft of their own');

export function WritingWork({ p }: { p: Project }) {
  const writers = p.hires.filter((h) => WRITER_ROLES.includes(h.roleId) && h.status === 'accepted');
  if (!p.writing) return null;
  const past = p.writing.filter((j) => !writers.some((h) => h.id === j.hireId));
  return (
    <div className="spaced">
      <h3>Writing Work</h3>
      <p className="muted">A hired writer is asked for a pass: what it covers, for how many working days, at their day rate. They are paid for each day they work, and credited and counted only for a pass you accept. Your brief and your notes are yours: they are kept as you wrote them, and the game doesn't read them.</p>
      {!writers.length && !past.length && <p className="muted">Nobody is hired to write yet.</p>}
      {writers.map((h) => <Writer key={h.id} p={p} h={h} />)}
      {past.length > 0 && <ul className="list" aria-label="Earlier Writing Work">{past.map((j) => <li key={j.id} className="list-item"><JobLine p={p} j={j} /></li>)}</ul>}
    </div>
  );
}

function JobLine({ p, j }: { p: Project; j: WritingJob }) {
  const g = useGame();
  const name = personById(g, j.personId).name;
  const pass = j.passes[j.passes.length - 1];
  const where = p.episodes.length > 1 ? `, episode ${j.episode}` : '';
  const read = standing(j)?.read;
  const what = j.status === 'working' ? `${j.passes.length > 1 ? `Revising (${pass.focus})` : 'Writing'}: day ${Math.min(pass.days, pass.done + 1)} of ${pass.days}.`
    : j.status === 'delivered' ? `Delivered ${formatDateKey(pass.deliveredOn!)}. It reads ${qualityWords(read!).toLowerCase()}.`
    : j.status === 'accepted' ? `Accepted ${formatDateKey(j.acceptedOn!)}. It reads ${qualityWords(read!).toLowerCase()}.`
    : `Stopped after ${plural(j.passes.reduce((a, x) => a + x.done, 0), 'paid day')}. Nothing of it is credited or counted.`;
  // The player's own words, shown back as written: the brief, and each note with the day it was asked.
  const notes = j.passes.slice(1);
  return (
    <span className="grow">
      <strong>{name}</strong>: {scopeWords(j)}{where}. <span className="dim">{what}</span>
      {j.brief && <span className="dim small" style={{ display: 'block' }}>Your brief, {formatDateKey(j.passes[0].askedOn)}: “{j.brief}”</span>}
      {notes.map((n, i) => <span key={i} className="dim small" style={{ display: 'block' }}>Revision asked {formatDateKey(n.askedOn)}, to look at {n.focus!.toLowerCase()}{n.text ? `: “${n.text}”` : '.'}</span>)}
    </span>
  );
}

function Writer({ p, h }: { p: Project; h: Hire }) {
  const g = useGame();
  const name = personById(g, h.personId, h.roleId).name;
  const scopes = SCOPES_FOR[h.roleId] ?? [];
  const [scope, setScope] = useState<WritingScope>(scopes[0]);
  const [episode, setEpisode] = useState(p.episodes[0]?.number ?? 1);
  const [brief, setBrief] = useState('');
  const [focus, setFocus] = useState(REVISION_FOCUS[0]);
  const [note, setNote] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const jobs = (p.writing ?? []).filter((j) => j.hireId === h.id);
  const open = jobs.find((j) => j.status === 'working' || j.status === 'delivered');
  const refusal = commissionRefusal(p, h, scope, episode);
  const terms = writingTerms(p, h, scope, episode);
  const series = p.episodes.length > 1;
  const act = (fn: (s: Parameters<Parameters<typeof store.act>[0]>[0]) => void) => setErr(store.act(fn));
  return (
    <section className="card card-tight writing-work" aria-label={`Writing Work For ${name}`}>
      <h4 style={{ margin: 0 }}>{name} <span className="chip">{jobLabel(p, h.roleId)}</span></h4>
      {jobs.length > 0 && <ul className="list">{jobs.map((j) => <li key={j.id} className="list-item"><JobLine p={p} j={j} /></li>)}</ul>}
      {open?.status === 'working' && (
        <div className="row gap-2 wrap">
          <button className="btn btn-sm" onClick={() => act((s) => cancelWriting(s, live(s, p), open.id))}>Stop This Pass</button>
          <span className="dim small">The days already worked stay paid.</span>
        </div>
      )}
      {open?.status === 'delivered' && (() => {
        const why = revisionRefusal(p, open);
        const rev = revisionTerms(p, open);
        return (
          <>
            <p className="dim small">How it reads is the game's measure of the delivered work, drawn around {name}'s level. It isn't a judgement of any words, yours or theirs.</p>
            <div className="row gap-2 wrap"><button className="btn btn-primary" onClick={() => act((s) => acceptWriting(s, live(s, p), open.id))}>Accept This Pass</button></div>
            {why ? <p className="muted">{why}</p> : (
              <div className="form">
                <div className="grid grid-2">
                  <SelectField label={`What ${name}'s Revision Should Look At`} value={focus} options={REVISION_FOCUS.map((f) => ({ value: f, label: f }))} onChange={setFocus} />
                  <TextField label={`Your Note To ${name} (Optional)`} value={note} onChange={setNote} multiline maxLength={2000} hint="Kept as you write it. The game doesn't read it." />
                </div>
                <p className="muted">A revision takes {plural(rev.days, 'working day')} at {money(h.dayRate)} a day: {money(rev.cost)}. It replaces this pass, and may read better or worse: a revision usually lands nearer their level than a first pass does.</p>
                <button className="btn" onClick={() => { act((s) => requestRevision(s, live(s, p), open.id, { focus, text: note })); setNote(''); }}>Ask For A Revision</button>
              </div>
            )}
          </>
        );
      })()}
      {!open && (
        <div className="form">
          <div className="grid grid-2">
            <SelectField label={`Ask ${name} For`} value={scope} options={scopes.map((x) => ({ value: x, label: SCOPE[x].label }))} onChange={(v) => setScope(v as WritingScope)} hint={SCOPE[scope].hint} />
            {series && <SelectField label={`Episode For ${name}`} value={String(episode)} options={p.episodes.map((e) => ({ value: String(e.number), label: `${e.number}. ${e.title}` }))} onChange={(v) => setEpisode(Number(v))} />}
          </div>
          <TextField label={`Your Brief For ${name} (Optional)`} value={brief} onChange={setBrief} multiline maxLength={2000} hint="What you want from the pass, in your own words. Kept as you write it; the game doesn't read it." />
          {refusal ? <p className="muted">{refusal}</p> : (
            <>
              <p className="muted">{plural(terms.days, 'working day')} at {money(h.dayRate)} a day: {money(terms.cost)}, added to what is agreed with them. They start on the next working day{scope !== 'polish' && h.roleId === 'episode-writer' ? `, and accepting it makes ${series ? 'the episode' : 'the film'} theirs to be credited for writing, beside whoever wrote the approved script` : ''}.</p>
              <button className="btn btn-primary" onClick={() => { act((s) => void commissionWriting(s, live(s, p), h.id, { scope, episode, brief })); setBrief(''); }}>Commission This Pass</button>
            </>
          )}
        </div>
      )}
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
    </section>
  );
}
