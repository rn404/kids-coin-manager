import { defineConfig } from 'vite'
import { fresh } from '@fresh/plugin-vite'
import tailwindcss from '@tailwindcss/vite'

const port = Number(Deno.env.get('PORT')) || undefined

// deno-lint-ignore internal/no-default-export
export default defineConfig({
  server: {
    port,
    watch: {
      ignored: ['!**/packages/**']
    }
  },
  plugins: [
    fresh(),
    tailwindcss()
  ]
})
