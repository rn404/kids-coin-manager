// Icon from Tabler Icons (MIT License) https://tabler.io/icons
export function IconCircle(
  props: { size?: number | string; class?: string }
) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width={props.size}
      height={props.size}
      class={props.class}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      stroke-width='2'
      stroke-linecap='round'
      stroke-linejoin='round'
    >
      <path stroke='none' d='M0 0h24v24H0z' fill='none' />
      <path d='M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0' />
    </svg>
  )
}
