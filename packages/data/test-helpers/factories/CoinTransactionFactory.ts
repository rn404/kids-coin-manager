/**
 * CoinTransaction のテストデータ作成 Factory
 */

import { generateUuid, getTimestamp, } from '@workspace/foundations'
import { COIN_TRANSACTION_PREFIX_KEY, } from '../../CoinTransaction.ts'
import type { CoinTransactionDataModel, } from '../../CoinTransaction.ts'

/**
 * CoinTransaction のデフォルト値
 */
const defaultCoinTransactionAttributes = {
  amount: 100,
  balance: 900,
}

/**
 * transactionType ごとのデフォルト metadata
 */
const defaultMetadataByType = {
  daily_distribution: { type: 'daily_distribution' as const, },
  use: { type: 'use' as const, },
  exchange: {
    type: 'exchange' as const,
    fromCoinTypeId: 'from-cointype-1',
    toCoinTypeId: 'to-cointype-1',
    rate: 5,
  },
  stamp_reward: {
    type: 'stamp_reward' as const,
    stampCardId: 'stamp-card-1',
  },
} satisfies Record<
  CoinTransactionDataModel['transactionType'],
  CoinTransactionDataModel['metadata']
>

/**
 * CoinTransaction 作成パラメータ
 */
type CreateCoinTransactionParams = {
  userId: string
  familyId: string
  coinTypeId: string
  transactionType: CoinTransactionDataModel['transactionType']
  amount?: number
  balance?: number
  metadata?: CoinTransactionDataModel['metadata']
}

/**
 * CoinTransactionDataModel を構築する（DB に保存しない）
 *
 * @param params - CoinTransaction 作成パラメータ
 * @returns CoinTransactionDataModel
 *
 * @example
 * ```ts
 * const tx = buildCoinTransaction({
 *   userId: 'user-1',
 *   familyId: 'family-1',
 *   coinTypeId: 'cointype-1',
 *   transactionType: 'use',
 * })
 * ```
 */
export function buildCoinTransaction(
  params: CreateCoinTransactionParams,
): CoinTransactionDataModel {
  const now = getTimestamp()
  return {
    id: generateUuid(),
    ...defaultCoinTransactionAttributes,
    ...params,
    metadata: params.metadata ??
      defaultMetadataByType[params.transactionType],
    createdAt: now,
    updatedAt: now,
  } as CoinTransactionDataModel
}

/**
 * CoinTransactionDataModel を作成して DB に保存する
 *
 * @param kv - Deno KV インスタンス
 * @param params - CoinTransaction 作成パラメータ
 * @returns CoinTransactionDataModel
 *
 * @example
 * ```ts
 * const tx = await createCoinTransaction(kv, {
 *   userId: 'user-1',
 *   familyId: 'family-1',
 *   coinTypeId: 'cointype-1',
 *   transactionType: 'daily_distribution',
 * })
 * ```
 */
export async function createCoinTransaction(
  kv: Deno.Kv,
  params: CreateCoinTransactionParams,
): Promise<CoinTransactionDataModel> {
  const transaction = buildCoinTransaction(params,)
  await kv.set(
    [
      COIN_TRANSACTION_PREFIX_KEY,
      params.userId,
      params.familyId,
      params.coinTypeId,
      transaction.id,
    ],
    transaction,
  )
  return transaction
}
