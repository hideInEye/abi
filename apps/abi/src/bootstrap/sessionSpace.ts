import { invalidateSpaceListPages, loadSpaceListPage } from '../resources/spaceListResource'
import { store } from '../store'
import { changeSpaceId, setSpaceHidden } from '../store/slice/app'
import { clearPersistedSpace, persistSpaceName } from '../utils/spaceStorage'
import { localStg } from '../utils/storage'

let pending: { token: string; promise: Promise<void> } | undefined

export function initializeSessionSpace(): Promise<void> {
  const token = localStg.get('token') || ''
  // 启动和登录恢复可能同时进入，同一会话共用初始化请求，避免重复重置空间。
  if (pending?.token === token) return pending.promise

  const promise = (async () => {
    // 默认空间以当前账号的首条结果为准，不能沿用上次关闭浏览器时的空间名称或 ID。
    clearPersistedSpace()
    store.dispatch(changeSpaceId(0))
    store.dispatch(setSpaceHidden(false))
    if (!token) return

    invalidateSpaceListPages()
    const page = await loadSpaceListPage(1, '', true)
    // 请求期间可能已切换账号，旧响应不得覆盖新账号的空间。
    if (localStg.get('token') !== token) throw new Error('登录账号已变更，请重新加载')

    const first = page.rows[0]
    if (first) {
      persistSpaceName(first.spaceName)
      store.dispatch(changeSpaceId(first.spaceId))
    }
  })()
  pending = { token, promise }
  void promise.finally(() => {
    // 旧会话结束时，新会话可能已开始初始化，不能清除后者的去重记录。
    if (pending?.promise === promise) pending = undefined
  }).catch(() => undefined)
  return promise
}
