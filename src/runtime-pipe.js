const net = require('node:net');
const { randomUUID } = require('node:crypto');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { readFileSync, statSync, unlinkSync } = require('node:fs');

/** Open a per-run local IPC stream with a random authentication token and bounded messages. */
async function openRuntimePipe(receive) {
  const token = randomUUID();
  const crashFile = join(tmpdir(), `visualize-${token}.json`);
  const endpoint =
    process.platform === 'win32'
      ? `\\\\.\\pipe\\visualize-${token}`
      : join(tmpdir(), `visualize-${token}.sock`);
  const sockets = new Set();
  const server = net.createServer((socket) => {
    sockets.add(socket);
    let buffer = '';
    socket.setEncoding('utf8');
    socket.on('data', (chunk) => {
      buffer += chunk;
      if (buffer.length > 4 * 1024 * 1024) {
        socket.destroy();
        return;
      }
      let index;
      while ((index = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 1);
        try {
          const message = JSON.parse(line);
          if (message.token !== token) {
            socket.destroy();
            return;
          }
          receive(message);
        } catch {
          socket.destroy();
          return;
        }
      }
    });
    socket.on('error', () => socket.destroy());
    socket.on('close', () => sockets.delete(socket));
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(endpoint, resolve);
  });
  const flushCrash = () => {
    try {
      if (statSync(crashFile).size <= 16000) {
        const message = JSON.parse(readFileSync(crashFile, 'utf8'));
        if (message.token === token) receive(message);
      }
    } catch {
      /* A normal run has no fatal-error record. */
    } finally {
      try {
        unlinkSync(crashFile);
      } catch {
        /* Already absent or removed. */
      }
    }
  };
  return {
    endpoint,
    token,
    crashFile,
    flushCrash,
    dispose: () => {
      flushCrash();
      for (const socket of sockets) socket.destroy();
      server.close();
    },
  };
}

module.exports = { openRuntimePipe };
