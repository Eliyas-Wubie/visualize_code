/** Extract language-provider documentation while excluding the leading signature code block. */
function hoverDocumentation(hovers) {
  const sections = [];
  for (const hover of hovers || []) {
    for (let index = 0; index < (hover.contents || []).length; index++) {
      const content = hover.contents[index];
      let text = typeof content === 'string' ? content : content.value;
      if (typeof text !== 'string') continue;
      if (index === 0 && content.language) continue;
      if (index === 0 && text.trimStart().startsWith('```')) {
        const start = text.indexOf('```');
        const end = text.indexOf('```', start + 3);
        if (end !== -1) text = text.slice(end + 3);
      }
      if (text.trim()) sections.push(text.trim());
    }
  }
  return [...new Set(sections)].join('\n\n').slice(0, 20000) || null;
}

/** Attach existing hover documentation once per discovered function; never synthesize documentation. */
async function enrichDocumentation(graph, provideHover) {
  await Promise.all(
    [...graph.nodes.values()]
      .filter((node) => node.documentation === undefined)
      .map(async (node) => {
        const item = graph.items.get(node.id);
        try {
          node.documentation = hoverDocumentation(
            await provideHover(item.uri, item.selectionRange.start),
          );
        } catch {
          node.documentation = null;
          node.documentationError = 'Documentation unavailable from language extension.';
        }
      }),
  );
}

module.exports = { hoverDocumentation, enrichDocumentation };
