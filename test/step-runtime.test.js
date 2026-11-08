const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { mkdtemp, writeFile, rm } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { pathToFileURL } = require('node:url');
const { debugPeer } = require('../test-support/debug-peer');
const { entryDocument } = require('../test-support/entry-document');
const { functionEntry } = require('../src/function-entry');
const { createStepRun } = require('../src/step-run');

test(
  'real JavaScript function-body breakpoints hold repeated same-line calls and recursion for Next',
  { timeout: 20000 },
  async (t) => {
    const directory = await mkdtemp(join(tmpdir(), 'visualizer-step-'));
    const file = join(directory, 'main.cjs');
    const text =
      'function twice(value) { return value * 2; }\nfunction recurse(value) { if (value > 0) return recurse(value - 1); return 0; }\nfunction main() { twice(1); twice(2); recurse(2); }\nmain();\n';
    await writeFile(file, text);
    const child = spawn(process.execPath, ['--inspect-brk=127.0.0.1:0', file], {
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let socket;
    let peer;
    t.after(async () => {
      socket?.close();
      peer?.dispose();
      child.kill();
      await rm(directory, { recursive: true, force: true });
    });
    const endpoint = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Inspector startup timed out')), 5000);
      let output = '';
      child.stderr.on('data', (chunk) => {
        output += chunk;
        // Match only the ephemeral loopback inspector WebSocket address printed by this child.
        const address = output.match(/ws:\/\/127\.0\.0\.1:\d+\/[^\s]+/);
        if (address) {
          clearTimeout(timer);
          resolve(address[0]);
        }
      });
      child.once('error', reject);
    });
    socket = new WebSocket(endpoint);
    await once(socket, 'open');
    peer = debugPeer((packet) => socket.send(JSON.stringify(packet)));
    socket.addEventListener('message', (event) => peer.receive(JSON.parse(event.data)));
    await peer.request('Debugger.enable');
    const url = pathToFileURL(file).href;
    const items = new Map();
    for (const name of ['twice', 'recurse', 'main']) {
      const { document, item } = entryDocument(text, name);
      const position = functionEntry(document, item);
      item.uri = { toString: () => url };
      item.range = {
        start: document.positionAt(text.indexOf(`function ${name}`)),
        end: { line: position.line, character: 1000 },
      };
      items.set(name, item);
      await peer.request('Debugger.setBreakpointByUrl', {
        url,
        lineNumber: position.line,
        columnNumber: position.character,
      });
    }
    await peer.request('Runtime.runIfWaitingForDebugger');
    await peer.event('Debugger.paused');
    await peer.request('Debugger.resume');
    const state = {};
    const control = createStepRun(state, () => {});
    control.prepare({ items });
    const seen = [];
    let resumes = 0;
    const session = {
      customRequest: async (command) => {
        assert.equal(command, 'continue');
        resumes++;
        await peer.request('Debugger.resume');
      },
    };
    for (const expected of ['main', 'twice', 'twice', 'recurse', 'recurse', 'recurse']) {
      const stopped = await peer.event('Debugger.paused');
      assert(stopped.hitBreakpoints.length > 0);
      const frames = stopped.callFrames.map((frame) => ({
        uri: url,
        position: { line: frame.location.lineNumber, character: frame.location.columnNumber },
      }));
      await control.stopped(session, frames, { threadId: 1, reason: 'breakpoint' });
      seen.push(stopped.callFrames[0].functionName);
      assert.equal(seen.at(-1), expected);
      assert.equal(state.step.canNext, true);
      assert.equal(resumes, seen.length - 1);
      await control.next();
    }
    assert.deepEqual(state.step.visited.sort(), ['main', 'recurse', 'twice']);
  },
);
