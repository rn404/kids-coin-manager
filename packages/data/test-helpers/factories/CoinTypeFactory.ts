/**
 * CoinType のテストデータ作成 Factory
 */

import { generateUuid, getTimestamp, } from '@workspace/foundations'
import { COIN_TYPE_PREFIX_KEY, } from '../../CoinType.ts'
import type { CoinTypeDataModel, } from '../../CoinType.ts'

/**
 * CoinType のデフォルト値
 */
const defaultCoinTypeAttributes = {
  name: 'テストコイン',
  durationMinutes: 30,
  dailyDistribution: 2,
  active: true,
}

/**
 * CoinType 作成パラメータ
 */
type CreateCoinTypeParams = {
  familyId: string
  name?: string
  durationMinutes?: number
  dailyDistribution?: number
  active?: boolean
}

/**
 * CoinTypeDataModel を構築する（DB に保存しない）
 *
 * @param params - CoinType 作成パラメータ
 * @returns CoinTypeDataModel
 *
 * @example
 * ```ts
 * const coinType = buildCoinType({ familyId: 'family-1', name: 'ゴールドコイン' })
 * ```
 */
export function buildCoinType(
  params: CreateCoinTypeParams,
): CoinTypeDataModel {
  const now = getTimestamp()
  return {
    id: generateUuid(),
    ...defaultCoinTypeAttributes,
    ...params,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * CoinTypeDataModel を作成して DB に保存する
 *
 * @param kv - Deno KV インスタンス
 * @param params - CoinType 作成パラメータ
 * @returns CoinTypeDataModel
 *
 * @example
 * ```ts
 * const coinType = await createCoinType(kv, { familyId: 'family-1', name: 'ゴールドコイン' })
 * ```
 */
export async function createCoinType(
  kv: Deno.Kv,
  params: CreateCoinTypeParams,
): Promise<CoinTypeDataModel> {
  const coinType = buildCoinType(params,)
  await kv.set([COIN_TYPE_PREFIX_KEY, params.familyId, coinType.id,], coinType,)
  return coinType
}
