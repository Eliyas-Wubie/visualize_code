"""Validate Python syntax, public documentation, and whitespace without executing application code."""
import ast
import pathlib
import sys


def main():
    """Exit nonzero with file/line diagnostics when a Python source violates the checked standards."""
    failures = []
    files = sorted([*pathlib.Path('runtime').rglob('*.py'), *pathlib.Path('sample').rglob('*.py'),
                    *pathlib.Path('scripts').glob('*.py')])
    for path in files:
        source = path.read_text(encoding='utf-8')
        try:
            tree = ast.parse(source, filename=str(path))
        except SyntaxError as error:
            failures.append(f'{path}:{error.lineno}: invalid Python syntax')
            continue
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                if (not node.name.startswith('_') or node.name == '__init__') and not ast.get_docstring(node):
                    failures.append(f'{path}:{node.lineno}: document {node.name}')
        for number, line in enumerate(source.splitlines(), 1):
            if '\t' in line or line.rstrip() != line:
                failures.append(f'{path}:{number}: tabs or trailing whitespace')
        if not source.endswith('\n'):
            failures.append(f'{path}: missing final newline')
    if failures:
        print('\n'.join(failures), file=sys.stderr)
        return 1
    print(f'Python syntax, documentation, and whitespace checked: {len(files)} files')
    return 0


if __name__ == '__main__':
    sys.exit(main())
