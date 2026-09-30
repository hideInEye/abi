import type { SpaceListItem } from './spaceListResource'

export function mergeSpacePages(current: SpaceListItem[], incoming: SpaceListItem[], replace: boolean): SpaceListItem[] {
  const merged = replace ? [] : [...current]
  const indexById = new Map(merged.map((item, index) => [item.spaceId, index]))
  incoming.forEach(item => {
    const existingIndex = indexById.get(item.spaceId)
    if (existingIndex === undefined) {
      indexById.set(item.spaceId, merged.length)
      merged.push(item)
    } else {
      merged[existingIndex] = item
    }
  })
  return merged
}

