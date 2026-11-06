import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './ui/app.css';
import { App } from './ui/App';

try {
  const t = localStorage.getItem('slate.v1.text');
  if (t === 'large') document.documentElement.dataset.text = 'large';
} catch {
  /* per-viewer convenience only */
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
