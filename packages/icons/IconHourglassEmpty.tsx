// Icon from Tabler Icons (MIT License) https://tabler.io/icons
export function IconHourglassEmpty(
  props: { size?: number | string; class?: string },
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
      class='icon icon-tabler icons-tabler-outline icon-tabler-hourglass-empty'
    >
      <path stroke='none' d='M0 0h24v24H0z' fill='none' />
      <path d='M6 20v-2a6 6 0 1 1 12 0v2a1 1 0 0 1 -1 1h-10a1 1 0 0 1 -1 -1' />
      <path d='M6 4v2a6 6 0 1 0 12 0v-2a1 1 0 0 0 -1 -1h-10a1 1 0 0 0 -1 1' />
    </svg>
  )
}
