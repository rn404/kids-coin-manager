import {
  COIN_PREFIX_KEY,
  COIN_TRANSACTION_PREFIX_KEY,
  COIN_TYPE_PREFIX_KEY,
  DAILY_COIN_DISTRIBUTION_PREFIX_KEY,
  makeCoinDistributionUseCase,
  makeCoinTypeUseCase,
  makeCoinUseCase
} from '@workspace/data'

const target = Deno.env.get('CONSOLE_TARGET')
const allowWrite = Deno.env.get('ALLOW_WRITE') === '1'

const resolveKvUrl = (): {
  label: string
  url: string | undefined
  isProduction: boolean
} => {
  if (target === 'local') {
    const kvPath = Deno.env.get('DENO_KV_PATH')
    if (kvPath === undefined) {
      console.error('Error: DENO_KV_PATH is required for console:local')
      Deno.exit(1)
    }
    return { label: 'local', url: kvPath, isProduction: false }
  }

  if (target === 'remote') {
    if (Deno.env.get('DENO_KV_ACCESS_TOKEN') === undefined) {
      console.error(
        'Error: DENO_KV_ACCESS_TOKEN is required for console:remote'
      )
      Deno.exit(1)
    }
    const previewDbId = Deno.env.get('PREVIEW_DB_ID')
    const prodDbId = Deno.env.get('PROD_DB_ID')
    if (previewDbId === undefined && prodDbId === undefined) {
      console.error(
        'Error: PREVIEW_DB_ID or PROD_DB_ID is required for console:remote'
      )
      Deno.exit(1)
    }
    if (previewDbId !== undefined) {
      return {
        label: 'preview',
        url: `https://api.deno.com/databases/${previewDbId}/connect`,
        isProduction: false
      }
    }
    return {
      label: 'production',
      url: `https://api.deno.com/databases/${prodDbId}/connect`,
      isProduction: true
    }
  }

  console.error(
    'Error: Use "deno task console:local" or "deno task console:remote"'
  )
  Deno.exit(1)
}

const { label, url, isProduction } = resolveKvUrl()

if (isProduction) {
  const input = prompt(
    `\n⚠️  Connecting to PRODUCTION KV. Are you sure? (yes/no)`
  )
  if (input !== 'yes') {
    console.log('Aborted.')
    Deno.exit(1)
  }
}

const kv = await Deno.openKv(url)

const fullCoinUseCase = makeCoinUseCase({ kv })
const fullCoinTypeUseCase = makeCoinTypeUseCase({ kv })
const fullCoinDistributionUseCase = makeCoinDistributionUseCase({ kv })

const coinUseCase = allowWrite ? fullCoinUseCase : {
  listByUser: fullCoinUseCase.listByUser,
  findById: fullCoinUseCase.findById
}

const coinTypeUseCase = allowWrite ? fullCoinTypeUseCase : {
  findById: fullCoinTypeUseCase.findById,
  listAllByFamily: fullCoinTypeUseCase.listAllByFamily
}

const coinDistributionUseCase = allowWrite ? fullCoinDistributionUseCase : {
  findById: fullCoinDistributionUseCase.findById
}

Object.assign(globalThis, {
  kv,
  coinUseCase,
  coinTypeUseCase,
  coinDistributionUseCase,
  COIN_PREFIX_KEY,
  COIN_TYPE_PREFIX_KEY,
  COIN_TRANSACTION_PREFIX_KEY,
  DAILY_COIN_DISTRIBUTION_PREFIX_KEY
})

const writeLabel = allowWrite ? 'read/write' : 'read-only'
console.log(`\n🪨  Deno KV Console`)
console.log(`   env:   ${label}`)
console.log(`   mode:  ${writeLabel}`)
console.log(`
Available:
  kv                              Deno.Kv instance
  coinUseCase                     CoinUseCase
  coinTypeUseCase                 CoinTypeUseCase
  coinDistributionUseCase         CoinDistributionUseCase
  COIN_PREFIX_KEY
  COIN_TYPE_PREFIX_KEY
  COIN_TRANSACTION_PREFIX_KEY
  DAILY_COIN_DISTRIBUTION_PREFIX_KEY
`)
