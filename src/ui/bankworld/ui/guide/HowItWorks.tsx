// The adapter for 1221's "How This Works" button (ported November 14, 2026). In 1221 it opened the game's reference
// at the entry for a screen. SLATE doesn't carry 1221's reference (`content/guide`), so the button isn't drawn: a
// control that opened nothing would be a dead one. A recorded deviation (docs/v9/PARITY.md).
export function HowItWorks(_props: { help: string; label?: string }) {
  return null;
}
