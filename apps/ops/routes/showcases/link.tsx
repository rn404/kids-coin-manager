import { page, } from 'fresh'
import { define, } from '../../main.ts'
import { LinkExamplePage, } from '@workspace/ui'

export const handler = define.handlers({
  GET(_ctx,) {
    return page({},)
  },
},)

const LinkShowcase = define.page<typeof handler>(() => {
  return <LinkExamplePage />
},)

// deno-lint-ignore internal/no-default-export
export default LinkShowcase
