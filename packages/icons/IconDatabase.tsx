// Icon from Tabler Icons (MIT License) https://tabler.io/icons
export function IconDatabase(
  props: { size?: number | string; class?: string }
) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width={props.size}
      height={props.size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      stroke-width='2'
      stroke-linecap='round'
      stroke-linejoin='round'
      class={props.class}
    >
      <path stroke='none' d='M0 0h24v24H0z' fill='none' />
      <path d='M4 6a8 3 0 1 0 16 0a8 3 0 1 0 -16 0' />
      <path d='M4 6v6a8 3 0 0 0 16 0v-6' />
      <path d='M4 12v6a8 3 0 0 0 16 0v-6' />
    </svg>
  )
}
