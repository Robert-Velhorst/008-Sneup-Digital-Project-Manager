"""Retain canonical source identity and raw scan results without suppressions."""
from collections import Counter
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

mode, destination = sys.argv[1:]
assert mode in {'before', 'verify'}
assert os.environ.get('RUNNER_ENVIRONMENT') == 'github-hosted'
root = Path(os.environ['GITHUB_WORKSPACE']).resolve()
output = Path(destination).resolve()
assert output.is_relative_to(Path(os.environ['RUNNER_TEMP']).resolve())
assert not output.is_relative_to(root)
output.mkdir(parents=True, exist_ok=True)

def git(*arguments, **kwargs):
    return subprocess.check_output(['git', '-C', str(root), *arguments], **kwargs)

head = git('rev-parse', 'HEAD').decode().strip()
assert head == os.environ['REVIEWED_SHA']
entries = []
for row in git('ls-tree', '-r', '-z', head).split(b'\0'):
    if row:
        metadata, name = row.split(b'\t', 1)
        file_mode, kind, object_id = metadata.split()
        assert kind == b'blob', 'Unexpected submodule: full-source qualification unavailable'
        entries.append((name.decode(), file_mode.decode(), object_id.decode()))
batch = git('cat-file', '--batch', input=''.join(oid+'\n' for _, _, oid in entries).encode())
cursor = 0
payloads = {}
for name, file_mode, object_id in entries:
    end = batch.index(b'\n', cursor)
    fields = batch[cursor:end].split()
    size = int(fields[2])
    payload = batch[end+1:end+1+size]
    assert fields[:2] == [object_id.encode(), b'blob']
    actual = os.readlink(root / name).encode() if file_mode == '120000' else (root / name).read_bytes()
    assert actual == payload, name
    payloads[name] = hashlib.sha256(payload).hexdigest()
    cursor = end + size + 2
assert cursor == len(batch)
identity = dict(head=head, tree=git('rev-parse', 'HEAD^{tree}').decode().strip(),
                tracked_file_sha256=payloads, language=os.environ.get('LANGUAGE'))
if mode == 'before':
    (output/'source-identity.json').write_text(json.dumps(identity, indent=2)+'\n')
else:
    before = json.loads((output/'source-identity.json').read_text())
    assert before == identity
    sarif = json.loads((output/'full-source.sarif').read_text())
    assert sarif.get('runs'), 'Missing scan runs'
    results = [result for run in sarif['runs'] for result in run.get('results', [])]
    notifications = [n for run in sarif['runs'] for invocation in run.get('invocations', [])
                     for n in invocation.get('toolExecutionNotifications', []) if n.get('level') == 'error']
    invocations = [i for run in sarif['runs'] for i in run.get('invocations', [])]
    assert not notifications and all(i.get('executionSuccessful', True) for i in invocations)
    summary = dict(head=head, source_payloads=len(payloads), source_unchanged=True,
        findings=len(results), by_rule=dict(Counter(r.get('ruleId', 'unknown') for r in results)),
        full_source_archive_present=(output/'extracted-source.zip').is_file(),
        source_query_advisory_exclusions_or_PR_diff_pack=False,
        no_findings_removed_or_dismissed=True)
    (output/'raw-result-summary.json').write_text(json.dumps(summary, indent=2)+'\n')
    print(json.dumps(summary))
    assert summary['full_source_archive_present']
    assert not results, 'Full-source findings remain open; no waiver or PR-diff filtering'
