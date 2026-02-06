/**
 * Coin のテストデータ作成 Factory
 */

import { generateUuid, getTimestamp, } from '@workspace/foundations'
import type { CoinDataModel, } from '../../Coin.ts'

/**
 * Coin のデフォルト値
 */
const defaultCoinAttributes = {
  amount: 1000,
}

/**
 * Coin 作成パラメータ
 */
type CreateCoinParams = {
  userId: string
  familyId: string
  coinTypeId: string
  amount?: number
}

/**
 * CoinDataModel を構築する（DB に保存しない）
 *
 * @param params - Coin 作成パラメータ
 * @returns CoinDataModel
 *
 * @example
 * ```ts
 * const coin = buildCoin({ userId: 'user-1', familyId: 'family-1', coinTypeId: 'cointype-1', amount: 500 })
 * ```
 */
export function buildCoin(params: CreateCoinParams,): CoinDataModel {
  const now = getTimestamp()
  return {
    id: generateUuid(),
    ...defaultCoinAttributes,
    ...params,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * CoinDataModel を作成して DB に保存する
 *
 * @param kv - Deno KV インスタンス
 * @param params - Coin 作成パラメータ
 * @returns CoinDataModel
 *
 * @example
 * ```ts
 * const coin = await createCoin(kv, { userId: 'user-1', familyId: 'family-1', coinTypeId: 'cointype-1', amount: 500 })
 * ```
 */
export async function createCoin(
  kv: Deno.Kv,
  params: CreateCoinParams,
): Promise<CoinDataModel> {
  const coin = buildCoin(params,)
  await kv.set(
    ['coins', params.userId, params.familyId, params.coinTypeId,],
    coin,
  )
  return coin
}
