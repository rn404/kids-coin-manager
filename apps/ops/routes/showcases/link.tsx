import { page } from 'fresh'
import { LinkExamplePage } from '@workspace/ui'
import { define } from '../../main.ts'

export const handler = define.handlers({
  GET(_ctx) {
    return page({})
  }
})

const LinkShowcase = define.page<typeof handler>(() => {
  return <LinkExamplePage />
})

// deno-lint-ignore internal/no-default-export
export default LinkShowcase
