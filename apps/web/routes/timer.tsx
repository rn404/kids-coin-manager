import { Head } from 'fresh/runtime'
import { define } from '../main.ts'

const Timer = define.page((_ctx) => {
  return (
    <div class='px-4 py-8'>
      <Head>
        <title>Timer - Kids Coin Manager</title>
      </Head>
      <div class='max-w-screen-md mx-auto flex flex-col items-center justify-center'>
        <h1 class='text-4xl font-bold'>Timer</h1>
      </div>
    </div>
  )
})

// deno-lint-ignore internal/no-default-export
export default Timer
