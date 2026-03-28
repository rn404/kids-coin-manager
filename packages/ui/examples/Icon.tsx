import { ExamplePage } from './ExamplePage.tsx'
import { ExampleSection } from './ExampleSection.tsx'
import { Icon } from '../components/Icon.tsx'
import type { IconName } from '@workspace/icons'

const iconNames: Array<IconName> = [
  'ArrowBack',
  'Check',
  'Circle',
  'Coin',
  'CoinStar',
  'Edit',
  'HourglassEmpty',
  'Minus',
  'Plus',
  'Settings',
  'Square',
  'SquareCheck',
  'TrashX',
  'X',
  'ExternalLink',
  'Palette'
]

function IconExamplePage() {
  return (
    <ExamplePage
      title='Icon'
      description='利用可能なアイコン一覧'
    >
      <ExampleSection title='All'>
        <div class='flex gap-4 flex-wrap'>
          {iconNames.map((name) => (
            <div key={name} class='flex flex-col items-center gap-2'>
              <Icon name={name} size='36' />
              <code class='text-xs bg-gray-200 text-red-400 px-1 rounded'>
                {name}
              </code>
            </div>
          ))}
        </div>
      </ExampleSection>
    </ExamplePage>
  )
}

export { IconExamplePage }
