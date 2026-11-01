/** Tokenize common JS/TS syntax for conservative local-work estimates; never execute source. */
function tokenize(source) {
  const tokens = [];
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];
    if (char.trim() === '') {
      index++;
      continue;
    }
    if (char === '/' && next === '/') {
      index = source.indexOf('\n', index + 2);
      if (index < 0) break;
      continue;
    }
    if (char === '/' && next === '*') {
      const end = source.indexOf('*/', index + 2);
      if (end < 0) return null;
      index = end + 2;
      continue;
    }
    if (['"', "'", '`'].includes(char)) {
      if (char === '`') return null; // Template interpolation can contain executable work.
      const quote = char;
      let closed = false;
      for (index++; index < source.length; index++) {
        if (source[index] === '\\') {
          index++;
          continue;
        }
        if (source[index] === quote) {
          closed = true;
          index++;
          break;
        }
      }
      if (!closed) return null;
      tokens.push('STRING');
      continue;
    }
    // Match an identifier or numeric literal at the current position; unsupported characters remain tokens.
    const word = source.slice(index).match(/^[A-Za-z_$][\w$]*|^\d+(?:\.\d+)?/);
    if (word) {
      tokens.push(word[0]);
      index += word[0].length;
      continue;
    }
    if (char === '/' && next !== '=') return null; // Regex literals and division require semantic analysis.
    const operator = source.slice(index, index + 2);
    if (
      ['++', '--', '*=', '/=', '+=', '-=', '=>', '<=', '>=', '==', '!=', '&&', '||'].includes(
        operator,
      )
    ) {
      tokens.push(operator);
      index += 2;
    } else {
      tokens.push(char);
      index++;
    }
  }
  return tokens;
}

module.exports = { tokenize };
