#!/usr/bin/env bash
# Final SLATE Build - Claude Code cloud environment setup script (2026-11-05).
# Paste this whole file into: Environment > Edit > Setup script (replaces the earlier installer).
# It changes no repository files. It installs single-agent developer tooling only.
#
# Inventory (all pinned or manifest-verified; nothing here asks for an API key or a login):
#   npm (isolated in /opt/final-slate-tools/npm): @playwright/cli 0.1.23, @playwright/mcp 0.0.84,
#     typescript 6.0.2 (7.x has no tsserver.js and silently breaks the LSP), typescript-language-server 6.0.3,
#     ctx7 0.9.0 (anonymous Context7 CLI)
#   Graphify: PyPI graphifyy==0.9.103 via uv (local CLI; GRAPHIFY_BACKEND=none; no Cloud, no skill)
#   RTK OSS: rtk-ai/rtk v1.1.0 Apache-2.0 build, sha256 pinned (NOT crates.io "rtk", a different project)
#   Playwright MCP: one user-scope registration, headless isolated Chromium, shares the CLI's browsers
#   Plugins: typescript-lsp, frontend-design, superpowers, pr-review-toolkit, security-guidance
#     (@claude-plugins-official); agent-skills@addy-agent-skills; impeccable@impeccable;
#     caveman@caveman; ponytail@ponytail
#   Guards: settings env (GRAPHIFY_BACKEND=none, Security Guidance LLM reviews off, Impeccable Apply
#     in chat, Caveman off, Ponytail lite), permissions.deny Agent/Workflow, ~/.claude/CLAUDE.md rules.
#
# Setup always exits 0 so a network hiccup cannot block the session. Exit 0 is NOT readiness:
#   /opt/final-slate-tools/install-report.json records PASS/WARN/FAIL for every step.
# In each new session run:   slate-ready browsers ; slate-ready verify
# Re-run a failed or budget-cut install with:   slate-ready install   (idempotent)
#
# Sources: code.claude.com/docs/en/claude-code-on-the-web, code.claude.com/docs/en/discover-plugins,
#   github.com/anthropics/claude-plugins-official, github.com/addyosmani/agent-skills,
#   github.com/obra/superpowers, github.com/pbakaus/impeccable, github.com/JuliusBrussee/caveman,
#   github.com/DietrichGebert/ponytail, github.com/Graphify-Labs/graphify, pypi.org/project/graphifyy,
#   github.com/rtk-ai/rtk (INSTALL.md), github.com/microsoft/playwright-mcp,
#   github.com/microsoft/playwright-cli, context7.com/docs/clients/cli
(
  umask 022
  if [ "$(id -u)" -ne 0 ]; then
    echo 'SETUP INCOMPLETE: use the root Ubuntu Claude cloud environment. No changes made.'
    exit 0
  fi
  if ! command -v python3 >/dev/null 2>&1; then
    echo 'SETUP INCOMPLETE: Python 3 is missing.'
    exit 0
  fi
  slate_tools_root="${SLATE_ROOT:-/opt/final-slate-tools}"
  slate_bin="${SLATE_BIN:-/usr/local/bin}"
  mkdir -p "$slate_tools_root" "$slate_bin" || exit 0
  chmod 700 "$slate_tools_root"
  cat > "$slate_tools_root/manager.py" <<'PY'
#!/usr/bin/env python3
"""Final SLATE tooling manager: install | browsers | verify.

Single-agent tooling only. Every step is recorded as PASS, WARN or FAIL in a JSON
report; nothing is assumed ready because an install command exited zero.
"""
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time

HOME = Path.home()
ROOT = Path(os.environ.get('SLATE_ROOT', '/opt/final-slate-tools'))
BIN = Path(os.environ.get('SLATE_BIN', '/usr/local/bin'))
PROFILE = Path(os.environ.get('SLATE_PROFILE', '/etc/profile.d/final-slate.sh'))
CLAUDE_DIR = Path(os.environ.get('CLAUDE_CONFIG_DIR', HOME / '.claude'))
CLAUDE_JSON = CLAUDE_DIR / '.claude.json' if os.environ.get('CLAUDE_CONFIG_DIR') else HOME / '.claude.json'
USER_BIN = Path(os.environ.get('UV_TOOL_BIN_DIR', HOME / '.local/bin'))
XDG = Path(os.environ.get('XDG_CONFIG_HOME', HOME / '.config'))
NPM = ROOT / 'npm'
LOGS = ROOT / 'logs'
LOGS.mkdir(parents=True, exist_ok=True)

# Exact pins. TypeScript stays on 6.x: 7.x ships no lib/tsserver.js, which silently
# breaks typescript-language-server (hover/definition return nothing).
NPM_PACKAGES = ['@playwright/cli@0.1.23', '@playwright/mcp@0.0.84', 'typescript@6.0.2',
                'typescript-language-server@6.0.3', 'ctx7@0.9.0']
LINKS = ['playwright-cli', 'playwright-mcp', 'typescript-language-server', 'ctx7']
GRAPHIFY_PIN = 'graphifyy==0.9.103'          # official PyPI name (double y); Graphify-Labs/graphify
RTK_VERSION = 'v1.1.0'                        # rtk-ai/rtk, Apache-2.0 OSS edition
RTK_ASSETS = {'x86_64': ('rtk-oss-x86_64-unknown-linux-musl.tar.gz',
                         '4dec94a64035e08189ae82fd5408fe4ae9ae27a665fc07e3e3ec3c4c2d8e8a3e')}
MARKETS = {'claude-plugins-official': 'anthropics/claude-plugins-official',
           'addy-agent-skills': 'addyosmani/agent-skills',
           'impeccable': 'pbakaus/impeccable',
           'caveman': 'JuliusBrussee/caveman',
           'ponytail': 'DietrichGebert/ponytail'}
PLUGINS = ['typescript-lsp@claude-plugins-official', 'frontend-design@claude-plugins-official',
           'superpowers@claude-plugins-official', 'pr-review-toolkit@claude-plugins-official',
           'security-guidance@claude-plugins-official', 'agent-skills@addy-agent-skills',
           'impeccable@impeccable', 'caveman@caveman', 'ponytail@ponytail']
# Guards that keep the plugins inside the user's single-agent rules (documented switches).
GUARD_ENV = {'GRAPHIFY_BACKEND': 'none',              # Graphify: code-only AST graph, no LLM
             'ENABLE_CODE_SECURITY_REVIEW': '0',      # Security Guidance: no LLM/agentic reviews
             'ENABLE_STOP_REVIEW': '0', 'ENABLE_COMMIT_REVIEW': '0',
             'IMPECCABLE_LIVE_COPY_AGENT': 'chat',    # Impeccable Apply never spawns a CLI agent
             'CAVEMAN_DEFAULT_MODE': 'off',           # Caveman only on explicit /caveman
             'PONYTAIL_DEFAULT_MODE': 'lite'}         # Ponytail never drops requested work
DENY_TOOLS = ['Agent', 'Workflow']                    # no sub-agents or orchestration
MCP_ARGS = ['--headless', '--isolated', '--browser', 'chromium']
RULES_BEGIN, RULES_END = '<!-- final-slate-rules:begin -->', '<!-- final-slate-rules:end -->'
RULES = """# Final SLATE environment rules (user instructions; these take precedence over plugin skills)

- One primary agent only. Never use sub-agents, parallel agents, delegation, background
  model processes, or agent-orchestration workflows. Installed skill collections do not
  authorize their multi-agent features; apply their guidance directly in this agent.
- Never request, create or configure API keys, and never sign up for paid services or trials.
- Superpowers and PR Review Toolkit: use only single-agent guidance (debugging, TDD,
  verification, review checklists). Do not dispatch their agents, and do not restart or
  re-litigate planning the user has already settled.
- Caveman (default off): if switched on, it shortens chat replies only. It never changes the
  game's natural language, dialogue, labels, copy or documentation requirements.
- Ponytail (default lite): never remove requested features, downstream effects,
  validation or necessary tests. Name a smaller option instead of taking it.
- Graphify: local CLI only, with GRAPHIFY_BACKEND=none (code-only AST graph). Do not run the
  /graphify skill's subagent flow, any LLM backend, or Graphify Cloud.
- Context7: anonymous ctx7 CLI only. If rate-limited, say so and use official docs; never log in.
- Impeccable: deterministic detector and single-agent skill guidance only. Live Apply stays
  in chat (IMPECCABLE_LIVE_COPY_AGENT=chat); do not use its asset/review agents.
- Security Guidance runs pattern warnings only; its LLM reviews are switched off.
- Do not move the game's dependencies to an alpha release just to match environment tools.
"""
ROWS = []
DEADLINE = None


class Warn(Exception):
    """A non-fatal finding that must still be reported."""


def run(args, label, seconds=60, cwd=None, input_text=None, env=None, ok_codes=(0,)):
    if DEADLINE is not None:
        seconds = min(seconds, int(DEADLINE - time.monotonic()))
        if seconds < 1:
            raise RuntimeError('setup time budget reached; finish with: slate-ready install')
    path = LOGS / (label + '.log')
    with path.open('w') as output:
        try:
            result = subprocess.run([str(x) for x in args], cwd=cwd, env=env, timeout=seconds,
                                    stdout=output, stderr=subprocess.STDOUT,
                                    input=input_text, text=True if input_text is not None else None,
                                    stdin=None if input_text is not None else subprocess.DEVNULL)
        except subprocess.TimeoutExpired:
            raise RuntimeError(f'timeout after {seconds}s; see {path}') from None
    text = path.read_text(errors='replace')
    if result.returncode not in ok_codes:
        raise RuntimeError(f'exit {result.returncode}; see {path}')
    return text if len(ok_codes) == 1 else (result.returncode, text)


def check(name, action):
    try:
        row = dict(name=name, status='PASS', detail=str(action() or 'completed'))
    except Warn as e:
        row = dict(name=name, status='WARN', detail=str(e))
    except Exception as e:
        row = dict(name=name, status='FAIL', detail=str(e))
    ROWS.append(row)
    print(f"{row['status']} {name}: {row['detail']}", flush=True)
    return row['status'] != 'FAIL'


def need(path, what):
    if not Path(path).exists():
        raise RuntimeError(f'{what} missing at {path}')
    return Path(path)


def node_script(label, code, seconds=90, args=()):
    with tempfile.TemporaryDirectory(prefix='slate-' + label + '-') as work:
        f = Path(work) / 'check.cjs'
        f.write_text(code)
        return run(['node', f, *args], label, seconds, cwd=NPM).strip()


# ---------------------------------------------------------------- install steps
def write_guards():
    settings_path = CLAUDE_DIR / 'settings.json'
    CLAUDE_DIR.mkdir(parents=True, exist_ok=True)
    settings = json.loads(settings_path.read_text()) if settings_path.exists() else {}
    settings.setdefault('env', {}).update(GUARD_ENV)
    deny = settings.setdefault('permissions', {}).setdefault('deny', [])
    deny.extend(t for t in DENY_TOOLS if t not in deny)
    settings_path.write_text(json.dumps(settings, indent=2) + '\n')
    for tool, mode in (('caveman', 'off'), ('ponytail', 'lite')):
        cfg = XDG / tool / 'config.json'
        cfg.parent.mkdir(parents=True, exist_ok=True)
        data = json.loads(cfg.read_text()) if cfg.exists() else {}
        data['defaultMode'] = mode
        cfg.write_text(json.dumps(data, indent=2) + '\n')
    PROFILE.parent.mkdir(parents=True, exist_ok=True)
    PROFILE.write_text('export GRAPHIFY_BACKEND=none\n')
    md = CLAUDE_DIR / 'CLAUDE.md'
    block = f'{RULES_BEGIN}\n{RULES}{RULES_END}\n'
    old = md.read_text() if md.exists() else ''
    if RULES_BEGIN in old and RULES_END in old:
        new = re.sub(re.escape(RULES_BEGIN) + '.*?' + re.escape(RULES_END) + r'\n?', lambda m: block, old, flags=re.S)
    else:
        new = (old.rstrip() + '\n\n' if old.strip() else '') + block
    md.write_text(new)
    return 'settings env + deny rules merged (existing keys kept); caveman=off, ponytail=lite; CLAUDE.md rules block current'


def install_node():
    NPM.mkdir(parents=True, exist_ok=True)
    if not (NPM / 'package.json').exists():
        (NPM / 'package.json').write_text('{"name":"final-slate-environment-tools","private":true}\n')
    major, minor = map(int, run(['node', '-p', 'process.versions.node'], 'node-version').split('.')[:2])
    packages = [p for p in NPM_PACKAGES if not (p.startswith('ctx7@') and (major, minor) < (22, 13))]
    run(['npm', 'install', '--prefix', NPM, '--save-exact', '--no-audit', '--no-fund', *packages], 'npm-install', 150)
    missing = sorted(set(NPM_PACKAGES) - set(packages))
    if missing:
        raise Warn(f'installed {packages}; skipped {missing}: Context7 CLI needs Node >= 22.13')
    return 'exact pins installed: ' + ', '.join(packages)


def link(name):
    target = NPM / 'node_modules/.bin' / name
    need(target, name + ' executable')
    dest = BIN / name
    if dest.exists() or dest.is_symlink():
        if dest.resolve() != target.resolve():
            raise RuntimeError(f'{dest} belongs to another install; preserved. Use {target} explicitly')
    else:
        BIN.mkdir(parents=True, exist_ok=True)
        dest.symlink_to(target)
    return str(dest)


def claude_json():
    return json.loads(CLAUDE_JSON.read_text()) if CLAUDE_JSON.exists() else {}


def playwright_servers():
    """Every MCP registration that launches Playwright MCP, in any scope."""
    found = []
    data = claude_json()
    scopes = [('user', data.get('mcpServers') or {})]
    scopes += [('project ' + k, (v or {}).get('mcpServers') or {}) for k, v in (data.get('projects') or {}).items()]
    for scope, servers in scopes:
        for name, spec in servers.items():
            text = json.dumps(spec)
            if 'playwright-mcp' in text or '@playwright/mcp' in text:
                found.append(f'{scope}:{name}')
    settings = CLAUDE_DIR / 'settings.json'
    enabled = json.loads(settings.read_text()).get('enabledPlugins', {}) if settings.exists() else {}
    if enabled.get('playwright@claude-plugins-official'):
        found.append('plugin:playwright@claude-plugins-official')
    return found


def register_mcp():
    ours = str(NPM / 'node_modules/.bin/playwright-mcp')
    current = (claude_json().get('mcpServers') or {}).get('playwright')
    if current is None:
        others = playwright_servers()
        if others:
            raise RuntimeError(f'Playwright MCP already registered as {others}; not adding a duplicate')
        run(['claude', 'mcp', 'add', '--scope', 'user', 'playwright', '--', ours, *MCP_ARGS], 'mcp-add', 60)
    elif current.get('command') != ours:
        raise RuntimeError(f"user server 'playwright' runs {current.get('command')}; preserved, not replaced")
    servers = playwright_servers()
    if servers != ['user:playwright']:
        raise RuntimeError(f'expected exactly one Playwright MCP registration, found {servers}')
    return 'one user-scope registration: playwright-mcp ' + ' '.join(MCP_ARGS)


def install_rtk():
    dest = USER_BIN / 'rtk'
    if dest.exists() and RTK_VERSION.lstrip('v') in run([dest, '--version'], 'rtk-version'):
        return f'rtk {RTK_VERSION} already present at {dest}'
    arch = os.uname().machine
    if arch not in RTK_ASSETS:
        raise RuntimeError(f'no pinned RTK OSS asset for {arch}; see https://github.com/rtk-ai/rtk/blob/master/INSTALL.md')
    asset, pinned = RTK_ASSETS[arch]
    base = f'https://github.com/rtk-ai/rtk/releases/download/{RTK_VERSION}/'
    with tempfile.TemporaryDirectory(prefix='slate-rtk-') as work:
        sums, archive = Path(work) / 'checksums.txt', Path(work) / asset
        run(['curl', '-fsSL', base + 'checksums.txt', '-o', sums], 'rtk-checksums', 60)
        run(['curl', '-fsSL', base + asset, '-o', archive], 'rtk-download', 120)
        actual = hashlib.sha256(archive.read_bytes()).hexdigest()
        listed = next((l.split()[0] for l in sums.read_text().splitlines() if l.endswith(' ' + asset)), None)
        if actual != pinned or actual != listed:
            raise RuntimeError(f'RTK checksum mismatch (actual {actual}, pinned {pinned}, release {listed}); not installed')
        with tarfile.open(archive) as tar:
            member = tar.getmember('rtk')
            if not member.isfile():
                raise RuntimeError('unexpected RTK archive layout; not installed')
            USER_BIN.mkdir(parents=True, exist_ok=True)
            with tar.extractfile(member) as src, open(Path(work) / 'rtk', 'wb') as out:
                out.write(src.read())
        shutil.move(str(Path(work) / 'rtk'), dest)
        dest.chmod(0o755)
    return f'rtk OSS {RTK_VERSION} installed to {dest} (sha256 verified twice); auto-rewrite hook not enabled'


def uv_bin():
    found = shutil.which('uv') or ('/root/.local/bin/uv' if Path('/root/.local/bin/uv').exists() else None)
    if not found:
        raise RuntimeError('uv not found; Graphify needs uv (official: uv tool install graphifyy)')
    return found


def install_graphify():
    exe = USER_BIN / 'graphify'
    want = GRAPHIFY_PIN.split('==')[1]
    if exe.exists() and want in run([exe, '--version'], 'graphify-version'):
        return f'graphify {want} already present'
    env = dict(os.environ, UV_TOOL_BIN_DIR=str(USER_BIN))
    run([uv_bin(), 'tool', 'install', '--force', GRAPHIFY_PIN], 'graphify-install', 200, env=env)
    return f'{GRAPHIFY_PIN} installed with uv; Claude skill NOT registered (it dispatches subagents)'


def market_location(name):
    data = json.loads(run(['claude', 'plugin', 'marketplace', 'list', '--json'], 'market-list'))
    item = next((x for x in data if x.get('name') == name), None)
    return Path(item['installLocation']) if item and item.get('installLocation') else None


def install_market(name, repo):
    if market_location(name) is None:
        run(['claude', 'plugin', 'marketplace', 'add', repo], 'market-add-' + name, 150)
    location = market_location(name)
    if location is None:
        raise RuntimeError(f'marketplace {name} from {repo} not registered after add')
    manifest = json.loads(need(location / '.claude-plugin/marketplace.json', 'marketplace manifest').read_text())
    if manifest.get('name') != name:
        raise RuntimeError(f"{repo} now declares marketplace '{manifest.get('name')}', not '{name}'; not guessing")
    return f'{name} <- {repo}'


def plugins():
    data = json.loads(run(['claude', 'plugin', 'list', '--json'], 'plugin-list'))
    if not isinstance(data, list):
        raise RuntimeError('unrecognized plugin list format')
    return data


def manifest_has(plugin_id):
    name, market = plugin_id.split('@')
    location = market_location(market)
    if location is None:
        raise RuntimeError(f'marketplace {market} not registered')
    manifest = json.loads((location / '.claude-plugin/marketplace.json').read_text())
    if not any(p.get('name') == name for p in manifest.get('plugins', [])):
        raise RuntimeError(f"'{name}' is not in the {market} manifest; it may have been renamed; not guessing")


def plugin_check(plugin_id):
    item = next((x for x in plugins() if x.get('id') == plugin_id), None)
    if not item or item.get('enabled') is not True or item.get('errors'):
        raise RuntimeError('not installed/enabled cleanly')
    return f"v{item.get('version')} installed and enabled; loads in sessions started after install"


def install_plugin(plugin_id):
    manifest_has(plugin_id)
    item = next((x for x in plugins() if x.get('id') == plugin_id), None)
    if not item:
        run(['claude', 'plugin', 'install', plugin_id, '--scope', 'user'], 'install-' + plugin_id, 150)
        item = next((x for x in plugins() if x.get('id') == plugin_id), None)
    if item and item.get('enabled') is not True:
        run(['claude', 'plugin', 'enable', plugin_id, '--scope', 'user'], 'enable-' + plugin_id)
    return plugin_check(plugin_id)


def configure_ponytail():
    values = json.dumps({'ledger': 'true', 'webhookUrl': '', 'sendNames': 'false', 'webhookToken': ''})
    run(['claude', 'plugin', 'configure', 'ponytail@ponytail', '--values-stdin'], 'ponytail-configure', 60, input_text=values)
    return 'local task ledger only; no webhook, no task names sent'


# ---------------------------------------------------------------- browsers
def playwright_cli_file():
    script = ("const {createRequire}=require('module');const p=require('path');"
              "const r=createRequire(require.resolve('@playwright/cli/package.json'));"
              "process.stdout.write(p.join(p.dirname(r.resolve('playwright/package.json')),'cli.js'));")
    return run(['node', '-e', script], 'playwright-path', cwd=NPM).strip()


def browser_install():
    run(['node', playwright_cli_file(), 'install', '--with-deps', 'chromium', 'webkit'], 'browser-install', 600)
    return 'Chromium and WebKit for the pinned Playwright (shared by playwright-cli and playwright-mcp)'


# ---------------------------------------------------------------- verify steps
BROWSER_SMOKE = r"""
const {createRequire}=require('module');
const here=createRequire(process.cwd()+'/package.json');   // resolve from the tools dir, not /tmp
const r=createRequire(here.resolve('@playwright/cli/package.json'));
const pw=r('playwright');
const html='<meta name="viewport" content="width=device-width">'+
 '<button onclick="o.textContent=+o.textContent+1">Tap</button><input id=i><output id=o>0</output>'+
 '<canvas id=c width=20 height=20></canvas><script>c.getContext("2d").fillStyle="#f00";c.getContext("2d").fillRect(0,0,20,20);'+
 'addEventListener("keydown",e=>{if(e.key==="ArrowRight")document.title="R"})</script>';
(async()=>{
 for(const [label,type,device] of [['chromium','chromium',null],['webkit','webkit',null],['webkit iPhone 13','webkit','iPhone 13']]){
  const browser=await pw[type].launch();
  try{
   const ctx=await browser.newContext(device?pw.devices[device]:{viewport:{width:1280,height:800}});
   const page=await ctx.newPage(); await page.setContent(html);
   for(let k=0;k<2;k++){ device?await page.tap('button'):await page.click('button'); }
   await page.fill('#i','slate'); await page.keyboard.press('ArrowRight');
   if(!device) await page.setViewportSize({width:390,height:844});
   const got=await page.evaluate(()=>[o.textContent,i.value,document.title,
     Array.from(c.getContext('2d').getImageData(5,5,1,1).data).join(','),innerWidth].join('|'));
   if(got!=='2|slate|R|255,0,0,255|390') throw Error(label+' got '+got);
   console.log('PASS '+label+' '+browser.version()+' click/tap, type, key, canvas, 390px');
  } finally { await browser.close(); }
 }
})().catch(e=>{console.error(e.message);process.exitCode=1});
"""

LSP_PROBE = r"""
const {spawn}=require('child_process');const fs=require('fs');const path=require('path');const os=require('os');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'slate-lsp-'));const file=path.join(dir,'a.ts');const uri='file://'+file;
fs.writeFileSync(file,['export interface Player { name: string; hp: number }',
 'export function heal(p: Player, n: number): Player { return { ...p, hp: p.hp + n }; }',
 'const hero = heal({ name: "x", hp: 1 }, 2);','const bad: number = "oops";',''].join('\n'));
const ls=spawn(path.join(process.cwd(),'node_modules/.bin/typescript-language-server'),['--stdio']);
let buf='',id=0;const pend={},diags=[],logs=[];
const send=o=>{const j=JSON.stringify({jsonrpc:'2.0',...o});ls.stdin.write('Content-Length: '+Buffer.byteLength(j)+'\r\n\r\n'+j)};
ls.stdout.on('data',d=>{buf+=d;for(;;){const m=buf.match(/Content-Length: (\d+)\r\n\r\n/);if(!m)break;const s=m.index+m[0].length,l=+m[1];
 if(buf.length<s+l)break;const msg=JSON.parse(buf.slice(s,s+l));buf=buf.slice(s+l);
 if(msg.id!=null&&pend[msg.id]){pend[msg.id](msg.result);delete pend[msg.id];}
 else if(msg.id!=null&&msg.method)send({id:msg.id,result:null});
 if(msg.method==='window/logMessage')logs.push(msg.params.message);
 if(msg.method==='textDocument/publishDiagnostics')diags.push(...msg.params.diagnostics);}});
const req=(method,params)=>new Promise(r=>{const i=++id;pend[i]=r;send({id:i,method,params})});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 await req('initialize',{processId:process.pid,rootUri:'file://'+dir,capabilities:{textDocument:{hover:{contentFormat:['markdown','plaintext']},publishDiagnostics:{}}}});
 send({method:'initialized',params:{}});
 send({method:'textDocument/didOpen',params:{textDocument:{uri,languageId:'typescript',version:1,text:fs.readFileSync(file,'utf8')}}});
 await wait(4000);
 const hover=await req('textDocument/hover',{textDocument:{uri},position:{line:2,character:7}});
 const def=await req('textDocument/definition',{textDocument:{uri},position:{line:2,character:14}});
 for(let k=0;k<20&&!diags.length;k++)await wait(500);
 const h=JSON.stringify(hover&&hover.contents||'');const ver=(logs.find(l=>/Using Typescript version/.test(l))||'').replace(/ from path.*/,'');
 ls.kill();
 if(!h.includes('const hero: Player'))throw Error('hover empty or wrong ('+h+'); '+(ver||'tsserver not found: TypeScript without lib/tsserver.js?'));
 if(!def||!def.length||def[0].range.start.line!==1)throw Error('definition lookup failed: '+JSON.stringify(def));
 if(!diags.some(d=>/not assignable to type 'number'/.test(d.message)))throw Error('type-error diagnostic missing');
 console.log('hover, definition and diagnostics work ('+ver+')');
})().catch(e=>{console.error(e.message);ls.kill();process.exitCode=1});
"""

MCP_PROBE = r"""
const {spawn}=require('child_process');const http=require('http');
const html='<button onclick="o.textContent=+o.textContent+1">Tap</button><input id=i><output id=o>0</output>'+
 '<script>addEventListener("keydown",e=>{if(e.key==="ArrowRight")document.title="R"})</script>';
const [bin,...args]=process.argv.slice(2);
(async()=>{
 const srv=http.createServer((q,r)=>{r.setHeader('content-type','text/html');r.end(html)}).listen(0,'127.0.0.1');
 await new Promise(r=>srv.on('listening',r));
 const p=spawn(bin,args);let buf='',id=0;const pend={};
 p.stdout.on('data',d=>{buf+=d;let i;while((i=buf.indexOf('\n'))>=0){const l=buf.slice(0,i);buf=buf.slice(i+1);
  if(!l.trim())continue;const m=JSON.parse(l);if(m.id&&pend[m.id]){pend[m.id](m);delete pend[m.id];}}});
 const send=o=>p.stdin.write(JSON.stringify({jsonrpc:'2.0',...o})+'\n');
 const req=(method,params)=>new Promise(r=>{const i=++id;pend[i]=r;send({id:i,method,params})});
 const call=async(name,a)=>{const r=await req('tools/call',{name,arguments:a});
  if(r.error||r.result.isError)throw Error(name+': '+JSON.stringify(r.error||r.result.content).slice(0,300));
  return r.result.content.map(c=>c.text||'').join('\n')};
 const value=t=>(t.split('### Result')[1]||'').trim().split('\n')[0];
 try{
  const init=await req('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'slate-ready',version:'1'}});
  send({method:'notifications/initialized'});
  const tools=(await req('tools/list',{})).result.tools;
  const click=tools.find(t=>t.name==='browser_click');
  const key=click&&click.inputSchema.properties.target?'target':'ref';
  await call('browser_navigate',{url:'http://127.0.0.1:'+srv.address().port+'/'});
  const snap=await call('browser_snapshot',{});
  const btn=(snap.match(/button "Tap" \[ref=(\w+)\]/)||[])[1],box=(snap.match(/textbox \[ref=(\w+)\]/)||[])[1];
  if(!btn||!box)throw Error('snapshot lacks expected refs');
  for(let k=0;k<2;k++)await call('browser_click',{element:'Tap button',[key]:btn});
  const clicks=value(await call('browser_evaluate',{function:'() => o.textContent'}));
  await call('browser_type',{element:'text box',[key]:box,text:'slate'});
  await call('browser_press_key',{key:'ArrowRight'});
  await call('browser_resize',{width:390,height:844});
  const all=value(await call('browser_evaluate',{function:'() => [o.textContent,i.value,document.title,innerWidth].join("|")'}));
  await call('browser_close',{}).catch(()=>{});
  if(clicks!=='"2"'||all!=='"2|slate|R|390"')throw Error('unexpected page state clicks='+clicks+' all='+all);
  console.log(init.result.serverInfo.name+' '+init.result.serverInfo.version+': '+tools.length+' tools; navigate, 2 clicks, type, key, resize verified');
 }finally{p.kill();srv.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
"""


def versions():
    out = []
    for name in LINKS:
        out.append(name + ' ' + run([NPM / 'node_modules/.bin' / name, '--version'], name + '-version').strip().splitlines()[-1])
    tsc = run([NPM / 'node_modules/.bin/tsc', '--version'], 'tsc-version').strip()
    need(NPM / 'node_modules/typescript/lib/tsserver.js', 'tsserver.js (TypeScript 7.x lacks it; keep 6.x)')
    return '; '.join(out + ['tsc ' + tsc])


def compile_fixture():
    with tempfile.TemporaryDirectory(prefix='slate-ts-check-') as work:
        f = Path(work) / 'check.ts'
        f.write_text('const value: number = 1;\nexport {value};\n')
        run([NPM / 'node_modules/.bin/tsc', '--noEmit', '--strict', f], 'typescript-compile', cwd=work)
    return 'strict TypeScript fixture compiled'


def guards_check():
    settings = json.loads(need(CLAUDE_DIR / 'settings.json', 'settings.json').read_text())
    env = settings.get('env', {})
    wrong = {k: env.get(k) for k, v in GUARD_ENV.items() if env.get(k) != v}
    deny = settings.get('permissions', {}).get('deny', [])
    if wrong or any(t not in deny for t in DENY_TOOLS):
        raise RuntimeError(f'guard settings drifted: env {wrong}, deny {deny}')
    for tool, mode in (('caveman', 'off'), ('ponytail', 'lite')):
        if json.loads(need(XDG / tool / 'config.json', tool + ' config').read_text()).get('defaultMode') != mode:
            raise RuntimeError(f'{tool} defaultMode is not {mode}')
    if RULES_BEGIN not in need(CLAUDE_DIR / 'CLAUDE.md', 'CLAUDE.md').read_text():
        raise RuntimeError('CLAUDE.md rules block missing')
    if (CLAUDE_DIR / 'security/agent-sdk-venv').exists():
        raise RuntimeError('Security Guidance Agent SDK venv exists; LLM reviews may have been bootstrapped')
    return 'single-agent guards in place (env, Agent/Workflow denied, caveman off, ponytail lite, rules block)'


def install_path(plugin_id):
    item = next((x for x in plugins() if x.get('id') == plugin_id), None)
    if not item:
        raise RuntimeError(plugin_id + ' not installed')
    return Path(item['installPath'])


def hook_check():
    env = dict(os.environ, **GUARD_ENV)
    with tempfile.TemporaryDirectory(prefix='slate-hooks-') as work:
        event = json.dumps({'session_id': 'slate-ready-hook-check', 'hook_event_name': 'SessionStart',
                            'source': 'startup', 'cwd': work, 'transcript_path': '/dev/null'})
        cave = install_path('caveman@caveman')
        out = run(['node', cave / 'src/hooks/caveman-activate.js'], 'hook-caveman', 30, cwd=work,
                  input_text=event, env=dict(env, CLAUDE_PLUGIN_ROOT=str(cave)))
        if len(out.strip()) > 40:
            raise RuntimeError('caveman injected rules at session start despite defaultMode off')
        pony = install_path('ponytail@ponytail')
        out = run(['node', '-e', f"require({json.dumps(str(pony / 'hooks/ponytail-activate.js'))})"], 'hook-ponytail', 30,
                  cwd=work, input_text=event, env=dict(env, CLAUDE_PLUGIN_ROOT=str(pony)))
        if 'level: lite' not in out:
            raise RuntimeError('ponytail did not start at level lite')
        sg = install_path('security-guidance@claude-plugins-official')
        launcher = sg / 'hooks/sg-python.sh'
        run(['bash', launcher, sg / 'hooks/ensure_agent_sdk.py'], 'hook-sg-bootstrap', 60, cwd=work,
            input_text=event, env=dict(env, CLAUDE_PLUGIN_ROOT=str(sg)))
        (Path(work) / 'ui.js').write_text('el.innerHTML = userName;\n')
        edit = json.dumps({'session_id': 'slate-ready-hook-check', 'hook_event_name': 'PostToolUse', 'tool_name': 'Write',
                           'cwd': work, 'tool_input': {'file_path': work + '/ui.js', 'content': 'el.innerHTML = userName;\n'},
                           'tool_response': {}})
        out = run(['bash', launcher, sg / 'hooks/security_reminder_hook.py'], 'hook-sg-pattern', 60, cwd=work,
                  input_text=edit, env=dict(env, CLAUDE_PLUGIN_ROOT=str(sg)))
        if 'innerHTML' not in out:
            raise RuntimeError('security pattern warning did not fire')
    if (CLAUDE_DIR / 'security/agent-sdk-venv').exists():
        raise RuntimeError('Security Guidance bootstrapped its Agent SDK venv')
    return 'caveman silent (off), ponytail lite, security pattern warning fires, no Agent SDK bootstrap'


def mcp_check():
    servers = playwright_servers()
    if servers != ['user:playwright']:
        raise RuntimeError(f'expected exactly one Playwright MCP registration, found {servers}')
    spec = claude_json()['mcpServers']['playwright']
    return 'registered once; ' + node_script('mcp-probe', MCP_PROBE, 120, [spec['command'], *spec.get('args', [])])


def graphify_check():
    exe = need(USER_BIN / 'graphify', 'graphify')
    env = {k: v for k, v in os.environ.items() if not k.endswith('_API_KEY')}
    env['GRAPHIFY_BACKEND'] = 'none'
    with tempfile.TemporaryDirectory(prefix='slate-graphify-') as work:
        src = Path(work) / 'src'
        src.mkdir()
        (src / 'entity.ts').write_text('export abstract class Entity { abstract update(dt: number): void; }\n')
        (src / 'math.ts').write_text('export function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }\n')
        (src / 'player.ts').write_text("import { Entity } from './entity';\nimport { clamp } from './math';\n"
                                       'export class Player extends Entity { x = 0; update(dt: number) { this.x = clamp(this.x + dt, 0, 320); } }\n')
        run([exe, 'update', '.'], 'graphify-update', 180, cwd=work, env=env)
        graph = json.loads((Path(work) / 'graphify-out/graph.json').read_text())
        report = (Path(work) / 'graphify-out/GRAPH_REPORT.md').read_text()
        rels = {(e.get('source'), e.get('relation'), e.get('target')) for e in graph.get('links', [])}
        if not any(r == 'inherits' and 'player' in s and 'entity' in t for s, r, t in rels):
            raise RuntimeError('graph lacks Player inherits Entity edge')
        if not any(r == 'calls' and 'clamp' in t for s, r, t in rels):
            raise RuntimeError('graph lacks call edge to clamp')
        if 'Token cost: 0 input' not in report:
            raise RuntimeError('graph report shows model token use')
        path = run([exe, 'path', 'Player', 'clamp()'], 'graphify-path', 60, cwd=work, env=env)
    return f"{len(graph['nodes'])} nodes, {len(rels)} edges, 0 model tokens; path query: {path.strip().splitlines()[0]}"


def rtk_check():
    exe = need(USER_BIN / 'rtk', 'rtk')
    version = run([exe, '--version'], 'rtk-version').strip()
    run([exe, 'gain'], 'rtk-gain', 30)
    with tempfile.TemporaryDirectory(prefix='slate-rtk-') as work:
        log = Path(work) / 'sample.log'
        log.write_text(''.join(f'2026-01-01 00:00:{i:02d} INFO tick ok id={i}\n' for i in range(40)) +
                       '2026-01-01 00:01:00 ERROR asset missing: sprites/hero.png\n')
        out = run([exe, 'log', log], 'rtk-log', 30)
        if 'asset missing: sprites/hero.png' not in out:
            raise RuntimeError('rtk log dropped the error line')
        test = Path(work) / 'fake-test.sh'
        test.write_text('#!/bin/sh\necho "ok 1 - passes"\necho "not ok 2 - score resets"\nexit 1\n')
        test.chmod(0o755)
        code, out = run([exe, 'test', test], 'rtk-test', 30, cwd=work, ok_codes=(0, 1))
        if code != 1 or 'not ok 2 - score resets' not in out:
            raise RuntimeError(f'rtk test hid a failure (exit {code})')
    return f'{version} (Token Killer: rtk gain works); keeps error lines and failing exit codes'


def impeccable_check():
    launcher = install_path('impeccable@impeccable') / 'skills/impeccable/scripts/impeccable'
    with tempfile.TemporaryDirectory(prefix='slate-impeccable-') as work:
        page = Path(work) / 'sample.html'
        page.write_text('<html><head><style>body{font-family:Inter}p{color:#9ca3af;background:#6366f1}</style></head>'
                        '<body><h1>Title</h1><h4>Skip</h4><p>Low contrast</p></body></html>')
        code, out = run(['sh', launcher, 'detect', page], 'impeccable-detect', 150, cwd=work, ok_codes=(0, 1, 2))
    found = re.search(r'(\d+) anti-patterns? found', out)
    if not found or int(found.group(1)) < 2:
        raise RuntimeError(f'detector did not flag the sample (exit {code})')
    return f'deterministic detector (no LLM) flagged {found.group(1)} issues in a sample page'


def context7_check():
    ctx7 = need(NPM / 'node_modules/.bin/ctx7', 'ctx7')
    who = run([ctx7, 'whoami'], 'ctx7-whoami', 30).strip().splitlines()[0]
    code, out = run([ctx7, 'library', 'react', 'useEffect cleanup'], 'ctx7-query', 60, ok_codes=tuple(range(256)))
    if 'Context7-compatible library ID' in out:
        return f'anonymous query works ({who})'
    if re.search(r'429|rate.?limit', out, re.I):
        raise Warn('anonymous Context7 is rate-limited; use official docs (no login attempted)')
    raise RuntimeError(f'anonymous query failed (exit {code}); see {LOGS}/ctx7-query.log')


def cli_smoke():
    with tempfile.TemporaryDirectory(prefix='slate-cli-check-') as work:
        script = ("const {createRequire}=require('module');const r=createRequire(require.resolve('@playwright/cli/package.json'));"
                  "process.stdout.write(r('playwright').chromium.executablePath())")
        executable = run(['node', '-e', script], 'chromium-path', cwd=NPM).strip()
        config = Path(work) / 'browser.json'
        config.write_text(json.dumps({'browser': {'browserName': 'chromium',
                                                  'launchOptions': {'executablePath': executable, 'headless': True}}}))
        base = [NPM / 'node_modules/.bin/playwright-cli', '-s=slate-readiness-' + str(os.getpid())]
        try:
            run([*base, 'open', 'about:blank', '--config', config], 'cli-open', 45, cwd=work)
            probe = ("() => { document.body.innerHTML = '<button>Check</button>'; "
                     "return document.querySelector('button').textContent; }")
            text = run([*base, 'eval', probe], 'cli-eval', 30, cwd=work)
            if 'Check' not in text:
                raise RuntimeError('CLI evaluation did not return the fixture text')
            run([*base, 'snapshot'], 'cli-snapshot', 30, cwd=work)
        finally:
            run([*base, 'close'], 'cli-close', 30, cwd=work)
    return 'playwright-cli opened a browser, evaluated a fixture and captured a snapshot'


# ---------------------------------------------------------------- report / main
def report(mode):
    failed = [r['name'] for r in ROWS if r['status'] == 'FAIL']
    warned = [r['name'] for r in ROWS if r['status'] == 'WARN']
    payload = {'mode': mode, 'utc': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'checks': ROWS,
               'all_recorded_checks_passed': bool(ROWS) and not failed, 'failed': failed, 'warnings': warned,
               'needs_new_claude_session': 'Plugins, the LSP tool and the Playwright MCP tools load only in a Claude '
                                           'session started after they were installed.',
               'not_covered': 'Live in-session LSP/skill invocation, the game itself, and physical iPhone tests.'}
    path = ROOT / (mode + '-report.json')
    path.write_text(json.dumps(payload, indent=2) + '\n')
    print(f"Report: {path}" + (f"  FAILED: {', '.join(failed)}" if failed else '') + (f"  WARN: {', '.join(warned)}" if warned else ''))
    return 1 if failed else 0


def main():
    global DEADLINE
    mode = sys.argv[1] if len(sys.argv) > 1 else 'verify'
    if mode not in ('install', 'browsers', 'verify'):
        print('Usage: slate-ready install | browsers | verify')
        return 2
    if mode == 'install' and os.environ.get('SLATE_SETUP_BUDGET'):
        DEADLINE = time.monotonic() + int(os.environ['SLATE_SETUP_BUDGET'])
    for name in ('node', 'npm', 'claude', 'curl'):
        if not shutil.which(name):
            check('prerequisite ' + name, lambda: (_ for _ in ()).throw(RuntimeError('not found on PATH')))
    if ROWS:
        return report(mode)
    if mode == 'install':
        check('Single-agent guards', write_guards)
        if check('Node tools (pinned)', install_node):
            for name in LINKS:
                if (NPM / 'node_modules/.bin' / name).exists():
                    check('command ' + name, lambda name=name: link(name))
            check('Playwright MCP registration', register_mcp)
        check('RTK OSS', install_rtk)
        check('Graphify (local CLI)', install_graphify)
        ready = {name: check('Marketplace ' + name, lambda n=name, r=repo: install_market(n, r))
                 for name, repo in MARKETS.items()}
        for plugin_id in PLUGINS:
            if ready.get(plugin_id.split('@')[1]):
                check('Plugin ' + plugin_id, lambda p=plugin_id: install_plugin(p))
            else:
                check('Plugin ' + plugin_id, lambda: (_ for _ in ()).throw(RuntimeError('marketplace unavailable')))
        if any(r['name'] == 'Plugin ponytail@ponytail' and r['status'] == 'PASS' for r in ROWS):
            check('Ponytail options', configure_ponytail)
        print('NEXT (in the session): slate-ready browsers ; slate-ready verify')
    elif mode == 'browsers':
        check('Browser installation', browser_install)
    else:
        check('Tool versions', versions)
        check('TypeScript compile', compile_fixture)
        check('TypeScript language server (hover/definition/diagnostics)', lambda: node_script('lsp-probe', LSP_PROBE, 60))
        for plugin_id in PLUGINS:
            check('Plugin ' + plugin_id, lambda p=plugin_id: (manifest_has(p), plugin_check(p))[1])
        check('Single-agent guards', guards_check)
        check('Plugin hooks under guards', hook_check)
        check('Browser interaction (Chromium, WebKit, iPhone 13)', lambda: node_script('browser-smoke', BROWSER_SMOKE, 150))
        check('Browser CLI invocation', cli_smoke)
        check('Playwright MCP (protocol-level)', mcp_check)
        check('Graphify code-only graph', graphify_check)
        check('RTK on sample output', rtk_check)
        check('Impeccable detector', impeccable_check)
        check('Context7 anonymous', context7_check)
    return report(mode)


if __name__ == '__main__':
    sys.exit(main())
PY
  chmod 700 "$slate_tools_root/manager.py"
  if [ -e "$slate_bin/slate-ready" ] || [ -L "$slate_bin/slate-ready" ]; then
    if [ "$(readlink -f "$slate_bin/slate-ready")" != "$slate_tools_root/manager.py" ]; then
      echo "SETUP INCOMPLETE: $slate_bin/slate-ready belongs to another installation; preserved."
      exit 0
    fi
  else
    ln -s "$slate_tools_root/manager.py" "$slate_bin/slate-ready" || exit 0
  fi
  # Remaining steps stop cleanly at this budget (seconds); slate-ready install finishes them later.
  if ! SLATE_SETUP_BUDGET="${SLATE_SETUP_BUDGET:-300}" python3 "$slate_tools_root/manager.py" install; then
    echo "SETUP INCOMPLETE: see $slate_tools_root/install-report.json, then run: slate-ready install"
  fi
)
# Cloud setup must still open the session when packages or network need repair.
exit 0
