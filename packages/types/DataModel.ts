interface RequiredDataModel {
  id: string
}

type DataModel<T extends object,> =
  & RequiredDataModel
  & Omit<T, keyof RequiredDataModel>

export type { DataModel, }
