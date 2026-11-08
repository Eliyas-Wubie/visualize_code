const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { browserSession } = require('./browser-session');
const { webviewFixture } = require('../test-support/webview-fixture');

/** Run real pointer/keyboard dismissal checks against the production bundle and a loopback-only synthetic host. */
async function main() {
  const root = path.resolve(__dirname, '..');
  const server = http.createServer((request, response) => {
    if (request.url === '/') {
      response.setHeader('content-type', 'text/html');
      response.end(webviewFixture());
      return;
    }
    const name =
      request.url === '/bundle.js'
        ? 'bundle.js'
        : request.url === '/bundle.css'
          ? 'bundle.css'
          : undefined;
    if (!name) {
      response.writeHead(404);
      response.end();
      return;
    }
    response.setHeader('content-type', name.endsWith('.js') ? 'text/javascript' : 'text/css');
    response.end(fs.readFileSync(path.join(root, 'media', name)));
  });
  let browser;
  try {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    browser = await browserSession(path.join(root, 'reports', `webview-browser-${Date.now()}`));
    await browser.send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/` });
    await browser.wait("!!document.querySelector('.node-edit')");
    await browser.evaluate(
      "window.dispatchEvent(new MessageEvent('message', {data:{type:'loading',message:'Waiting for language support'}}))",
    );
    await browser.wait("!!document.querySelector('.map-loading')");
    assert.equal(
      await browser.evaluate("document.querySelector('.map-loading button').textContent"),
      'Cancel',
    );
    await browser.evaluate(
      "window.dispatchEvent(new MessageEvent('message', {data:{type:'loading',status:'error',message:'Retry language support'}}))",
    );
    await browser.wait("document.querySelector('.map-loading button')?.textContent === 'Retry'");
    await browser.evaluate(
      "window.dispatchEvent(new MessageEvent('message', {data:{type:'loading',status:'ready'}}))",
    );
    await browser.wait("!document.querySelector('.map-loading')");
    const open = async () => {
      await browser.click('.node-edit');
      await browser.wait("!!document.querySelector('.authoring-dialog')");
    };
    const closed = () => browser.wait("!document.querySelector('.authoring-dialog')");
    const snapshot = async (name) => {
      const result = await browser.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(root, 'reports', name), Buffer.from(result.data, 'base64'));
    };
    for (let i = 0; i < 3; i++) {
      await open();
      await browser.click('.authoring-dialog button[aria-label="Close source editor"]');
      await closed();
      assert.equal(
        await browser.evaluate("document.querySelectorAll('.authoring-dialog').length"),
        0,
      );
    }
    await snapshot('flow-workspace.png');
    await open();
    await snapshot('flow-source-editor.png');
    await browser.send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'Escape',
      code: 'Escape',
      windowsVirtualKeyCode: 27,
    });
    await browser.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'Escape',
      code: 'Escape',
      windowsVirtualKeyCode: 27,
    });
    await closed();
    await open();
    await browser.evaluate(
      "window.fixtureDelay=300; document.querySelector('.authoring-dialog .dialog-body > button').click()",
    );
    await browser.click('.authoring-dialog button[aria-label="Close source editor"]');
    await closed();
    await browser.evaluate("document.querySelector('.function-name').click()");
    await browser.wait("!!document.querySelector('.node-details')");
    await browser.click('.node-details button[aria-label="Close node details"]');
    await browser.wait("!document.querySelector('.node-details')");
    await browser.evaluate('window.fixtureDelay=0');
    await browser.wait("!!document.querySelector('.mode-toggle button:not(:disabled)')");
    await browser.click('.function-name');
    await browser.click('.function-name', 2);
    await browser.wait("!!document.querySelector('.authoring-dialog textarea')");
    await browser.send('Emulation.setDeviceMetricsOverride', {
      width: 1200,
      height: 450,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await browser.evaluate(`(() => {
      const body = document.querySelector('.dialog-body');
      body.scrollTop = body.scrollHeight;
    })()`);
    assert(await browser.evaluate("document.querySelector('.dialog-body').scrollTop > 0"));
    await browser.click('.authoring-dialog textarea');
    await browser.send('Input.insertText', { text: '\n// browser save check\n' });
    await browser.wait("!document.querySelector('.dialog-save').disabled");
    await browser.click('.dialog-save');
    await closed();
    assert(
      await browser.evaluate(
        "window.fixtureRequests.some(r => r.action === 'save' && r.source.includes('browser save check'))",
      ),
    );
    await browser.send('Emulation.clearDeviceMetricsOverride');
    await browser.evaluate("document.querySelector('.function-name').click()");
    await browser.wait("!!document.querySelector('.node-details')");
    await browser.evaluate(`(() => {
      const body = document.querySelector('.node-details-content');
      body.scrollTop = body.scrollHeight;
    })()`);
    assert(await browser.evaluate("document.querySelector('.node-details-content').scrollTop > 0"));
    await browser.click('.node-details .details-actions .node-edit');
    await browser.wait("!!document.querySelector('.authoring-dialog')");
    await browser.click('.authoring-dialog button[aria-label="Close source editor"]');
    await closed();
    await browser.click('.node-details button[aria-label="Close node details"]');
    await browser.wait("!document.querySelector('.node-details')");
    assert.equal(
      await browser.evaluate(
        'document.querySelectorAll(\'main[aria-label="Function call map"]\').length',
      ),
      1,
    );
    await browser.wait("!!document.querySelector('.mode-toggle button:not(:disabled)')");
    assert.equal(
      await browser.evaluate("document.querySelectorAll('.authoring-dialog').length"),
      0,
    );
    await browser.evaluate(
      "window.fixtureDelay=0; [...document.querySelectorAll('nav button')].find(e=>e.textContent==='New entity').click()",
    );
    await browser.wait("!!document.querySelector('.creation-workspace')");
    await browser.click('.hierarchy-browser input[type="search"]');
    await browser.send('Input.insertText', { text: 'main.js' });
    await browser.click('.hierarchy-browser button[aria-label="Select file src/main.js"]');
    await browser.click('.creation-properties input:not([readonly])');
    await browser.send('Input.insertText', { text: 'createdFn' });
    await browser.click('.hierarchy-browser input[type="search"]');
    await browser.send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'Enter',
      code: 'Enter',
      windowsVirtualKeyCode: 13,
    });
    await browser.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'Enter',
      code: 'Enter',
      windowsVirtualKeyCode: 13,
    });
    assert(
      await browser.evaluate("!window.fixtureRequests.some(r => r.action === 'create')"),
      'Searching must not implicitly submit source creation',
    );
    assert(
      await browser.evaluate(
        "document.querySelector('.creation-location input').value === 'src/main.js'",
      ),
    );
    await snapshot('flow-create-entity.png');
    await browser.click('.authoring-dialog .dialog-header button[type="submit"]');
    await closed();
    assert(
      await browser.evaluate(
        "window.fixtureRequests.some(r => r.action === 'create' && r.name === 'createdFn' && r.target === 'file')",
      ),
    );
    await browser.evaluate(
      "[...document.querySelectorAll('nav button')].find(e=>e.textContent==='New entity').click()",
    );
    await browser.wait("!!document.querySelector('.creation-workspace')");
    await browser.click('.authoring-dialog button[aria-label="Close source editor"]');
    await closed();
    const geometry = () =>
      browser.evaluate(`(() => {
      const r = document.querySelector('main').getBoundingClientRect();
      return { canvas: [r.x, r.y, r.width, r.height], viewport: document.querySelector('.react-flow__viewport').style.transform,
        nodes: [...document.querySelectorAll('.react-flow__node')].map(n => [n.querySelector('.function-name').textContent, n.style.transform]).sort() };
    })()`);
    const initial = await geometry();
    await browser.evaluate("document.querySelector('.react-flow__node').focus()");
    await browser.send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'ArrowRight',
      code: 'ArrowRight',
      windowsVirtualKeyCode: 39,
    });
    await browser.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'ArrowRight',
      code: 'ArrowRight',
      windowsVirtualKeyCode: 39,
    });
    await browser.wait(
      `document.querySelector('.react-flow__node').style.transform !== ${JSON.stringify(initial.nodes.find((n) => n[0] === 'run')[1])}`,
    );
    await browser.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel',
      x: initial.canvas[2] / 4,
      y: initial.canvas[1] + initial.canvas[3] / 3,
      deltaX: 0,
      deltaY: 120,
    });
    await browser.wait(
      `document.querySelector('.react-flow__viewport').style.transform !== ${JSON.stringify(initial.viewport)}`,
    );
    const beforeStep = await geometry();
    assert(await browser.evaluate("document.querySelector('.step-controls button').disabled"));
    await browser.evaluate(
      "[...document.querySelectorAll('nav button')].find(e=>e.textContent==='Step run').click()",
    );
    await browser.wait("!!document.querySelector('.step-controls button:not(:disabled)')");
    assert.deepEqual(
      await geometry(),
      beforeStep,
      'Step run must preserve canvas bounds, viewport, and node positions',
    );
    assert(await browser.evaluate("!!document.querySelector('.function-card.step-current')"));
    await browser.click('.step-controls button');
    await browser.wait("document.querySelector('.step-controls button').disabled");
    await browser.wait("!document.querySelector('.step-controls button').disabled");
    assert(
      await browser.evaluate(
        "document.querySelector('.step-controls').textContent.includes('Pause 2')",
      ),
    );
    assert.deepEqual(
      await geometry(),
      beforeStep,
      'Next must preserve the map layout and viewport',
    );
    await browser.click('.step-controls button:nth-child(2)');
    await browser.wait("document.querySelector('.step-controls button').disabled");
    assert(await browser.evaluate("!!document.querySelector('.function-card.step-visited')"));
    assert.deepEqual(
      await geometry(),
      beforeStep,
      'Stop must preserve the map layout and viewport',
    );
    assert.deepEqual(browser.errors, []);
    await browser.click('.navigation-settings summary');
    assert.equal(
      await browser.evaluate(
        "document.querySelectorAll('.navigation-popover input[type=range]').length",
      ),
      2,
    );
    await browser.click('.navigation-settings summary');
    for (const width of [390, 800]) {
      await browser.send('Emulation.setDeviceMetricsOverride', {
        width,
        height: 800,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await browser.wait('document.documentElement.clientWidth === ' + width);
      await browser.click('.react-flow__controls button[aria-label="Fit map"]');
      await browser.evaluate(
        'new Promise(resolve => { let frames=0; const tick=()=>++frames>20?resolve():requestAnimationFrame(tick); requestAnimationFrame(tick); })',
      );
      assert(
        await browser.evaluate(
          'document.documentElement.scrollWidth <= document.documentElement.clientWidth',
        ),
        'Workspace must not overflow horizontally',
      );
      await snapshot(`flow-workspace-${width}.png`);
    }
    await browser.send('Emulation.clearDeviceMetricsOverride');
    await browser.evaluate("document.body.classList.add('vscode-light')");
    await snapshot('flow-workspace-light.png');
    assert.equal(
      await browser.evaluate(
        "getComputedStyle(document.body).getPropertyValue('--ui-panel').trim()",
      ),
      '#fff',
    );
    assert.equal(
      await browser.evaluate(
        "getComputedStyle(document.querySelector('.react-flow__background')).backgroundColor",
      ),
      'rgb(246, 246, 249)',
    );
    await browser.evaluate("document.body.classList.remove('vscode-light')");
    await browser.evaluate(`window.dispatchEvent(new MessageEvent('message', { data: {
      type: 'graph', root: 'run', limit: 300, capabilities: { authoring: true, live: true },
      nodes: ['run','a','b','a1','a2','a3','b1','b2'].map((id,index) => ({id,name:id,file:'src/main.js',line:index+1,loaded:true,parameters:'()'})),
      edges: [['run','a'],['run','b'],['a','a1'],['a','a2'],['a','a3'],['b','b1'],['b','b2'],['a2','b1'],['b2','run'],['b2','b2']].map(([from,to],index) => ({from,to,lines:[index+1]}))
    }}))`);
    await browser.wait("document.querySelectorAll('.function-card').length === 8");
    await browser.click('.react-flow__controls button[aria-label="Auto arrange"]');
    await browser.click('.react-flow__controls button[aria-label="Fit map"]');
    await browser.evaluate(
      'new Promise(resolve => { let frames=0; const tick=()=>++frames>20?resolve():requestAnimationFrame(tick); requestAnimationFrame(tick); })',
    );
    const branches =
      await browser.evaluate(`Object.fromEntries([...document.querySelectorAll('.react-flow__node')].map(node => {
      const r=node.getBoundingClientRect(); return [node.querySelector('.function-name').textContent,{left:r.left,right:r.right,top:r.top,bottom:r.bottom}];
    }))`);
    for (const [parent, child] of [
      ['run', 'a'],
      ['run', 'b'],
      ['a', 'a1'],
      ['a', 'a2'],
      ['a', 'a3'],
      ['b', 'b1'],
      ['b', 'b2'],
    ])
      assert(branches[child].top > branches[parent].bottom, `${child} must branch below ${parent}`);
    const boxes = Object.entries(branches);
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const [a, b] = [boxes[i][1], boxes[j][1]];
        assert(
          a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top,
          'Branch cards must not overlap',
        );
      }
    assert(
      branches.a3.right < branches.b1.left,
      'Sibling subtrees must occupy separate outward lanes',
    );
    await snapshot('flow-branches.png');
    console.log(
      'Browser smoke passed: responsive/light workspace, hierarchy search, pinned creation/edit actions, navigation settings, execution and stable-layout regressions.',
    );
  } finally {
    browser?.close();
    server.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
