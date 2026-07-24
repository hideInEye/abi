import express from 'express'

import type { ServerConfig } from './config.js'
import { createReportStreamRouter } from './routes/reportStream.js'
import type { RedisClient } from './services/redis.js'

/** Express route 层只返回可读错误信息，不把 unknown 直接序列化给客户端。 */
function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

/**
 * 创建 Express app。
 * 传入 redisClient 是为了便于后续单测或集成测试替换为 mock client。
 */
export function createApp(redisClient: RedisClient, config: ServerConfig) {
  const app = express()

  app.use(express.json())

  /** 健康检查同时验证 HTTP server 和 Redis 连接状态。 */
  app.get('/health', async (_req, res) => {
    try {
      const redis = await redisClient.ping()

      res.json({
        ok: true,
        redis,
      })
    } catch (error) {
      res.status(503).json({
        ok: false,
        redis: 'ERROR',
        error: toErrorMessage(error),
      })
    }
  })

  // 报告流相关接口统一挂在 /api/report-stream 下，方便前端后续配置代理。
  app.use('/api/report-stream', createReportStreamRouter(config))

  return app
}
