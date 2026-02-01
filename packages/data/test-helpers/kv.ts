/**
 * Deno KV のテストヘルパー
 * メモリ内 KV インスタンスを提供し、テスト後の自動クリーンアップを行う
 */

/**
 * テスト用のメモリ内 KV インスタンスを作成する
 *
 * @returns Deno KV インスタンス
 *
 * @example
 * ```ts
 * import { setupTestKv } from '../test-helpers/kv.ts'
 *
 * const kv = await setupTestKv()
 * // テストコード
 * kv.close()
 * ```
 */
export async function setupTestKv(): Promise<Deno.Kv> {
  return await Deno.openKv(':memory:',)
}

/**
 * テスト後に KV インスタンスをクリーンアップする
 *
 * @param kv - クリーンアップする KV インスタンス
 *
 * @example
 * ```ts
 * import { afterEach } from '@std/testing/bdd'
 * import { setupTestKv, cleanupTestKv } from '../test-helpers/kv.ts'
 *
 * let kv: Deno.Kv | null = null
 *
 * afterEach(async () => {
 *   await cleanupTestKv(kv)
 *   kv = null
 * })
 * ```
 */
export function cleanupTestKv(
  kv: Deno.Kv | null,
): void {
  if (kv) {
    kv.close()
  }
}
