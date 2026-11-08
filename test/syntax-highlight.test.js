const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { syntaxTokens, syntaxLanguage } = require('../webview/syntax-tokens');
const { loadJsx } = require('../test-support/load-jsx');
const { syncCodeViewport } = require('../webview/code-viewport');

test('JS/TS coloring preserves exact code and distinguishes comments, strings, names and numbers', () => {
  const code =
    'class Worker {\n  run() { const value = "return \\"42\\""; /* note */ return 0xFF + 1.5e2; }\n}\n';
  const tokens = syntaxTokens(code, 'typescript');
  assert.equal(tokens.map((token) => token.text).join(''), code);
  assert(tokens.some((token) => token.text === 'class' && token.type === 'keyword'));
  assert(tokens.some((token) => token.text === 'Worker' && token.type === 'type'));
  assert(tokens.some((token) => token.text === 'run' && token.type === 'function'));
  assert(tokens.some((token) => token.text.startsWith('"return') && token.type === 'string'));
  assert(tokens.some((token) => token.text === '/* note */' && token.type === 'comment'));
  assert(tokens.some((token) => token.text === '1.5e2' && token.type === 'number'));
});

test('Python supports triple-quoted docstrings, comments, Unicode names and language-specific keywords', () => {
  const code =
    'def Δif():\n\t"""return # still a string\nsecond line"""\n\t# comment\n\treturn None\n';
  const tokens = syntaxTokens(code, 'python');
  assert.equal(tokens.map((token) => token.text).join(''), code);
  assert(tokens.some((token) => token.text === 'Δif' && token.type === 'function'));
  assert(tokens.some((token) => token.text.includes('second line') && token.type === 'string'));
  assert(tokens.some((token) => token.text === '# comment' && token.type === 'comment'));
  assert(tokens.some((token) => token.text === 'None' && token.type === 'keyword'));
});

test('incomplete and large code stays lossless while typing; unknown languages remain plain', () => {
  for (const code of [
    '"unterminated',
    '/* unfinished',
    '"line\nreturn 1',
    '`template ${value}',
    '"escape\\',
    '',
    'const x = 1;\n'.repeat(10000),
  ]) {
    assert.equal(
      syntaxTokens(code, 'javascript')
        .map((token) => token.text)
        .join(''),
      code,
    );
  }
  assert.deepEqual(syntaxTokens('<html>plain</html>', 'html'), [
    { text: '<html>plain</html>', type: 'plain' },
  ]);
  assert.equal(syntaxLanguage('main.PY'), 'python');
  assert.equal(syntaxLanguage('App.tsx'), 'typescriptreact');
  assert.equal(syntaxLanguage('readme.md'), 'plaintext');
  const json = syntaxTokens('{"enabled": true, "value": 42}', 'json');
  assert(json.some((token) => token.text === 'true' && token.type === 'keyword'));
});

test('code editor renders escaped colors over an accessible native textarea without emitting source HTML', () => {
  const { CodeEditor } = loadJsx('webview/CodeEditor.jsx');
  const html = renderToStaticMarkup(
    React.createElement(CodeEditor, {
      value: 'const content = "</textarea><script>bad()</script>";\n',
      language: 'javascript',
      label: 'Source code',
      onChange() {},
    }),
  );
  assert(html.includes('syntax-keyword'));
  assert(html.includes('syntax-string'));
  assert(html.includes('aria-hidden="true"'));
  assert(html.includes('aria-label="Source code"'));
  assert(html.includes('wrap="off"'));
  assert(html.includes('&lt;script&gt;bad()&lt;/script&gt;'));
  assert(!html.includes('<script>'));
});

test('mirror matches the editable viewport and scroll position without including scrollbar space', () => {
  const input = { clientWidth: 480, clientHeight: 300, scrollTop: 125, scrollLeft: 60 };
  const mirror = { style: {}, scrollTop: 0, scrollLeft: 0 };
  syncCodeViewport(input, mirror);
  assert.equal(mirror.style.width, '482px');
  assert.equal(mirror.style.height, '302px');
  assert.equal(mirror.scrollTop, 125);
  assert.equal(mirror.scrollLeft, 60);
  input.clientWidth = 300;
  input.scrollTop = 0;
  syncCodeViewport(input, mirror);
  assert.equal(mirror.style.width, '302px');
  assert.equal(mirror.scrollTop, 0);
});
