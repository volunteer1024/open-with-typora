'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const manifest = require('../package.json');
const {SUPPORTED_EXTENSIONS, isSupportedFile} = require('../dist/domain/supportedFiles.js');

const MENUS = [
  'explorer/context',
  'editor/context',
  'editor/title/context',
  'scm/resourceState/context'
];

function fileRule(menu) {
  const when = manifest.contributes.menus[menu][0].when;
  const fragment = when.match(/resourceExtname =~ (\/\^.*\$\/i)/);
  assert.ok(fragment, `missing extension regex in ${menu}: ${when}`);
  const expression = fragment[1];
  return new RegExp(expression.slice(1, expression.lastIndexOf('/')), 'i');
}

test('manifest has correct ID, engines, command, and all four prioritized menus', () => {
  assert.equal(`${manifest.publisher}.${manifest.name}`, 'local.open-with-external');
  assert.equal(manifest.engines.vscode, '^1.85.0');
  assert.equal(manifest.extensionKind[0], 'ui');
  assert.equal(manifest.contributes.commands.length, 1);
  assert.equal(manifest.contributes.commands[0].title, 'Open with Typora');
  assert.deepEqual(Object.keys(manifest.contributes.menus).sort(), MENUS.slice().sort());
  for (const menu of MENUS) {
    const entries = manifest.contributes.menus[menu];
    assert.equal(entries.length, 1);
    assert.equal(entries[0].command, 'openWithExternal.openWithTypora');
    assert.equal(entries[0].group, 'navigation@-100');
    assert.match(entries[0].when, /resourceScheme == file/);
  }
  assert.match(manifest.contributes.menus['explorer/context'][0].when, /!explorerResourceIsFolder/);
  assert.match(manifest.contributes.menus['scm/resourceState/context'][0].when, /scmProvider == git/);
  assert.ok(!manifest.contributes.menus['search/context']);
});

test('supported formats are case insensitive, exactly matching all menu conditions', () => {
  for (const menu of MENUS) {
    const regex = fileRule(menu);
    for (const ext of SUPPORTED_EXTENSIONS) {
      assert.equal(regex.test(ext), true, `${menu}: ${ext}`);
      assert.equal(regex.test(ext.toUpperCase()), true, `${menu}: ${ext.toUpperCase()}`);
      assert.equal(isSupportedFile(`/tmp/中文 1${ext.toUpperCase()}`), true);
    }
    for (const ext of ['.ts', '.tsx', '.html', '.pdf', '.mdx2', '.md.backup', '']) {
      assert.equal(regex.test(ext), false, `${menu}: ${ext}`);
      assert.equal(isSupportedFile(`/tmp/a${ext}`), false);
    }
  }
});
