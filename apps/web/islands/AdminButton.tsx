import { Button, Icon } from '@workspace/ui'

const AdminButton = () => {
  const handleClick = () => {
    const input = globalThis.prompt('パスワードをいれてね')
    if (input === 'okane') {
      globalThis.location.href = '/coin-types'
    }
  }

  return (
    <Button
      onClick={handleClick}
      aria-label='管理画面へ'
    >
      <Icon name='Settings' />
    </Button>
  )
}

// deno-lint-ignore internal/no-default-export
export default AdminButton
