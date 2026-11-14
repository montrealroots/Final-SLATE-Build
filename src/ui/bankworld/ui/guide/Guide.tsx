// The adapter for 1221's guide (ported November 14, 2026). In 1221 `Gated` was a button that stayed locked, and opened
// the tutorial at its chapter, until that chapter was read. The owner's command keeps tutorial gating out of SLATE, so
// every feature is open: `Gated` is always the button, as 1221's was once its chapter was read, and `useFeature` says
// open. (Until later that day this adapter drew only the button's words, so every gated action was text that did
// nothing: found walking Your Bank in the browser.)
import type { ButtonHTMLAttributes } from 'react';

export function Gated({ feature: _feature, className = 'btn btn-sm', onClick, children, title, ...rest }: { feature: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={className} onClick={onClick} title={title} {...rest}>{children}</button>;
}

export function useFeature(_feature: string): { open: boolean; reason?: string; ask: () => void } {
  return { open: true, ask: () => {} };
}
