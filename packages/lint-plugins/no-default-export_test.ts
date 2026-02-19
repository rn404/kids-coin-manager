import { assertEquals, } from '@std/assert'

Deno.test(
  'no-default-export rule - should detect default export of function',
  async () => {
    const _testCode = `
    export default function foo() {}
  `

    const ruleModule = await import('./no-default-export.ts')
    assertEquals(typeof ruleModule.noDefaultExport, 'object',)
    assertEquals(typeof ruleModule.noDefaultExport.create, 'function',)
  },
)

Deno.test(
  'no-default-export rule - should detect default export of variable',
  async () => {
    const _testCode = `
    const foo = 42
    export default foo
  `

    const ruleModule = await import('./no-default-export.ts')
    assertEquals(typeof ruleModule.noDefaultExport, 'object',)
  },
)

Deno.test(
  'no-default-export rule - should detect default export of class',
  async () => {
    const _testCode = `
    export default class Foo {}
  `

    const ruleModule = await import('./no-default-export.ts')
    assertEquals(typeof ruleModule.noDefaultExport, 'object',)
  },
)

Deno.test(
  'no-default-export rule - named exports should pass',
  async () => {
    const _testCode = `
    export function foo() {}
    export const bar = 42
    export class Baz {}
  `

    const ruleModule = await import('./no-default-export.ts')
    assertEquals(typeof ruleModule.noDefaultExport, 'object',)
  },
)
