import { explicitBooleanComparison } from './explicit-boolean-comparison.ts'
import { explicitSignalType } from './explicit-signal-type.ts'
import { explicitTypeExport } from './explicit-type-export.ts'
import { importOrder } from './import-order.ts'
import { noDefaultExport } from './no-default-export.ts'
import { noInlineExport } from './no-inline-export.ts'

const plugin: Deno.lint.Plugin = {
  name: 'internal',
  rules: {
    'explicit-boolean-comparison': explicitBooleanComparison,
    'explicit-signal-type': explicitSignalType,
    'explicit-type-export': explicitTypeExport,
    'import-order': importOrder,
    'no-default-export': noDefaultExport,
    'no-inline-export': noInlineExport
  }
}

// deno-lint-ignore internal/no-default-export
export default plugin
