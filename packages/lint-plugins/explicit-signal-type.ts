/**
 * Custom lint rule to enforce explicit type arguments on `useSignal` and
 * `useComputed` calls from `@preact/signals`.
 *
 * ## Purpose
 *
 * Even when TypeScript can infer the type from the initial value or callback,
 * omitting the type argument hides the intent. An explicit type argument makes
 * the signal's purpose clear at a glance and anchors the type independently of
 * the initializer.
 *
 * ## Required pattern
 *
 * ```ts
 * // Good
 * const flag = useSignal<boolean>(false)
 * const count = useSignal<number>(0)
 * const label = useSignal<string | null>(null)
 * const double = useComputed<number>(() => count.value * 2)
 *
 * // Bad
 * const flag = useSignal(false)
 * const count = useSignal(0)
 * const double = useComputed(() => count.value * 2)
 * ```
 *
 * Use `deno-lint-ignore internal/explicit-signal-type` only when the type
 * argument cannot be expressed statically.
 */

const SIGNAL_FUNCTIONS = new Set(['useSignal', 'useComputed'])

const explicitSignalType = {
  // deno-lint-ignore no-explicit-any
  create(context: any) {
    return {
      // deno-lint-ignore no-explicit-any
      CallExpression(node: any) {
        if (node.callee.type !== 'Identifier') return
        if (SIGNAL_FUNCTIONS.has(node.callee.name) === false) return

        const hasTypeArguments = node.typeArguments !== null &&
          node.typeArguments !== undefined &&
          node.typeArguments.params?.length > 0

        if (hasTypeArguments === false) {
          context.report({
            node,
            message:
              `\`${node.callee.name}\` requires an explicit type argument. Use \`${node.callee.name}<T>(...)\` to make the signal type clear.`
          })
        }
      }
    }
  },
  defaultSeverity: 'error'
}

export { explicitSignalType }
