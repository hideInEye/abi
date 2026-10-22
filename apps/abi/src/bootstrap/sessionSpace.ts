import { invalidateSpaceListPages, loadSpaceListPage } from '../resources/spaceListResource'
import { store } from '../store'
import { setCurrentSpaceInfo, setSpaceHidden } from '../store/slice/app'
import { readPersistedSpaceId } from '../utils/spaceStorage'
import { localStg } from '../utils/storage'

let pending: { token: string; promise: Promise<void> } | undefined

export function initializeSessionSpace(options: { restoreCachedSpace?: boolean } = {}): Promise<void> {
  const token = localStg.get('token') || ''
  // 启动和登录恢复可能同时进入，同一会话共用初始化请求，避免重复重置空间。
  if (pending?.token === token) return pending.promise

  const promise = (async () => {
    const cachedSpaceId = options.restoreCachedSpace ? readPersistedSpaceId() : 0
    // 主动登录重选默认空间；刷新保留缓存供校验/失败重试，不提前通知其他窗口清空空间。
    if (!options.restoreCachedSpace || !token) store.dispatch(setCurrentSpaceInfo(null))
    store.dispatch(setSpaceHidden(false))
    if (!token) return

    invalidateSpaceListPages()
    let page = await loadSpaceListPage(1, '', true)
    const first = page.rows[0]
    let selected = page.rows.find(row => row.spaceId === cachedSpaceId)
    // 当前空间可能不在首屏分页内，不能仅因第一页找不到就改成第一个空间。
    while (cachedSpaceId && !selected && page.hasMore) {
      if (localStg.get('token') !== token) throw new Error('登录账号已变更，请重新加载')
      page = await loadSpaceListPage(page.pageNum + 1, '', true)
      selected = page.rows.find(row => row.spaceId === cachedSpaceId)
    }
    // 请求期间可能已切换账号，旧响应不得覆盖新账号的空间。
    if (localStg.get('token') !== token) throw new Error('登录账号已变更，请重新加载')

    // 名称与 ID 一起使用当前账号的接口结果；无权限/已删除的缓存空间回退首项。
    store.dispatch(setCurrentSpaceInfo(selected ?? first ?? null))
  })()
  pending = { token, promise }
  void promise.finally(() => {
    // 旧会话结束时，新会话可能已开始初始化，不能清除后者的去重记录。
    if (pending?.promise === promise) pending = undefined
  }).catch(() => undefined)
  return promise
}
