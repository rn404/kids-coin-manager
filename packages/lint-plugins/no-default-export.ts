/**
 * Custom lint rule to disallow default exports.
 * Use `// deno-lint-ignore internal/no-default-export` for framework conventions.
 */
const noDefaultExport = {
  // deno-lint-ignore no-explicit-any
  create(context: any,) {
    return {
      // deno-lint-ignore no-explicit-any
      ExportDefaultDeclaration(node: any,) {
        context.report({
          node,
          message:
            'Prefer named exports over default exports. Default exports make refactoring harder and reduce discoverability.',
        },)
      },
    }
  },
  defaultSeverity: 'error',
}

export { noDefaultExport, }
