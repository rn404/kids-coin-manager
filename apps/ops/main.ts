import { App, createDefine, staticFiles, } from 'fresh'

export interface OpsState {
  kv: Deno.Kv
}

export const define = createDefine<OpsState>()

export const app = new App<OpsState>()

app.use(staticFiles(),)
app.use(async (ctx,) => {
  ctx.state.kv = await Deno.openKv()
  return await ctx.next()
},)
app.fsRoutes()
