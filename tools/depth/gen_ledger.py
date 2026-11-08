import csv, sys, os, shutil
sys.path.insert(0, os.path.dirname(__file__))
from ledger_data import C, S
# A child's detail record (from November 8, 2026): what the player controls, what it needs, the engine rule, what it costs,
# what follows from it, how it fails and recovers, how it saves, and how its facts are sourced.
DETAIL = {'control': 'player_control', 'needs': 'prerequisites', 'rule': 'engine_rule', 'cost': 'resource_time_cost', 'downstream': 'downstream_effects',
          'failure': 'failure_recovery', 'save': 'save_behaviour', 'research': 'research_classification'}
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PKG = os.path.join(REPO, 'docs/depth/package')
OUT = os.path.join(REPO, 'docs/depth')
os.makedirs(os.path.join(OUT, 'package'), exist_ok=True)

def parent_status(kids):
    st = [k[1] for k in kids]
    if all(s in ('VE', 'V') for s in st): return S['V'] if all(s == 'V' for s in st) else S['VE']
    if all(s == 'MI' for s in st): return S['MI']
    if any(s in ('MI', 'NR') for s in st): return S['NR']
    if any(s == 'EB' for s in st): return S['EB']
    return S['IU']

rows = list(csv.DictReader(open(os.path.join(PKG, '02-COVERAGE-LEDGER.csv'))))
assert len(rows) == 100
children = []
for r in rows:
    key = r['id'][len('SLATE-'):]
    ui, eng, kids = C[key]
    ids = []
    for i, k in enumerate(kids, 1):
        req, st, ev, gap = k[:4]
        d = k[4] if len(k) > 4 else {}
        assert set(d) <= set(DETAIL), (r['id'], set(d) - set(DETAIL))
        cid = f"{r['id']}.{i:02d}"
        ids.append(cid)
        children.append({'child_id': cid, 'parent_id': r['id'], 'requirement': req, 'status': S[st], 'evidence': ' | '.join(ev), 'remaining_gap': gap,
                         **{DETAIL[x]: d.get(x, '') for x in DETAIL}})
    r['status'] = parent_status(kids)
    r['child_ids'] = ' '.join(ids)
    r['ui_entry'] = ui
    r['engine_files'] = eng
    ev = [e for k in kids for e in k[2]]
    r['unit_evidence'] = ' | '.join(e for e in ev if e.startswith('tests/'))
    r['browser_evidence'] = ' | '.join(e for e in ev if e.startswith('e2e/'))
    r['remaining_gap'] = '; '.join(f"{ids[i]}: {k[3]}" for i, k in enumerate(kids) if k[1] not in ('VE', 'V') and k[3])
    area = key[:2]
    r['research_status'] = ('SOURCED (docs/DATA-PROVENANCE.md, src/engine/rulebooks.ts)' if area in ('02', '17')
                            else 'NOT APPLICABLE' if area in ('19', '20') else 'MODELED (docs/ASSUMPTIONS.md)')
    r['persistence'] = 'Saved with the game (src/engine/save.ts)' if r['status'] != S['MI'] else ''
with open(os.path.join(OUT, 'COVERAGE-LEDGER.csv'), 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
with open(os.path.join(OUT, 'CHILDREN.csv'), 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(children[0].keys())); w.writeheader(); w.writerows(children)
from collections import Counter
print('parents', Counter(r['status'] for r in rows))
print('children', len(children), Counter(c['status'] for c in children))
