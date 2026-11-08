const { AuthoringError } = require('./authoring-error');
const { realpath } = require('node:fs/promises');
const { relative, isAbsolute, dirname } = require('node:path');

/** Reject nonlocal, untrusted, symlink-escaped, or protected workspace targets before reading/editing source. */
async function editablePath(vscode, uri, creating = false) {
  if (!vscode.workspace.isTrusted || uri?.scheme !== 'file')
    throw new AuthoringError('Authoring requires a trusted local workspace.');
  const folder = vscode.workspace.getWorkspaceFolder(uri);
  if (!folder) throw new AuthoringError('Choose a location inside the open workspace.');
  const root = await realpath(folder.uri.fsPath);
  const target = await realpath(creating ? dirname(uri.fsPath) : uri.fsPath);
  const path = relative(root, target);
  if (path === '..' || path.startsWith(`..${require('node:path').sep}`) || isAbsolute(path))
    throw new AuthoringError('Symlink targets outside the workspace cannot be edited.');
  const parts = [relative(folder.uri.fsPath, uri.fsPath), path].flatMap((value) =>
    value.split(require('node:path').sep),
  );
  if (
    parts.some((part) =>
      ['.git', '.codex', '.agents', 'node_modules', '.venv', 'venv'].includes(part.toLowerCase()),
    )
  )
    throw new AuthoringError('Choose project source outside protected or dependency directories.');
}

/** Validate one portable filesystem basename, excluding traversal, device names and Windows-reserved characters. */
function validEntityName(name) {
  // Reject separators and Windows-reserved punctuation; control characters are checked separately below.
  const forbidden = /[<>:"/\\|?*]/;
  // Windows device names are reserved even when followed by an extension.
  const device = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
  return (
    typeof name === 'string' &&
    name.length > 0 &&
    name.length <= 180 &&
    name.trim() === name &&
    !name.endsWith('.') &&
    !['.', '..', '.git', '.codex', '.agents'].includes(name.toLowerCase()) &&
    !forbidden.test(name) &&
    ![...name].some((char) => char.charCodeAt(0) < 32) &&
    !device.test(name)
  );
}

/** Validate a conservative JS/TS/Python identifier; unsupported names are rejected rather than repaired. */
function validIdentifier(name, python) {
  // ASCII identifier subset deliberately excludes Unicode names and Python dollar signs.
  const identifier = python ? /^[A-Za-z_][A-Za-z0-9_]*$/ : /^[A-Za-z_$][A-Za-z0-9_$]*$/;
  const reserved = new Set(
    'class def return import from as for while if else elif try except finally with lambda pass raise yield async await function const let var new this super extends export default delete typeof void switch case break continue in instanceof interface implements enum private protected public static constructor None True False and or not is global nonlocal assert del match'.split(
      ' ',
    ),
  );
  return (
    typeof name === 'string' && name.length <= 120 && identifier.test(name) && !reserved.has(name)
  );
}

module.exports = { editablePath, validEntityName, validIdentifier };
