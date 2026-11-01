/** Format a sample order result as a printable receipt line. */
function formatReceipt(result) {
  return `${result.customer}: ${result.status} — $${result.total.toFixed(2)}`;
}

/** Print one receipt to standard output. */
function printReceipt(result) {
  console.log(formatReceipt(result));
}

module.exports = { formatReceipt, printReceipt };
