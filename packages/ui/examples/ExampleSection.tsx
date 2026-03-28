import type { ComponentChildren } from 'preact'

function ExampleSection({ title, description, children }: {
  title: string
  children: ComponentChildren
  description?: string
}) {
  return (
    <div class='mb-4 flex flex-col gap-2'>
      <div class='font-bold text-2xl'>{title}</div>
      {description && <div class='text-sm accent-gray-400'>{description}</div>}
      <div class='border-1 border-gray-200 border-solid p-4 rounded'>
        {children}
      </div>
    </div>
  )
}

export { ExampleSection }
