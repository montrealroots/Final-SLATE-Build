// What a project goes through, shown before it is started (SLATE-03-05, November 8, 2026). The New Script form asked
// for a format, a medium and a technique and said nothing of what each would mean, so the player found out stage by
// stage. Now it lists the stages and what each needs, read from the same choices that decide which work is built
// (production/tasks.ts buildTasks) and which tabs a project has. It describes; it decides nothing. Loaded with the
// Projects page, not at startup.
import { isEpisodic, isNonfiction } from './projects';
import type { Format, Medium, Technique } from './types';

export interface Stage { name: string; needs: string }

export function projectStages(a: { format: Format; medium: Medium; technique: Technique; episodes?: number }): Stage[] {
  const nonfiction = isNonfiction(a.format);
  const unscripted = a.format === 'unscripted-series';
  const live = a.medium !== 'animation';
  const animated = a.medium !== 'live-action';
  const stop = animated && a.technique === 'stop-motion';
  const each = isEpisodic(a.format) ? ` for each of the ${a.episodes ?? 'planned'} episodes` : '';
  const prep: string[] = [];
  if (unscripted) prep.push('write the format rules', 'cast hosts and participants, who each give consent');
  else if (nonfiction) prep.push('research and plan access', 'ask contributors for consent');
  if (live && !nonfiction) prep.push('cast performers', 'hire a crew', 'scout locations and choose sites', 'rehearse', 'schedule shoot days');
  else if (live) prep.push('hire a crew', 'schedule shoot days');
  if (animated) prep.push('cast voices', 'approve each character design', 'storyboards and an animatic');
  if (stop) prep.push('build armatures, puppets and sets', 'book stages');
  const shoot: string[] = [];
  if (live) shoot.push(nonfiction ? 'interviews and filming with the people who agreed to appear' : 'shoot days on location, where weather, daylight and a site falling through can cost a day');
  if (stop) shoot.push('animating on stages, frame by frame; puppets can be damaged and need repair');
  else if (animated) shoot.push(a.technique === '3d-cg' || a.technique === 'mixed' ? 'modelling, rigging, animation and rendering, with motion capture sessions for any captured part' : 'layout, animation and compositing, shot by shot');
  if (a.medium === 'hybrid') shoot.push('integrating the animated and live-action scenes');
  const post = ['an edit you lock', 'dialogue, Foley and effects, then the mix', 'music', 'the grade, and subtitles where they are needed'];
  if (nonfiction) post.push('fact checks, and contributors who asked to see the cut');
  return [
    { name: 'Development', needs: `Write the script${nonfiction ? ' or outline' : ''} and approve a draft; the approved draft sets the budget estimate, and backers fund it.` },
    { name: 'Pre-Production', needs: `${cap(prep.join(', '))}.` },
    { name: 'Production', needs: `${cap(shoot.join('; '))}${each}.` },
    { name: 'Post-Production', needs: `${cap(post.join(', '))}.` },
    { name: 'Delivery And Release', needs: 'Deliver the finished work, then choose distribution offers and enter festivals and awards.' },
  ];
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
