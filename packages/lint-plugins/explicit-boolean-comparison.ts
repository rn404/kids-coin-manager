/**
 * Custom lint rule to enforce explicit boolean comparisons
 * Detects all usage of logical negation operators (! and !!)
 * Use deno-lint-ignore for exceptions where negation is necessary
 */
const explicitBooleanComparison = {
  // deno-lint-ignore no-explicit-any
  create(context: any,) {
    return {
      // deno-lint-ignore no-explicit-any
      UnaryExpression(node: any,) {
        if (node.operator === '!') {
          // Check if this is the inner ! of a !! pattern
          // If the parent is also a UnaryExpression with !, skip reporting
          // (we'll report on the outer ! instead)
          const parent = node.parent
          if (
            parent &&
            parent.type === 'UnaryExpression' &&
            parent.operator === '!' &&
            parent.argument === node
          ) {
            // This is the inner ! of !!, skip it
            return
          }

          // Check if this is !! pattern (outer !)
          const isDoubleNegation = node.argument &&
            node.argument.type === 'UnaryExpression' &&
            node.argument.operator === '!'

          const message = isDoubleNegation
            ? 'Use explicit boolean comparisons instead of double negation (!!). Use !== null, !== undefined, etc.'
            : 'Use explicit boolean comparisons instead of negation operator (!). Use === null, === false, etc.'

          context.report({
            node,
            message,
          },)
        }
      },
    }
  },
  defaultSeverity: 'error',
}

export { explicitBooleanComparison, }
