const { tokenize } = require('./complexity-tokens');

/** Estimate local JS/TS loop growth, excluding callees; reject syntax that makes this heuristic ambiguous. */
function estimateComplexity(source, recursive = false) {
  const unknown = (reason) => ({ notation: 'Unknown', reason });
  if (recursive) return unknown('Recursion requires recurrence analysis.');
  const tokens = tokenize(source);
  if (!tokens) return unknown('This syntax requires deeper analysis.');
  const firstBody = tokens.indexOf('{');
  if (firstBody < 0 || tokens.includes('=>') || tokens.includes('do'))
    return unknown('Unsupported body or nested callback syntax.');
  const body = tokens.slice(firstBody);
  if (body.includes('function') || body.includes('class') || body.includes('sort'))
    return unknown('Nested declarations or sorting require deeper analysis.');
  let depth = 0;
  let maximum = 0;
  const loopScopes = [];
  let pending = false;
  for (let i = 0; i < body.length; i++) {
    const token = body[i];
    if (token === 'for' || token === 'while') {
      if (pending) return unknown('Unbraced loop nesting is not supported.');
      let end = i + 1;
      if (body[end] === 'await') end++;
      if (body[end] !== '(') return unknown('Unrecognized loop syntax.');
      let parentheses = 1;
      const start = ++end;
      for (; end < body.length && parentheses; end++) {
        if (body[end] === '(') parentheses++;
        if (body[end] === ')') parentheses--;
      }
      const header = body.slice(start, end - 1);
      if (
        header.includes('*=') ||
        header.includes('/=') ||
        (header.includes('=') && token === 'while')
      ) {
        return unknown('Nonlinear or state-dependent loop progression.');
      }
      if (body[end] !== '{') return unknown('Loop estimates currently require braces.');
      pending = true;
      i = end - 1;
    } else if (token === '{') {
      depth++;
      if (pending) {
        loopScopes.push(depth);
        pending = false;
        maximum = Math.max(maximum, loopScopes.length);
      }
    } else if (token === '}') {
      if (loopScopes.at(-1) === depth) loopScopes.pop();
      depth--;
    }
  }
  const notation = maximum === 0 ? 'O(1)' : maximum === 1 ? 'O(n)' : `O(n^${maximum})`;
  return {
    notation,
    reason:
      'Local body only; assumes each loop traverses n items. Excludes called functions, library operations, I/O, and input-dependent iteration bounds.',
  };
}

module.exports = { estimateComplexity };
