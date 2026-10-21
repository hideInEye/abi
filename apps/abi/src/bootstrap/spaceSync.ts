import { loadCurrentSpaceInfo } from '../resources/currentSpaceInfo'
import { store } from '../store'
import { getCurrentSpaceInfo, setCurrentSpaceInfo } from '../store/slice/app'
import { readPersistedSpaceId, readPersistedSpaceName } from '../utils/spaceStorage'
import { localStg } from '../utils/storage'

/** 只在跨窗口/明确空间事件时同步，普通点击和下拉开关不能重新选择空间。 */
export function startAbiSpaceSync(): () => void {
  let stopped = false
  let revision = 0
  let pendingKey = ''

  const sync = () => {
    const spaceId = readPersistedSpaceId()
    const token = localStg.get('token')
    const current = getCurrentSpaceInfo(store.getState())
    if (!token || !spaceId || window.location.pathname.startsWith('/login')) {
      revision += 1
      pendingKey = ''
      return
    }
    if (current?.spaceId === spaceId && current.spaceName === readPersistedSpaceName()) return
    const key = `${token}:${spaceId}`
    if (pendingKey === key) return
    pendingKey = key
    const run = ++revision

    // 两个兼容缓存键不是原子写入，名称以该 ID 的详情为准，不直接信任旧 spaceName。
    void loadCurrentSpaceInfo(spaceId)
      .then((space) => {
        if (stopped || run !== revision || localStg.get('token') !== token || readPersistedSpaceId() !== spaceId) return
        if (getCurrentSpaceInfo(store.getState()) !== current) return
        store.dispatch(setCurrentSpaceInfo(space))
      })
      .catch(() => {
        // 请求失败保留当前选择，下一次明确同步事件可重试。
      })
      .finally(() => {
        if (run === revision) pendingKey = ''
      })
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === 'spaceId' || event.key === 'spaceName') sync()
  }
  const onVisibility = () => {
    if (document.visibilityState === 'visible') sync()
  }
  window.addEventListener('storage', onStorage)
  window.addEventListener('focus', sync)
  window.addEventListener('space-change', sync)
  document.addEventListener('visibilitychange', onVisibility)
  sync()
  return () => {
    stopped = true
    revision += 1
    window.removeEventListener('storage', onStorage)
    window.removeEventListener('focus', sync)
    window.removeEventListener('space-change', sync)
    document.removeEventListener('visibilitychange', onVisibility)
  }
}
