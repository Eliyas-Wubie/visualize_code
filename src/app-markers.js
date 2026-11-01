/** Classify app markers without loading their code or executing configuration. */
function classify(name, text) {
  if (name === 'package.json') {
    const data = JSON.parse(text);
    const deps = { ...data.dependencies, ...data.devDependencies };
    const framework = data.engines?.vscode
      ? 'VS Code extension'
      : deps.next
        ? 'Next.js'
        : deps.react
          ? 'React'
          : 'JavaScript / TypeScript';
    return {
      name: typeof data.name === 'string' ? data.name : undefined,
      framework,
      language: 'js',
      scripts: Object.fromEntries(
        Object.entries(data.scripts || {}).filter(([, value]) => typeof value === 'string'),
      ),
      packageManager:
        typeof data.packageManager === 'string' &&
        ['npm', 'pnpm', 'yarn', 'bun'].includes(data.packageManager.split('@')[0])
          ? data.packageManager.split('@')[0]
          : 'npm',
      workspace: Boolean(data.workspaces),
      main: typeof data.main === 'string' ? data.main : undefined,
    };
  }
  if (name.startsWith('next.config.')) return { framework: 'Next.js', language: 'js' };
  if (name.startsWith('vite.config.')) return { framework: 'Vite / JavaScript', language: 'js' };
  const lower = text.toLowerCase();
  return {
    framework:
      name === 'manage.py' || lower.includes('django')
        ? 'Django / Python'
        : lower.includes('fastapi')
          ? 'FastAPI / Python'
          : lower.includes('flask')
            ? 'Flask / Python'
            : 'Python',
    language: 'py',
  };
}

module.exports = { classify };
