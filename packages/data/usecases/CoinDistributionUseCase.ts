import { COIN_PREFIX_KEY, } from '../Coin.ts'
import type { CoinDataModel, } from '../Coin.ts'
import { COIN_TRANSACTION_PREFIX_KEY, } from '../CoinTransaction.ts'
import type { CoinTransactionDataModel, } from '../CoinTransaction.ts'
import { COIN_TYPE_PREFIX_KEY, } from '../CoinType.ts'
import type { CoinTypeDataModel, } from '../CoinType.ts'
import { DAILY_COIN_DISTRIBUTION_PREFIX_KEY, } from '../DailyCoinDistribution.ts'
import type { DailyCoinDistributionDataModel, } from '../DailyCoinDistribution.ts'
import { generateUuid, getTimestamp, withRetry, } from '@workspace/foundations'
import type { DatetimeWithTimezone, } from '@workspace/foundations'

interface CoinDistributionUseCaseInterface {
  findById(
    familyId: DailyCoinDistributionDataModel['familyId'],
    userId: DailyCoinDistributionDataModel['userId'],
    summaryDate: DailyCoinDistributionDataModel['summaryDate'],
  ): Promise<DailyCoinDistributionDataModel['distributions'] | null>
  ensure(
    familyId: DailyCoinDistributionDataModel['familyId'],
    userId: DailyCoinDistributionDataModel['userId'],
    currentDate: DatetimeWithTimezone,
  ): Promise<void>
}

const diffDays = (
  from: string,
  to: string,
): number => {
  const msPerDay = 24 * 60 * 60 * 1000
  const fromDate = new Date(from,)
  const toDate = new Date(to,)
  return Math.floor(
    (toDate.getTime() - fromDate.getTime()) / msPerDay,
  )
}

const makeCoinDistributionUseCase = (
  deps: { kv: Deno.Kv },
): CoinDistributionUseCaseInterface => {
  const findEntry = async (
    familyId: DailyCoinDistributionDataModel['familyId'],
    userId: DailyCoinDistributionDataModel['userId'],
    summaryDate: DailyCoinDistributionDataModel['summaryDate'],
  ) => {
    return await deps.kv.get<DailyCoinDistributionDataModel>([
      DAILY_COIN_DISTRIBUTION_PREFIX_KEY,
      familyId,
      userId,
      summaryDate,
    ],)
  }

  const findLatestDistribution = async (
    familyId: DailyCoinDistributionDataModel['familyId'],
    userId: DailyCoinDistributionDataModel['userId'],
  ): Promise<DailyCoinDistributionDataModel | null> => {
    let latest: DailyCoinDistributionDataModel | null = null
    const entries = deps.kv.list<DailyCoinDistributionDataModel>({
      prefix: [
        DAILY_COIN_DISTRIBUTION_PREFIX_KEY,
        familyId,
        userId,
      ],
    },)

    for await (const entry of entries) {
      if (
        latest === null ||
        entry.value.summaryDate > latest.summaryDate
      ) {
        latest = entry.value
      }
    }

    return latest
  }

  const findById = async (
    familyId: DailyCoinDistributionDataModel['familyId'],
    userId: DailyCoinDistributionDataModel['userId'],
    summaryDate: DailyCoinDistributionDataModel['summaryDate'],
  ): ReturnType<CoinDistributionUseCaseInterface['findById']> => {
    const entry = await findEntry(familyId, userId, summaryDate,)
    return entry.value?.distributions ?? null
  }

  const ensure = async (
    familyId: DailyCoinDistributionDataModel['familyId'],
    userId: DailyCoinDistributionDataModel['userId'],
    currentDate: DatetimeWithTimezone,
  ): ReturnType<CoinDistributionUseCaseInterface['ensure']> => {
    const summaryDate = currentDate.localDateString
    await withRetry(async () => {
      const distributionEntry = await findEntry(
        familyId,
        userId,
        summaryDate,
      )

      if (distributionEntry.value !== null) {
        return
      }

      const coinTypes: Array<CoinTypeDataModel> = []
      const entries = deps.kv.list<CoinTypeDataModel>({
        prefix: [COIN_TYPE_PREFIX_KEY, familyId,],
      },)

      for await (const entry of entries) {
        if (entry.value.active) {
          coinTypes.push(entry.value,)
        }
      }

      // 前回の配布日から経過日数を算出（初回は 1 日分）
      const latestDistribution = await findLatestDistribution(
        familyId,
        userId,
      )
      const days = latestDistribution === null
        ? 1
        : diffDays(latestDistribution.summaryDate, summaryDate,)

      if (days <= 0) {
        return
      }

      const coinEntries: Array<Deno.KvEntryMaybe<CoinDataModel>> = []
      for (const coinType of coinTypes) {
        const coinEntry = await deps.kv.get<CoinDataModel>([
          COIN_PREFIX_KEY,
          userId,
          familyId,
          coinType.id,
        ],)
        coinEntries.push(coinEntry,)
      }

      const now = getTimestamp()
      const distributions: DailyCoinDistributionDataModel['distributions'] = {}

      let atomic = deps.kv.atomic()

      // 配布記録の楽観的ロック（二重配布防止）
      atomic = atomic.check(distributionEntry,)

      for (let i = 0; i < coinTypes.length; i++) {
        const coinType = coinTypes[i]
        const coinEntry = coinEntries[i]

        const baseCoin: CoinDataModel = coinEntry.value ?? {
          id: generateUuid(),
          userId,
          familyId,
          coinTypeId: coinType.id,
          amount: 0,
          createdAt: now,
          updatedAt: now,
        }

        const amount = coinType.dailyDistribution * days

        if (amount === 0) continue

        const newAmount = baseCoin.amount + amount

        distributions[coinType.id] = { amount, }

        // Coin 更新（存在しない場合は新規作成）
        const updatedCoin: CoinDataModel = {
          ...baseCoin,
          amount: newAmount,
          updatedAt: now,
        }

        atomic = atomic
          .check(coinEntry,)
          .set(
            [COIN_PREFIX_KEY, userId, familyId, coinType.id,],
            updatedCoin,
          )

        // CoinTransaction 作成
        const transactionId = generateUuid()
        const transaction: CoinTransactionDataModel = {
          id: transactionId,
          userId,
          familyId,
          coinTypeId: coinType.id,
          amount,
          balance: newAmount,
          transactionType: 'daily_distribution',
          metadata: { type: 'daily_distribution', },
          createdAt: now,
          updatedAt: now,
        }

        atomic = atomic.set(
          [
            COIN_TRANSACTION_PREFIX_KEY,
            userId,
            familyId,
            coinType.id,
            transactionId,
          ],
          transaction,
        )
      }

      // DailyCoinDistribution 作成
      const distributionId = generateUuid()
      const distribution: DailyCoinDistributionDataModel = {
        id: distributionId,
        familyId,
        userId,
        summaryDate,
        distributions,
        metadata: { timezone: currentDate.timezone, },
        createdAt: now,
        updatedAt: now,
      }

      atomic = atomic.set(
        [
          DAILY_COIN_DISTRIBUTION_PREFIX_KEY,
          familyId,
          userId,
          summaryDate,
        ],
        distribution,
      )

      const res = await atomic.commit()

      if (res.ok === false) {
        throw new Error('Conflict detected',)
      }
    },)
  }

  return {
    findById,
    ensure,
  }
}

export { makeCoinDistributionUseCase, }
