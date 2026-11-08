/** An actionable authoring validation failure safe to display; unexpected provider/filesystem errors stay internal. */
class AuthoringError extends Error {}

module.exports = { AuthoringError };
