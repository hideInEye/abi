import dotenv from 'dotenv'

// 让本地开发可以直接使用 server/.env，同时生产环境仍可由进程环境变量注入。
dotenv.config()

/** Server 运行配置，全部由环境变量派生，避免把 Redis 地址/密码写死在代码中。 */
export type ServerConfig = {
  port: number
  redisUrl: string
  /** 可选 Redis 密码；为空时仅使用 REDIS_URL 中自带的认证信息。 */
  redisPassword?: string
  /** Redis logical database，报告 Stream 当前统一使用 DB3。 */
  redisDb: number
  reportStreamPrefix: string
  reportStreamMaxLen: number
  sseHeartbeatMs: number
  sseBlockMs: number
  sseCount: number
}

/** 读取数字型环境变量；配置错误应在启动阶段尽早失败。 */
function readNumberEnv(name: string, fallback: number) {
  const rawValue = process.env[name]

  if (!rawValue) {
    return fallback
  }

  const parsed = Number(rawValue)

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative number`)
  }

  return parsed
}

/** Redis database 必须是非负安全整数，避免 3.5、NaN 等配置延迟到建连阶段才失败。 */
function readIntegerEnv(name: string, fallback: number) {
  const value = readNumberEnv(name, fallback)

  if (!Number.isSafeInteger(value)) {
    throw new Error(`${name} must be a non-negative safe integer`)
  }

  return value
}

/** 集中装配配置，便于测试或后续改为配置中心。 */
export function loadConfig(): ServerConfig {
  return {
    port: readNumberEnv('PORT', 3001),
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    redisPassword: process.env.REDIS_PASSWORD?.trim() || undefined,
    redisDb: readIntegerEnv('REDIS_DB', 3),
    reportStreamPrefix: process.env.REPORT_STREAM_PREFIX || 'report',
    reportStreamMaxLen: readNumberEnv('REPORT_STREAM_MAXLEN', 5000),
    sseHeartbeatMs: readNumberEnv('SSE_HEARTBEAT_MS', 25000),
    sseBlockMs: readNumberEnv('SSE_BLOCK_MS', 5000),
    sseCount: readNumberEnv('SSE_COUNT', 50),
  }
}

export const config = loadConfig()
