import type { ISODateTimeString, } from './ISODateTimeString.ts'

interface RequiredDataModel {
  id: string
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
}

type DataModel<T extends object,> =
  & RequiredDataModel
  & Omit<T, keyof RequiredDataModel>

export type { DataModel, }
