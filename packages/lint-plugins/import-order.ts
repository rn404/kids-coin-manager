/**
 * Custom lint rule to enforce import ordering.
 *
 * ## Required order
 *
 * All import statements must form a contiguous block at the top of the file.
 * Non-import statements must not appear between import statements.
 *
 * Within the import block, the required order is:
 *
 * 1. `import type` statements, sub-ordered by source:
 *    - bare specifiers (e.g. `fresh`, `@preact/signals`)
 *    - `jsr:` imports
 *    - `npm:` imports
 *    - `https://` imports
 *    - `@workspace/` (internal monorepo packages)
 *    - `../` (relative, parent directory)
 *    - `./` (relative, same directory)
 * 2. `import` (value) statements — same sub-order as above
 *
 * Use `deno-lint-ignore internal/import-order` only when the ordering cannot
 * be satisfied due to runtime constraints (e.g. side-effect import ordering).
 */

const GROUP_LABELS: Record<number, string> = {
  0: '3rd party (bare specifier)',
  1: '3rd party (jsr:)',
  2: '3rd party (npm:)',
  3: '3rd party (https://)',
  4: '@workspace/*',
  5: 'relative (../)',
  6: 'relative (./)'
}

const classifySource = (src: string): number => {
  if (src.startsWith('./')) return 6
  if (src.startsWith('../')) return 5
  if (src.startsWith('@workspace/')) return 4
  if (src.startsWith('https://')) return 3
  if (src.startsWith('npm:')) return 2
  if (src.startsWith('jsr:')) return 1
  return 0
}

// deno-lint-ignore no-explicit-any
const classify = (node: any): [number, number] => {
  const isValue = node.importKind === 'type' ? 0 : 1
  const subGroup = classifySource(node.source.value as string)
  return [isValue, subGroup]
}

const compareGroups = (a: [number, number], b: [number, number]): number => {
  if (a[0] !== b[0]) return a[0] - b[0]
  return a[1] - b[1]
}

const groupLabel = (group: [number, number]): string => {
  const kind = group[0] === 0 ? 'import type' : 'import'
  return `${kind} / ${GROUP_LABELS[group[1]]}`
}

const importOrder = {
  // deno-lint-ignore no-explicit-any
  create(context: any) {
    let lastGroup: [number, number] | null = null

    return {
      // deno-lint-ignore no-explicit-any
      ImportDeclaration(node: any) {
        // Check: import must not appear after non-import statements
        // deno-lint-ignore no-explicit-any
        const body: Array<any> = node.parent?.body ?? []
        const myIndex = body.indexOf(node)
        const hasNonImportBefore = myIndex > 0 &&
          // deno-lint-ignore no-explicit-any
          body.slice(0, myIndex).some((stmt: any) =>
            stmt.type !== 'ImportDeclaration'
          )

        if (hasNonImportBefore) {
          context.report({
            node,
            message:
              'Import statements must be grouped at the top of the file. Do not place import statements after non-import statements.'
          })
          lastGroup = classify(node)
          return
        }

        // Check: import group order
        const current = classify(node)
        if (lastGroup !== null && compareGroups(current, lastGroup) < 0) {
          context.report({
            node,
            message:
              `Import order violation: "${
                groupLabel(current)
              }" must come before "${groupLabel(lastGroup)}". ` +
              'Required order: import type → import, within each block: 3rd party (bare → jsr: → npm: → https://) → @workspace/* → ../ → ./'
          })
        }
        lastGroup = current
      }
    }
  },
  defaultSeverity: 'error'
}

export { importOrder }
