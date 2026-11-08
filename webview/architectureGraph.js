const { aggregateGraph } = require('./aggregateGraph');
const { architectureRole } = require('./architectureRoles');

/** Group known code by estimated responsibility and report the exact conventions/links supporting a possible architecture. */
function architectureGraph(graph) {
  const framework = graph.app?.framework || '';
  const grouped = aggregateGraph(graph, (node) => {
    const info = architectureRole(node.file, framework);
    return { ...info, id: `area:${info.role}`, kind: 'architecture', file: node.file };
  });
  const roles = new Set(grouped.nodes.map((node) => node.role));
  const linked = (from, to) =>
    grouped.edges.some((edge) => edge.from === `area:${from}` && edge.to === `area:${to}`);
  let pattern = 'Architecture undetermined';
  let evidence =
    'The scanned code does not provide enough recognized structure to suggest a pattern.';
  if (
    (linked('ui', 'service') || linked('entry', 'service')) &&
    (linked('service', 'data') || linked('service', 'model'))
  ) {
    pattern = 'Layered-style architecture (estimate)';
    evidence =
      'Detected calls connect UI/controllers to services, and services to data/domain areas.';
  } else if (roles.has('ui') && roles.has('entry') && roles.has('model')) {
    pattern = 'MVC-style organization (naming estimate)';
    evidence =
      'View/UI, controller, and model conventions are present. MVC control flow is not verified.';
  } else if ((framework.includes('React') || framework.includes('Next.js')) && roles.has('ui')) {
    pattern = 'Component-oriented frontend (estimate)';
    evidence = `${framework} app metadata and recognized UI source files. Server/deployment architecture is undetermined.`;
  }
  return {
    ...grouped,
    nodes: grouped.nodes.map((node) => ({
      ...node,
      files: [...new Set(node.methods.map((method) => method.file.split('\\').join('/')))],
      evidence: [
        ...new Set(
          node.methods.map(
            (method) => `${method.file}: ${architectureRole(method.file, framework).reason}`,
          ),
        ),
      ],
    })),
    architecture: {
      pattern,
      evidence,
      framework,
      classified: grouped.nodes.filter((node) => node.role !== 'unclassified').length,
    },
  };
}

module.exports = { architectureGraph };
