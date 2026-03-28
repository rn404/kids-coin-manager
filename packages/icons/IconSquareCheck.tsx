// Icon from Tabler Icons (MIT License) https://tabler.io/icons
export function IconSquareCheck(
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
      <path d='M3 5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14' />
      <path d='M9 12l2 2l4 -4' />
    </svg>
  )
}
