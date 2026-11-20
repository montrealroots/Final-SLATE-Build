#!/usr/bin/env python3
"""Validate this research artifact only; does not run or certify the game."""
from pathlib import Path
from datetime import date
import json
P=Path(__file__).resolve().parent
def read(name): return json.loads((P/name).read_text())
m=read('MANIFEST.json'); sources=read('data/sources.json')
awards=read('data/award-observations.json'); fees=read('data/scoped-immigration-fees.json')
gaps=read('data/gap-ledger.json'); inv=read('data/repository-gap-inventory.json')
def unique(rows):
 ids=[r['id'] for r in rows]
 assert len(ids)==len(set(ids)), 'Duplicate IDs'
unique(sources); unique(awards); unique(fees)
source_ids={s['id'] for s in sources}
assert len(awards)==m['awardRows'] and len(fees)==m['feeRows']
assert len(gaps)==m['trackedGapRows'] and len(sources)==m['sources']
for a in awards:
 assert a['sourceId'] in source_ids
 assert a['kind'] in ('winner','nomination')
 assert date.fromisoformat(a['publishedDate']) <= date(2026,11,19)
 if a['occurredDate']: date.fromisoformat(a['occurredDate'])
 assert a['mappingStatus']=='needs_repository_mapping'
 assert a['subjects'] and a['categoryLabel']
for f in fees:
 assert f['sourceId'] in source_ids and f['amount']>=0
 assert len(f['currency'])==3 and len(f['country'])==2
 assert not f['globalCountryReplacement']
 for s in f.get('additionalSources',[]): assert s in source_ids
 if f['effectiveFrom']: date.fromisoformat(f['effectiveFrom'])
 if f['effectiveThrough']:
  assert date.fromisoformat(f['effectiveThrough'])>=date.fromisoformat(f['effectiveFrom'])
 if f['processingDays'] is not None: assert f['processingDayUnit'] in ('working','calendar')
 if f['amount']==0: assert f['id']=='lk-free40'
for group in ('visas','permits','visaTimes','permitTimes'):
 assert len(inv[group])==inv['counts'][group]
 assert {g['country'] for g in gaps if g['group']==group}==set(inv[group])
assert not any(g['closed'] for g in gaps)
assert len({(g['group'],g['country']) for g in gaps})==len(gaps)
assert m['fullyClosedCountryRecords']==0 and not m['gameTestsRun']
assert not m['licensedBoxOfficeDatasetIncluded'] and not m['physicalSafariTested']
destinations=sorted({f['country'] for f in fees})
print(f'PASS: {len(awards)} award observations, {len(fees)} fee components, {len(sources)} sources, {len(gaps)} gap rows.')
print(f'Fee evidence destinations ({len(destinations)}): '+', '.join(destinations))
print('PASS means package structure/consistency only. No game, source-authority or device certification.')
