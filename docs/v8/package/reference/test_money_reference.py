import unittest,json
from pathlib import Path
from money_reference import parse_amount,transfer,cash_forecast,monthly_due
class MoneyTests(unittest.TestCase):
 def test_custom_budgets(self):
  self.assertEqual(parse_amount('20,000'),2000000);self.assertEqual(parse_amount('2,000,000'),200000000)
 def test_minor_units(self):
  self.assertEqual(parse_amount('123',0),123);self.assertEqual(parse_amount('1.234',3),1234)
 def test_invalid_inputs(self):
  for x in ['-1','NaN','Infinity','2e6','1,00','1.234','20.000,00','999999999999999999999999']:
   with self.assertRaises(ValueError):parse_amount(x)
 def test_transfer_conserves_and_retries(self):
  s={'accounts':{'p':{'currency':'USD','balance':2500000000},'c':{'currency':'USD','balance':0}},'events':{}}
  n=transfer(s,'fund','p','c',200000000)
  self.assertEqual(sum(a['balance'] for a in n['accounts'].values()),2500000000)
  self.assertEqual(transfer(n,'fund','p','c',200000000),n)
  self.assertEqual(s['accounts']['p']['balance'],2500000000)
 def test_hold_prevents_double_spend(self):
  s={'accounts':{'p':{'currency':'USD','balance':100,'held':80},'c':{'currency':'USD','balance':0}},'events':{}}
  with self.assertRaises(ValueError):transfer(s,'bad','p','c',30)
  self.assertEqual(s['events'],{})
 def test_fx_needs_explicit_conversion(self):
  s={'accounts':{'p':{'currency':'USD','balance':100},'c':{'currency':'GBP','balance':0}},'events':{}}
  with self.assertRaises(ValueError):transfer(s,'bad','p','c',10)
 def test_delivery_money_cannot_fund_deposit(self):
  r=cash_forecast(2000000,[{'id':'deposit','kind':'out','date':'2026-01-02','amount':3000000},{'id':'delivery','kind':'in','secured':True,'date':'2026-04-01','amount':10000000}])
  self.assertEqual(r['firstDeficit'],'2026-01-02');self.assertEqual(r['additionalRequired'],1000000)
 def test_uncertain_funding_not_counted(self):
  r=cash_forecast(0,[{'id':'offer','kind':'in','date':'2026-01-01','amount':100}]);self.assertEqual(r['endingBalance'],0)
 def test_hold_not_deducted_twice(self):
  r=cash_forecast(20,[{'id':'held','kind':'out','date':'2026-01-02','amount':80,'already_held':True}]);self.assertEqual(r['endingBalance'],20)
 def test_duplicate_cash_event_rejected(self):
  e={'id':'a','kind':'out','date':'2026-01-01','amount':1}
  with self.assertRaises(ValueError):cash_forecast(3,[e,e])
 def test_month_anchor_not_thirty_days(self):
  self.assertEqual(monthly_due('2026-01-31',1),'2026-02-28');self.assertEqual(monthly_due('2026-01-31',2),'2026-03-31');self.assertEqual(monthly_due('2028-01-31',1),'2028-02-29')
 def test_price_sources_resolve(self):
  r=Path(__file__).resolve().parents[1];sources={x['id'] for x in json.loads((r/'data/research.json').read_text())}
  for row in json.loads((r/'data/price-examples.json').read_text()):self.assertIn(row['source'],sources)
if __name__=='__main__':unittest.main()
