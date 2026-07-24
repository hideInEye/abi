import { createClient } from 'redis'

/**
 * 本服务只使用 Redis 的基础命令和 Stream 命令。
 * 这里保留官方 client 的完整类型，避免自己包一层丢掉 xRead/xRange/xAdd 能力。
 */
export type RedisClient = ReturnType<typeof createClient>

export type RedisClientConnectionOptions = {
  password?: string
  database: number
}

/**
 * REDIS_DB 是数据库的唯一配置来源。
 * node-redis 会让 URL 中的 `/0` 覆盖 `database` option，因此建连前必须移除 URL 自带的 DB 段。
 */
export function stripRedisDatabaseFromUrl(redisUrl: string) {
  const url = new URL(redisUrl)
  url.pathname = '/'
  return url.toString()
}

/** 创建 Redis client；调用方决定它是普通命令连接还是 SSE blocking read 连接。 */
export function createRedisClient(redisUrl: string, options: RedisClientConnectionOptions) {
  const client = createClient({
    url: stripRedisDatabaseFromUrl(redisUrl),
    // Redis 密码可通过 REDIS_URL 或 REDIS_PASSWORD 提供；这里支持独立 key，避免把密码写进 URL。
    password: options.password,
    database: options.database,
  })

  // node-redis 的 error 是 EventEmitter 事件；保留监听器可避免瞬时断线演变成未捕获异常。
  // 具体命令仍会 reject，并由 health、SSE 路由或 mock 脚本各自输出可读错误。
  client.on('error', () => undefined)

  return client
}

/** 幂等连接：避免重复 connect 导致 node-redis 抛错。 */
export async function connectRedisClient(client: RedisClient) {
  if (!client.isOpen) {
    await client.connect()
  }

  return client
}

/** 幂等断开：SSE req.close 和 finally 都可能触发释放。 */
export async function disconnectRedisClient(client: RedisClient) {
  if (!client.isOpen) {
    return
  }

  await client.quit()
}

/** 强制断开用于取消正在 BLOCK 的 XREAD，确保浏览器离开后及时释放专用连接。 */
export async function forceDisconnectRedisClient(client: RedisClient) {
  if (!client.isOpen) {
    return
  }

  await client.disconnect()
}
