'use strict';
const Module = require('node:module');

class FakeUri {
  constructor(scheme, fsPath, uriPath) {
    this.scheme = scheme;
    this.fsPath = fsPath;
    this.path = uriPath ?? fsPath;
  }
  static file(value) { return new FakeUri('file', value); }
  static parse(value) {
    const parsed = new URL(value);
    return new FakeUri(parsed.protocol.slice(0, -1), decodeURIComponent(parsed.pathname));
  }
  static from({scheme, path}) { return new FakeUri(scheme, path); }
}

const mockVscode = {Uri: FakeUri};
const original = Module._load;
Module._load = function(id, ...args) {
  if (id === 'vscode') { return mockVscode; }
  return original.call(this, id, ...args);
};

module.exports = {FakeUri, mockVscode};
