class Catalog {
  /** Find an available book in the supplied synthetic collection; return undefined if missing. */
  findAvailable(books, title) {
    return books.find((book) => book.title === title && book.available);
  }
}

module.exports = { Catalog };
