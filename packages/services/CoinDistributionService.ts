import { makeCoinDistributionUseCase } from '@workspace/data'
import { createDatetimeWithTimezoneFromNow } from '@workspace/foundations'

const makeCoinDistributionService = (deps: { kv: Deno.Kv }) => {
  const distributionUseCase = makeCoinDistributionUseCase(deps)

  const ensureDaily = async (
    familyId: string,
    userId: string,
    timezone: string
  ): Promise<void> => {
    const currentDate = createDatetimeWithTimezoneFromNow(timezone)
    await distributionUseCase.ensure(familyId, userId, currentDate)
  }

  return { ensureDaily }
}

export { makeCoinDistributionService }
