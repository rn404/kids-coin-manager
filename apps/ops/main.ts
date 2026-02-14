import { App, createDefine, staticFiles, } from 'fresh'

export interface OpsState {
  kv: Deno.Kv
}

export const define = createDefine<OpsState>()

export const app = new App<OpsState>()

const kv = await Deno.openKv(Deno.env.get('DENO_KV_PATH',),)

app.use(staticFiles(),)
app.use(async (ctx,) => {
  ctx.state.kv = kv
  return await ctx.next()
},)
app.fsRoutes()
