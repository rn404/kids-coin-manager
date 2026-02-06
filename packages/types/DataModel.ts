import type { ISODateTimeString, } from './ISODateTimeString.ts'

interface RequiredDataModel {
  id: string
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
}

type DataModel<T extends object,> =
  & RequiredDataModel
  & Omit<T, keyof RequiredDataModel>

/**
 * DataModel から属性部分（T）を抽出する
 *
 * @example
 * ```ts
 * type CoinAttributes = AttributeOf<CoinDataModel>
 * // => { userId: string, familyId: string, coinTypeId: string, amount: number }
 * ```
 */
type AttributeOf<T,> = T extends DataModel<infer U> ? U : never

export type { AttributeOf, DataModel, }
