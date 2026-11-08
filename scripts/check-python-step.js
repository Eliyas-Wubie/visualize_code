const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtemp, writeFile, rm } = require('node:fs/promises');
const { join, resolve } = require('node:path');
const { tmpdir } = require('node:os');
const { pathToFileURL } = require('node:url');
const { debugPeer } = require('../test-support/debug-peer');
const { entryDocument } = require('../test-support/entry-document');
const { functionEntry } = require('../src/function-entry');
const { createStepRun } = require('../src/step-run');

/** Verify real Python entry breakpoints and Next using an explicitly supplied, already-installed debugpy adapter. */
async function main() {
  const adapter = process.argv[2];
  if (!adapter)
    throw new Error('Supply the installed debugpy/adapter directory as the first argument.');
  const directory = await mkdtemp(join(tmpdir(), 'visualizer-step-python-'));
  const file = join(directory, 'main.py');
  const text =
    'def twice(value):\n    """A docstring must not receive the breakpoint."""\n    return value * 2\ndef recurse(value):\n    if value > 0: return recurse(value - 1)\n    return 0\ndef main():\n    twice(1); twice(2); recurse(2)\nmain()\n';
  await writeFile(file, text);
  const child = spawn('python', [resolve(adapter)], {
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const peer = debugPeer((packet) => {
    const body = JSON.stringify(packet);
    child.stdin.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
  }, true);
  let buffer = Buffer.alloc(0);
  child.stdout.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (true) {
      const index = buffer.indexOf('\r\n\r\n');
      if (index < 0) return;
      const length = Number(buffer.subarray(0, index).toString().split(':')[1]);
      if (buffer.length < index + 4 + length) return;
      peer.receive(JSON.parse(buffer.subarray(index + 4, index + 4 + length).toString()));
      buffer = buffer.subarray(index + 4 + length);
    }
  });
  child.stderr.resume();
  const timeout = setTimeout(() => child.kill(), 25000);
  try {
    await peer.request('initialize', {
      clientID: 'visualizer-test',
      adapterID: 'python',
      linesStartAt1: true,
      columnsStartAt1: true,
      pathFormat: 'path',
    });
    const launched = peer.request('launch', {
      name: 'Synthetic step check',
      type: 'debugpy',
      request: 'launch',
      program: file,
      cwd: directory,
      console: 'internalConsole',
      justMyCode: true,
      stopOnEntry: false,
    });
    await peer.event('initialized');
    const items = new Map();
    const breakpoints = [];
    const url = pathToFileURL(file).href;
    for (const name of ['twice', 'recurse', 'main']) {
      const { document, item } = entryDocument(text, name, 'python');
      const position = functionEntry(document, item);
      breakpoints.push({ line: position.line + 1, column: position.character + 1 });
      item.uri = { toString: () => url };
      item.range = {
        start: document.positionAt(text.indexOf(`def ${name}`)),
        end: { line: position.line + (name === 'recurse' ? 1 : 0), character: 1000 },
      };
      items.set(name, item);
    }
    const bound = await peer.request('setBreakpoints', { source: { path: file }, breakpoints });
    assert(bound.breakpoints.every((entry) => entry.verified));
    await peer.request('configurationDone');
    await launched;
    const state = {};
    const control = createStepRun(state, () => {});
    control.prepare({ items });
    const session = { customRequest: (command, args) => peer.request(command, args) };
    for (const expected of ['main', 'twice', 'twice', 'recurse', 'recurse', 'recurse']) {
      const stopped = await peer.event('stopped');
      const stack = await peer.request('stackTrace', { threadId: stopped.threadId });
      assert.equal(stack.stackFrames[0].name, expected);
      const frames = stack.stackFrames.map((frame) => ({
        uri: pathToFileURL(frame.source.path).href,
        position: { line: frame.line - 1, character: 0 },
      }));
      await control.stopped(session, frames, {
        threadId: stopped.threadId,
        reason: stopped.reason,
      });
      assert.equal(state.step.canNext, true);
      await control.next();
    }
    await peer.event('terminated');
    assert.deepEqual(state.step.visited.sort(), ['main', 'recurse', 'twice']);
    await peer.request('disconnect', { terminateDebuggee: true });
    console.log(
      'Real Python debugger passed: verified body breakpoints, skipped docstring, repeated same-line calls, recursion, and Next-controlled continuation.',
    );
  } finally {
    clearTimeout(timeout);
    peer.dispose();
    child.kill();
    await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
