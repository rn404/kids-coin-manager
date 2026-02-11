/**
 * DailyCoinDistribution のテストデータ作成 Factory
 */

import {
  generateUuid,
  getDateOnly,
  getTimestamp,
} from '@workspace/foundations'
import { DAILY_COIN_DISTRIBUTION_PREFIX_KEY, } from '../../DailyCoinDistribution.ts'
import type { DailyCoinDistributionDataModel, } from '../../DailyCoinDistribution.ts'
import type { CoinTypeDataModel, } from '../../CoinType.ts'

/**
 * DailyCoinDistribution のデフォルト値
 */
const defaultDailyCoinDistributionAttributes = {
  metadata: {
    timezone: 'Asia/Tokyo',
  },
}

/**
 * DailyCoinDistribution 作成パラメータ
 */
type CreateDailyCoinDistributionParams = {
  familyId: string
  userId: string
  distributions: Record<CoinTypeDataModel['id'], { amount: number }>
  summaryDate?: DailyCoinDistributionDataModel['summaryDate']
}

/**
 * DailyCoinDistributionDataModel を構築する（DB に保存しない）
 *
 * @param params - DailyCoinDistribution 作成パラメータ
 * @returns DailyCoinDistributionDataModel
 *
 * @example
 * ```ts
 * const distribution = buildDailyCoinDistribution({
 *   familyId: 'family-1',
 *   userId: 'user-1',
 *   distributions: { 'cointype-1': { amount: 2 } },
 * })
 * ```
 */
export function buildDailyCoinDistribution(
  params: CreateDailyCoinDistributionParams,
): DailyCoinDistributionDataModel {
  const now = getTimestamp()
  return {
    id: generateUuid(),
    ...defaultDailyCoinDistributionAttributes,
    ...params,
    summaryDate: params.summaryDate ?? getDateOnly(),
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * DailyCoinDistributionDataModel を作成して DB に保存する
 *
 * @param kv - Deno KV インスタンス
 * @param params - DailyCoinDistribution 作成パラメータ
 * @returns DailyCoinDistributionDataModel
 *
 * @example
 * ```ts
 * const distribution = await createDailyCoinDistribution(kv, {
 *   familyId: 'family-1',
 *   userId: 'user-1',
 *   distributions: { 'cointype-1': { amount: 2 } },
 * })
 * ```
 */
export async function createDailyCoinDistribution(
  kv: Deno.Kv,
  params: CreateDailyCoinDistributionParams,
): Promise<DailyCoinDistributionDataModel> {
  const distribution = buildDailyCoinDistribution(params,)
  await kv.set(
    [
      DAILY_COIN_DISTRIBUTION_PREFIX_KEY,
      distribution.familyId,
      distribution.userId,
      distribution.summaryDate,
    ],
    distribution,
  )
  return distribution
}
