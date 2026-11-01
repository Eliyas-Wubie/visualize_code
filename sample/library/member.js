class Member {
  /** Store synthetic member details and their current number of loans. */
  constructor(name, activeLoans = 0) {
    this.name = name;
    this.activeLoans = activeLoans;
  }

  /** Allow borrowing when the member has fewer than three active loans. */
  canBorrow() {
    return this.activeLoans < 3;
  }

  /** Record one approved loan on this in-memory member. */
  recordLoan() {
    this.activeLoans++;
  }
}

module.exports = { Member };
