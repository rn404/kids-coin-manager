import { page } from 'fresh'
import { IconExamplePage } from '@workspace/ui'
import { define } from '../../main.ts'

export const handler = define.handlers({
  GET(_ctx) {
    return page({})
  }
})

const IconShowcase = define.page<typeof handler>(() => {
  return <IconExamplePage />
})

// deno-lint-ignore internal/no-default-export
export default IconShowcase
