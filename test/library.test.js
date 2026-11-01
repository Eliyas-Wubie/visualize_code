const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Library } = require('../sample/library/library');
const { Member } = require('../sample/library/member');

test('approved borrowing updates book availability and member loans, then prevents a second loan', () => {
  const book = { title: 'Example Book', available: true };
  const member = new Member('Sample');
  const library = new Library([book]);
  assert.deepEqual(library.borrow(member, book.title), {
    approved: true,
    message: 'Sample borrowed Example Book',
  });
  assert.equal(member.activeLoans, 1);
  assert.equal(book.available, false);
  assert.deepEqual(library.borrow(member, book.title), {
    approved: false,
    reason: 'Book unavailable',
  });
  assert.equal(member.activeLoans, 1);
});

test('missing books and loan-limit rejections leave member and book state unchanged', () => {
  const book = { title: 'Example Book', available: true };
  const library = new Library([book]);
  const member = new Member('Sample', 3);
  assert.deepEqual(library.borrow(member, book.title), {
    approved: false,
    reason: 'Loan limit reached',
  });
  assert.equal(book.available, true);
  assert.equal(member.activeLoans, 3);
  assert.deepEqual(library.borrow(new Member('Another'), 'Missing'), {
    approved: false,
    reason: 'Book unavailable',
  });
});
