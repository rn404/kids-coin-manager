import { useEffect, } from 'preact/hooks'

// deno-lint-ignore internal/no-default-export
export default function TimezoneCookie() {
  useEffect(() => {
    if (document.cookie.includes('tz=',) === false) {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      document.cookie = `tz=${tz};path=/;max-age=31536000`
    }
  }, [],)

  return null
}
