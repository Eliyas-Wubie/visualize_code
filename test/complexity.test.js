const { test } = require('node:test');
const assert = require('node:assert/strict');
const { estimateComplexity } = require('../src/complexity');

test('local complexity distinguishes straight-line, sequential, and nested loops', () => {
  assert.equal(estimateComplexity('function f(x) { return x + 1; }').notation, 'O(1)');
  assert.equal(
    estimateComplexity('function f(n) { for(let i=0;i<n;i++) {} for(let j=0;j<n;j++) {} }')
      .notation,
    'O(n)',
  );
  assert.equal(
    estimateComplexity('function f(n) { for(let i=0;i<n;i++) { for(let j=0;j<n;j++) {} } }')
      .notation,
    'O(n^2)',
  );
});

test('comments and strings do not add loops, and ambiguous or recursive work is unknown', () => {
  assert.equal(
    estimateComplexity('function f() { /* for (;;) {} */ return "while (x) {}"; }').notation,
    'O(1)',
  );
  assert.equal(estimateComplexity('function f() { return f(); }', true).notation, 'Unknown');
  assert.equal(
    estimateComplexity('function f(n) { for(let i=1;i<n;i*=2) {} }').notation,
    'Unknown',
  );
  assert.equal(estimateComplexity('function f(xs) { return xs.map(x => x); }').notation, 'Unknown');
  assert.equal(
    estimateComplexity('function f(n) { for(let i=0;i<n;i++) work(); }').notation,
    'Unknown',
  );
});
