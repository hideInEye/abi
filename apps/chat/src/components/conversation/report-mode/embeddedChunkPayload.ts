import type { ReportPublicChunk, ReportStepChunkEvent } from './types'

/**
 * 后端工具可能把一份 `{ chunks: [...] }` JSON 按字符拆成多条 text 事件。
 * 这个内部类型只用于保存物理分片，任何展示组件都不能直接渲染它。
 */
export const EMBEDDED_CHUNK_PAYLOAD_OUTPUT_TYPE = 'report_payload'

interface EmbeddedChunkPayloadItem {
  output_type?: unknown
  content?: unknown
  title?: unknown
  emit_to_client?: unknown
}

function findJsonObjectEnd(source: string, start: number): number | undefined {
  let depth = 0
  let inString = false
  let escaped = false

  for (let index = start; index < source.length; index += 1) {
    const character = source[index]

    if (inString) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === '"') inString = false
      continue
    }

    if (character === '"') {
      inString = true
      continue
    }

    if (character === '{') depth += 1
    else if (character === '}') depth -= 1

    if (depth === 0) return index
  }

  return undefined
}

/** 提取已经完整闭合且可解析的顶层 JSON 对象；末尾未闭合分片留在缓冲区等待后续事件。 */
function parseCompleteJsonObjects(source: string): unknown[] {
  const objects: unknown[] = []
  let cursor = 0

  while (cursor < source.length) {
    const start = source.indexOf('{', cursor)
    if (start < 0) break

    const end = findJsonObjectEnd(source, start)
    if (end === undefined) break

    try {
      objects.push(JSON.parse(source.slice(start, end + 1)) as unknown)
      cursor = end + 1
    } catch {
      // 当前左花括号不是合法 JSON 起点，继续查找后面的对象，单条坏数据不能阻断后续内容。
      cursor = start + 1
    }
  }

  return objects
}

function hasUnclosedJsonObject(source: string): boolean {
  let cursor = 0

  while (cursor < source.length) {
    const start = source.indexOf('{', cursor)
    if (start < 0) return false

    const end = findJsonObjectEnd(source, start)
    if (end === undefined) return true
    cursor = end + 1
  }

  return false
}

function getPayloadChunks(chunks: ReportPublicChunk[]) {
  return chunks.filter((chunk) => chunk.outputType === EMBEDDED_CHUNK_PAYLOAD_OUTPUT_TYPE)
}

/**
 * 判定新收到的物理 chunk 是否仍属于当前未闭合 JSON。
 * 已完整闭合后的普通 text 会恢复为正常输出；新的 `{ chunks: ... }` 仍可开启下一份载荷。
 */
export function getStoredChunkOutputType(
  chunks: ReportPublicChunk[],
  event: Pick<ReportStepChunkEvent, 'output_type' | 'content'>,
): string {
  const outputType = event.output_type || 'text'
  if (String(outputType).toLowerCase() !== 'text') return outputType

  const payloadSource = getPayloadChunks(chunks)
    .map((chunk) => chunk.content)
    .join('')
  const continuesPayload = Boolean(payloadSource) && hasUnclosedJsonObject(payloadSource)
  const startsPayload = /^\s*\{\s*"chunks"\s*:/.test(event.content)
  return continuesPayload || startsPayload ? EMBEDDED_CHUNK_PAYLOAD_OUTPUT_TYPE : outputType
}

/**
 * 将完整内部载荷还原为逻辑输出。
 * `emit_to_client: false` 是服务端明确的不可见标记，必须在进入 UI 模型前过滤。
 */
export function getEmbeddedPayloadChunks(chunks: ReportPublicChunk[]): ReportPublicChunk[] {
  const payloadChunks = getPayloadChunks(chunks)
  if (payloadChunks.length === 0) return []

  const payloadSource = payloadChunks.map((chunk) => chunk.content).join('')
  const sourceEntryId = payloadChunks[0].entryId

  return parseCompleteJsonObjects(payloadSource).flatMap((parsed, objectIndex) => {
    if (!parsed || typeof parsed !== 'object') return []

    const embeddedChunks = (parsed as { chunks?: unknown }).chunks
    if (!Array.isArray(embeddedChunks)) return []

    return embeddedChunks.flatMap((item: EmbeddedChunkPayloadItem, chunkIndex) => {
      if (!item || typeof item !== 'object' || item.emit_to_client === false) return []
      if (typeof item.output_type !== 'string' || typeof item.content !== 'string') return []

      return [
        {
          entryId: `${sourceEntryId}:embedded:${objectIndex}:${chunkIndex}`,
          outputType: item.output_type.toLowerCase(),
          content: item.content,
          title: typeof item.title === 'string' ? item.title : undefined,
        },
      ]
    })
  })
}

/**
 * 用逻辑输出替换内部物理分片，同时保留同一步骤中前后出现的正常输出顺序。
 * JSON 未完整时 embeddedChunks 为空，因此页面只显示步骤状态，不显示半截正文。
 */
export function getRenderableStepChunks(chunks: ReportPublicChunk[]): ReportPublicChunk[] {
  const embeddedChunks = getEmbeddedPayloadChunks(chunks)
  const result: ReportPublicChunk[] = []
  let embeddedInserted = false

  chunks.forEach((chunk) => {
    if (chunk.outputType !== EMBEDDED_CHUNK_PAYLOAD_OUTPUT_TYPE) {
      result.push(chunk)
      return
    }

    if (!embeddedInserted) {
      result.push(...embeddedChunks)
      embeddedInserted = true
    }
  })

  return result
}

/**
 * 将历史 `steps[].outputs` 等已经成型的物理输出按实时事件的相同规则归一化。
 * 历史接口可能把完整工具载荷保存在一条 text 中，也可能保留为连续分片；这里先标记物理载荷，
 * 再统一展开为页面可见的逻辑 chunk，确保历史恢复和实时生成的展示结果一致。
 */
export function normalizeEmbeddedChunkOutputs(chunks: ReportPublicChunk[]): ReportPublicChunk[] {
  const storedChunks = chunks.reduce<ReportPublicChunk[]>((result, chunk) => {
    result.push({
      ...chunk,
      outputType: getStoredChunkOutputType(result, {
        output_type: chunk.outputType,
        content: chunk.content,
      }),
    })
    return result
  }, [])

  return getRenderableStepChunks(storedChunks)
}
