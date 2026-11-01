/** Enforce JSDoc on exported functions and public methods without requiring a new lint plugin. */
module.exports = {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: { missing: 'Document public function {{name}} with a nearby JSDoc comment.' },
  },
  /** Register per-module export analysis with ESLint; private helpers remain a review responsibility. */
  create(context) {
    const source = context.sourceCode;
    const declarations = new Map();
    const exported = new Set();
    const hasDoc = (node) => {
      const comment = source.getCommentsBefore(node).at(-1);
      return comment?.type === 'Block' && comment.value.trimStart().startsWith('*');
    };
    const check = (node, name, commentNode = node) => {
      while (
        ['VariableDeclaration', 'ExportNamedDeclaration', 'ExportDefaultDeclaration'].includes(
          commentNode.parent?.type,
        )
      )
        commentNode = commentNode.parent;
      if (!hasDoc(commentNode)) context.report({ node, messageId: 'missing', data: { name } });
    };
    const checkClass = (node) => {
      for (const method of node.body.body)
        if (method.type === 'MethodDefinition' && method.key.type !== 'PrivateIdentifier')
          check(method, method.key.name || 'method');
    };
    return {
      FunctionDeclaration(node) {
        if (node.id) declarations.set(node.id.name, node);
      },
      ClassDeclaration(node) {
        if (node.id) declarations.set(node.id.name, node);
      },
      VariableDeclarator(node) {
        if (
          node.id.type === 'Identifier' &&
          ['ArrowFunctionExpression', 'FunctionExpression'].includes(node.init?.type)
        ) {
          declarations.set(node.id.name, node);
        }
      },
      ExportNamedDeclaration(node) {
        if (node.declaration?.id) exported.add(node.declaration.id.name);
        for (const declaration of node.declaration?.declarations || [])
          if (declaration.id.type === 'Identifier') exported.add(declaration.id.name);
        for (const specifier of node.specifiers) exported.add(specifier.local.name);
      },
      ExportDefaultDeclaration(node) {
        if (node.declaration.type === 'Identifier') exported.add(node.declaration.name);
        else if (node.declaration.type === 'ClassDeclaration') checkClass(node.declaration);
        else if (
          ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(
            node.declaration.type,
          )
        )
          check(node.declaration, 'default', node);
      },
      AssignmentExpression(node) {
        const target = node.left;
        if (
          target.type !== 'MemberExpression' ||
          target.object.name !== 'module' ||
          target.property.name !== 'exports'
        )
          return;
        if (node.right.type === 'Identifier') exported.add(node.right.name);
        if (node.right.type === 'ObjectExpression')
          for (const property of node.right.properties) {
            if (property.value?.type === 'Identifier') exported.add(property.value.name);
            else if (
              ['FunctionExpression', 'ArrowFunctionExpression'].includes(property.value?.type)
            )
              check(property, property.key.name);
          }
      },
      'Program:exit'() {
        for (const name of exported) {
          const node = declarations.get(name);
          if (!node) continue;
          if (node.type === 'ClassDeclaration') checkClass(node);
          else check(node, name);
        }
      },
    };
  },
};
