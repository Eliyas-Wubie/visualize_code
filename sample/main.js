const { placeOrder } = require('./orders');
const { printReceipt } = require('./receipt');

/** Run successful and declined orders using synthetic data; print their outcomes. */
function main() {
  const orders = [
    {
      customer: 'Sample Customer',
      items: [{ name: 'Notebook', price: 8, quantity: 2 }],
      balance: 25,
    },
    { customer: 'Another Customer', items: [{ name: 'Pen', price: 3, quantity: 2 }], balance: 2 },
  ];
  for (const order of orders) {
    const result = placeOrder(order);
    printReceipt(result);
  }
}

if (require.main === module) main();

module.exports = { main };
