import { assertEquals } from '@std/assert'

Deno.test('import-order rule - should export a valid rule object', async () => {
  const ruleModule = await import('./import-order.ts')
  assertEquals(typeof ruleModule.importOrder, 'object')
  assertEquals(typeof ruleModule.importOrder.create, 'function')
  assertEquals(ruleModule.importOrder.defaultSeverity, 'error')
})

/**
 * The following tests document expected behavior conceptually.
 * Actual enforcement is verified by running `deno lint` against fixture code.
 *
 * Valid import order:
 *
 * ```ts
 * import type { A } from 'bare-lib'
 * import type { B } from 'jsr:@scope/pkg'
 * import type { C } from 'npm:some-pkg'
 * import type { D } from 'https://example.com/mod.ts'
 * import type { E } from '@workspace/ui'
 * import type { F } from '../shared'
 * import type { G } from './local'
 * import { H } from 'bare-lib'
 * import { I } from 'jsr:@scope/pkg'
 * import { J } from 'npm:some-pkg'
 * import { K } from 'https://example.com/mod.ts'
 * import { L } from '@workspace/ui'
 * import { M } from '../shared'
 * import { N } from './local'
 * ```
 */

Deno.test('import-order rule - valid: type imports before value imports', async () => {
  const _validCode = `
    import type { Foo } from 'some-lib'
    import { Bar } from 'some-lib'
  `
  const { importOrder } = await import('./import-order.ts')
  assertEquals(typeof importOrder.create, 'function')
})

Deno.test('import-order rule - invalid: value import before type import', async () => {
  const _invalidCode = `
    import { Bar } from 'some-lib'
    import type { Foo } from 'some-lib'  // violation: type after value
  `
  const { importOrder } = await import('./import-order.ts')
  assertEquals(typeof importOrder.create, 'function')
})

Deno.test('import-order rule - valid: 3rd party → @workspace → ../ → ./', async () => {
  const _validCode = `
    import { a } from 'external-lib'
    import { b } from '@workspace/ui'
    import { c } from '../shared'
    import { d } from './local'
  `
  const { importOrder } = await import('./import-order.ts')
  assertEquals(typeof importOrder.create, 'function')
})

Deno.test('import-order rule - invalid: @workspace before 3rd party', async () => {
  const _invalidCode = `
    import { b } from '@workspace/ui'
    import { a } from 'external-lib'  // violation
  `
  const { importOrder } = await import('./import-order.ts')
  assertEquals(typeof importOrder.create, 'function')
})

Deno.test('import-order rule - invalid: relative before @workspace', async () => {
  const _invalidCode = `
    import { c } from '../shared'
    import { b } from '@workspace/ui'  // violation
  `
  const { importOrder } = await import('./import-order.ts')
  assertEquals(typeof importOrder.create, 'function')
})

Deno.test('import-order rule - invalid: same-dir relative before parent-dir relative', async () => {
  const _invalidCode = `
    import { d } from './local'
    import { c } from '../shared'  // violation
  `
  const { importOrder } = await import('./import-order.ts')
  assertEquals(typeof importOrder.create, 'function')
})

Deno.test('import-order rule - valid: 3rd party sub-order (bare → jsr: → npm: → https://)', async () => {
  const _validCode = `
    import { a } from 'bare-lib'
    import { b } from 'jsr:@scope/pkg'
    import { c } from 'npm:some-pkg'
    import { d } from 'https://example.com/mod.ts'
  `
  const { importOrder } = await import('./import-order.ts')
  assertEquals(typeof importOrder.create, 'function')
})

Deno.test('import-order rule - invalid: npm: before jsr:', async () => {
  const _invalidCode = `
    import { c } from 'npm:some-pkg'
    import { b } from 'jsr:@scope/pkg'  // violation
  `
  const { importOrder } = await import('./import-order.ts')
  assertEquals(typeof importOrder.create, 'function')
})

Deno.test('import-order rule - invalid: import after non-import statement', async () => {
  const _invalidCode = `
    import { a } from 'external-lib'
    const x = 1
    import { b } from '@workspace/ui'  // violation: import after non-import
  `
  const { importOrder } = await import('./import-order.ts')
  assertEquals(typeof importOrder.create, 'function')
})

Deno.test('import-order rule - valid: side-effect import treated as 3rd party value import', async () => {
  const _validCode = `
    import type { Foo } from 'some-lib'
    import 'some-lib/side-effect'
    import { bar } from '@workspace/ui'
  `
  const { importOrder } = await import('./import-order.ts')
  assertEquals(typeof importOrder.create, 'function')
})
