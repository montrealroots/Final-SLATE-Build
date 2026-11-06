// Active 1:1 clock. Game time is derived from measured elapsed real time since an anchor,
// never from counting timer callbacks, so delayed or irregular frames cannot cause drift.
// Working lifecycle default: time only accumulates while the game is loaded and visible.
// Hiding, suspending or closing the app suspends accumulation; on return the clock re-anchors
// at the saved game time, so there is never offline catch-up.

export class ActiveClock {
  private anchorReal: number | null = null;
  private anchorGame = 0;

  constructor(private readonly realNow: () => number) {}

  get running(): boolean {
    return this.anchorReal !== null;
  }

  start(gameNow: number): void {
    this.anchorReal = this.realNow();
    this.anchorGame = gameNow;
  }

  suspend(): void {
    this.anchorReal = null;
  }

  /** The game instant the world should have reached now, or null while suspended. */
  target(): number | null {
    if (this.anchorReal === null) return null;
    return this.anchorGame + Math.max(0, this.realNow() - this.anchorReal);
  }
}
