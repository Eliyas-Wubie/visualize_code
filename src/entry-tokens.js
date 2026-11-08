/** Tokenize declaration boundaries without evaluating source; quoted text/comments cannot introduce body delimiters. */
function entryTokens(text) {
  // Unicode identifier characters keep names distinct from punctuation in declaration headers.
  const identifierStart = /[$_\p{ID_Start}]/u;
  // Identifier continuations additionally allow digits and JavaScript's zero-width joiners.
  const identifierPart = /[$\u200c\u200d\p{ID_Continue}]/u;
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    const start = i;
    const char = text[i];
    if (char.trim() === '') {
      i++;
      continue;
    }
    if (char === '#' || text.startsWith('//', i)) {
      while (i < text.length && text[i] !== '\n') i++;
      continue;
    }
    if (text.startsWith('/*', i)) {
      const end = text.indexOf('*/', i + 2);
      i = end < 0 ? text.length : end + 2;
      continue;
    }
    if (['"', "'", '`'].includes(char)) {
      const quote = text.startsWith(char.repeat(3), i) ? char.repeat(3) : char;
      i += quote.length;
      while (i < text.length && !text.startsWith(quote, i)) i += text[i] === '\\' ? 2 : 1;
      i = Math.min(text.length, i + quote.length);
      tokens.push({ value: 'string', kind: 'string', start, end: i });
      continue;
    }
    if (identifierStart.test(char)) {
      i++;
      while (i < text.length && identifierPart.test(text[i])) i++;
    } else if (text.startsWith('=>', i)) i += 2;
    else i++;
    tokens.push({ value: text.slice(start, i), start, end: i });
  }
  return tokens;
}

module.exports = { entryTokens };
