class Notifications {
  /** Format a loan confirmation; no message is sent to an external service. */
  confirmation(member, book) {
    return `${member.name} borrowed ${book.title}`;
  }
}

module.exports = { Notifications };
