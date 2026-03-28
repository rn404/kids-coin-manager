import { page } from 'fresh'
import { ButtonExamplePage } from '@workspace/ui'
import { define } from '../../main.ts'

const handler = define.handlers({
  GET(_ctx) {
    return page({})
  }
})

const ButtonShowcase = define.page<typeof handler>(() => {
  return <ButtonExamplePage />
})

export { handler }
// deno-lint-ignore internal/no-default-export
export default ButtonShowcase
