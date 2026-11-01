const { test } = require('node:test');
const assert = require('node:assert/strict');
const { placeOrder } = require('../sample/orders');
const { totalItems } = require('../sample/pricing');
const { formatReceipt } = require('../sample/receipt');

test('sample branches cover paid, declined, and empty orders', () => {
  const order = {
    customer: 'Sample',
    items: [{ name: 'Notebook', price: 8, quantity: 2 }],
    balance: 25,
  };
  assert.deepEqual(placeOrder(order), { customer: 'Sample', status: 'paid', total: 14.4 });
  assert.equal(placeOrder({ ...order, balance: 0 }).status, 'declined');
  assert.equal(placeOrder({ ...order, items: [] }).status, 'empty order');
});

test('sample recursion totals multiple items and receipt formats cents', () => {
  assert.equal(
    totalItems([
      { price: 3, quantity: 2 },
      { price: 5, quantity: 1 },
    ]),
    11,
  );
  assert.equal(totalItems([]), 0);
  assert.equal(
    formatReceipt({ customer: 'Sample', status: 'paid', total: 14.4 }),
    'Sample: paid — $14.40',
  );
});
