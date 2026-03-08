import type { ComponentChildren, } from 'preact'

function ExamplePage({ title, description, children, }: {
  title: string
  children: ComponentChildren
  description?: string
},) {
  return (
    <div>
      <div class='p-4 bg-neutral-200 rounded mb-6'>
        <h1 class='mb-2 text-4xl font-bold'>{title}</h1>
        {description && <div>{description}</div>}
      </div>
      <div class='relative'>
        {children}
      </div>
    </div>
  )
}

export { ExamplePage, }
