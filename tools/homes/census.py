# US house prices and rents from each place's own Census figures, and how prices moved since, from FHFA's index (the
# owner's request of November 17, 2026: "census prices and price trends"). Until then a US home's price was NAHB's
# national average for a new house, whatever the town, and its rent was HUD's figure for its county.
#
# Writes:
# - src/data/homes/census/<ST>.json: for each gazetteer place matched to a Census place of the same name in the same
#   state, its median home value (B25077) and its median gross rent by bedrooms (B25031, studio to three), from the
#   2019-2023 and 2020-2024 ACS 5-year releases; and each county's median value, for a place without its own.
#   A figure is kept only when its margin of error is at most 30% of it: a small town's median can be a guess.
# - src/data/homes/fhfa.json: FHFA's all-transactions house price index, quarterly, for each metro area (or metro
#   division, where FHFA splits one) and each state, and the metro of each county (OMB's July 2023 delineation).
#
# Inputs (public domain, downloaded by hand: the Census API now needs a key, which this project doesn't request):
#   <acs dir>/<year>/acsdt5y<year>-b25077.dat, -b25031.dat, Geos<year>5YR.txt  (www2.census.gov summary files)
#   <fhfa csv>   https://www.fhfa.gov/hpi/download/monthly/hpi_master.csv
#   <omb xlsx>   www2.census.gov/programs-surveys/metro-micro/geographies/reference-files/2023/delineation-files/list1_2023.xlsx
#   python3 -I tools/homes/census.py <acs dir> <fhfa csv> <omb xlsx>
import csv, json, os, re, sys, unicodedata
from collections import defaultdict

import openpyxl

ACS, FHFA, OMB = sys.argv[1:4]
YEARS = ['2023', '2024']
OUT = 'src/data/homes/census'
MAX_MOE = 0.30


def fold(s):
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c)).lower()
    s = re.sub(r'[^a-z0-9]+', ' ', s).strip()
    # "St. Paul" and "Saint Paul": the Census Bureau abbreviates, GeoNames mostly doesn't.
    return re.sub(r'\bste\b', 'sainte', re.sub(r'\bst\b', 'saint', s))


# The kind of place the Census Bureau writes after a place's name ("Fort Worth city"), and a consolidated city's
# remainder ("Nashville-Davidson metropolitan government (balance)").
LSAD = re.compile(r'\s+(city and borough|consolidated government \(balance\)|metropolitan government \(balance\)|metro government \(balance\)|unified government \(balance\)|urban county|city \(balance\)|municipality|borough|city|town|village|cdp|comunidad|zona urbana)$', re.I)
# GeoNames' name for a city the Census Bureau names otherwise.
ALIAS = {
    ('TN', 'nashville'): 'nashville davidson', ('KY', 'louisville'): 'louisville jefferson county', ('KY', 'lexington'): 'lexington fayette',
    ('GA', 'athens'): 'athens clarke county', ('GA', 'augusta'): 'augusta richmond county', ('GA', 'macon'): 'macon bibb county',
    ('HI', 'honolulu'): 'urban honolulu', ('ID', 'boise'): 'boise city', ('NY', 'new york city'): 'new york', ('MT', 'butte'): 'butte silver bow',
}
CATALOG = {'us-los-angeles': ('CA', 'los angeles'), 'us-new-york': ('NY', 'new york'), 'us-atlanta': ('GA', 'atlanta'), 'us-austin': ('TX', 'austin'), 'us-chicago': ('IL', 'chicago'), 'us-boulder': ('CO', 'boulder'), 'us-albuquerque': ('NM', 'albuquerque'), 'us-anchorage': ('AK', 'anchorage'), 'us-honolulu': ('HI', 'urban honolulu')}


def read_dat(path):
    with open(path, encoding='utf-8') as f:
        r = csv.reader(f, delimiter='|')
        head = next(r)
        return {row[0]: dict(zip(head, row)) for row in r}


def num(x):
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    return v if v > 0 else None  # the Census Bureau's codes for "no estimate" are negative


def good(row, e, m):
    v, moe = num(row.get(e)), num(row.get(m))
    return int(v) if v is not None and (moe is None or moe <= MAX_MOE * v) else None


places = defaultdict(dict)  # ST -> folded name -> list of (geoid, name)
county_names = {}
values, rents = {y: {} for y in YEARS}, {y: {} for y in YEARS}
for y in YEARS:
    with open(f'{ACS}/{y}/Geos{y}5YR.txt', encoding='latin-1') as f:
        r = csv.reader(f, delimiter='|')
        head = next(r)
        for row in r:
            g = dict(zip(head, row))
            if g['SUMLEVEL'] == '160' and y == YEARS[-1]:
                base = LSAD.sub('', g['NAME'].rsplit(', ', 1)[0])
                places[g['STUSAB']].setdefault(fold(base), []).append((g['GEO_ID'], g['NAME']))
            if g['SUMLEVEL'] == '050':
                county_names[g['GEO_ID']] = (g['NAME'], g['STUSAB'])
    v = read_dat(f'{ACS}/{y}/acsdt5y{y}-b25077.dat')
    b = read_dat(f'{ACS}/{y}/acsdt5y{y}-b25031.dat')
    for gid, row in v.items():
        values[y][gid] = good(row, 'B25077_E001', 'B25077_M001')
    for gid, row in b.items():
        # B25031: 002 no bedroom, 003 one, 004 two, 005 three. Kept only when all four hold.
        rs = [good(row, f'B25031_E00{i}', f'B25031_M00{i}') for i in (2, 3, 4, 5)]
        rents[y][gid] = rs if all(rs) else None

counties = json.load(open('src/data/homes/hud/counties.json'))
gaz = []
for line in open('src/world/gazetteer/places/US.tsv', encoding='utf-8'):
    c = line.rstrip('\n').split('\t')
    if len(c) > 7 and c[3].startswith('US.'):
        gaz.append((c[0], c[1], c[3][3:], int(c[7] or 0)))
# A name the gazetteer holds twice in a state (a city and a district of another) goes to the most populous.
biggest = {}
for gid, name, st, pop in gaz:
    k = (st, fold(name))
    if k not in biggest or pop > biggest[k][1]:
        biggest[k] = (gid, pop)

out = defaultdict(lambda: {'places': {}, 'counties': {}})
stats = defaultdict(int)


def entry(geoid, name):
    e = {'fips': geoid.split('US')[1], 'name': name, 'value': {}, 'rent': {}}
    for y in YEARS:
        if values[y].get(geoid):
            e['value'][y] = values[y][geoid]
        if rents[y].get(geoid):
            e['rent'][y] = rents[y][geoid]
    return e


for gid, name, st, pop in gaz + [(k, v[1], v[0], 0) for k, v in CATALOG.items()]:
    stats['places'] += not gid.startswith('us-')
    k = fold(name)
    if not gid.startswith('us-') and biggest[(st, k)][0] != gid:
        stats['a same-named place in the state is bigger'] += 1
        continue
    hits = places[st].get(ALIAS.get((st, k), k), [])
    if len(hits) > 1:  # a city and a same-named census-designated place elsewhere in the state: the city
        towns = [h for h in hits if not h[1].rsplit(', ', 1)[0].endswith(' CDP')]
        hits = towns if len(towns) == 1 else hits
    if len(hits) != 1:
        stats['no census place' if not hits else 'two census places of that name'] += 1
        continue
    e = entry(*hits[0])
    if not e['value'] and not e['rent']:
        stats['matched, no figure good enough'] += 1
        continue
    stats['matched with figures'] += 1
    out[st]['places'][gid] = e
# Each county's median value, for a place whose own isn't good enough.
for geoid, (cname, st) in county_names.items():
    vals = {y: values[y][geoid] for y in YEARS if values[y].get(geoid)}
    if vals:
        out[st]['counties'][geoid.split('US')[1]] = {'name': cname, 'value': vals}

os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    os.remove(f'{OUT}/{f}')
for st, d in sorted(out.items()):
    json.dump(d, open(f'{OUT}/{st}.json', 'w'), separators=(',', ':'))

# FHFA: all-transactions, quarterly, not seasonally adjusted, by metro (or metro division) and by state.
series = {}
for r in csv.DictReader(open(FHFA, encoding='utf-8')):
    if r['hpi_type'] != 'traditional' or r['hpi_flavor'] != 'all-transactions' or r['frequency'] != 'quarterly' or r['level'] not in ('MSA', 'State'):
        continue
    s = series.setdefault(r['place_id'], {'name': r['place_name'], 'from': [int(r['yr']), int(r['period'])], 'index': []})
    want = s['from'][0] * 4 + s['from'][1] - 1 + len(s['index'])
    have = int(r['yr']) * 4 + int(r['period']) - 1
    while want < have:  # a quarter FHFA left out: carried, said in the data as null
        s['index'].append(None)
        want += 1
    s['index'].append(float(r['index_nsa']) if r['index_nsa'] else None)
metro = {}
ws = openpyxl.load_workbook(OMB, read_only=True).active
for row in ws.iter_rows(min_row=4, values_only=True):
    if not row or not row[9] or not row[10]:
        continue
    fips = f'{row[9]}{row[10]}'
    for code in (row[1], row[0]):  # FHFA indexes a divided metro by its divisions
        if code and str(code) in series:
            metro[fips] = str(code)
            break
last = max(s['from'][0] * 4 + s['from'][1] - 1 + len(s['index']) - 1 for s in series.values())
json.dump({'last': [last // 4, last % 4 + 1], 'series': series, 'metro': metro}, open('src/data/homes/fhfa.json', 'w'), separators=(',', ':'))

matched = sum(len(d['places']) for d in out.values())
print(json.dumps(dict(stats), indent=1))
print(f'places with figures {matched}; counties {sum(len(d["counties"]) for d in out.values())}; FHFA series {len(series)}; counties in an indexed metro {len(metro)}; latest quarter {last // 4} Q{last % 4 + 1}')
