"""Import an authorized, locally downloaded TMDB daily ID gzip into a resumable queue.
No network or credentials. This is ID inventory, NOT a metadata/catalog downloader.
Usage: python tmdb_inventory.py queue.sqlite movie movie_ids_DATE.json.gz
"""
import argparse, gzip, json, sqlite3
TYPES = {'movie','tv','person','collection','network','keyword','company'}

def ingest(database, kind, path):
    if kind not in TYPES: raise ValueError('unsupported entity type')
    with sqlite3.connect(database) as db:
        db.execute('CREATE TABLE IF NOT EXISTS queue (kind TEXT NOT NULL, id INTEGER NOT NULL, status TEXT NOT NULL DEFAULT "pending", PRIMARY KEY(kind,id))')
        before = db.total_changes
        opener = gzip.open if str(path).endswith('.gz') else open
        with opener(path, 'rt', encoding='utf-8') as f:
            for line in f:
                row = json.loads(line)
                identifier = row.get('id')
                if type(identifier) is not int or identifier <= 0:
                    raise ValueError('invalid ID')
                db.execute('INSERT OR IGNORE INTO queue(kind,id) VALUES (?,?)', (kind,identifier))
        return db.total_changes - before

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('database'); parser.add_argument('kind',choices=sorted(TYPES)); parser.add_argument('gzip_file')
    args=parser.parse_args()
    print(json.dumps({'added':ingest(args.database,args.kind,args.gzip_file)}))
