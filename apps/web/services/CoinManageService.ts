import { makeCoinTypeUseCase, } from '@workspace/data'
import type { CoinTypeDataModel, } from '@workspace/data'

interface AddCoinTypeInput {
  name: string
  durationMinutes: number
  dailyDistribution: number
}

interface ValidationError {
  field: string
  message: string
}

const validateAddCoinTypeInput = (
  input: AddCoinTypeInput,
): Array<ValidationError> => {
  const errors: Array<ValidationError> = []

  if (input.name.trim() === '') {
    errors.push({ field: 'name', message: '名前を入力してください', },)
  }

  if (input.durationMinutes <= 0) {
    errors.push({
      field: 'durationMinutes',
      message: '時間は1分以上にしてください',
    },)
  }

  if (input.dailyDistribution < 0) {
    errors.push({
      field: 'dailyDistribution',
      message: '配布数は0以上にしてください',
    },)
  }

  return errors
}

const makeCoinManageService = (deps: { kv: Deno.Kv },) => {
  const coinTypeUseCase = makeCoinTypeUseCase(deps,)

  const addCoinType = async (
    familyId: string,
    input: AddCoinTypeInput,
  ): Promise<
    { ok: true; coinType: CoinTypeDataModel } | {
      ok: false
      errors: Array<ValidationError>
    }
  > => {
    const errors = validateAddCoinTypeInput(input,)
    if (errors.length > 0) {
      return { ok: false, errors, }
    }

    const coinType = await coinTypeUseCase.create(
      familyId,
      input.name.trim(),
      input.durationMinutes,
      input.dailyDistribution,
    )

    return { ok: true, coinType, }
  }

  const listCoinTypes = async (
    familyId: string,
  ): Promise<Array<CoinTypeDataModel>> => {
    return await coinTypeUseCase.listAllByFamily(familyId,)
  }

  return {
    addCoinType,
    listCoinTypes,
  }
}

export { makeCoinManageService, }
export type { AddCoinTypeInput, ValidationError, }
