// Your Papers (from November 14, 2026; the owner's command, 4 and 5): your documents and permissions, with a way back
// to Home: passports, visiting and working, and applications (Papers.tsx).
import { store } from './store';
import { PageHead } from './components';
import { PapersCard } from './Papers';

export function PapersPage() {
  return (
    <>
      <PageHead eyebrow="You" title="Your Papers" lede="Your passports and your permission to work, and what you have applied for."
        actions={<button className="btn btn-sm" onClick={() => store.go({ view: 'home' })}>Back To Home</button>} />
      <PapersCard />
    </>
  );
}
