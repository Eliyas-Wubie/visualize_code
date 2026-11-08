const { AuthoringError } = require('./authoring-error');
const { validIdentifier } = require('./edit-safety');

/** Generate a documented JS/TS/Python declaration from a name and optional body; empty bodies use scaffolds and unsupported languages fail. */
function entitySource(kind, name, language, method = false, body = '') {
  const python = language === 'python';
  if (
    !python &&
    !['javascript', 'javascriptreact', 'typescript', 'typescriptreact'].includes(language)
  )
    throw new AuthoringError(
      'Function and class creation currently supports JavaScript, TypeScript and Python.',
    );
  if (!validIdentifier(name, python))
    throw new AuthoringError('Choose a nonreserved function/class identifier.');
  const custom = body.trim()
    ? body
        .trimEnd()
        .split('\n')
        .map((line) => (python ? '    ' : '  ') + line)
        .join('\n') + '\n'
    : undefined;
  if (python) {
    if (kind === 'class')
      return `class ${name}:\n    """Describe ${name}."""\n${custom || '\n    def __init__(self):\n        """Initialize this instance."""\n        pass\n'}`;
    return `def ${name}(${method ? 'self' : ''}):\n    """Describe ${name}."""\n${custom || '    pass\n'}`;
  }
  if (kind === 'class')
    return `/** Describe ${name}. */\nclass ${name} {\n${custom || '  /** Initialize this instance. */\n  constructor() {}\n'}}\n`;
  return `/** Describe ${name}. */\n${method ? '' : 'function '}${name}() {\n${custom || ''}}\n`;
}

/** Compute a source insertion at file end or within a fresh provider class range; preserve existing text and indentation. */
function declarationInsertion(document, target, source) {
  if (!target)
    return { position: document.positionAt(document.getText().length), text: `\n\n${source}` };
  if (target.version !== document.version)
    throw new AuthoringError('Class changed. Choose its location again.');
  const line = target.symbol.selectionRange?.start.line ?? target.symbol.range.start.line;
  const prefix = document.lineAt(line).text;
  // Leading whitespace determines the surrounding class's indentation; source templates use spaces.
  const base = prefix.match(/^\s*/)[0];
  const child = target.symbol.children?.[0]?.range?.start.line ?? line + 1;
  const body = child <= target.symbol.range.end.line ? document.lineAt(child).text : '';
  // Reuse existing class-body indentation, including Python tab indentation; empty JS classes use two spaces.
  const whitespace = body.match(/^\s*/)[0];
  const unit =
    whitespace.length > base.length
      ? whitespace.slice(base.length)
      : document.languageId === 'python'
        ? '    '
        : '  ';
  const indent = base + unit;
  const indented = source
    .trimEnd()
    .split('\n')
    .map((text) => {
      // Python template indentation is four spaces; convert it to the existing class's indentation unit.
      const leading = text.match(/^ */)[0].length;
      return (
        indent +
        (document.languageId === 'python'
          ? unit.repeat(Math.floor(leading / 4)) + ' '.repeat(leading % 4) + text.slice(leading)
          : text)
      );
    })
    .join('\n');
  if (document.languageId === 'python')
    return { position: target.symbol.range.end, text: `\n\n${indented}\n` };
  const text = document.getText(target.symbol.range).trimEnd();
  if (!text.endsWith('}'))
    throw new AuthoringError('Cannot find a supported class body insertion point.');
  const offset = document.offsetAt(target.symbol.range.start) + text.length - 1;
  const end = document.positionAt(offset);
  const closingIndent = document.lineAt(end.line).text.slice(0, end.character);
  if (!closingIndent.trim())
    return {
      position: document.positionAt(offset - closingIndent.length),
      text: `\n${indented}\n`,
    };
  return { position: end, text: `\n${indented}\n${base}` };
}

module.exports = { entitySource, declarationInsertion };
