import type { DataModel, } from '@workspace/types'

type CoinTransactionDataModel = DataModel<
  & {
    userId: string
    familyId: string
    coinTypeId: string

    /**
     * 増減額
     */
    amount: number

    /**
     * コインの取引後の残高
     */
    balance: number
  }
  & (
    | {
      /**
       * 毎日の配布
       */
      transactionType: 'daily_distribution'
      metadata: {
        type: 'daily_distribution'
      }
    }
    | {
      /**
       * コイン使用
       * - タイマー利用時は timeSessionId が紐づく
       */
      transactionType: 'use'
      metadata: {
        type: 'use'
        timeSessionId?: string
      }
    }
    | {
      /**
       * コイン交換
       * - rate 交換、テレビコイン5枚をゲームコイン1枚に変更、など
       */
      transactionType: 'exchange'
      metadata: {
        type: 'exchange'
        fromCoinTypeId: string
        toCoinTypeId: string
        rate: number
      }
    }
    | {
      /**
       * スタンプカード達成による報酬
       */
      transactionType: 'stamp_reward'
      metadata: {
        type: 'stamp_reward'
        stampCardId: string
      }
    }
  )
>

export type { CoinTransactionDataModel, }
