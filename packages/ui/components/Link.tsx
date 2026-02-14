import type { ComponentChildren, } from 'preact'

function Link(props: {
  href?: string
  onClick?: () => void
  children?: ComponentChildren
},) {
  return <a {...props} />
}

export { Link, }
