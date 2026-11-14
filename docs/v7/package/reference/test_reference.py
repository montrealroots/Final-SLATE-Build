import gzip,json,sqlite3,tempfile,unittest
from pathlib import Path
from reference_core import visible,comparable,feature_runtime_eligibility,affected_tasks,validate_graph,apply_reputation
from tmdb_inventory import ingest
ROOT=Path(__file__).resolve().parents[1]
class EngineTests(unittest.TestCase):
 def test_future_result_hidden(self):
  self.assertFalse(visible({'event_date':'2026-03-15','available_on':'2026-03-15'},'2026-01-01'))
 def test_result_visible_on_date(self):
  self.assertTrue(visible({'event_date':'2026-03-15','available_on':'2026-03-15'},'2026-03-15'))
 def test_unknown_publication_hidden(self):self.assertFalse(visible({},'2026-11-13'))
 def test_inference_requires_opt_in(self):
  r={'available_on':'2026-11-10','availability_inferred':True}
  self.assertFalse(visible(r,'2026-11-13'));self.assertTrue(visible(r,'2026-11-13',True))
 def test_metrics_require_matching_scope(self):
  a=dict(metric='views',unit='views',territory='global',period_start='2026-11-02',period_end='2026-11-08',methodology='hours/runtime')
  self.assertTrue(comparable(a,a));self.assertFalse(comparable(a,dict(a,territory='US')));self.assertFalse(comparable(a,dict(a,unit='minutes')))
 def test_partial_eligibility_never_claims_full_approval(self):
  self.assertEqual(feature_runtime_eligibility(40),'ineligible');self.assertEqual(feature_runtime_eligibility(41),'unknown')
 def test_rework_is_transitive_and_scoped(self):
  tasks=[{'id':'script','depends_on':[]},{'id':'shoot','depends_on':['script']},{'id':'edit','depends_on':['shoot']},{'id':'other','depends_on':[]}]
  self.assertEqual(affected_tasks(tasks,'script'),{'script','shoot','edit'})
 def test_cycle_rejected(self):
  with self.assertRaises(ValueError):validate_graph([{'id':'a','depends_on':['b']},{'id':'b','depends_on':['a']}])
 def test_reputation_idempotent_role_scoped_bounded(self):
  s={'scores':{'director':98,'actor':25},'seen':[]};n=apply_reputation(s,'e1','director',7)
  self.assertEqual(n['scores'],{'director':100,'actor':25});self.assertEqual(apply_reputation(n,'e1','director',7),n);self.assertEqual(s['scores']['director'],98)
class InventoryTests(unittest.TestCase):
 def test_resume_keeps_existing_status(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'ids.gz';db=Path(d)/'q.db'
   with gzip.open(p,'wt') as f:f.write('{"id":1}\n{"id":1}\n{"id":2}\n')
   self.assertEqual(ingest(db,'movie',p),2)
   with sqlite3.connect(db) as c:c.execute("UPDATE queue SET status='done' WHERE id=1")
   self.assertEqual(ingest(db,'movie',p),0)
   with sqlite3.connect(db) as c:self.assertEqual(c.execute('SELECT status FROM queue WHERE id=1').fetchone()[0],'done')
 def test_bad_id_rolls_back_whole_import(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'ids.gz';db=Path(d)/'q.db'
   with gzip.open(p,'wt') as f:f.write('{"id":3}\n{"id":true}\n')
   with self.assertRaises(ValueError):ingest(db,'movie',p)
   with sqlite3.connect(db) as c:self.assertEqual(c.execute('SELECT COUNT(*) FROM queue').fetchone()[0],0)
class PacketTests(unittest.TestCase):
 def test_all_json_parses(self):
  for p in (ROOT/'data').glob('*.json'):json.loads(p.read_text())
 def test_award_references_unique_and_resolve(self):
  entities=json.loads((ROOT/'data/entities.json').read_text());sources=json.loads((ROOT/'data/sources.json').read_text())
  ids=[x['id'] for rows in entities.values() for x in rows];self.assertEqual(len(ids),len(set(ids)))
  sourceids={x['id'] for x in sources}
  for r in json.loads((ROOT/'data/award-reference-records.json').read_text()):
   self.assertIn(r['work_id'],ids)
   if r.get('person_id'):self.assertIn(r['person_id'],ids)
   self.assertIn(r['source_id'],sourceids)
 def test_packet_inferred_audience_hidden_in_strict_mode(self):
  for r in json.loads((ROOT/'data/audience-reference-records.json').read_text()):
   self.assertFalse(visible(r,'2026-11-13'))
   self.assertTrue(visible(r,'2026-11-13',True))
 def test_all_blueprints_are_acyclic(self):
  for tasks in json.loads((ROOT/'data/production-blueprints.json').read_text())['pipelines'].values():validate_graph(tasks)
if __name__=='__main__':unittest.main()
