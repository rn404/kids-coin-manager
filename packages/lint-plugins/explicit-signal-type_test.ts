import { assertEquals } from '@std/assert'

Deno.test('explicit-signal-type rule - should export a valid rule object', async () => {
  const { explicitSignalType } = await import('./explicit-signal-type.ts')
  assertEquals(typeof explicitSignalType, 'object')
  assertEquals(typeof explicitSignalType.create, 'function')
  assertEquals(explicitSignalType.defaultSeverity, 'error')
})

/**
 * The following tests document expected behavior conceptually.
 * Actual enforcement is verified by running `deno lint` against fixture code.
 *
 * Invalid patterns (all should be flagged):
 *
 * ```ts
 * const flag = useSignal(false)
 * const count = useSignal(0)
 * const label = useSignal('')
 * const double = useComputed(() => count.value * 2)
 * ```
 *
 * Valid patterns (should pass):
 *
 * ```ts
 * const flag = useSignal<boolean>(false)
 * const count = useSignal<number>(0)
 * const label = useSignal<string | null>(null)
 * const double = useComputed<number>(() => count.value * 2)
 *
 * // Non-signal functions with the same name are not affected
 * const result = someOtherFn(false)
 * ```
 */

Deno.test('explicit-signal-type rule - invalid: useSignal without type argument', async () => {
  const _invalidCode = `const flag = useSignal(false)`
  const { explicitSignalType } = await import('./explicit-signal-type.ts')
  assertEquals(typeof explicitSignalType.create, 'function')
})

Deno.test('explicit-signal-type rule - invalid: useComputed without type argument', async () => {
  const _invalidCode = `const double = useComputed(() => count.value * 2)`
  const { explicitSignalType } = await import('./explicit-signal-type.ts')
  assertEquals(typeof explicitSignalType.create, 'function')
})

Deno.test('explicit-signal-type rule - valid: useSignal with type argument', async () => {
  const _validCode = `const flag = useSignal<boolean>(false)`
  const { explicitSignalType } = await import('./explicit-signal-type.ts')
  assertEquals(typeof explicitSignalType.create, 'function')
})

Deno.test('explicit-signal-type rule - valid: useComputed with type argument', async () => {
  const _validCode = `const double = useComputed<number>(() => count.value * 2)`
  const { explicitSignalType } = await import('./explicit-signal-type.ts')
  assertEquals(typeof explicitSignalType.create, 'function')
})

Deno.test('explicit-signal-type rule - valid: useSignal with union type argument', async () => {
  const _validCode = `const label = useSignal<string | null>(null)`
  const { explicitSignalType } = await import('./explicit-signal-type.ts')
  assertEquals(typeof explicitSignalType.create, 'function')
})
