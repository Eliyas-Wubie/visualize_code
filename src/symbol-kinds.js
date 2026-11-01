// VS Code's stable SymbolKind values keep pure analyzers independent of the extension host module.
const SYMBOL_KINDS = Object.freeze({
  Class: 4,
  Method: 5,
  Property: 6,
  Constructor: 8,
  Function: 11,
  Variable: 12,
  Constant: 13,
});

module.exports = { SYMBOL_KINDS };
