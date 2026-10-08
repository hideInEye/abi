import { fetchSpaceList } from '../service/api/space'
import type { SpaceInfo } from '../types/layout'

import { createStableRequestKey, RequestResource } from './requestResource'
export { mergeChatSpacePages } from './spaceListMerge'

export interface ChatSpacePage {
  hasMore: boolean
  pageNum: number
  rows: SpaceInfo[]
}

export const CHAT_SPACE_PAGE_SIZE = 20

const spacePageResource = new RequestResource<ChatSpacePage>()

function getUserName(): string {
  try {
    const userInfo = JSON.parse(localStorage.getItem('SOY-REACT_userInfo') || '{}')
    return String(userInfo?.userName || '')
  } catch {
    return ''
  }
}

function normalizeSpaceList(response: any): SpaceInfo[] {
  const rawList = [
    response?.rows,
    response?.data?.rows,
    response?.response?.data?.rows,
    response?.data,
  ].find((item) => Array.isArray(item))

  if (!Array.isArray(rawList)) return []
  return rawList
    .map((item: any): SpaceInfo | null => {
      const spaceId = Number(item?.spaceId)
      const spaceName = String(item?.spaceName ?? '').trim()
      if (!Number.isFinite(spaceId) || spaceId <= 0 || !spaceName) return null
      return {
        spaceId,
        spaceName,
        remark: typeof item?.remark === 'string' ? item.remark.trim() : '',
        userCount: Number(item?.userCount) || 0,
        chatCount: Number(item?.chatCount) || 0,
      }
    })
    .filter((item): item is SpaceInfo => Boolean(item))
}

export function getChatSpacePageKey(pageNum: number, search: string): string {
  return createStableRequestKey('chat-space-list', {
    pageNum,
    pageSize: CHAT_SPACE_PAGE_SIZE,
    search: search.trim(),
    userName: getUserName(),
  })
}

export function loadChatSpacePage(pageNum: number, search: string): Promise<ChatSpacePage> {
  const normalizedSearch = search.trim()
  const key = getChatSpacePageKey(pageNum, normalizedSearch)
  return spacePageResource.load(key, async signal => {
    const response = await fetchSpaceList({
      isAsc: 'desc',
      orderByColumn: 'spaceId',
      pageNum,
      pageSize: CHAT_SPACE_PAGE_SIZE,
      spaceName: normalizedSearch || undefined,
    }, signal)
    const rows = normalizeSpaceList(response)
    return { hasMore: rows.length === CHAT_SPACE_PAGE_SIZE, pageNum, rows }
  })
}

export function abortChatSpacePage(pageNum: number, search: string): void {
  spacePageResource.abort(getChatSpacePageKey(pageNum, search))
}
