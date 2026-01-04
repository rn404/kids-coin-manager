function TextButton(props: {
  onClick?: () => void
},) {
  return <button type='button' {...props} />
}

export { TextButton, }
