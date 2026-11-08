const fs = require('node:fs/promises');
const { join, relative, isAbsolute, resolve, sep } = require('node:path');
const { tmpdir } = require('node:os');
const { pathToFileURL } = require('node:url');
const { SYMBOL_KINDS } = require('../src/symbol-kinds');

/** Create a synthetic local workspace with real files and controlled symbol/refactor providers; no application code executes. */
async function authoringHost(t, files) {
  const directory = await fs.mkdtemp(join(tmpdir(), 'visualizer-authoring-'));
  t.after(async () => {
    const target = resolve(directory);
    if (!target.startsWith(resolve(tmpdir()) + sep) || !target.includes('visualizer-authoring-'))
      throw new Error('Unsafe fixture cleanup target');
    await fs.rm(target, { recursive: true, force: true });
  });
  for (const [path, text] of Object.entries(files)) {
    await fs.mkdir(require('node:path').dirname(join(directory, path)), { recursive: true });
    await fs.writeFile(join(directory, path), text);
  }
  const uri = (path = '') => ({
    scheme: 'file',
    fsPath: join(directory, path),
    path: join(directory, path).split('\\').join('/'),
    toString() {
      return pathToFileURL(this.fsPath).toString();
    },
  });
  const documents = new Map();
  const saved = [];
  const symbols = new Map();
  const folder = { uri: uri(), name: 'Fixture' };
  const calls = [];
  class WorkspaceEdit {
    constructor() {
      this.ops = [];
    }
    replace(uri, range, text) {
      this.ops.push({ uri, range, text });
    }
    insert(uri, position, text) {
      this.replace(uri, { start: position, end: position }, text);
    }
    createFile(uri) {
      this.ops.push({ uri, create: true });
    }
    get size() {
      return new Set(this.ops.map((op) => op.uri.toString())).size;
    }
    entries() {
      return [...new Set(this.ops.map((op) => op.uri))].map((uri) => [
        uri,
        this.ops.filter((op) => op.uri === uri),
      ]);
    }
  }
  const openTextDocument = async (target) => {
    if (documents.has(target.toString())) return documents.get(target.toString());
    const document = {
      uri: target,
      text: await fs.readFile(target.fsPath, 'utf8'),
      version: 1,
      languageId: target.fsPath.endsWith('.py') ? 'python' : 'javascript',
      async save() {
        await fs.writeFile(this.uri.fsPath, this.text);
        saved.push(this.uri.toString());
        return true;
      },
      offsetAt(position) {
        return (
          this.text
            .split('\n')
            .slice(0, position.line)
            .reduce((sum, line) => sum + line.length + 1, 0) + position.character
        );
      },
      positionAt(offset) {
        const lines = this.text.slice(0, offset).split('\n');
        return { line: lines.length - 1, character: lines.at(-1).length };
      },
      getText(range) {
        return range
          ? this.text.slice(this.offsetAt(range.start), this.offsetAt(range.end))
          : this.text;
      },
      lineAt(line) {
        return { text: this.text.split('\n')[line] };
      },
    };
    documents.set(target.toString(), document);
    return document;
  };
  const vscode = {
    Uri: { joinPath: (base, ...parts) => uri(relative(directory, join(base.fsPath, ...parts))) },
    FileType: { File: 1, Directory: 2, SymbolicLink: 64 },
    SymbolKind: SYMBOL_KINDS,
    WorkspaceEdit,
    Position: class {
      constructor(line, character) {
        this.line = line;
        this.character = character;
      }
    },
    Range: class {
      constructor(start, end) {
        this.start = start;
        this.end = end;
      }
    },
    debug: {},
    workspace: {
      isTrusted: true,
      workspaceFolders: [folder],
      openTextDocument,
      getWorkspaceFolder(target) {
        const path = relative(directory, target.fsPath);
        return path === '..' || path.startsWith('..' + sep) || isAbsolute(path)
          ? undefined
          : folder;
      },
      asRelativePath: (target) => relative(directory, target.fsPath).split('\\').join('/'),
      fs: {
        readDirectory: async (target) =>
          (await fs.readdir(target.fsPath, { withFileTypes: true })).map((item) => [
            item.name,
            item.isSymbolicLink() ? 64 : item.isDirectory() ? 2 : 1,
          ]),
        stat: async (target) => fs.stat(target.fsPath),
        createDirectory: async (target) => fs.mkdir(target.fsPath),
      },
      async applyEdit(edit) {
        for (const op of edit.ops.filter((op) => op.create))
          await fs.writeFile(op.uri.fsPath, '', { flag: 'wx' });
        const groups = new Map();
        for (const op of edit.ops.filter((op) => !op.create)) {
          if (!groups.has(op.uri.toString())) groups.set(op.uri.toString(), []);
          groups.get(op.uri.toString()).push(op);
        }
        for (const ops of groups.values()) {
          const document = await openTextDocument(ops[0].uri);
          for (const op of ops.sort(
            (a, b) => document.offsetAt(b.range.start) - document.offsetAt(a.range.start),
          )) {
            const start = document.offsetAt(op.range.start);
            const end = document.offsetAt(op.range.end);
            document.text = document.text.slice(0, start) + op.text + document.text.slice(end);
          }
          document.version++;
        }
        return true;
      },
    },
    commands: {
      async executeCommand(command, target, ...args) {
        calls.push({ command, target, args });
        if (command === 'vscode.executeDocumentSymbolProvider')
          return symbols.get(target.toString()) || [];
        if (command === 'vscode.provideOutgoingCalls') return [];
        return [];
      },
    },
  };
  /** Set fresh provider symbols for a declaration occupying the complete fixture document. */
  const symbol = async (path, name, kind = SYMBOL_KINDS.Function) => {
    const target = uri(path);
    const doc = await openTextDocument(target);
    const offset = doc.text.indexOf(name);
    const value = {
      name,
      kind,
      range: { start: doc.positionAt(0), end: doc.positionAt(doc.text.length) },
      selectionRange: { start: doc.positionAt(offset), end: doc.positionAt(offset + name.length) },
      children: [],
    };
    symbols.set(target.toString(), [value]);
    return { ...value, uri: target };
  };
  return { vscode, uri, documents, symbols, folder, symbol, calls, directory, saved };
}

module.exports = { authoringHost };
