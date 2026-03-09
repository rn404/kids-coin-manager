import { define, } from '../main.ts'

const App = define.page(({ Component, },) => {
  return (
    <html>
      <head>
        <meta charset='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1.0' />
        <title>Kids coin manager | Ops</title>
      </head>
      <body class='bg-gray-50 min-h-screen'>
        <header class='bg-gray-900 text-white px-6 py-3 flex items-center gap-4'>
          <a href='/' class='text-lg font-bold'>Ops</a>
        </header>
        <main class='p-6'>
          <Component />
        </main>
      </body>
    </html>
  )
},)

// deno-lint-ignore internal/no-default-export
export default App
