const { entryTokens } = require('./entry-tokens');

/** Resolve the name end from source when a provider selects a full signature/body rather than only the name. */
function declarationOffset(document, item) {
  const text = document.getText();
  const range = item.range || item.selectionRange;
  const start = range.start ? document.offsetAt(range.start) : 0;
  const end = document.offsetAt(range.end);
  const name = item.name.split('(')[0].trim().split('.').at(-1);
  if (item.selectionRange?.start) {
    const selectedStart = document.offsetAt(item.selectionRange.start);
    const selectedEnd = document.offsetAt(item.selectionRange.end);
    if (
      selectedStart >= start &&
      selectedEnd < end &&
      text.slice(selectedStart, selectedEnd) === name
    )
      return selectedEnd;
  }
  const tokens = entryTokens(text.slice(start, end));
  const python = document.languageId === 'python';
  const token = tokens.find(
    (token, index) =>
      token.value === name &&
      !token.kind &&
      (python
        ? tokens[index - 1]?.value === 'def'
        : ['(', '=', '<'].includes(tokens[index + 1]?.value)),
  );
  if (!token) throw new Error('The provider range does not contain the function declaration name.');
  return start + token.end;
}

module.exports = { declarationOffset };
