import { page } from 'fresh'
import { TextButtonExamplePage } from '@workspace/ui'
import { define } from '../../main.ts'

const handler = define.handlers({
  GET(_ctx) {
    return page({})
  }
})

const TextButtonShowcase = define.page<typeof handler>(() => {
  return <TextButtonExamplePage />
})

export { handler }
// deno-lint-ignore internal/no-default-export
export default TextButtonShowcase
