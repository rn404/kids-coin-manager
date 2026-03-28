import { Link } from '../components/Link.tsx'
import { ExamplePage } from './ExamplePage.tsx'
import { ExampleSection } from './ExampleSection.tsx'

const LinkExamplePage = () => {
  return (
    <ExamplePage title='Link'>
      <ExampleSection title='Default'>
        <Link href='#'>リンクテキスト</Link>
      </ExampleSection>
      <ExampleSection title='External'>
        <Link href='#' externalLink>外部リンク</Link>
      </ExampleSection>
    </ExamplePage>
  )
}

export { LinkExamplePage }
