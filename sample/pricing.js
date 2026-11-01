/** Recursively total the sample items; return zero for an empty list. */
function totalItems(items, index = 0) {
  if (index >= items.length) return 0;
  const item = items[index];
  return item.price * item.quantity + totalItems(items, index + 1);
}

/** Apply a ten-percent discount on totals of at least ten; round to cents. */
function applyDiscount(subtotal) {
  return subtotal >= 10 ? Math.round(subtotal * 0.9 * 100) / 100 : subtotal;
}

module.exports = { totalItems, applyDiscount };
