import { describe, expect, it } from 'vitest'

import { writeRawSseMessage, writeSseTransportError } from './sse.js'

/** 测试只记录 write 内容，不需要启动 Express 或 Redis。 */
function createWritableResponse() {
  const chunks: string[] = []

  return {
    response: {
      write(chunk: string) {
        chunks.push(chunk)
        return true
      },
    },
    output() {
      return chunks.join('')
    },
  }
}

describe('SSE transport', () => {
  it('forwards Redis data without parsing or re-serializing it', () => {
    const target = createWritableResponse()
    const rawData = '{ "type": "done", "unknown": [1, 2] }'

    writeRawSseMessage(target.response, '1730000000000-0', rawData)

    expect(target.output()).toBe(`id: 1730000000000-0\ndata: ${rawData}\n\n`)
  })

  it('preserves invalid JSON and formats multiline data according to SSE rules', () => {
    const target = createWritableResponse()

    writeRawSseMessage(target.response, '2-0', 'not-json\nsecond line')

    expect(target.output()).toBe('id: 2-0\ndata: not-json\ndata: second line\n\n')
  })

  it('uses a separate named event for transport errors', () => {
    const target = createWritableResponse()

    writeSseTransportError(target.response, 'missing_data', 'data is required', '3-0')

    expect(target.output()).toBe('id: 3-0\nevent: stream.error\ndata: {"code":"missing_data","message":"data is required"}\n\n')
  })
})
