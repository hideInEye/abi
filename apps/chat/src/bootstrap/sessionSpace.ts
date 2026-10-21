import { loadChatSpacePage } from '../resources/spaceListResource'
import { readAuthToken } from '../utils/auth'

export async function initializeChatSessionSpace(explicitSpaceId?: string): Promise<void> {
  const token = readAuthToken()
  if (!token) {
    localStorage.removeItem('spaceId')
    localStorage.removeItem('spaceName')
    return
  }

  const cachedSpaceId = Number(localStorage.getItem('spaceId'))
  // 显式链接优先；普通刷新校验缓存 ID，名称必须从接口恢复，不能沿用过期名称。
  const preferredSpaceId = explicitSpaceId || (Number.isFinite(cachedSpaceId) && cachedSpaceId > 0 ? String(cachedSpaceId) : undefined)

  let page = await loadChatSpacePage(1, '', true)
  const first = page.rows[0]
  let selected = preferredSpaceId ? page.rows.find(row => String(row.spaceId) === preferredSpaceId) : first
  // 缓存/链接指定的空间可能在后续分页中，不能仅检查第一页。
  while (preferredSpaceId && !selected && page.hasMore) {
    if (readAuthToken() !== token) throw new Error('登录账号已变更，请重新加载')
    page = await loadChatSpacePage(page.pageNum + 1, '', true)
    selected = page.rows.find(row => String(row.spaceId) === preferredSpaceId)
  }
  // 最后一次异步查询返回后仍需核对账号，防止旧响应写入新会话的空间缓存。
  if (readAuthToken() !== token) throw new Error('登录账号已变更，请重新加载')
  if (explicitSpaceId && !selected) throw new Error('指定空间不可访问，请从空间列表重新进入')

  selected ??= first
  if (selected) {
    localStorage.setItem('spaceName', selected.spaceName)
    localStorage.setItem('spaceId', String(selected.spaceId))
  } else {
    localStorage.removeItem('spaceId')
    localStorage.removeItem('spaceName')
  }
}
