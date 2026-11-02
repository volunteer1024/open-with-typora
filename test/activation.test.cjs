'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {mockVscode} = require('./fixtures/fakeVscode.cjs');

test('activation registers one command, logger and config-change listener', async () => {
  const lines = [];
  let registered = null;
  let onConfigChanged;
  mockVscode.window = {
    createOutputChannel(name) {
      assert.equal(name, 'Open With External');
      return {appendLine: line => lines.push(line), show() {}, dispose() {}};
    },
    showWarningMessage:async()=>undefined,
    showErrorMessage:async()=>undefined,
    activeTextEditor:undefined
  };
  let currentSetting = '';
  mockVscode.workspace = {
    getConfiguration: () => ({get:()=>currentSetting}),
    onDidChangeConfiguration:callback => {onConfigChanged=callback; return {dispose(){}};}
  };
  mockVscode.commands = {
    registerCommand(id,callback) {
      assert.equal(id,'openWithExternal.openWithTypora');
      registered=callback;
      return {dispose(){}};
    }
  };
  const extension = require('../dist/extension.js');
  const context = {subscriptions:[]};
  extension.activate(context);
  assert.equal(context.subscriptions.length, 3);
  assert.equal(typeof registered, 'function');
  assert.ok(lines.some(line=>line.includes('[CONFIG]')));
  currentSetting = '/missing/app';
  onConfigChanged({affectsConfiguration: key => key === 'openWithExternal.typoraPath'});
  assert.ok(lines.some(line=>line.includes('/missing/app')));
});
