const JS = new Set(
  'async await break case catch class const continue debugger default delete do else enum export extends finally for from function get if implements import in instanceof interface keyof let namespace new of private protected public readonly return satisfies set static super switch this throw try type typeof var void while yield abstract as assert boolean declare never number string symbol unknown any null true false undefined'.split(
    ' ',
  ),
);
const PY = new Set(
  'False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case'.split(
    ' ',
  ),
);
// Sticky Unicode identifier matching consumes a complete name at the current offset, including JS dollar/zero-width characters.
const IDENTIFIER = /[\p{ID_Start}_$][\p{ID_Continue}$\u200c\u200d]*/uy;
// Sticky, case-insensitive matching covers decimal/exponent and binary/octal/hex literals; this colors without numeric validation.
const NUMBER = /(?:0[xob][\da-f_]+|(?:\d[\d_]*(?:\.[\d_]*)?|\.\d[\d_]*)(?:e[+-]?[\d_]+)?n?)/iy;

/** Consume a quoted token with escapes; multiline Python triple strings and JS templates stay intact, without parsing interpolation. */
function quotedEnd(source, start, python) {
  const quote = source[start];
  const delimiter = python && source.startsWith(quote.repeat(3), start) ? quote.repeat(3) : quote;
  let end = start + delimiter.length;
  while (end < source.length) {
    if (source[end] === '\\') {
      end = Math.min(source.length, end + 2);
      continue;
    }
    if (source.startsWith(delimiter, end)) return end + delimiter.length;
    if (source[end] === '\n' && delimiter.length === 1 && quote !== '`') return end;
    end++;
  }
  return end;
}

/** Color JS/TS, Python and JSON lexical tokens without altering source or emitting HTML; other languages remain plain text. */
function syntaxTokens(source, language = '') {
  const python = language === 'python';
  const json = ['json', 'jsonc'].includes(language);
  if (
    !python &&
    !json &&
    !['javascript', 'javascriptreact', 'typescript', 'typescriptreact'].includes(language)
  )
    return [{ text: source, type: 'plain' }];
  const keywords = python ? PY : json ? new Set(['true', 'false', 'null']) : JS;
  const tokens = [];
  let position = 0;
  let previous;
  const emit = (end, type) => {
    const text = source.slice(position, end);
    if (tokens.at(-1)?.type === type) tokens[tokens.length - 1].text += text;
    else tokens.push({ text, type });
    position = end;
  };
  while (position < source.length) {
    const char = source[position];
    if (
      (python && char === '#') ||
      (!python && language !== 'json' && source.startsWith('//', position))
    ) {
      const newline = source.indexOf('\n', position);
      emit(newline < 0 ? source.length : newline, 'comment');
      continue;
    }
    if (!python && language !== 'json' && source.startsWith('/*', position)) {
      const end = source.indexOf('*/', position + 2);
      emit(end < 0 ? source.length : end + 2, 'comment');
      continue;
    }
    if (['"', "'", ...(python || json ? [] : ['`'])].includes(char)) {
      emit(quotedEnd(source, position, python), 'string');
      previous = undefined;
      continue;
    }
    IDENTIFIER.lastIndex = position;
    const name = IDENTIFIER.exec(source)?.[0];
    if (name) {
      let lookahead = position + name.length;
      while (lookahead < source.length && ' \t\r\n'.includes(source[lookahead])) lookahead++;
      const next = source[lookahead];
      const type = keywords.has(name)
        ? 'keyword'
        : ['class', 'interface', 'type', 'enum', 'new'].includes(previous)
          ? 'type'
          : ['def', 'function'].includes(previous) || next === '('
            ? 'function'
            : 'plain';
      emit(position + name.length, type);
      previous = name;
      continue;
    }
    NUMBER.lastIndex = position;
    const number = NUMBER.exec(source)?.[0];
    if (number) {
      emit(position + number.length, 'number');
      previous = undefined;
      continue;
    }
    if ('{}[]();,.:?+-*/%=!<>|&~^'.includes(char)) previous = undefined;
    emit(position + 1, '{}[]();,.:?+-*/%=!<>|&~^'.includes(char) ? 'punctuation' : 'plain');
  }
  return tokens;
}

/** Choose a supported coloring language from a file name; unknown extensions stay plain text. */
function syntaxLanguage(file = '') {
  const extension = file.split('.').pop().toLowerCase();
  return (
    {
      py: 'python',
      js: 'javascript',
      mjs: 'javascript',
      cjs: 'javascript',
      jsx: 'javascriptreact',
      ts: 'typescript',
      tsx: 'typescriptreact',
      json: 'json',
      jsonc: 'jsonc',
    }[extension] || 'plaintext'
  );
}

module.exports = { syntaxTokens, syntaxLanguage };
