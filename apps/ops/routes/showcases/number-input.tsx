import { page, } from 'fresh'
import { define, } from '../../main.ts'
import { NumberInputExample, } from '../../islands/NumberInputExample.tsx'

export const handler = define.handlers({
  GET(_ctx,) {
    return page({},)
  },
},)

const NumberInputShowcase = define.page<typeof handler>(() => {
  return <NumberInputExample />
},)

// deno-lint-ignore internal/no-default-export
export default NumberInputShowcase
