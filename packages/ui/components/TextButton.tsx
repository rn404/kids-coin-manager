import type { ComponentChildren, } from 'preact'

function TextButton(props: {
  onClick?: () => void
  children?: ComponentChildren
},) {
  return <button type='button' {...props} />
}

export { TextButton, }
