/**
 * Custom lint rule to enforce explicit boolean comparisons.
 *
 * ## Purpose
 *
 * Falsy/truthy checks (e.g. `!foo`, `!!foo`) are prohibited to:
 *
 * - **Reduce cognitive load**: Explicit comparisons (e.g. `=== null`, `=== false`) make
 *   the intent immediately clear without requiring the reader to infer the type.
 * - **Surface type changes**: When a type changes (e.g. `string | null` → `string | undefined`),
 *   an explicit comparison like `foo === null` forces the developer to consciously update
 *   the condition. A negation like `!foo` would silently pass through, hiding the semantic drift.
 * - **Eliminate ambiguity**: Falsy coercion conflates `0`, `""`, `null`, `undefined`, and `false`.
 *   Explicit comparisons make the intended value(s) unambiguous.
 *
 * Use `deno-lint-ignore explicit-boolean-comparison` only when negation is truly unavoidable.
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
