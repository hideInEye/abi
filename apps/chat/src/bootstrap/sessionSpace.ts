import { loadChatSpacePage } from '../resources/spaceListResource'
import { readAuthToken } from '../utils/auth'

export async function initializeChatSessionSpace(explicitSpaceId?: string): Promise<void> {
  const token = readAuthToken()
  // 重进应用时重新确定默认空间，避免缓存名称与实际请求所用空间不一致。
  localStorage.removeItem('spaceId')
  localStorage.removeItem('spaceName')
  if (!token) return

  let page = await loadChatSpacePage(1, '', true)
  let selected = explicitSpaceId ? page.rows.find(row => String(row.spaceId) === explicitSpaceId) : page.rows[0]
  // 链接显式指定的空间可能在后续分页中，不应直接回退首个空间而改变链接上下文。
  while (explicitSpaceId && !selected && page.hasMore) {
    if (readAuthToken() !== token) throw new Error('登录账号已变更，请重新加载')
    page = await loadChatSpacePage(page.pageNum + 1, '', true)
    selected = page.rows.find(row => String(row.spaceId) === explicitSpaceId)
  }
  // 最后一次异步查询返回后仍需核对账号，防止旧响应写入新会话的空间缓存。
  if (readAuthToken() !== token) throw new Error('登录账号已变更，请重新加载')
  if (explicitSpaceId && !selected) throw new Error('指定空间不可访问，请从空间列表重新进入')

  if (selected) {
    localStorage.setItem('spaceName', selected.spaceName)
    localStorage.setItem('spaceId', String(selected.spaceId))
  }
}
