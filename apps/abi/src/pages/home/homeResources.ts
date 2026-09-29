import { spaceList } from '@/service/api/data-space'
import { fetchHomeData } from '@/service/api/home'
import { createStableRequestKey, RequestResource } from '@/resources/requestResource'

import type { ISpaceItem } from '../space-list/types'

import { readRequiredFlatData, readSpaceRows } from './homeRequests'

type HomeOverview = Record<string, any>

const homeOverviewResource = new RequestResource<HomeOverview>()
const homeSpacesResource = new RequestResource<ISpaceItem[]>()

function getUserIdentity(): string {
  try {
    const userInfo = JSON.parse(localStorage.getItem('SOY-REACT_userInfo') || '{}')
    return String(userInfo.userId ?? userInfo.userName ?? localStorage.getItem('userId') ?? 'anonymous')
  } catch {
    return String(localStorage.getItem('userId') ?? 'anonymous')
  }
}

export function getHomeResourceKeys() {
  const user = getUserIdentity()
  return {
    overview: createStableRequestKey('abi-home-overview', { user }),
    spaces: createStableRequestKey('abi-home-spaces', { pageNum: 1, pageSize: 8, user }),
  }
}

export function loadHomeOverview(force = false): Promise<HomeOverview> {
  const { overview } = getHomeResourceKeys()
  return homeOverviewResource.load(
    overview,
    async signal => readRequiredFlatData<HomeOverview>(await fetchHomeData(signal), '获取首页数据失败'),
    { force },
  )
}

export function loadHomeSpaces(force = false): Promise<ISpaceItem[]> {
  const { spaces } = getHomeResourceKeys()
  return homeSpacesResource.load(
    spaces,
    async signal => {
      const response = await spaceList({
        isAsc: 'desc',
        orderByColumn: 'spaceId',
        pageNum: 1,
        pageSize: 8,
      }, signal)
      const rows = readSpaceRows(response as any)
      if (rows === null) throw new Error('获取空间列表失败')
      return rows.map(item => ({ ...(item as ISpaceItem), type: 'space' }))
    },
    { force },
  )
}

export function getCachedHomeOverview(): HomeOverview | undefined {
  return homeOverviewResource.peek(getHomeResourceKeys().overview)
}

export function getCachedHomeSpaces(): ISpaceItem[] | undefined {
  return homeSpacesResource.peek(getHomeResourceKeys().spaces)
}

export function invalidateHomeResources(): void {
  const keys = getHomeResourceKeys()
  homeOverviewResource.invalidate(keys.overview)
  homeSpacesResource.invalidate(keys.spaces)
}

export function invalidateHomeSpaces(): void {
  homeSpacesResource.invalidate(getHomeResourceKeys().spaces)
}

export function abortHomeResources(): void {
  const keys = getHomeResourceKeys()
  homeOverviewResource.abort(keys.overview)
  homeSpacesResource.abort(keys.spaces)
}
