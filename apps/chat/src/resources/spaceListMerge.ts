import type { SpaceInfo } from '../types/layout'

export function mergeChatSpacePages(current: SpaceInfo[], incoming: SpaceInfo[], replace: boolean): SpaceInfo[] {
  const result = replace ? [] : [...current]
  const indexes = new Map(result.map((space, index) => [space.spaceId, index]))
  incoming.forEach(space => {
    const index = indexes.get(space.spaceId)
    if (index === undefined) {
      indexes.set(space.spaceId, result.length)
      result.push(space)
    } else {
      result[index] = space
    }
  })
  return result
}

