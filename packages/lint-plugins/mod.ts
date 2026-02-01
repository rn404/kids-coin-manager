import { explicitBooleanComparison, } from './explicit-boolean-comparison.ts'

const plugin: Deno.lint.Plugin = {
  name: 'internal',
  rules: {
    'explicit-boolean-comparison': explicitBooleanComparison,
  },
}

export default plugin
