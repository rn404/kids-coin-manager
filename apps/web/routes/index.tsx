import { Head, } from 'fresh/runtime'
import { define, } from '@workspace/utils'
import { Button, Link, TextButton, } from '@workspace/ui'

export default define.page(function Home(_ctx,) {
  return (
    <div class='px-4 py-8 mx-auto min-h-screen'>
      <Head>
        <title>Kids Coin Manager</title>
      </Head>
      <div class='max-w-screen-md mx-auto flex flex-col items-center justify-center'>
        <h1 class='text-4xl font-bold'>Kids Coin Manager</h1>
        <nav class='mt-8 flex flex-col gap-4'>
          <a
            href='/timer'
            class='px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-center'
          >
            Timer
          </a>
          <a
            href='/stamps'
            class='px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 text-center'
          >
            Stamps
          </a>
        </nav>
      </div>
      <Button>ButtonExample</Button>
      <TextButton>TextButtonExample</TextButton>
      <Link href='/timer'>Link Sample</Link>
    </div>
  )
},)
