import { defineConfig, } from 'vite'
import { fresh, } from '@fresh/plugin-vite'
import tailwindcss from '@tailwindcss/vite'

const port = Number(Deno.env.get('PORT',),) || undefined

export default defineConfig({
  server: { port, },
  plugins: [
    fresh(),
    tailwindcss(),
  ],
},)
