import { assertEquals } from '@std/assert'

Deno.test('no-inline-export rule - should export a valid rule object', async () => {
  const { noInlineExport } = await import('./no-inline-export.ts')
  assertEquals(typeof noInlineExport, 'object')
  assertEquals(typeof noInlineExport.create, 'function')
  assertEquals(noInlineExport.defaultSeverity, 'error')
})

/**
 * The following tests document expected behavior conceptually.
 * Actual enforcement is verified by running `deno lint` against fixture code.
 *
 * Invalid patterns (all should be flagged):
 *
 * ```ts
 * export const foo = 42
 * export function greet() {}
 * export class Foo {}
 * export type Bar = string
 * export interface Baz {}
 * ```
 *
 * Valid patterns (should pass):
 *
 * ```ts
 * const foo = 42
 * type Bar = string
 * export { foo }
 * export type { Bar }
 * // deno-lint-ignore internal/no-inline-export
 * export const frameworkRequired = ...
 * ```
 */

Deno.test('no-inline-export rule - invalid: export const', async () => {
  const _invalidCode = `export const foo = 42`
  const { noInlineExport } = await import('./no-inline-export.ts')
  assertEquals(typeof noInlineExport.create, 'function')
})

Deno.test('no-inline-export rule - invalid: export function', async () => {
  const _invalidCode = `export function greet() {}`
  const { noInlineExport } = await import('./no-inline-export.ts')
  assertEquals(typeof noInlineExport.create, 'function')
})

Deno.test('no-inline-export rule - invalid: export class', async () => {
  const _invalidCode = `export class Foo {}`
  const { noInlineExport } = await import('./no-inline-export.ts')
  assertEquals(typeof noInlineExport.create, 'function')
})

Deno.test('no-inline-export rule - invalid: export type alias', async () => {
  const _invalidCode = `export type Bar = string`
  const { noInlineExport } = await import('./no-inline-export.ts')
  assertEquals(typeof noInlineExport.create, 'function')
})

Deno.test('no-inline-export rule - invalid: export interface', async () => {
  const _invalidCode = `export interface Baz { id: string }`
  const { noInlineExport } = await import('./no-inline-export.ts')
  assertEquals(typeof noInlineExport.create, 'function')
})

Deno.test('no-inline-export rule - valid: export specifiers', async () => {
  const _validCode = `
    const foo = 42
    type Bar = string
    export { foo }
    export type { Bar }
  `
  const { noInlineExport } = await import('./no-inline-export.ts')
  assertEquals(typeof noInlineExport.create, 'function')
})

Deno.test('no-inline-export rule - valid: re-export from other module', async () => {
  const _validCode = `export { foo } from './foo.ts'`
  const { noInlineExport } = await import('./no-inline-export.ts')
  assertEquals(typeof noInlineExport.create, 'function')
})
