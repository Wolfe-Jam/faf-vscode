// bun `preload` — registers the hand-written vscode mock as the `vscode` module
// before any test file (or the extension source it imports) resolves it.
import { mock } from 'bun:test';
import * as vscodeMock from './mocks/vscode';

await mock.module('vscode', () => vscodeMock);
