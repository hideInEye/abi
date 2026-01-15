import { createStore, applyMiddleware, combineReducers } from 'redux'

function createEffectsMiddleware(getEffects: () => Record<string, Function>, getNamespacePut: () => any) {
  return (store: any) => (next: any) => async (action: any) => {
    const effects = getEffects()
    const fn = effects[action.type]
    if (!fn) return next(action)

    const { call, select, put } = getNamespacePut()(action.type, store)
    return fn(action, { call, select, put, dispatch: store.dispatch, getState: store.getState })
  }
}

export function createApp(opts: { models: any[] }) {
  const models = opts.models

  const reducersMap: Record<string, any> = {}
  const effectsMap: Record<string, Function> = {}

  const prefix = (ns: string, type: string) => (type.includes('/') ? type : `${ns}/${type}`)

  // 组 reducer / effects
  for (const m of models) {
    const ns = m.namespace
    if (!ns) throw new Error('model.namespace required')

    // reducer：只响应 ns/xxx
    reducersMap[ns] = (state = m.state, action: any) => {
      const key = action.type?.startsWith(ns + '/') ? action.type.slice(ns.length + 1) : ''
      const r = m.reducers?.[key]
      return r ? r(state, action) : state
    }

    // effects：把 ns/effectName 映射到函数
    for (const k of Object.keys(m.effects ?? {})) {
      effectsMap[`${ns}/${k}`] = m.effects[k]
    }
  }

  const rootReducer = combineReducers(reducersMap)

  // put 自动补 namespace：在 effect 里 put({type:'save'}) => ns/save
  const getNamespacePut = () => (fullType: string, store: any) => {
    const ns = fullType.split('/')[0]
    return {
      call: (fn: any, ...args: any[]) => fn(...args),
      select: (sel: any) => sel(store.getState()),
      put: (a: any) => store.dispatch({ ...a, type: prefix(ns, a.type) }),
    }
  }

  let getEffects = () => effectsMap
  const effectsMiddleware = createEffectsMiddleware(() => getEffects(), () => getNamespacePut)

  const store = createStore(rootReducer, applyMiddleware(effectsMiddleware))

  return { store }
}
