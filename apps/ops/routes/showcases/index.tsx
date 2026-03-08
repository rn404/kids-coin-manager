import { page, } from 'fresh'
import { define, } from '../../main.ts'

const SHOWCASES = [
  { href: '/showcases/icon', label: 'Icon', },
  { href: '/showcases/link', label: 'Link', },
  { href: '/showcases/button', label: 'Button', },
  { href: '/showcases/text-button', label: 'TextButton', },
  { href: '/showcases/number-input', label: 'NumberInput', },
] as const

export const handler = define.handlers({
  GET(_ctx,) {
    return page({},)
  },
},)

const ShowcasesIndex = define.page<typeof handler>(() => {
  return (
    <div class='max-w-2xl mx-auto'>
      <h1 class='text-2xl font-bold mb-6'>Showcases</h1>
      <div class='grid gap-4'>
        {SHOWCASES.map(({ href, label, },) => (
          <a
            key={href}
            href={href}
            class='block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow'
          >
            <div class='font-semibold text-lg'>{label}</div>
          </a>
        ))}
      </div>
    </div>
  )
},)

// deno-lint-ignore internal/no-default-export
export default ShowcasesIndex
