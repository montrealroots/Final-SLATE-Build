// The adapter for 1221's app/game-context (ported November 14, 2026): 1221's bank screens ask `useGame` for the
// simulation, `run` for a command and `toast` to tell the player, and `useWorld` to read. Here the simulation is the one
// over this save's bank world (`GameState.bank`), and a command runs inside SLATE's store action, so it saves, refuses in
// a read-only tab and redraws as any SLATE action does. The bank is brought to SLATE's clock before every command, and keeps it as
// its clock moves (engine/bank.ts). 1221's clock controls, history and favourites aren't the bank's and aren't adapted.
import { useMemo, useSyncExternalStore } from 'react';
import { store } from '../../store';
import { advanceBankWorld, bankSim, type Simulation } from '../../../engine/bankworld';
import type { CommandResult } from '../../../engine/bankworld/core/simulation';

export interface Toast { id: number; message: string; tone: 'neutral' | 'positive' | 'negative' }

let toasts: Toast[] = [];
let toastSeq = 0;
const toastListeners = new Set<() => void>();
const emitToasts = () => toastListeners.forEach((f) => f());
/** Toasts said by the bank's screens, read by `BankToasts`. Each goes after six seconds. */
export function toast(message: string, tone: Toast['tone'] = 'neutral'): void {
  const t = { id: ++toastSeq, message, tone };
  toasts = [...toasts, t].slice(-3);
  emitToasts();
  setTimeout(() => { toasts = toasts.filter((x) => x !== t); emitToasts(); }, 6000);
}
export function useToasts(): Toast[] {
  return useSyncExternalStore((f) => { toastListeners.add(f); return () => toastListeners.delete(f); }, () => toasts);
}

export interface GameContextValue {
  sim: Simulation;
  version: number;
  run: <R = unknown>(kind: string, payload?: Record<string, unknown>, options?: { silent?: boolean }) => CommandResult<R>;
  refresh: () => void;
  route: string;
  navigate: (route: string, label?: string) => void;
  back: () => void;
  toast: (message: string, tone?: Toast['tone']) => void;
}

function current(): Simulation {
  const s = store.state;
  if (!s?.bank) throw new Error('This story has no bank yet.');
  // Read as it stands: the bank keeps the game's clock as the clock moves (engine/bank.ts), and a read changes nothing.
  return bankSim(s.bank);
}

/** 1221's routes into SLATE's: the bank and the papers are their own views; any other goes Home. */
function go(route: string): void {
  const [path, query] = route.split('?');
  const tab = new URLSearchParams(query ?? '').get('tab') ?? undefined;
  if (path.includes('bank')) store.go({ view: 'bank', ...(tab ? { tab } : {}) });
  else if (path.includes('papers')) store.go({ view: 'papers', ...(tab ? { tab } : {}) });
  else store.go({ view: 'home' });
}

/** A bank-world command run from any screen (Your Papers runs 1221's passport application). */
export function run<R>(kind: string, payload: Record<string, unknown> = {}, options: { silent?: boolean } = {}): CommandResult<R> {
  let result: CommandResult<R> = { ok: false, error: 'No game is open.' };
  const refused = store.act((s) => {
    if (!s.bank) throw new Error('This story has no bank yet.');
    advanceBankWorld(s.bank, s.now);
    result = bankSim(s.bank).execute<R>({ kind, payload });
  });
  if (refused) result = { ok: false, error: refused };
  if (result.detail) console.error(result.detail);
  if (!result.ok && !options.silent) toast(result.error ?? 'That didn’t go through, and nothing was changed.', 'negative');
  return result;
}

export function useGame(): GameContextValue {
  const version = useSyncExternalStore(store.subscribe, () => store.version);
  const sim = current();
  const r = store.route;
  return {
    sim, version, run, toast,
    refresh: () => store.act(() => {}),
    route: `/workspace/${r.view}${r.tab ? `?tab=${r.tab}` : ''}`,
    navigate: (route) => go(route),
    back: () => store.back(),
  };
}

/** Read something out of the bank world, recomputed when the save changes. */
export function useWorld<T>(read: (sim: Simulation) => T, deps: readonly unknown[] = []): T {
  const { sim, version } = useGame();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => read(sim), [sim, version, ...deps]);
}
