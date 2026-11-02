'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {FakeUri} = require('./fixtures/fakeVscode.cjs');
const {createOpenWithTyporaCommand} = require('../dist/commands/openWithTypora.js');
const {FileNotFoundError, NotARegularFileError} = require('../dist/platform/openInTypora.js');

function setup() {
  const events = {launched:[], errors:[], warnings:[], logs:[], shown:0};
  const editor = FakeUri.file('/tmp/editor B.md');
  let launchImpl = async(uri, application) => { events.launched.push([uri.fsPath,application]); };
  const command = createOpenWithTyporaCommand({
    activeEditorUri:()=>editor,
    typoraPath:()=>'/Applications/Typora.app',
    launch:(uri, application)=>launchImpl(uri, application),
    error:async(message,action)=>{ events.errors.push(message); return action==='Show Output'?'Show Output':undefined; },
    warning:async message=>{ events.warnings.push(message); },
    logger:{
      info:message=>events.logs.push(`[OPEN] ${message}`),
      error:message=>events.logs.push(`[ERROR] ${message}`),
      config:message=>events.logs.push(`[CONFIG] ${message}`),
      show:()=>events.shown++
    }
  });
  return {command,events,setLaunch:callback=>{launchImpl=callback;}};
}

test('Git selected A wins over editor B; command opens first selection only', async () => {
  const {command,events} = setup();
  const A = FakeUri.file('/tmp/staged A.MDX');
  const C = FakeUri.file('/tmp/selected C.md');
  await command({resourceUri:A}, {resourceUri:C});
  assert.deepEqual(events.launched, [[A.fsPath,'/Applications/Typora.app']]);
  assert.match(events.logs[0], /staged A\.MDX.*\[menu\]/);
  await command();
  assert.deepEqual(events.launched.at(-1), ['/tmp/editor B.md','/Applications/Typora.app']);
});

test('invalid selection cannot silently open editor B; untitled, git, and .ts reject', async () => {
  const {command,events} = setup();
  await command({unsupported:true});
  assert.match(events.errors.at(-1), /Cannot resolve/);
  await command({resourceUri:new FakeUri('untitled','/Untitled-1')});
  assert.match(events.warnings.at(-1), /Save this untitled file/);
  await command({resourceUri:new FakeUri('git','/tmp/staged.md')});
  assert.match(events.errors.at(-1), /Only local files/);
  await command(FakeUri.file('/tmp/file.ts'));
  assert.match(events.warnings.at(-1), /Only \.md/);
  assert.equal(events.launched.length, 0);
});

test('missing/nonregular file and launch failure have explicit errors and output shortcut', async () => {
  const {command,events,setLaunch} = setup();
  for (const [problem,expected] of [
    [new FileNotFoundError(), /File no longer exists/],
    [new NotARegularFileError(), /Not a regular file/],
    [new Error('spawn failed'), /Failed to launch Typora.*spawn failed/]
  ]) {
    setLaunch(async()=>{throw problem;});
    await command(FakeUri.file('/tmp/gone.md'));
    assert.match(events.errors.at(-1), expected);
  }
  assert.equal(events.shown, 3);
  assert.equal(events.logs.filter(x=>x.startsWith('[ERROR]')).length, 3);
});
