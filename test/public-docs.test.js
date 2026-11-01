const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Linter } = require('eslint');
const rule = require('../scripts/public-docs-rule.cjs');

test('public documentation lint accepts documented exports and rejects undocumented public APIs', () => {
  const lint = (code) =>
    new Linter().verify(code, [
      { plugins: { standards: { rules: { docs: rule } } }, rules: { 'standards/docs': 'error' } },
    ]);
  assert.equal(
    lint('/** Return the value. */ export function read(value) { return value; }').length,
    0,
  );
  assert.equal(lint('function read(value) { return value; } module.exports = { read };').length, 1);
  assert.equal(lint('class Service { run() {} } module.exports = { Service };').length, 1);
  assert.equal(lint('function privateHelper() {}').length, 0);
  assert.equal(lint('export default function () {}').length, 1);
  assert.equal(lint('/** Start the component. */ export default function () {}').length, 0);
  assert.equal(lint('export const run = () => 1;').length, 1);
  assert.equal(lint('/** Return a value. */ export const run = () => 1;').length, 0);
});
