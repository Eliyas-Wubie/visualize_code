const vscode = require('vscode');
const { randomBytes } = require('node:crypto');

/** Load the local React bundle; inline styles support React Flow's node positioning. */
function render(webview, extensionUri) {
  const nonce = randomBytes(16).toString('hex');
  const asset = (name) => webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', name));
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} data:;">
<link rel="stylesheet" href="${asset('bundle.css')}"><title>Function Map</title></head>
<body><div id="root"></div>
<script nonce="${nonce}" src="${asset('bundle.js')}"></script></body></html>`;
}

module.exports = { render };
