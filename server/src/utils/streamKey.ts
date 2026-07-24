// 展示端只需要历史回放/续读，因此只接受明确的 Redis Stream entry ID。
const REDIS_STREAM_ID_PATTERN = /^\d+-\d+$/

export type ReportStreamQuery = {
  streamKey: string
  lastId?: string
}

/** 统一去掉配置末尾多余冒号，避免前缀边界校验出现双冒号。 */
function normalizePrefix(prefix: string) {
  return prefix.trim().replace(/:+$/, '')
}

/**
 * 只允许读取配置报告前缀下的子 key。
 * 使用 `${prefix}:` 边界可以拒绝 `report-evil:*` 等看似相同的任意 Redis key。
 */
export function assertAllowedReportStreamKey(streamKey: string, prefix: string) {
  const normalizedPrefix = normalizePrefix(prefix)

  if (!normalizedPrefix) {
    throw new Error('REPORT_STREAM_PREFIX must not be empty')
  }

  if (!streamKey.startsWith(`${normalizedPrefix}:`) || streamKey.length <= normalizedPrefix.length + 1) {
    throw new Error(`stream_key must start with ${normalizedPrefix}:`)
  }

  // 控制字符会破坏日志和下游协议；空白字符也不属于当前报告 key 约定。
  if (/[\u0000-\u0020\u007f]/.test(streamKey)) {
    throw new Error('stream_key must not contain whitespace or control characters')
  }

  return streamKey
}

/**
 * 统一校验 report-stream 接口 query。
 * stream_key 由报告提交服务返回，Node 只做必要的前缀和格式安全校验。
 */
export function parseReportStreamQuery(query: Record<string, unknown>, prefix: string): ReportStreamQuery {
  const rawStreamKey = query.stream_key
  const rawLastId = query.last_id

  if (typeof rawStreamKey !== 'string' || !rawStreamKey.trim()) {
    throw new Error('stream_key is required')
  }

  const streamKey = assertAllowedReportStreamKey(rawStreamKey.trim(), prefix)

  if (rawLastId === undefined) {
    return {
      streamKey,
    }
  }

  if (typeof rawLastId !== 'string' || !REDIS_STREAM_ID_PATTERN.test(rawLastId)) {
    throw new Error('last_id must be a Redis Stream id, for example 0-0 or 1730000000000-0')
  }

  return {
    streamKey,
    lastId: rawLastId,
  }
}

/** 不传 last_id 时必须从 0-0 开始，保证刷新/恢复能回放完整历史。 */
export function resolveLastId(lastId?: string) {
  return lastId || '0-0'
}
