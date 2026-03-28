// Icon from Tabler Icons (MIT License) https://tabler.io/icons
const IconArrowBack = (
  props: { size?: number | string; class?: string }
) => {
  return (
    <svg
      width={props.size}
      height={props.size}
      class={props.class}
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      stroke-width='2'
      stroke-linecap='round'
      stroke-linejoin='round'
    >
      <path stroke='none' d='M0 0h24v24H0z' fill='none' />
      <path d='M9 11l-4 4l4 4m-4 -4h11a4 4 0 0 0 0 -8h-1' />
    </svg>
  )
}

export { IconArrowBack }
