"""Small executable design examples; not a replacement for the game's engine."""
from datetime import date

def visible(record, asof, allow_inferred=False):
    date.fromisoformat(asof)
    available = record.get('available_on')
    if not available or ((record.get('availability_inferred', False) or str(record.get('availability_basis', '')).startswith('inferred')) and not allow_inferred):
        return False
    date.fromisoformat(available)
    return available <= asof and record.get('event_date', available) <= asof

def comparable(a, b):
    keys = ('metric', 'unit', 'territory', 'period_start', 'period_end', 'methodology')
    return all(a.get(k) is not None and a.get(k) == b.get(k) for k in keys)

def feature_runtime_eligibility(runtime_minutes):
    # A known necessary condition is not proof of complete eligibility.
    if runtime_minutes is None: return 'unknown'
    if runtime_minutes <= 40: return 'ineligible'
    return 'unknown'

def validate_graph(tasks):
    graph = {t['id']: set(t['depends_on']) for t in tasks}
    if len(graph) != len(tasks): raise ValueError('duplicate task')
    if any(d not in graph for deps in graph.values() for d in deps):
        raise ValueError('missing dependency')
    pending = dict(graph)
    while pending:
        ready = {k for k, v in pending.items() if not v}
        if not ready: raise ValueError('dependency cycle')
        pending = {k: v - ready for k, v in pending.items() if k not in ready}
    return graph

def affected_tasks(tasks, changed):
    graph = validate_graph(tasks)
    if changed not in graph: raise ValueError('unknown task')
    affected = {changed}
    while True:
        expanded = affected | {k for k,v in graph.items() if v & affected}
        if expanded == affected: return affected
        affected = expanded

def apply_reputation(state, event_id, role, delta):
    # Pure transition: persist result and event identity in the same transaction.
    if role not in ('actor', 'screenwriter', 'producer', 'director'):
        raise ValueError('unknown role')
    result = {'scores': dict(state['scores']), 'seen': list(state['seen'])}
    if event_id in result['seen']: return result
    result['scores'][role] = min(100, max(0, result['scores'].get(role, 0) + delta))
    result['seen'].append(event_id)
    return result
