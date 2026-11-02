'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {FakeUri} = require('./fixtures/fakeVscode.cjs');
const {resolveFileUri} = require('../dist/domain/uriResolver.js');

test('Git clicked file A takes precedence over active editor B and other selections', () => {
  const A = FakeUri.file('/tmp/git A.MD');
  const B = FakeUri.file('/tmp/editor B.md');
  assert.deepEqual(resolveFileUri([{resourceUri:A}], B), {kind:'resolved', uri:A, origin:'menu'});
  assert.deepEqual(resolveFileUri([{resourceUri:A}, {resourceUri:B}], B), {kind:'resolved', uri:A, origin:'menu'});
  assert.deepEqual(resolveFileUri([[{resourceUri:A},{resourceUri:B}]], B), {kind:'resolved', uri:A, origin:'menu'});
});

test('URI, SCM resourceState, wrappers, URI strings and paths normalize', () => {
  const A = FakeUri.file('/tmp/中文 空 格.md');
  for (const item of [
    A, {uri:A}, {resourceUri:A}, {resource:A}, {fsPath:A.fsPath},
    {path:A.fsPath}, {location:{uri:A}}, {element:{resourceUri:A}},
    [{element:{uri:A}}]
  ]) {
    const result = resolveFileUri([item], undefined);
    assert.equal(result.kind, 'resolved');
    assert.equal(result.uri.fsPath, A.fsPath);
  }
  assert.equal(resolveFileUri(['file:///tmp/my%20note.MD']).kind, 'resolved');
  assert.equal(resolveFileUri(['file:///tmp/my%20note.MD']).uri.fsPath, '/tmp/my note.MD');
  assert.equal(resolveFileUri([{scheme:'git', path:'/tmp/staged.md'}], A).uri.scheme, 'git');
});

test('fallback only with no explicit target; malformed selection must fail closed', () => {
  const editor = FakeUri.file('/tmp/active.md');
  assert.deepEqual(resolveFileUri([], editor), {kind:'resolved',uri:editor,origin:'active-editor'});
  assert.deepEqual(resolveFileUri([], undefined), {kind:'no-target'});
  assert.deepEqual(resolveFileUri([{}], editor), {kind:'invalid-argument'});
  assert.deepEqual(resolveFileUri([['unrelated search label']], editor), {kind:'invalid-argument'});
  assert.deepEqual(resolveFileUri([{element:{}}], editor), {kind:'invalid-argument'});
});
