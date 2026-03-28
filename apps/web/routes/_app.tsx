import { define } from '../main.ts'
import TimezoneCookie from '../islands/TimezoneCookie.tsx'

const App = define.page(({ Component }) => {
  return (
    <html>
      <head>
        <meta charset='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1.0' />
        <title>fresh-project</title>
      </head>
      <body>
        <TimezoneCookie />
        <Component />
      </body>
    </html>
  )
})

// deno-lint-ignore internal/no-default-export
export default App
