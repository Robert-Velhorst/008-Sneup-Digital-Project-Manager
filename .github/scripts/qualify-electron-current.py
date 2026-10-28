"""Owned hosted lock metadata only; never imports app/Electron/SDK code."""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import urllib.request

assert os.environ.get('GITHUB_ACTIONS')=='true'
assert os.environ.get('GITHUB_REPOSITORY')=='Robert-Velhorst/008-Sneup-Digital-Project-Manager'
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'artifacts/electron-current-lock'
OUT.mkdir(parents=True,exist_ok=True)
def save(name,data):
    (OUT/name).write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8')
def snapshot():
    names=subprocess.check_output(['git','ls-files','-z'],cwd=ROOT).decode().split('\0')
    return {name:hashlib.sha256(os.readlink(ROOT/name).encode() if (ROOT/name).is_symlink() else (ROOT/name).read_bytes()).hexdigest() for name in names if name}
def npm(args):
    return subprocess.check_output(['npm',*args],cwd=ROOT,text=True).strip()
def policy():
    values={key:npm(['config','get',key]) for key in ['force','legacy-peer-deps','strict-peer-deps','ignore-scripts']}
    assert values['force']=='false' and values['legacy-peer-deps']=='false'
    assert npm(['--version'])=='12.2.1'
    return values
def prepare():
    save('original-source-hashes.json',snapshot())
    raw=(ROOT/'package.json').read_bytes()
    manifest=json.loads(raw)
    assert manifest['devDependencies']['electron']=='45.0.0' and manifest['packageManager']=='npm@12.2.1'
    with urllib.request.urlopen('https://registry.npmjs.org/electron',timeout=30) as response:
        registry=json.load(response)
    stable=[v for v,m in registry['versions'].items() if re.fullmatch(r'\d+[.]\d+[.]\d+',v) and not m.get('deprecated')]
    target=max(stable,key=lambda v:tuple(map(int,v.split('.'))))
    assert target=='45.1.0' and registry['dist-tags']['latest']==target
    published=datetime.datetime.fromisoformat(registry['time'][target].replace('Z','+00:00'))
    assert datetime.datetime.now(datetime.timezone.utc)-published>=datetime.timedelta(minutes=1440)
    current=policy()
    save('before-policy.json',current)
    save('input.json',{'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT).decode().strip(),
        'target':target,'published':registry['time'][target],'metadata':registry['versions'][target],
        'normal_command':['npm','install','--package-lock-only','--ignore-scripts','--strict-peer-deps'],
        'full_app_runtime_or_SDK_acceptance':False})
    old=b'"electron": "45.0.0"'
    assert raw.count(old)==1
    candidate=raw.replace(old,b'"electron": "45.1.0"',1)
    (ROOT/'package.json').write_bytes(candidate)
    save('expected-manifest.json',{'sha256':hashlib.sha256(candidate).hexdigest()})
def resolve():
    command=['npm','install','--package-lock-only','--ignore-scripts','--strict-peer-deps']
    with (OUT/'resolve.log').open('wb') as log:
        result=subprocess.run(command,cwd=ROOT,stdout=log,stderr=subprocess.STDOUT,check=False)
    save('resolve-result.json',{'command':command,'returncode':result.returncode})
    raise SystemExit(result.returncode)
def collect():
    before=json.loads((OUT/'original-source-hashes.json').read_text())
    after=snapshot()
    changed=[name for name,value in before.items() if after.get(name)!=value]
    assert before.keys()==after.keys()
    save('source-preservation.json',{'original_payloads':len(before),'changed':changed,
        'all_original_cases_helpers_fixtures_commands_and_other_source_unchanged':set(changed)<={'package.json','package-lock.json'},
        'full_app_runtime_or_SDK_acceptance':False})
    assert set(changed)<={'package.json','package-lock.json'}
    assert after['package.json']==json.loads((OUT/'expected-manifest.json').read_text())['sha256']
    actual=policy()
    assert actual==json.loads((OUT/'before-policy.json').read_text())
    save('after-policy.json',actual)
    for name in ['package.json','package-lock.json']:
        shutil.copyfile(ROOT/name,OUT/name)
parser=argparse.ArgumentParser()
parser.add_argument('phase',choices=['prepare','resolve','collect'])
{'prepare':prepare,'resolve':resolve,'collect':collect}[parser.parse_args().phase]()
