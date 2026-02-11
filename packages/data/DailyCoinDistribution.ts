import type { DataModel, ISODateString, } from '@workspace/types'

/**
 * 毎日のコイン配布済み記録
 *
 * - 存在すればその日の配布済みを示す中間レコード
 * - CoinTransaction を参照せず、このレコードだけで配布済み判定が完結する
 * - key: ['coin_daily_distributions', familyId, userId, summaryDate]
 * - prefix: ['coin_daily_distributions', familyId] で家族全体の配布状況を一覧取得可能
 */
type DailyCoinDistributionDataModel = DataModel<{
  familyId: string
  userId: string

  /**
   * 配布を実施した日
   * - ユーザーのローカル日付で記録される
   * - TZ情報は metadata.timezone に記録する
   * @example '2026-01-31'
   */
  summaryDate: ISODateString

  /**
   * CoinType ごとの配布結果
   */
  distributions: Array<{
    coinTypeId: string
    amount: number
  }>

  metadata: {
    /**
     * ユーザーTZ
     * - IANA TZ識別子
     * @example "Asia/Tokyo"
     */
    timezone: string
  }
}>

export type { DailyCoinDistributionDataModel, }
