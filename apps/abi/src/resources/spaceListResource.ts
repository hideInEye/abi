import { spaceList } from '../service/api/data-space'

import { createStableRequestKey, RequestResource } from './requestResource'
export { mergeSpacePages } from './spaceListMerge'

export interface SpaceListItem {
  chatCount?: number
  remark?: string
  spaceId: number
  spaceName: string
  userCount?: number
}

export interface SpaceListPage {
  hasMore: boolean
  pageNum: number
  rows: SpaceListItem[]
}

export const SPACE_LIST_PAGE_SIZE = 20

const spacePageResource = new RequestResource<SpaceListPage>()

function getUserIdentity(): string {
  try {
    const userInfo = JSON.parse(localStorage.getItem('SOY-REACT_userInfo') || '{}')
    return String(userInfo.userId ?? userInfo.userName ?? localStorage.getItem('userId') ?? 'anonymous')
  } catch {
    return String(localStorage.getItem('userId') ?? 'anonymous')
  }
}

function normalizeRows(response: any): SpaceListItem[] {
  const rawRows = [
    response?.data,
    response?.rows,
    response?.data?.rows,
    response?.response?.data?.rows,
  ].find(Array.isArray)
  if (!Array.isArray(rawRows)) return []

  return rawRows
    .map((item: any) => {
      const spaceId = Number(item?.spaceId)
      const spaceName = String(item?.spaceName ?? '').trim()
      if (!Number.isFinite(spaceId) || spaceId <= 0 || !spaceName) return null
      return {
        ...item,
        spaceId,
        spaceName,
      } as SpaceListItem
    })
    .filter((item): item is SpaceListItem => Boolean(item))
}

export function getSpaceListPageKey(pageNum: number, search: string): string {
  return createStableRequestKey('abi-space-list', {
    pageNum,
    pageSize: SPACE_LIST_PAGE_SIZE,
    search: search.trim(),
    user: getUserIdentity(),
  })
}

export function loadSpaceListPage(pageNum: number, search: string, force = false): Promise<SpaceListPage> {
  const normalizedSearch = search.trim()
  const key = getSpaceListPageKey(pageNum, normalizedSearch)
  return spacePageResource.load(
    key,
    async signal => {
      const response = await spaceList({
        isAsc: 'desc',
        orderByColumn: 'spaceId',
        pageNum,
        pageSize: SPACE_LIST_PAGE_SIZE,
        spaceName: normalizedSearch || undefined,
      }, signal)
      if ((response as any)?.error) throw (response as any).error
      const rows = normalizeRows(response)
      return {
        hasMore: rows.length === SPACE_LIST_PAGE_SIZE,
        pageNum,
        rows,
      }
    },
    { force },
  )
}

export function abortSpaceListPage(pageNum: number, search: string): void {
  spacePageResource.abort(getSpaceListPageKey(pageNum, search))
}

export function invalidateSpaceListPages(): void {
  spacePageResource.invalidate(key => key.startsWith('abi-space-list:'))
}
