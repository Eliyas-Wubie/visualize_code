/** Construct a lossless synthetic source document and name/range item for entry-breakpoint tests. */
function entryDocument(text, name, languageId = 'javascript') {
  const positionAt = (offset) => {
    const prefix = text.slice(0, offset).split('\n');
    return { line: prefix.length - 1, character: prefix.at(-1).length };
  };
  const offsetAt = (position) =>
    text
      .split('\n')
      .slice(0, position.line)
      .reduce((sum, line) => sum + line.length + 1, 0) + position.character;
  const start = text.indexOf(name);
  return {
    document: { languageId, getText: () => text, offsetAt, positionAt },
    item: {
      name,
      selectionRange: { end: positionAt(start + name.length) },
      range: { end: positionAt(text.length) },
    },
  };
}

module.exports = { entryDocument };
