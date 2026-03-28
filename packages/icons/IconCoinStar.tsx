// Custom icon based on Tabler Icons (MIT License) https://tabler.io/icons
export function IconCoinStar(
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
      <path d='M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0' />
      <polygon points='12,7 13.18,10.38 16.76,10.46 13.9,12.62 14.94,16.05 12,14 9.06,16.05 10.1,12.62 7.24,10.46 10.82,10.38' />
    </svg>
  )
}
