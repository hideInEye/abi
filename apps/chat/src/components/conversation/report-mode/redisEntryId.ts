import type { RawReportStreamEntry } from './types'

export interface ParsedRedisEntryId {
  milliseconds: bigint
  sequence: bigint
}

const REDIS_ENTRY_ID_PATTERN = /^(0|[1-9]\d*)-(0|[1-9]\d*)$/

/**
 * Redis Stream ID 的两个分段都可能超过 Number.MAX_SAFE_INTEGER，必须使用 BigInt 比较，
 * 不能直接做字符串排序或 Number 相减。
 */
export function parseRedisEntryId(entryId: string): ParsedRedisEntryId | undefined {
  const match = REDIS_ENTRY_ID_PATTERN.exec(entryId)
  if (!match) return undefined

  return {
    milliseconds: BigInt(match[1]),
    sequence: BigInt(match[2]),
  }
}

export function compareRedisEntryIds(left: string, right: string): number {
  const parsedLeft = parseRedisEntryId(left)
  const parsedRight = parseRedisEntryId(right)

  if (!parsedLeft || !parsedRight) {
    throw new Error(`非法 Redis Stream entry ID：${!parsedLeft ? left : right}`)
  }

  if (parsedLeft.milliseconds !== parsedRight.milliseconds) {
    return parsedLeft.milliseconds < parsedRight.milliseconds ? -1 : 1
  }

  if (parsedLeft.sequence === parsedRight.sequence) return 0
  return parsedLeft.sequence < parsedRight.sequence ? -1 : 1
}

/** 对批量历史回放先按真实数值顺序排序，再按 entry ID 去重。 */
export function sortAndDedupeRedisEntries(entries: RawReportStreamEntry[]): RawReportStreamEntry[] {
  const uniqueEntries = new Map<string, RawReportStreamEntry>()

  for (const entry of entries) {
    if (!uniqueEntries.has(entry.id)) {
      uniqueEntries.set(entry.id, entry)
    }
  }

  return [...uniqueEntries.values()].sort((left, right) => compareRedisEntryIds(left.id, right.id))
}
