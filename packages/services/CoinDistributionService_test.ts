import { afterEach, beforeEach, describe, it } from '@std/testing/bdd'
import { assertEquals } from '@std/assert'
import { makeCoinDistributionService } from './CoinDistributionService.ts'
import { makeCoinDistributionUseCase } from '@workspace/data'
import {
  cleanupTestKv,
  createCoinType,
  setupTestKv
} from '@workspace/data/test-helpers'

let kv: Deno.Kv
let service: ReturnType<typeof makeCoinDistributionService>

beforeEach(async () => {
  kv = await setupTestKv()
  service = makeCoinDistributionService({ kv })
})

afterEach(async () => {
  await cleanupTestKv(kv)
})

describe('CoinDistributionService#ensureDaily', () => {
  it('should execute daily distribution via CoinDistributionUseCase', async () => {
    await createCoinType(kv, {
      familyId: 'family-1',
      name: 'テレビコイン',
      dailyDistribution: 3,
      active: true
    })

    await service.ensureDaily('family-1', 'user-1', 'Asia/Tokyo')

    // UseCase 側の findById で配布レコードが作成されたことを確認
    const distributionUseCase = makeCoinDistributionUseCase({ kv })
    const today = new Date().toLocaleDateString('sv-SE', {
      timeZone: 'Asia/Tokyo'
    })
    const result = await distributionUseCase.findById(
      'family-1',
      'user-1',
      today
    )
    const entries = Object.values(result!)
    assertEquals(entries.length, 1)
    assertEquals(entries[0].amount, 3)
  })
})
