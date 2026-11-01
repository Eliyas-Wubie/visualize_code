const path = require('node:path').posix;

/** Recognize framework conventions as entry candidates, not guaranteed runtime entry points. */
function isEntry(file, app) {
  const relative = app.root === '.' ? file : file.slice(app.root.length + 1);
  const name = path.basename(relative);
  const stem = name.slice(0, name.lastIndexOf('.'));
  if (app.main && relative === app.main.replace('./', '')) return true;
  if (app.framework === 'Next.js') {
    const parts = relative.split('/');
    return (
      (parts.includes('app') &&
        ['page', 'layout', 'route', 'loading', 'error', 'not-found', 'default'].includes(stem)) ||
      parts.includes('pages')
    );
  }
  return ['main', 'index', 'App', '__main__', 'manage', 'app', 'server'].includes(stem);
}

module.exports = { isEntry };
