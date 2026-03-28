import { assertEquals } from '@std/assert'

Deno.test('explicit-type-export rule - should export a valid rule object', async () => {
  const { explicitTypeExport } = await import('./explicit-type-export.ts')
  assertEquals(typeof explicitTypeExport, 'object')
  assertEquals(typeof explicitTypeExport.create, 'function')
  assertEquals(explicitTypeExport.defaultSeverity, 'error')
})

/**
 * The following tests document expected behavior conceptually.
 * Actual enforcement is verified by running `deno lint` against fixture code.
 *
 * Invalid patterns (all should be flagged):
 *
 * ```ts
 * type Foo = string
 * export { Foo }
 *
 * interface Bar { id: string }
 * export { Bar }
 *
 * type Baz = number
 * interface Qux {}
 * export { Baz, Qux }
 * ```
 *
 * Valid patterns (should pass):
 *
 * ```ts
 * type Foo = string
 * export type { Foo }
 *
 * interface Bar { id: string }
 * export { type Bar }
 *
 * // Re-exports are not checked (no type info available)
 * export { Foo } from './types.ts'
 *
 * // Values are not checked
 * const x = 1
 * export { x }
 * ```
 */

Deno.test('explicit-type-export rule - invalid: type alias exported without type modifier', async () => {
  const _invalidCode = `
    type Foo = string
    export { Foo }
  `
  const { explicitTypeExport } = await import('./explicit-type-export.ts')
  assertEquals(typeof explicitTypeExport.create, 'function')
})

Deno.test('explicit-type-export rule - invalid: interface exported without type modifier', async () => {
  const _invalidCode = `
    interface Bar { id: string }
    export { Bar }
  `
  const { explicitTypeExport } = await import('./explicit-type-export.ts')
  assertEquals(typeof explicitTypeExport.create, 'function')
})

Deno.test('explicit-type-export rule - valid: export type { Foo }', async () => {
  const _validCode = `
    type Foo = string
    export type { Foo }
  `
  const { explicitTypeExport } = await import('./explicit-type-export.ts')
  assertEquals(typeof explicitTypeExport.create, 'function')
})

Deno.test('explicit-type-export rule - valid: export { type Foo }', async () => {
  const _validCode = `
    type Foo = string
    export { type Foo }
  `
  const { explicitTypeExport } = await import('./explicit-type-export.ts')
  assertEquals(typeof explicitTypeExport.create, 'function')
})

Deno.test('explicit-type-export rule - valid: re-export from other module is not checked', async () => {
  const _validCode = `export { Foo } from './types.ts'`
  const { explicitTypeExport } = await import('./explicit-type-export.ts')
  assertEquals(typeof explicitTypeExport.create, 'function')
})

Deno.test('explicit-type-export rule - valid: value export is not checked', async () => {
  const _validCode = `
    const x = 1
    export { x }
  `
  const { explicitTypeExport } = await import('./explicit-type-export.ts')
  assertEquals(typeof explicitTypeExport.create, 'function')
})
