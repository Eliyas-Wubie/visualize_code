const esbuild = require('esbuild');
const { resolve } = require('node:path');
const { mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const { createHash } = require('node:crypto');

esbuild
  .build({
    absWorkingDir: resolve(__dirname, '..'),
    entryPoints: ['./webview/main.jsx'],
    tsconfigRaw: {},
    bundle: true,
    outfile: 'media/bundle.js',
    minify: true,
    platform: 'browser',
    target: 'chrome120',
    define: { 'process.env.NODE_ENV': '"production"' },
  })
  .then(() => {
    mkdirSync('reports', { recursive: true });
    const digest = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
    writeFileSync(
      'reports/build.json',
      JSON.stringify(
        {
          revision: process.env.GITHUB_SHA || 'local-uncommitted',
          javascript: digest('media/bundle.js'),
          css: digest('media/bundle.css'),
        },
        null,
        2,
      ) + '\n',
    );
  })
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
