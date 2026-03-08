import { ExamplePage, } from './ExamplePage.tsx'
import { ExampleSection, } from './ExampleSection.tsx'
import { Button, } from '../components/Button.tsx'

const ButtonExamplePage = () => {
  return (
    <ExamplePage title='Button'>
      <ExampleSection title='Default'>
        <div class='flex gap-4 items-center'>
          <Button>ボタン</Button>
          <Button disabled>ボタン</Button>
        </div>
      </ExampleSection>
      <ExampleSection title='Primary'>
        <div class='flex gap-4 items-center'>
          <Button variant='primary'>ボタン</Button>
          <Button variant='primary' disabled>ボタン</Button>
        </div>
      </ExampleSection>
      <ExampleSection title='Danger'>
        <div class='flex gap-4 items-center'>
          <Button variant='danger'>ボタン</Button>
          <Button variant='danger' disabled>ボタン</Button>
        </div>
      </ExampleSection>
    </ExamplePage>
  )
}

export { ButtonExamplePage, }
