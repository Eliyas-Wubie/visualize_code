const { Library } = require('./library');
const { Member } = require('./member');

/** Demonstrate approved, unavailable, and loan-limit paths using synthetic library data. */
function main() {
  const library = new Library([{ title: 'Learning JavaScript', available: true }]);
  const member = new Member('Sample Reader');
  console.log(library.borrow(member, 'Learning JavaScript'));
  console.log(library.borrow(member, 'Learning JavaScript'));
  console.log(library.borrow(new Member('Busy Reader', 3), 'Learning JavaScript'));
}

if (require.main === module) main();

module.exports = { main };
