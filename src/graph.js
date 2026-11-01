/** A bounded call graph. Provider failures leave nodes retryable. */
class CallGraph {
  /** Accept an async call provider, URI labeler, and maximum number of retained functions. */
  constructor(provideCalls, label, limit = 300) {
    this.provideCalls = provideCalls;
    this.label = label;
    this.limit = limit;
    this.nodes = new Map();
    this.items = new Map();
    this.edges = [];
  }

  /** Register a language-provider item and return its stable graph node. */
  add(item) {
    const start = item.selectionRange.start;
    const id = JSON.stringify([item.uri.toString(), start.line, start.character, item.name]);
    if (!this.nodes.has(id)) {
      if (this.nodes.size >= this.limit) return undefined;
      this.items.set(id, item);
      this.nodes.set(id, {
        id,
        name: item.name,
        file: this.label(item.uri),
        line: start.line + 1,
        loaded: false,
      });
    }
    return this.nodes.get(id);
  }

  /** Expand one known node, deduplicating recursion; reject invalid IDs or provider failures. */
  async expand(id) {
    const node = this.nodes.get(id);
    if (!node) throw new Error('Unknown graph node');
    if (node.loaded) return;
    const calls = await this.provideCalls(this.items.get(id));
    if (!Array.isArray(calls))
      throw new Error('The language provider did not return call information.');
    let omitted = 0;
    for (const call of calls) {
      const target = this.add(call.to);
      if (!target) {
        omitted++;
        continue;
      }
      const lines = [...new Set(call.fromRanges.map((range) => range.start.line + 1))];
      const existing = this.edges.find(
        (edge) => edge.from === id && edge.to === target.id && edge.kind !== 'render',
      );
      if (existing) existing.lines = [...new Set([...existing.lines, ...lines])];
      else {
        this.edges.push({ from: id, to: target.id, lines });
      }
    }
    node.loaded = true;
    node.omitted = omitted;
  }

  /** Return presentation data only; source locations remain in the extension host. */
  snapshot() {
    return { nodes: [...this.nodes.values()], edges: this.edges, limit: this.limit };
  }
}

module.exports = { CallGraph };
