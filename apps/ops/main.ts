import { App, createDefine, staticFiles } from 'fresh'

interface OpsState {
  kv: Deno.Kv
}

const define = createDefine<OpsState>()

const app = new App<OpsState>()

const kv = await Deno.openKv(Deno.env.get('DENO_KV_PATH'))

app.use(staticFiles())
app.use(async (ctx) => {
  ctx.state.kv = kv
  return await ctx.next()
})
app.fsRoutes()

export type { OpsState }
export { app, define }
