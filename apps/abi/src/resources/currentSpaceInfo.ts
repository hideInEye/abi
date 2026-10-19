import { getSpaceInfo } from '../service/api/data-space'
import { assertFlatRequestSuccess } from '../service/request/flat-result'
import type { CurrentSpaceInfo } from '../store/slice/app/types'

/** 只有 ID 的入口必须查询对应名称，不能拼接上一个空间的缓存名称。 */
export async function loadCurrentSpaceInfo(spaceId: number): Promise<CurrentSpaceInfo> {
  const result = await getSpaceInfo(spaceId)
  assertFlatRequestSuccess(result)
  const data = result.data as { spaceId?: number | string; spaceName?: string } | null
  if (Number(data?.spaceId) !== spaceId || !data?.spaceName?.trim()) throw new Error('空间信息不完整')
  return { spaceId, spaceName: data.spaceName.trim() }
}
