const { Session } = require('node:inspector');
const net = require('node:net');
const { collectRecords } = require('./records.cjs');
const { captureLogs } = require('./logs.cjs');

// This preload is installed only for a run explicitly launched from the extension.
if (process.env.VISUALIZE_ENDPOINT && process.env.VISUALIZE_TOKEN) {
  const session = new Session();
  const token = process.env.VISUALIZE_TOKEN;
  const root = process.env.VISUALIZE_ROOT || process.cwd();
  const socket = net.connect(process.env.VISUALIZE_ENDPOINT);
  module.exports.ready = new Promise((resolve) => {
    socket.once('connect', resolve);
    socket.once('error', resolve);
  });
  socket.unref();
  let stopped = false;
  let polling = false;
  let timer;
  const send = (message) => {
    if (!socket.destroyed) socket.write(`${JSON.stringify({ token, ...message })}\n`);
  };
  const post = (method, params = {}) =>
    new Promise((resolve, reject) => {
      session.post(method, params, (error, result) => (error ? reject(error) : resolve(result)));
    });
  const fail = () => {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
    send({ type: 'error' });
    session.disconnect();
    socket.end();
  };
  socket.on('error', () => {
    stopped = true;
    clearInterval(timer);
    session.disconnect();
  });
  const sample = async (final) => {
    if (stopped || polling) return;
    polling = true;
    try {
      const coverage = await post('Profiler.takePreciseCoverage');
      const { profile } = await post('Profiler.stop');
      send({ type: 'metrics', records: collectRecords(coverage, profile, root) });
      if (final) {
        stopped = true;
        clearInterval(timer);
        await post('Profiler.stopPreciseCoverage');
        session.disconnect();
        socket.end();
      } else await post('Profiler.start');
    } catch {
      fail();
    } finally {
      polling = false;
    }
  };
  session.connect();
  captureLogs(session, send, root, process.env.VISUALIZE_CRASH_FILE, token);
  session.post('Profiler.enable', {}, (error) => {
    if (error) {
      fail();
      return;
    }
    session.post('Profiler.startPreciseCoverage', { callCount: true, detailed: false }, (error) => {
      if (error) {
        fail();
        return;
      }
      session.post('Profiler.start', {}, (error) => {
        if (error) {
          fail();
          return;
        }
        timer = setInterval(() => sample(false), 500);
        timer.unref();
        process.once('beforeExit', () => sample(true));
      });
    });
  });
}
