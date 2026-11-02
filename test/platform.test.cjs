'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {FakeUri} = require('./fixtures/fakeVscode.cjs');
const config = require('../dist/config/typoraConfig.js');
const platform = require('../dist/platform/openInTypora.js');

test('Typora path setting resolves defaults and validates absolute/relative paths', () => {
  assert.equal(config.defaultTyporaPath('darwin'), '/Applications/Typora.app');
  assert.equal(config.defaultTyporaPath('win32'), 'Typora.exe');
  assert.equal(config.defaultTyporaPath('linux'), 'typora');
  assert.equal(config.resolveTyporaPath('  /Custom/Typora.app  ', 'darwin'), '/Custom/Typora.app');
  assert.deepEqual(config.validateTyporaPath('', 'linux', () => false), []);
  assert.equal(config.validateTyporaPath('/missing/app', 'darwin', () => false).length, 1);
  assert.equal(config.validateTyporaPath('C:\\missing\\Typora.exe', 'win32', () => false).length, 1);
  assert.equal(config.validateTyporaPath('./relative/app', 'linux').length, 1);
  assert.equal(config.validateTyporaPath(15, 'darwin').length, 1);
});

test('platform launch command: macOS separated argv, Linux direct, Windows cmd start', () => {
  const name = '/tmp/中文 with & spaces.MD';
  assert.deepEqual(platform.buildLaunchCommand('/Applications/Typora.app', name, 'darwin').args,
    ['-a', '/Applications/Typora.app', name]);
  const linux = platform.buildLaunchCommand('/usr/bin/typora', name, 'linux');
  assert.equal(linux.executable, '/usr/bin/typora');
  assert.deepEqual(linux.args, [name]);
  const win = platform.buildLaunchCommand('C:\\Program Files\\Typora\\Typora.exe', 'C:\\资料\\my file.MD', 'win32');
  assert.equal(win.executable, 'cmd.exe');
  assert.deepEqual(win.args.slice(0,4), ['/d','/v:off','/s','/c']);
  assert.match(win.args[4], /^start "" /);
  assert.match(win.args[4], /"C:\\资料\\my file\.MD"/);
  assert.equal(win.options.windowsVerbatimArguments, true);
  assert.throws(() => platform.buildLaunchCommand('typora', 'C:\\bad"name.md', 'win32'));
});

test('file must exist and be regular before launching once; only local file schemes', async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'typora-test-'));
  try {
    const file = path.join(folder, '中文 A.MD');
    await fs.writeFile(file, '# heading');
    const calls = [];
    await platform.openInTypora(FakeUri.file(file), '/Applications/Typora.app', 'darwin', async command => calls.push(command));
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].args, ['-a', '/Applications/Typora.app', file]);
    await assert.rejects(platform.openInTypora(FakeUri.file(file + '.gone'), 'typora', 'linux', async () => {throw Error('unexpected run');}), platform.FileNotFoundError);
    await assert.rejects(platform.openInTypora(FakeUri.file(folder), 'typora', 'linux', async () => {throw Error('unexpected run');}), platform.NotARegularFileError);
    await assert.rejects(platform.openInTypora(new FakeUri('git',file), 'typora', 'linux', async () => {throw Error('unexpected run');}), platform.UnsupportedUriError);
  } finally { await fs.rm(folder, {recursive:true,force:true}); }
});
