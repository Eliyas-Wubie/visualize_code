/** Simulate payment approval from the supplied balance; no funds are moved. */
function charge(total, balance) {
  if (balance < total) return false;
  return true;
}

module.exports = { charge };
