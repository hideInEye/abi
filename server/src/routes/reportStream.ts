import { Router } from 'express'

import type { ServerConfig } from '../config.js'
import { createRedisClient, disconnectRedisClient, forceDisconnectRedisClient } from '../services/redis.js'
import type { RedisStreamEntry } from '../types/report.js'
import { setSseHeaders, writeRawSseMessage, writeSseHeartbeat, writeSseTransportError } from '../utils/sse.js'
import { parseReportStreamQuery, resolveLastId } from '../utils/streamKey.js'

/**
 * node-redis 的 xRead 返回类型非常宽，这里定义本服务实际使用的最小结构。
 * 这样路由代码更聚焦在业务语义上，也避免泄漏 redis 包内部复杂类型。
 */
type RedisXReadStream = {
  name?: string
  messages?: Array<{
    id: string
    message: Record<string, string | Buffer | null | undefined>
  }>
}

/** 把未知异常统一转换成可返回给 HTTP/SSE 客户端的字符串。 */
function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

/** 将 node-redis 返回结构收敛成服务内部只读的最小 entry 类型。 */
function normalizeRedisEntries(entries: Array<{ id: string; message: Record<string, string | Buffer | null | undefined> }>): RedisStreamEntry[] {
  return entries.map(entry => ({
    id: entry.id,
    message: entry.message,
  }))
}

/** Redis client 可能根据配置返回 string 或 Buffer，传输层只负责无损转为 UTF-8 字符串。 */
function getRawData(entry: RedisStreamEntry) {
  const data = entry.message.data

  if (Buffer.isBuffer(data)) {
    return data.toString('utf8')
  }

  return typeof data === 'string' ? data : undefined
}

/**
 * 报告流路由只做 Redis -> SSE 的传输，不理解 question/plan/done 等业务事件。
 * 报告任务提交、事件解析、状态聚合和终态判断全部由其他服务或前端承担。
 */
export function createReportStreamRouter(config: ServerConfig) {
  const router = Router()

  /**
   * Redis Stream SSE 读取接口。
   *
   * 读取语义：
   * - 不使用 XREADGROUP，避免多个浏览器页面抢同一组消息。
   * - 不传 last_id 时从 0-0 开始，满足页面恢复的完整回放需求。
   * - 传 last_id 时只读该 ID 之后的新消息，满足断线续读需求。
   */
  router.get('/events', async (req, res) => {
    let query

    try {
      query = parseReportStreamQuery(req.query as Record<string, unknown>, config.reportStreamPrefix)
    } catch (error) {
      res.status(400).json({
        ok: false,
        error: toErrorMessage(error),
      })
      return
    }

    // blocking read 会在 Redis 连接上阻塞等待数据，所以每个 SSE 连接都必须单独创建 client。
    const blockingClient = createRedisClient(config.redisUrl, {
      password: config.redisPassword,
      database: config.redisDb,
    })
    let closed = false
    let lastId = resolveLastId(query.lastId)
    let lastHeartbeatAt = Date.now()

    // 浏览器关闭页面、切换会话或网络断开时，立即释放该 SSE 专用 Redis 连接。
    req.once('close', () => {
      closed = true
      // 强制断开才能立即打断正在 BLOCK 的 XREAD，避免页面离开后连接继续占用数秒。
      void forceDisconnectRedisClient(blockingClient).catch(() => undefined)
    })

    try {
      await blockingClient.connect()
      setSseHeaders(res)

      // 首包心跳可以让代理和浏览器尽快确认这是一个活跃 SSE 响应。
      writeSseHeartbeat(res)

      while (!closed) {
        // XREAD 从 lastId 之后开始读；BLOCK 超时返回 null 后继续循环并视情况发心跳。
        const streams = (await blockingClient.xRead(
          [
            {
              key: query.streamKey,
              id: lastId,
            },
          ],
          {
            BLOCK: config.sseBlockMs,
            COUNT: config.sseCount,
          },
        )) as RedisXReadStream[] | null

        if (!streams || streams.length === 0) {
          const now = Date.now()

          // Redis 没有新消息时，按配置间隔发送 SSE 注释心跳，不产生业务事件。
          if (now - lastHeartbeatAt >= config.sseHeartbeatMs) {
            writeSseHeartbeat(res)
            lastHeartbeatAt = now
          }

          continue
        }

        for (const stream of streams) {
          const messages = normalizeRedisEntries(stream.messages || [])

          for (const message of messages) {
            // 缺少 data 的 entry 也推进 lastId，防止重连后永远卡在同一条坏消息。
            lastId = message.id

            const rawData = getRawData(message)

            if (rawData === undefined) {
              // 只报告传输结构异常；不尝试推断或伪造任何报告业务事件。
              writeSseTransportError(res, 'missing_data', 'Redis Stream entry does not include data field', message.id)
              continue
            }

            // 即使内容不是 JSON 或 type=done，Node 也原样传递并继续等待；终止连接由前端决定。
            writeRawSseMessage(res, message.id, rawData)
          }
        }
      }
    } catch (error) {
      if (!closed) {
        // Redis 连接异常、命令异常等统一通过 stream.error 暴露，方便前端提示和重连。
        writeSseTransportError(res, 'redis_error', toErrorMessage(error))
      }
    } finally {
      closed = true
      if (!res.writableEnded) {
        res.end()
      }

      // 正常异常路径优雅退出；若 req.close 已强制断开，这里会直接返回。
      await disconnectRedisClient(blockingClient).catch(() => undefined)
    }
  })

  return router
}
