import type { ExploreMcpSource } from '../../components/conversation/exploration-mode/types'

/**
 * MCP 选中项按协议分流为两类源版本字段
 * 
 * 元素形态：{源版本id: 分组namespaceId(s_<groupId>)}
 * 未知协议归入 sse（与未分流前行为一致）
 */
export function buildMcpSourceVersionFields(sources?: ExploreMcpSource[]) {
  const sse: Array<Record<string, string>> = []
  const streamable: Array<Record<string, string>> = []
  const seen = new Set<string>()

  ;(sources || []).forEach((source) => {
    const id = String(source?.id ?? '')
    if (!id || seen.has(id)) return
    seen.add(id)

    const entry = { [id]: source.namespaceId ?? '' }
    const protocol = toProtocolKey(source.protocol)

    if (protocol === 'streamable' || protocol === 'streamablehttp') {
      streamable.push(entry)
    } else {
      sse.push(entry)
    }
  })

  return { sse, streamable }
}

function toProtocolKey(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, '')
}
