import { ExamplePage, } from './ExamplePage.tsx'
import { ExampleSection, } from './ExampleSection.tsx'
import { TextButton, } from '../components/TextButton.tsx'

const TextButtonExamplePage = () => {
  return (
    <ExamplePage title='TextButton' description='リンクに見せかけたボタン'>
      <ExampleSection title='Default'>
        <div class='flex gap-4 items-center'>
          <TextButton>ボタン</TextButton>
          <TextButton disabled>ボタン</TextButton>
        </div>
      </ExampleSection>
    </ExamplePage>
  )
}

export { TextButtonExamplePage, }
