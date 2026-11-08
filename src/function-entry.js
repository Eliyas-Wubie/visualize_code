const { entryTokens } = require('./entry-tokens');
const { extractParameters } = require('./parameters');
const { declarationOffset } = require('./declaration-offset');

/** Resolve a callable-body token after its name/signature; reject unsupported declarations explicitly. */
function functionEntry(document, item) {
  const offset = declarationOffset(document, item);
  const end = document.offsetAt((item.range || item.selectionRange).end);
  const text = document.getText().slice(offset, end);
  const parameters = extractParameters(text);
  const parameterStart = parameters ? text.indexOf(parameters) : -1;
  const start = parameterStart >= 0 ? parameterStart + parameters.length : 0;
  const tokens = entryTokens(text.slice(start));
  const python = document.languageId === 'python';
  let depth = 0;
  let body = -1;
  for (let i = 0; i < tokens.length; i++) {
    const value = tokens[i].value;
    // An object-shaped TypeScript return annotation precedes the actual block or arrow body.
    if (!python && depth === 0 && value === '{' && tokens[0]?.value === ':') {
      let end = i + 1;
      let braces = 1;
      while (end < tokens.length && braces) {
        if (tokens[end].value === '{') braces++;
        if (tokens[end].value === '}') braces--;
        end++;
      }
      if (['{', '=>'].includes(tokens[end]?.value)) {
        i = end - 1;
        continue;
      }
    }
    if (depth === 0 && (python ? value === ':' : ['{', '=>'].includes(value))) {
      body = i + 1;
      if (!python && value === '=>' && tokens[body]?.value === '{') body++;
      break;
    }
    if (['(', '[', '{'].includes(value)) depth++;
    if ([')', ']', '}'].includes(value)) depth--;
  }
  if (python && tokens[body]?.kind === 'string' && tokens[body + 1]) body++;
  const token = tokens[body];
  if (body < 0 || !token) throw new Error(`No executable function body found for ${item.name}.`);
  return document.positionAt(offset + start + token.start);
}

module.exports = { functionEntry };
