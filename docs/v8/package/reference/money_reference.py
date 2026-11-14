"""Executable design examples; port into the current TS engine, not a second game runtime."""
import re,calendar
from copy import deepcopy
from datetime import date
MAX_MINOR=9007199254740991

def parse_amount(text, exponent=2):
    if exponent not in (0,2,3):raise ValueError('unsupported exponent in this example')
    # Explicit en-US input contract; localization belongs in the game's adapter.
    if not isinstance(text,str) or not re.fullmatch(r'(?:0|[1-9]\d*|[1-9]\d{0,2}(?:,\d{3})+)(?:\.\d+)?',text.strip()):raise ValueError('invalid amount')
    parts=text.strip().replace(',','').split('.')
    frac=parts[1] if len(parts)==2 else ''
    if len(frac)>exponent:raise ValueError('excess precision')
    amount=int(parts[0])*10**exponent+int(frac.ljust(exponent,'0') or '0')
    if amount>MAX_MINOR:raise ValueError('unsafe amount')
    return amount

def transfer(state,key,source,target,amount):
    if key in state['events']:return deepcopy(state)
    if type(amount) is not int or amount<=0:raise ValueError('positive integer required')
    if source==target:raise ValueError('same account')
    a,b=state['accounts'][source],state['accounts'][target]
    if a['currency']!=b['currency']:raise ValueError('explicit FX required')
    if a['balance']-a.get('held',0)<amount:raise ValueError('insufficient available funds')
    if b['balance']+amount>MAX_MINOR:raise ValueError('overflow')
    out=deepcopy(state);out['accounts'][source]['balance']-=amount;out['accounts'][target]['balance']+=amount
    out['events'][key]={'source':source,'target':target,'amount':amount,'kind':'transfer_not_revenue'}
    return out

def cash_forecast(opening_available,events):
    """All amounts same currency. Inputs are unreserved remaining obligations only.
    Dated inflows require secured=True. Same-day outflows are conservative: before receipts.
    A held obligation is excluded because opening_available already removes its hold.
    """
    balance=opening_available;worst=min(0,balance);first=None;seen=set();rows=[]
    for e in sorted(events,key=lambda x:(x['date'],0 if x['kind']=='out' else 1,x['id'])):
        date.fromisoformat(e['date'])
        if e['id'] in seen:raise ValueError('duplicate event')
        seen.add(e['id'])
        if e.get('already_held') or (e['kind']=='in' and not e.get('secured')):continue
        if e['kind'] not in ('in','out') or type(e['amount']) is not int or e['amount']<0:raise ValueError('bad event')
        balance+=e['amount'] if e['kind']=='in' else -e['amount']
        if balance<0 and first is None:first=e['date']
        worst=min(worst,balance);rows.append({'id':e['id'],'balance':balance})
    return {'firstDeficit':first,'additionalRequired':-worst,'endingBalance':balance,'rows':rows}

def monthly_due(anchor,offset):
    start=date.fromisoformat(anchor)
    month=start.year*12+start.month-1+offset
    y,m=divmod(month,12);m+=1
    return date(y,m,min(start.day,calendar.monthrange(y,m)[1])).isoformat()
