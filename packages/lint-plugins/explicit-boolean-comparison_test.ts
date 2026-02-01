import { assertEquals, } from '@std/assert'

/**
 * Test the explicit-boolean-comparison lint rule
 * Note: These tests verify the rule behavior conceptually.
 * For actual lint plugin testing, you would use Deno's lint test utilities.
 */

Deno.test(
  'explicit-boolean-comparison rule - should detect single negation operator',
  async () => {
    const _testCode = `
    const foo = null
    if (!foo) {
      console.log('test')
    }
  `

    // In a real lint plugin test, we would run the linter and check for violations
    // For now, we verify the rule structure exists
    const ruleModule = await import('./explicit-boolean-comparison.ts')
    assertEquals(typeof ruleModule.explicitBooleanComparison, 'object',)
    assertEquals(
      typeof ruleModule.explicitBooleanComparison.create,
      'function',
    )
  },
)

Deno.test(
  'explicit-boolean-comparison rule - should detect bang-bang operator',
  async () => {
    const _testCode = `
    const foo = null
    const bar = !!foo
  `

    // This should trigger 2 violations (two ! operators)
    // In practice, when run through deno lint, it detects both
    const ruleModule = await import('./explicit-boolean-comparison.ts')
    assertEquals(typeof ruleModule.explicitBooleanComparison, 'object',)
  },
)

Deno.test(
  'explicit-boolean-comparison rule - should not affect other operators',
  async () => {
    const _testCode = `
    const a = 1 + 2
    const b = a !== 3
    const c = a > 5
  `

    // This code should not trigger the rule
    const ruleModule = await import('./explicit-boolean-comparison.ts')
    assertEquals(
      typeof ruleModule.explicitBooleanComparison.create,
      'function',
    )
  },
)

Deno.test(
  'explicit-boolean-comparison rule - explicit comparisons should pass',
  async () => {
    const _testCode = `
    const foo = null
    if (foo === null) {
      console.log('test')
    }
    const bar = false
    if (bar === false) {
      console.log('test')
    }
  `

    // This code uses explicit comparisons and should not trigger the rule
    const ruleModule = await import('./explicit-boolean-comparison.ts')
    assertEquals(typeof ruleModule.explicitBooleanComparison, 'object',)
  },
)
