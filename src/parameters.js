/** Read a parenthesized declaration, ignoring parentheses inside strings and comments. */
function parenthesized(text) {
  let depth = 0;
  let quote;
  let comment;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (comment === 'line') {
      if (char === '\n') comment = undefined;
      continue;
    }
    if (comment === 'block') {
      if (char === '*' && next === '/') {
        comment = undefined;
        i++;
      }
      continue;
    }
    if (quote) {
      if (char === '\\') {
        i++;
        continue;
      }
      if (char === quote) quote = undefined;
      continue;
    }
    if (char === '/' && next === '/') {
      comment = 'line';
      i++;
      continue;
    }
    if (char === '/' && next === '*') {
      comment = 'block';
      i++;
      continue;
    }
    if (char === '#') {
      comment = 'line';
      continue;
    }
    if (['"', "'", '`'].includes(char)) {
      quote = char;
      continue;
    }
    if (char === '(') depth++;
    if (char === ')' && --depth === 0) return text.slice(0, i + 1);
  }
  return null;
}

/** Extract common function parameters after the symbol name; return null for unsupported syntax. */
function extractParameters(afterName) {
  let text = afterName.trimStart();
  if (text.startsWith('=')) text = text.slice(1).trimStart();
  if (text.startsWith('async ')) text = text.slice(6).trimStart();
  if (text.startsWith('<')) {
    let depth = 0;
    let end = -1;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '<') depth++;
      if (text[i] === '>' && text[i - 1] !== '=' && --depth === 0) {
        end = i;
        break;
      }
    }
    if (end < 0) return null;
    text = text.slice(end + 1).trimStart();
  }
  if (text.startsWith('(')) return parenthesized(text);
  // Match a single unparenthesized JavaScript arrow parameter, followed by its arrow.
  const single = text.match(/^([A-Za-z_$][\w$]*)\s*=>/);
  return single ? `(${single[1]})` : null;
}

/** Enrich newly discovered functions from source documents; unsupported declarations stay explicit. */
async function enrichParameters(graph, openDocument) {
  await Promise.all(
    [...graph.nodes.values()]
      .filter((node) => node.parameters === undefined)
      .map(async (node) => {
        const item = graph.items.get(node.id);
        try {
          const document = await openDocument(item.uri);
          const offset = document.offsetAt(item.selectionRange.end);
          node.parameters = extractParameters(document.getText().slice(offset, offset + 8000));
        } catch {
          node.parameters = null;
        }
      }),
  );
}

module.exports = { extractParameters, enrichParameters };
