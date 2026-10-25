"""Record ordinary package resolution against the registry's stable latest tags."""
import concurrent.futures
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import urllib.parse
import urllib.request

folder = Path(os.environ['RUNNER_TEMP']) / 'ordinary-graph-evidence'
folder.mkdir(exist_ok=True)
metadata = folder / 'registry-metadata'
metadata.mkdir(exist_ok=True)

def published(name):
    url = 'https://registry.npmjs.org/' + urllib.parse.quote(name, safe='@') + '/latest'
    raw = urllib.request.urlopen(url, timeout=45).read()
    digest = hashlib.sha256(raw).hexdigest()
    (metadata / (digest + '.json')).write_bytes(raw)
    data = json.loads(raw)
    assert data['name'] == name
    return {'name': name, 'url': url, 'version': data['version'], 'sha256': digest,
            'stable': re.fullmatch(r'\d+\.\d+\.\d+(?:\+[0-9A-Za-z.-]+)?', data['version']) is not None,
            'deprecated': data.get('deprecated'), 'dist_integrity': data.get('dist', {}).get('integrity')}

if sys.argv[1] == 'targets':
    path = Path('package.json')
    original = path.read_bytes()
    (folder / 'package-before.json').write_bytes(original)
    (folder / 'lock-before.json').write_bytes(Path('package-lock.json').read_bytes())
    package = json.loads(original)
    removed = package.pop('overrides')
    names = sorted(set(package['dependencies']) | set(package['devDependencies']))
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        records = dict(zip(names, pool.map(published, names)))
    assert all(r['stable'] for r in records.values()), 'A latest direct tag is not stable; no older tag substituted'
    for field in ['dependencies', 'devDependencies']:
        package[field] = {name: records[name]['version'] for name in package[field]}
    assert not package.get('overrides')
    path.write_text(json.dumps(package, indent=2) + '\n')
    (folder / 'direct-stable-targets.json').write_text(json.dumps({'captured_at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'removed_overrides': removed, 'targets': records}, indent=2) + '\n')
    print(json.dumps({'direct_targets': len(records), 'overrides_removed': removed}))
elif sys.argv[1] == 'catalog':
    lock = json.loads(Path('package-lock.json').read_bytes())
    entries = {}
    for path, item in lock['packages'].items():
        if not path:
            continue
        assert not item.get('link'), 'A linked package needs explicit provenance, not omission'
        name = item.get('name') or path.rsplit('node_modules/', 1)[-1]
        assert name and item.get('version'), path
        entries[path] = {'name': name, 'installed_version': item['version'], 'integrity': item.get('integrity')}
    def inspect(name):
        try:
            return published(name)
        except Exception as error:
            return {'name': name, 'error': str(error)}
    names = sorted({r['name'] for r in entries.values()})
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
        records = dict(zip(names, pool.map(inspect, names)))
    mismatches = []
    prereleases = []
    errors = []
    for path, entry in entries.items():
        record = records[entry['name']]
        if 'error' in record:
            errors.append({'path': path, **record})
        elif not record['stable'] or entry['installed_version'] != record['version']:
            mismatches.append({'path': path, **entry, 'published_latest': record['version'], 'published_latest_stable': record['stable']})
        if '-' in entry['installed_version'].split('+', 1)[0]:
            prereleases.append({'path': path, **entry})
    summary = {'captured_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
               'basis': 'Normal npm resolution; every locked package compared with its registry latest tag; unstable tags and query errors fail',
               'lock_entries': len(entries), 'unique_package_names': len(names),
               'mismatches': mismatches, 'prereleases': prereleases, 'query_errors': errors,
               'all_entries': entries, 'registry_records': records,
               'full_stable_graph_is_latest': not (mismatches or prereleases or errors),
               'runtime_SDK_vendor_browser_database_and_live_acceptance': False}
    (folder / 'complete-graph-catalog.json').write_text(json.dumps(summary, indent=2) + '\n')
    print(json.dumps({k: summary[k] for k in ['lock_entries', 'unique_package_names', 'full_stable_graph_is_latest']}))
else:
    raise ValueError('Unsupported metadata operation')
