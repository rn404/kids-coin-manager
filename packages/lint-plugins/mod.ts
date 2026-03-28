import { explicitBooleanComparison } from './explicit-boolean-comparison.ts'
import { importOrder } from './import-order.ts'
import { noDefaultExport } from './no-default-export.ts'

const plugin: Deno.lint.Plugin = {
  name: 'internal',
  rules: {
    'explicit-boolean-comparison': explicitBooleanComparison,
    'import-order': importOrder,
    'no-default-export': noDefaultExport
  }
}

// deno-lint-ignore internal/no-default-export
export default plugin
