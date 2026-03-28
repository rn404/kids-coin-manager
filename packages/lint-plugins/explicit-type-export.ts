/**
 * Custom lint rule to enforce `export type` for type-only exports.
 *
 * ## Purpose
 *
 * With `verbatimModuleSyntax: true` in the TypeScript compiler options,
 * type-only exports must use the `type` modifier. This rule catches violations
 * at lint time for types declared in the same file.
 *
 * Note: Re-exports from other modules (`export { Foo } from './types.ts'`)
 * cannot be checked without type information — those are handled by `deno check`.
 *
 * ## Required pattern
 *
 * ```ts
 * type Foo = string
 * interface Bar { id: string }
 *
 * // Good
 * export type { Foo, Bar }
 * // or
 * export { type Foo, type Bar }
 *
 * // Bad
 * export { Foo, Bar }
 * ```
 *
 * Use `deno-lint-ignore internal/explicit-type-export` only when the export form
 * cannot be changed (e.g. generated code).
 */

const explicitTypeExport = {
  // deno-lint-ignore no-explicit-any
  create(context: any) {
    const typeNames = new Set<string>()
    // deno-lint-ignore no-explicit-any
    const pendingSpecifiers: Array<{ specifier: any; name: string }> = []

    return {
      // deno-lint-ignore no-explicit-any
      TSTypeAliasDeclaration(node: any) {
        typeNames.add(node.id.name)
      },
      // deno-lint-ignore no-explicit-any
      TSInterfaceDeclaration(node: any) {
        typeNames.add(node.id.name)
      },
      // deno-lint-ignore no-explicit-any
      ExportNamedDeclaration(node: any) {
        // Inline exports are handled by no-inline-export rule
        if (node.declaration !== null) return
        // Re-exports from other modules cannot be checked without type info
        if (node.source !== null) return
        // `export type { ... }` — all specifiers are already type exports
        if (node.exportKind === 'type') return

        // deno-lint-ignore no-explicit-any
        for (const specifier of node.specifiers as Array<any>) {
          // `export { type Foo }` — per-specifier type modifier is fine
          if (specifier.exportKind === 'type') continue
          pendingSpecifiers.push({ specifier, name: specifier.local.name })
        }
      },
      'Program:exit'() {
        for (const { specifier, name } of pendingSpecifiers) {
          if (typeNames.has(name)) {
            context.report({
              node: specifier,
              message:
                `"${name}" is a type and must be exported with the \`type\` modifier. Use \`export type { ${name} }\` or \`export { type ${name} }\`.`
            })
          }
        }
      }
    }
  },
  defaultSeverity: 'error'
}

export { explicitTypeExport }
