"""Import the banks and currencies of the old SLATE-REBUILD line into this game (the owner's v8 package, 07 step 4).

Run from the repository root:  python3 -I tools/v8/import_banks.py
It reads docs/v8/package (migration evidence only, never imported code) and writes src/data/banks.json and
src/data/currencies.json. Every product says how sure we are of it:
  primary-observed     read on the provider's own page, with the date (data/price-examples.json, sources B01, B02)
  reported             the old line's research file names its sources and the date read (US, GB, CA)
  legacy-unreverified  the old line's normalized table; nobody has read it again for this game
A fee the record doesn't give is null, never 0: a missing fee is unknown, not free (A10).
"""
import json, os

PKG = 'docs/v8/package'
REF = f'{PKG}/repository-reference/SLATE-REBUILD'
PERIOD_MONTHS = {'month': 1, 'bimonth': 2, 'quarter': 3, 'half': 6, 'year': 12}


def load(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)


cur = load(f'{REF}/src/core/money/currencies.json')
currencies = {code: {'name': c['name'], 'exponent': c['minorUnits']} for code, c in sorted(cur['currencies'].items()) if isinstance(c.get('minorUnits'), int)}


def minor_of(v, code):
    """A decimal string of the old research files as minor units of `code`, exactly."""
    if v is None or v is False:
        return None
    s = str(v)
    whole, _, frac = s.partition('.')
    e = currencies[code]['exponent']
    if len(frac) > e:
        raise ValueError(f'{s} has more decimals than {code}')
    return int(whole) * 10 ** e + int((frac + '0' * e)[:e] or 0)


def waivers(ws, code):
    out = []
    for w in ws or []:
        for k, v in w.items():
            if isinstance(v, dict):
                out.append({'kind': k, 'minor': v['minor']})
            elif isinstance(v, (int, float)):
                out.append({'kind': k, 'age': v})
            else:
                out.append({'kind': k, 'minor': minor_of(v, code)})
    return out


products = []
legacy = load(f'{REF}/src/money/banks/banks.json')['countries']
reported = {}
for cc in ('US', 'GB', 'CA'):
    r = load(f'{REF}/research/sources/money/banks/{cc}.json')
    reported[cc] = r
for cc, lst in sorted(legacy.items()):
    for i, b in enumerate(lst):
        code = b['currency']
        fees = []
        for f in b.get('fees', []):
            if f.get('per') not in PERIOD_MONTHS:
                continue
            fees.append({'event': 'account', 'everyMonths': PERIOD_MONTHS[f['per']], 'minor': f['fee']['minor'],
                         'waivers': waivers(f.get('waived'), code),
                         'changes': [{'from': ch['from'], 'minor': ch['fee']['minor']} for ch in f.get('changes', [])]})
        tr = b.get('transfers') or {}
        dom = tr.get('domestic')
        rep = reported.get(cc)
        rec = {
            'id': f'{cc.lower()}-{i}', 'provider': b['bank'], 'product': b['account'], 'market': cc, 'holder': 'personal',
            'currency': code, 'fees': fees,
            # An account with no fee line in the record: its account fee is "none recorded", not nothing.
            'accountFeeKnown': bool(fees) or b.get('fees') == [] and rep is not None,
            'domesticTransferMinor': (dom['minor'] if isinstance(dom, dict) else minor_of(dom, code)) if dom is not None else None,
            'overdraft': 'not-offered' if b.get('overdraft') is False else ('fee-only' if b.get('overdraft') else 'unknown'),
            'evidence': 'legacy-unreverified', 'source': 'SLATE-REBUILD src/money/banks/banks.json', 'observed': None,
        }
        if rep and any(x['bank'] == b['bank'] for x in rep['banks']):
            rec['evidence'] = 'reported'
            rec['source'] = '; '.join(dict.fromkeys(s['url'] for s in rep['sources']))
            rec['observed'] = max(s.get('read', '') for s in rep['sources']) or None
            rec['accountFeeKnown'] = True
        products.append(rec)

# Business products the owner's package observed on the providers' own pages (data/price-examples.json).
research = {s['id']: s for s in load(f'{PKG}/data/research.json')}
for p in load(f'{PKG}/data/price-examples.json'):
    if p['id'] == 'chase-business-monthly':
        products.append({'id': 'us-chase-business-complete', 'provider': 'Chase', 'product': 'Business Complete Checking', 'market': 'US', 'holder': 'business', 'currency': 'USD',
                         'fees': [{'event': 'account', 'everyMonths': 1, 'minor': p['amountMinor'], 'waivers': [{'kind': 'balance', 'minor': p['waiverExample']['minimumDailyBalanceMinor']}], 'changes': [],
                                   'waiversPartial': True}],
                         'accountFeeKnown': True, 'domesticTransferMinor': None, 'overdraft': 'unknown', 'evidence': 'primary-observed', 'source': research[p['source']]['url'], 'observed': p['observed']})
    if p['id'] == 'wise-us-details':
        products.append({'id': 'us-wise-business', 'provider': 'Wise', 'product': 'Business account details', 'market': 'US', 'holder': 'business', 'currency': 'USD',
                         'fees': [], 'openingMinor': p['amountMinor'], 'accountFeeKnown': False, 'domesticTransferMinor': None, 'inboundWireMinor': 611,
                         'overdraft': 'unknown', 'evidence': 'primary-observed', 'source': research[p['source']]['url'], 'observed': p['observed']})

os.makedirs('src/data', exist_ok=True)
with open('src/data/currencies.json', 'w', encoding='utf-8') as f:
    json.dump({'published': cur['published'], 'source': 'ISO 4217, by way of SLATE-REBUILD src/core/money/currencies.json', 'currencies': currencies}, f, ensure_ascii=False, separators=(',', ':'))
    f.write('\n')
with open('src/data/banks.json', 'w', encoding='utf-8') as f:
    json.dump({'imported': '2026-11-14', 'products': products}, f, ensure_ascii=False, separators=(',', ':'))
    f.write('\n')
by = {}
for p in products:
    by[p['evidence']] = by.get(p['evidence'], 0) + 1
print(len(products), 'products in', len({p['market'] for p in products}), 'markets;', by, ';', len(currencies), 'currencies')
