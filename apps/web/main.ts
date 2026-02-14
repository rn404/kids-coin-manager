import { App, createDefine, staticFiles, } from 'fresh'

export interface State {
  kv: Deno.Kv
}

export const define = createDefine<State>()

export const app = new App<State>()

const kv = await Deno.openKv(Deno.env.get('DENO_KV_PATH',),)

app.use(staticFiles(),)

app.use(async (ctx,) => {
  ctx.state.kv = kv
  return await ctx.next()
},)

// this is the same as the /api/:name route defined via a file. feel free to delete this!
app.get('/api2/:name', (ctx,) => {
  const name = ctx.params.name
  return new Response(
    `Hello, ${name.charAt(0,).toUpperCase() + name.slice(1,)}!`,
  )
},)

// this can also be defined via a file. feel free to delete this!
const exampleLoggerMiddleware = define.middleware((ctx,) => {
  console.log(`${ctx.req.method} ${ctx.req.url}`,)
  return ctx.next()
},)
app.use(exampleLoggerMiddleware,)

// Include file-system based routes here
app.fsRoutes()
