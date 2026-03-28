import { useSignal } from '@preact/signals'
import { NumberInput } from '../components/NumberInput.tsx'
import { ExamplePage } from './ExamplePage.tsx'
import { ExampleSection } from './ExampleSection.tsx'

function NumberInputExamplePage() {
  const controlled = useSignal(10)

  return (
    <ExamplePage
      title='NumberInput'
      description='数値入力コンポーネント'
    >
      <ExampleSection
        title='Uncontrolled'
        description='defaultValue=0, step=1'
      >
        <NumberInput />
      </ExampleSection>
      <ExampleSection
        title='Controlled'
        description='min=0, max=20, step=5'
      >
        <div class='flex items-center gap-4'>
          <NumberInput
            value={controlled}
            min={0}
            max={20}
            step={5}
            class='grow'
          />
          <span class='font-mono text-lg'>= {controlled}</span>
        </div>
      </ExampleSection>
      <ExampleSection
        title='Disabled'
        description='defaultValue=42'
      >
        <NumberInput defaultValue={42} disabled />
      </ExampleSection>
    </ExamplePage>
  )
}

export { NumberInputExamplePage }
