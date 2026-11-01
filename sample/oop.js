class Cart {
  /** Total synthetic item prices without changing the cart. */
  total(items) {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }
}

class Payment {
  /** Simulate a payment decision; no real funds are moved. */
  charge(total, balance) {
    return balance >= total;
  }
}

class Checkout {
  /** Calculate an order and ask Payment to approve it. */
  run(items, balance) {
    const cart = new Cart();
    const payment = new Payment();
    const total = cart.total(items);
    return { total, paid: payment.charge(total, balance) };
  }
}

/** Start the class-based sample; prints a synthetic checkout result. */
function main() {
  const checkout = new Checkout();
  console.log(checkout.run([{ price: 8, quantity: 2 }], 25));
}

if (require.main === module) main();

module.exports = { Cart, Payment, Checkout, main };
