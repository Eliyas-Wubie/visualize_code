const { Catalog } = require('./catalog');
const { Notifications } = require('./notifications');

class Library {
  /** Store the supplied in-memory books and create local collaborators. */
  constructor(books) {
    this.books = books;
    this.catalog = new Catalog();
    this.notifications = new Notifications();
  }

  /** Approve a loan or return a rejection; approved loans update book and member state. */
  borrow(member, title) {
    if (!member.canBorrow()) return { approved: false, reason: 'Loan limit reached' };
    const book = this.catalog.findAvailable(this.books, title);
    if (!book) return { approved: false, reason: 'Book unavailable' };
    book.available = false;
    member.recordLoan();
    return { approved: true, message: this.notifications.confirmation(member, book) };
  }
}

module.exports = { Library };
