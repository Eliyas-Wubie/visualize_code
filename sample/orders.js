const { totalItems, applyDiscount } = require('./pricing');
const { charge } = require('./payment');

/** Validate an order and return a receipt or rejection; no external services are called. */
function placeOrders(order) {
  if (!order.items.length) return { customer: order.customer, status: 'empty order', total: 0 };
  const subtotal = totalItems(order.items);
  const total = applyDiscount(subtotal);
  const paid = charge(total, order.balance);
  return { customer: order.customer, status: paid ? 'paid' : 'declined', total };
}

module.exports = { placeOrder: placeOrders };
