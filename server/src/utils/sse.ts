import type { Response } from 'express'

/** 设置 SSE 必需响应头；X-Accel-Buffering 用于避免 Nginx 代理缓冲实时事件。 */
export function setSseHeaders(res: Response) {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders?.()
}

/**
 * 原样写出 Redis entry 的 data 字符串。
 * 这里不 JSON.parse/JSON.stringify，避免改变空格、字段顺序或未知业务字段。
 */
export function writeRawSseMessage(res: Pick<Response, 'write'>, id: string, rawData: string) {
  res.write(`id: ${id}\n`)

  // SSE 要求每一行都带 data:；浏览器会按规范用换行重新拼接多行内容。
  for (const line of rawData.split(/\r?\n/)) {
    res.write(`data: ${line}\n`)
  }

  res.write('\n')
}

/** 传输层错误使用独立事件名，避免被前端当作 Redis 原始业务消息。 */
export function writeSseTransportError(res: Pick<Response, 'write'>, code: string, message: string, id?: string) {
  if (id) {
    res.write(`id: ${id}\n`)
  }

  res.write('event: stream.error\n')
  res.write(`data: ${JSON.stringify({ code, message })}\n\n`)
}

/** 心跳用注释行，不触发前端业务事件，只负责防止代理或浏览器长连接超时。 */
export function writeSseHeartbeat(res: Response) {
  res.write(`: heartbeat ${Date.now()}\n\n`)
}
