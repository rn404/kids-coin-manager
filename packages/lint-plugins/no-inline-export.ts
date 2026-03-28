/**
 * Custom lint rule to disallow inline named exports.
 *
 * ## Purpose
 *
 * Inline exports (`export const`, `export function`, `export class`,
 * `export type`, `export interface`) scatter export declarations throughout
 * the file body, making it harder to see what a module exposes at a glance.
 *
 * Declaring first and exporting at the bottom keeps exports predictable and
 * scannable in one place.
 *
 * ## Required pattern
 *
 * ```ts
 * // Good: declare then export at the bottom
 * const foo = 42
 * type Bar = string
 * export { foo }
 * export type { Bar }
 *
 * // Bad: inline export
 * export const foo = 42
 * export type Bar = string
 * ```
 *
 * Use `deno-lint-ignore internal/no-inline-export` only when the inline
 * export is required by an external framework convention.
 */
const noInlineExport = {
  // deno-lint-ignore no-explicit-any
  create(context: any) {
    return {
      // deno-lint-ignore no-explicit-any
      ExportNamedDeclaration(node: any) {
        if (node.declaration !== null) {
          context.report({
            node,
            message:
              'Inline exports are not allowed. Declare first, then export at the bottom of the file using `export { foo }` or `export type { Bar }`.'
          })
        }
      }
    }
  },
  defaultSeverity: 'error'
}

export { noInlineExport }
