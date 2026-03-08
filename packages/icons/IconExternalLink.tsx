// Icon from Tabler Icons (MIT License) https://tabler.io/icons
export function IconExternalLink(
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
      class={props.class}
    >
      <path stroke='none' d='M0 0h24v24H0z' fill='none' />
      <path d='M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6' />
      <path d='M11 13l9 -9' />
      <path d='M15 4h5v5' />
    </svg>
  )
}
