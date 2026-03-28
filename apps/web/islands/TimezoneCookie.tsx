import { useEffect } from 'preact/hooks'

const TimezoneCookie = () => {
  useEffect(() => {
    if (document.cookie.includes('tz=') === false) {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      document.cookie = `tz=${tz};path=/;max-age=31536000`
    }
  }, [])

  return null
}

// deno-lint-ignore internal/no-default-export
export default TimezoneCookie
