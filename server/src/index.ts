import { config } from './config.js'
import { createApp } from './app.js'
import { connectRedisClient, createRedisClient, disconnectRedisClient } from './services/redis.js'

/** 进程入口：连接 Redis，启动 HTTP server，并注册优雅退出。 */
async function main() {
  const redisClient = createRedisClient(config.redisUrl, {
    password: config.redisPassword,
    database: config.redisDb,
  })

  // node-redis 的 error 事件如果无人监听，可能导致进程异常退出。
  redisClient.on('error', error => {
    console.error('[redis] error', error)
  })

  await connectRedisClient(redisClient)

  const app = createApp(redisClient, config)
  const server = app.listen(config.port, () => {
    console.log(`[report-stream-server] listening on http://localhost:${config.port}`)
  })
  let shuttingDown = false

  /** SIGINT/SIGTERM 退出时关闭 HTTP server，再释放普通 Redis client。 */
  async function shutdown(signal: NodeJS.Signals) {
    // pnpm/容器可能重复转发终止信号，幂等保护避免重复 close 和重复日志。
    if (shuttingDown) return
    shuttingDown = true

    console.log(`[report-stream-server] received ${signal}, shutting down`)
    server.close(async () => {
      await disconnectRedisClient(redisClient)
      process.exit(0)
    })
  }

  // 本地 Ctrl+C 与容器停止都走同一套释放逻辑。
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch(error => {
  // 启动阶段失败直接退出，避免进程以“未连接 Redis”的假健康状态运行。
  console.error('[report-stream-server] failed to start', error)
  process.exit(1)
})
