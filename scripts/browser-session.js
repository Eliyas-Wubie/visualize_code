const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Launch an isolated hidden Chromium profile and expose bounded CDP input/evaluation helpers; caller must close the session. */
async function browserSession(profile) {
  const executable = [
    process.env.VISUALIZER_BROWSER_PATH,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
  ].find((candidate) => candidate && fs.existsSync(candidate));
  if (!executable)
    throw new Error(
      'Set VISUALIZER_BROWSER_PATH to a Chromium/Edge executable for browser smoke checks.',
    );
  fs.mkdirSync(profile, { recursive: true });
  const child = spawn(
    executable,
    [
      '--headless=new',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-sync',
      '--disable-extensions',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      '--window-size=1400,950',
      'about:blank',
    ],
    { windowsHide: true, stdio: 'ignore' },
  );
  let launchError;
  child.on('error', (error) => {
    launchError = error;
  });
  let socket;
  const pending = new Map();
  try {
    const file = path.join(profile, 'DevToolsActivePort');
    for (let i = 0; i < 100 && !fs.existsSync(file) && !launchError; i++) await delay(100);
    if (launchError || !fs.existsSync(file))
      throw new Error('Could not start the isolated browser debugging session.');
    const port = fs.readFileSync(file, 'utf8').split('\n')[0];
    const page = await (
      await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })
    ).json();
    socket = new WebSocket(page.webSocketDebuggerUrl);
    await once(socket, 'open');
    let sequence = 0;
    const errors = [];
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown')
        errors.push(message.params.exceptionDetails.text);
      if (!pending.has(message.id)) return;
      const request = pending.get(message.id);
      pending.delete(message.id);
      clearTimeout(request.timer);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
    });
    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = ++sequence;
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`Browser command timed out: ${method}`));
        }, 10000);
        pending.set(id, { resolve, reject, timer });
        socket.send(JSON.stringify({ id, method, params }));
      });
    const evaluate = async (expression) => {
      const result = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      return result.result.value;
    };
    const wait = async (expression) => {
      for (let i = 0; i < 100; i++) {
        if (await evaluate(expression)) return;
        await delay(50);
      }
      throw new Error(`Browser condition timed out: ${expression}`);
    };
    const click = async (selector, clickCount = 1) => {
      // Wait for fit-view animation/layout to make the real pointer target reachable; never retry a submitted click.
      await wait(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return false;
        const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 &&
          e.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); })()`);
      const point =
        await evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return null;
        const r = e.getBoundingClientRect(); const x = r.x + r.width / 2, y = r.y + r.height / 2;
        return { x, y, reachable: e.contains(document.elementFromPoint(x, y)), disabled: e.disabled }; })()`);
      if (!point || !point.reachable || point.disabled)
        throw new Error(`Unreachable browser control: ${selector}`);
      await send('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x: point.x,
        y: point.y,
        button: 'left',
        clickCount,
      });
      await send('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x: point.x,
        y: point.y,
        button: 'left',
        clickCount,
      });
    };
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Page.bringToFront');
    return {
      send,
      evaluate,
      wait,
      click,
      errors,
      close() {
        for (const request of pending.values()) clearTimeout(request.timer);
        socket.close();
        child.kill();
      },
    };
  } catch (error) {
    socket?.close();
    child.kill();
    throw error;
  }
}

module.exports = { browserSession };
