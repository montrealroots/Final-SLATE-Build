"""Build the festival and awards catalog, its inventory and its coverage ledger from the roster research records.

    python3 tools/awards/build.py          # writes src/data/institutions.json, docs/awards/INVENTORY.md, docs/awards/COVERAGE.csv
    python3 tools/awards/build.py --check  # fails if any of them differs from what the rosters make

Rosters: docs/awards/roster/<institution>.txt (format in its README). The catalog keeps every institution's dates,
places and other fields; categories come from the roster, keeping each existing category's id and the fields the
roster doesn't speak to (fees, slots, premiere rules), so saved entries, nominations and wins keep their category.
Categories the roster no longer lists stay in the catalog, closed to new entries, for the same reason.
"""
import csv, io, json, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ROSTERS = os.path.join(ROOT, 'docs/awards/roster')
CATALOG = os.path.join(ROOT, 'src/data/institutions.json')
BASELINE = os.path.join(ROOT, 'docs/awards/baseline-institutions.json')
INVENTORY = os.path.join(ROOT, 'docs/awards/INVENTORY.md')
COVERAGE = os.path.join(ROOT, 'docs/awards/COVERAGE.csv')

TV = ['series', 'limited-series', 'anthology-series', 'web-series', 'tv-film', 'documentary-series', 'unscripted-series']
SCRIPTED_TV = ['series', 'limited-series', 'anthology-series', 'web-series', 'tv-film']
# Base work tokens: formats, and for unscripted programs which families and how many episodes.
BASE = {
    'feature': {'formats': ['feature']}, 'documentary-feature': {'formats': ['documentary-feature']},
    'short': {'formats': ['short']}, 'documentary-short': {'formats': ['documentary-short']},
    'series': {'formats': ['series', 'anthology-series', 'web-series']},
    'limited': {'formats': ['limited-series', 'anthology-series', 'tv-film']},
    'limited-series': {'formats': ['limited-series', 'anthology-series']}, 'movie': {'formats': ['tv-film']},
    'special': {'formats': ['tv-film']}, 'television': {'formats': TV}, 'narrative': {'formats': SCRIPTED_TV},
    'animated': {'formats': SCRIPTED_TV, 'mediums': ['animation', 'hybrid']},
    'live-hybrid': {'formats': ['feature', 'short'] + SCRIPTED_TV, 'mediums': ['hybrid']},
    'animation': {'formats': ['feature', 'short'] + SCRIPTED_TV, 'mediums': ['animation', 'hybrid']},
    'docseries': {'formats': ['documentary-series']}, 'docspecial': {'formats': ['documentary-feature', 'documentary-short']},
    'variety': {'formats': ['unscripted-series'], 'family': ['talk', 'studio-variety'], 'episodes': [2, 9999]},
    'variety-special': {'formats': ['unscripted-series'], 'family': ['talk', 'studio-variety'], 'episodes': [1, 1]},
    'reality': {'formats': ['unscripted-series'], 'family': ['observational', 'factual']},
    'reality-structured': {'formats': ['unscripted-series'], 'family': ['factual']},
    'reality-unstructured': {'formats': ['unscripted-series'], 'family': ['observational']},
    'factual': {'formats': ['unscripted-series', 'documentary-series'], 'family': ['factual']},
    'competition': {'formats': ['unscripted-series'], 'family': ['competition']},
    'music-video': {'formats': ['music-video']},
    'shortform': {'formats': ['web-series']}, 'shortform-nonfiction': {'formats': ['web-series', 'documentary-series']},
}
# Qualifiers after a base token. Each becomes a requirement the engine checks (`need`), a class, or a medium.
CLASS = {'comedy': 'comedy', 'drama': 'drama', 'musical': 'comedy'}
MEDIUM = {'animated': ['animation', 'hybrid'], 'animation': ['animation', 'hybrid'], 'live': ['live-action', 'hybrid'], 'live-action': ['live-action', 'hybrid']}
NEEDS = {
    'debut', 'writer-debut', 'new', 'over-60', 'over-70', 'max-20', 'under-60', 'under-1m', 'box-office', 'indie',
    'independent', 'la-ny-theatrical', 'non-english', 'environment', 'civil-rights', 'social-issues', 'current-events',
    'arts', 'archival', 'food', 'sports', 'coproduction', 'family', 'children', 'preschool', 'mature', 'period', 'fantasy',
    'contemporary', 'half', 'hour', 'basque', 'asia-pacific', 'latin-america', 'europe', 'europe-non-es',
    'iberoamerica-non-es', 'us', 'non-us', 'fr', 'non-fr', 'es', 'ca', 'non-ca', 'au', 'jp', 'non-jp', 'nl',
}
KINDS = {'C': 'award', 'A': 'area', 'J': 'juried', 'S': 'section', 'P': 'prize', 'U': 'audience', 'X': 'partner', 'H': 'honorary'}
RECIPIENTS = {'project', 'producer', 'director', 'writer', 'writer-original', 'writer-adapted', 'lead', 'supporting', 'guest',
              'performer', 'ensemble', 'voice', 'host', 'narrator', 'craft', 'song', 'national', 'career', 'career-film',
              'career-television', 'career-producer', 'career-animation', 'career-program'}


def parse(path):
    inst = {'sources': [], 'entries': [], 'blocked': None, 'edition': None}
    section = None
    for n, raw in enumerate(open(path, encoding='utf-8'), 1):
        line = raw.rstrip('\n')
        if not line.strip():
            continue
        where = f'{os.path.basename(path)}:{n}'
        if line.startswith('@institution'):
            inst['id'] = line.split(None, 1)[1].strip()
        elif line.startswith('@edition'):
            inst['edition'] = line.split(None, 1)[1].strip()
        elif line.startswith('@source'):
            parts = [p.strip() for p in line.split(None, 1)[1].split('|')]
            assert len(parts) == 4 and parts[2].startswith('http') and parts[3].startswith('retrieved'), where
            inst['sources'].append({'id': parts[0], 'title': parts[1], 'url': parts[2], 'retrieved': parts[3][len('retrieved '):]})
        elif line.startswith('@blocked'):
            inst['blocked'] = line.split(None, 1)[1].strip()
        elif line.startswith('#'):
            text = line.lstrip('#').strip()
            # A heading is a short title; longer comment lines are notes for the reader.
            if text and len(text) <= 70 and not text.endswith('.') and ':' not in text[:3] and '(' not in text[:1]:
                section = re.sub(r'\s*\(.*\)$', '', text)
        elif line.startswith('- '):
            parts = [p.strip() for p in line[2:].split('|')]
            assert len(parts) == 3, where
            inst['entries'].append({'playable': False, 'name': parts[0], 'reason': parts[1], 'ref': parts[2], 'section': section})
        else:
            parts = [p.strip() for p in line.split('|')]
            assert len(parts) == 7, f'{where}: expected 7 fields, got {len(parts)}'
            cid, name, kind, rec, work, ref, note = parts
            assert re.fullmatch(r'[a-z0-9-]+', cid), where
            k, _, parents = kind.partition(':')
            assert k in KINDS, f'{where}: kind {kind}'
            inst['entries'].append({'playable': True, 'id': cid, 'name': name, 'kind': KINDS[k], 'parents': parents.split('+') if parents else [],
                                    'recipient': rec, 'work': work, 'ref': ref, 'note': note, 'section': section, 'where': where})
    assert inst.get('id'), path
    return inst


def recipient(rec, where):
    """'producer+director', 'lead:Actress', 'craft:dop+editor', 'performer:Actor:breakthrough' -> category fields."""
    out = {}
    if rec.startswith('craft:'):
        out['recipient'] = 'craft'
        out['crafts'] = rec[len('craft:'):].split('+')
        return out
    groups = rec.split('+')
    first, *rest = groups
    head, *quals = first.split(':')
    assert head in RECIPIENTS, f'{where}: recipient {rec}'
    if head.startswith('career'):
        out['recipient'] = 'career'
        out['career'] = head[len('career-'):] if head != 'career' else 'any'
    elif head in ('writer-original', 'writer-adapted'):
        out['recipient'] = 'writer'
        out['material'] = head[len('writer-'):]
    else:
        out['recipient'] = head
    for q in quals:
        if q in ('Actor', 'Actress'):
            out['actingTitle'] = q
        elif q == 'breakthrough':
            out.setdefault('need', []).append('breakthrough')
        else:
            raise AssertionError(f'{where}: recipient qualifier {q}')
    if rest:
        for r in rest:
            assert r in RECIPIENTS, f'{where}: recipient {r}'
        out['with'] = rest
    return out


def work(spec, where):
    """'feature:us:debut+series:us:environment' -> formats, mediums, family, episodes, class, need."""
    formats, mediums, family, needs, classes, episodes = [], [], [], set(), set(), None
    for alt in spec.split('+'):
        base, *quals = alt.split(':')
        assert base in BASE, f'{where}: work {base}'
        b = BASE[base]
        for f in b['formats']:
            if f not in formats:
                formats.append(f)
        for m in b.get('mediums', []):
            if m not in mediums:
                mediums.append(m)
        for fam in b.get('family', []):
            if fam not in family:
                family.append(fam)
        if 'episodes' in b:
            episodes = b['episodes'] if episodes is None or episodes == b['episodes'] else None
        for q in quals:
            if q in CLASS:
                classes.add(CLASS[q])
            elif q in MEDIUM:
                for m in MEDIUM[q]:
                    if m not in mediums:
                        mediums.append(m)
            elif q in NEEDS:
                needs.add(q)
            else:
                raise AssertionError(f'{where}: work qualifier {q}')
    out = {'formats': formats}
    if mediums:
        out['mediums'] = mediums
    if family:
        out['family'] = family
    if episodes:
        out['episodes'] = episodes
    if len(classes) == 1:
        out['class'] = classes.pop()
    if needs:
        out['need'] = sorted(needs)
    return out


def years(note):
    m = re.search(r'years (\d{4})-(\d{4})', note)
    return [int(m.group(1)), int(m.group(2))] if m else None


def category(inst_kind, e, old):
    c = dict(old) if old else {}
    c['id'] = e['id']
    c['name'] = e['name']
    c.update(recipient(e['recipient'], e['where']))
    w = work(e['work'], e['where'])
    if 'need' in c and 'need' in w:
        c['need'] = sorted(set(c['need']) | set(w['need']))
        del w['need']
    c.update(w)
    c['kind'] = e['kind']
    if e['parents']:
        c['parents'] = e['parents']
    if e['section']:
        c['section'] = e['section']
    y = years(e['note'])
    if y:
        c['years'] = y
    c['verified'] = 'UNVERIFIED' not in e['note'] and e['ref'] != 'UNVERIFIED'
    # Defaults for categories the game didn't have; existing ones keep their fees, slots and judging.
    if not old:
        kind = e['kind']
        c['judging'] = {'award': 'members', 'area': 'members', 'juried': 'jury', 'section': 'programmers', 'prize': 'jury',
                        'audience': 'audience', 'partner': 'jury', 'honorary': 'members'}[kind]
        c['slots'] = {'award': 5, 'area': 5, 'juried': 3, 'section': 12, 'prize': 1, 'audience': 1, 'partner': 1, 'honorary': 1}[kind]
        c['fee'] = 60 if kind == 'section' and inst_kind == 'festival' else 0
    # Sections select; prizes, audience and partner awards pick a winner among a section's films; awards nominate.
    c['competitive'] = e['kind'] not in ('section', 'honorary')
    # Drama and comedy come from the project's own declaration (class), not a genre list.
    for k in ('genres', 'excludeGenres'):
        if c.get(k) and set(c[k]) >= {'comedy', 'musical'} and k in c and 'class' in c:
            del c[k]
    return c


def build():
    base = json.load(open(BASELINE, encoding='utf-8'))
    current = json.load(open(CATALOG, encoding='utf-8'))
    rosters = {}
    for f in sorted(os.listdir(ROSTERS)):
        if f.endswith('.txt'):
            r = parse(os.path.join(ROSTERS, f))
            rosters[r['id']] = r
    base_ids = {i['id'] for i in base['institutions']}
    assert set(rosters) == base_ids, f'rosters {sorted(set(rosters) ^ base_ids)} differ from the institutions in the game'
    out_insts = []
    for inst in current['institutions']:
        r = rosters[inst['id']]
        old = {c['id']: c for c in inst['categories']}
        seen = set()
        cats = []
        for e in r['entries']:
            if not e['playable']:
                continue
            assert e['id'] not in seen, f"{e['where']}: {e['id']} twice"
            seen.add(e['id'])
            cats.append(category(inst['kind'], e, old.get(e['id'])))
        ids = {c['id'] for c in cats}
        taking = {c['id'] for c in cats if c['kind'] in ('award', 'area', 'juried', 'section')}
        for c in cats:
            for p in c.get('parents', []):
                assert p in ids, f"{inst['id']}:{c['id']} names section {p}, which the roster doesn't list"
                # A prize is decided among works entered somewhere; another prize takes no entries of its own.
                assert p in taking, f"{inst['id']}:{c['id']} is decided among {p}, which takes no entries"
        # Existing categories the roster dropped stay, closed, so old entries and results keep their category.
        for cid, c in old.items():
            if cid not in ids:
                kept = dict(c)
                kept['retired'] = True
                cats.append(kept)
        out = dict(inst)
        out['categories'] = cats
        out['rosterStatus'] = 'blocked' if r['blocked'] else 'read'
        out_insts.append(out)
    catalog = dict(current)
    catalog['institutions'] = out_insts
    return base, rosters, catalog


def inventory(base, rosters, catalog):
    b = {i['id']: i for i in base['institutions']}
    lines = ['# Awards And Festivals Inventory', '',
             'Generated by `tools/awards/build.py` from the roster research records in `docs/awards/roster/` and the catalog',
             'as it stood before this work (`docs/awards/baseline-institutions.json`, 37 institutions and 142 categories).',
             'Do not edit by hand.', '']
    tot = {'before': 0, 'after': 0, 'new': 0, 'renamed': 0, 'na': 0, 'unverified': 0}
    rows = []
    for inst in catalog['institutions']:
        r = rosters[inst['id']]
        before = {c['id']: c for c in b[inst['id']]['categories']}
        live = [c for c in inst['categories'] if not c.get('retired')]
        new = [c for c in live if c['id'] not in before]
        renamed = [c for c in live if c['id'] in before and before[c['id']]['name'] != c['name']]
        na = [e for e in r['entries'] if not e['playable']]
        unverified = [c for c in live if not c.get('verified')]
        kinds = {}
        for c in live:
            kinds[c['kind']] = kinds.get(c['kind'], 0) + 1
        rec = sorted({c['recipient'] for c in live})
        tot['before'] += len(before); tot['after'] += len(live); tot['new'] += len(new); tot['renamed'] += len(renamed)
        tot['na'] += len(na); tot['unverified'] += len(unverified)
        rows.append((inst, r, before, live, new, renamed, na, unverified, kinds, rec))
    lines += ['## Totals', '', '| Before | Playable now | New | Renamed | Official but not playable | Unverified in play |',
              '| --- | --- | --- | --- | --- | --- |',
              f"| {tot['before']} | {tot['after']} | {tot['new']} | {tot['renamed']} | {tot['na']} | {tot['unverified']} |", '']
    for inst, r, before, live, new, renamed, na, unverified, kinds, rec in rows:
        lines += [f"## {inst['name']} (`{inst['id']}`, {inst['kind']})", '']
        lines.append(f"- **Edition read:** {r['edition'] or 'none'}")
        if r['blocked']:
            lines.append(f"- **Research blocked:** {r['blocked']}")
        for s in r['sources']:
            lines.append(f"- **Source:** [{s['title']}]({s['url']}), retrieved {s['retrieved']}")
        lines.append(f"- **Categories:** {len(before)} before, {len(live)} playable now ({', '.join(f'{v} {k}' for k, v in sorted(kinds.items()))}); recipients: {', '.join(rec)}")
        if new:
            lines.append(f"- **New:** {', '.join(c['name'] for c in new)}")
        if renamed:
            lines.append(f"- **Renamed to the official name:** {', '.join(before[c['id']]['name'] + ' → ' + c['name'] for c in renamed)}")
        if na:
            lines.append('- **Official but not playable:** ' + '; '.join(f"{e['name']} ({e['reason']})" for e in na))
        if unverified:
            lines.append(f"- **In play but unverified:** {', '.join(c['name'] for c in unverified)}")
        lines.append('')
    return '\n'.join(lines) + '\n'


def coverage(rosters, catalog):
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator='\n')
    w.writerow(['institution', 'category', 'name', 'kind', 'section', 'recipient', 'roster', 'source', 'note'])
    for inst in catalog['institutions']:
        r = rosters[inst['id']]
        for e in r['entries']:
            if e['playable']:
                status = 'blocked' if r['blocked'] else ('unverified' if ('UNVERIFIED' in e['note'] or e['ref'] == 'UNVERIFIED') else 'verified')
                w.writerow([inst['id'], e['id'], e['name'], e['kind'], e['section'] or '', e['recipient'], status, e['ref'], e['note']])
            else:
                status = 'unverified-not-playable' if 'UNVERIFIED' in e['reason'] else 'not-playable'
                w.writerow([inst['id'], '', e['name'], '', e['section'] or '', '', status, e['ref'], e['reason']])
    return buf.getvalue()


def main():
    base, rosters, catalog = build()
    outputs = {
        CATALOG: json.dumps(catalog, ensure_ascii=False, indent=1) + '\n',
        INVENTORY: inventory(base, rosters, catalog),
        COVERAGE: coverage(rosters, catalog),
    }
    if '--check' in sys.argv:
        stale = [p for p, text in outputs.items() if not os.path.exists(p) or open(p, encoding='utf-8').read() != text]
        if stale:
            print('Out of date (run python3 tools/awards/build.py):', ', '.join(os.path.relpath(p, ROOT) for p in stale))
            sys.exit(1)
        print('Awards catalog, inventory and coverage are current.')
        return
    for p, text in outputs.items():
        open(p, 'w', encoding='utf-8').write(text)
    n = sum(1 for i in catalog['institutions'] for c in i['categories'] if not c.get('retired'))
    print(f"{len(catalog['institutions'])} institutions, {n} playable categories")


if __name__ == '__main__':
    main()
