const ROLES = [
  [
    'ui',
    'Presentation / UI',
    [
      'components',
      'component',
      'views',
      'view',
      'pages',
      'page',
      'layouts',
      'layout',
      'webview',
      'templates',
    ],
  ],
  [
    'entry',
    'Controllers / API',
    [
      'controllers',
      'controller',
      'routes',
      'route',
      'routers',
      'router',
      'handlers',
      'handler',
      'api',
      'endpoints',
    ],
  ],
  [
    'service',
    'Services / application logic',
    ['services', 'service', 'usecases', 'use_cases', 'application'],
  ],
  ['model', 'Domain / models', ['domain', 'models', 'model', 'entities', 'entity']],
  [
    'data',
    'Data / integrations',
    [
      'repositories',
      'repository',
      'data',
      'database',
      'db',
      'persistence',
      'adapters',
      'adapter',
      'integrations',
    ],
  ],
  ['shared', 'Shared utilities', ['shared', 'utils', 'utilities', 'helpers', 'common', 'lib']],
];
const TITLES = Object.fromEntries(ROLES.map(([id, title]) => [id, title]));

/** Estimate a file's responsibility from explicit path conventions; return matching evidence, never infer runtime behavior. */
function architectureRole(file, framework = '') {
  const path = file.split('\\').join('/');
  const parts = path.toLowerCase().split('/');
  const filename = parts.pop();
  const tokens = [...parts, ...filename.split('.').slice(0, -1)];
  if (tokens.some((token) => ['test', 'tests', '__tests__', 'spec', 'specs'].includes(token)))
    return { role: 'tests', name: 'Tests', reason: 'Test directory or filename convention' };
  if (framework.includes('Django') && filename === 'views.py')
    return {
      role: 'entry',
      name: TITLES.entry,
      reason: 'Django views.py request-handler convention',
    };
  if (parts.includes('api'))
    return { role: 'entry', name: TITLES.entry, reason: 'api directory convention' };
  for (const token of [...tokens].reverse()) {
    const match = ROLES.find(([, , names]) => names.includes(token));
    if (match) return { role: match[0], name: match[1], reason: `Path convention: ${token}` };
  }
  if (filename.endsWith('.jsx') || filename.endsWith('.tsx'))
    return {
      role: 'ui',
      name: TITLES.ui,
      reason: 'JSX/TSX source extension (estimated UI responsibility)',
    };
  return {
    role: 'unclassified',
    name: 'Unclassified',
    reason: 'No recognized responsibility convention',
  };
}

module.exports = { architectureRole };
