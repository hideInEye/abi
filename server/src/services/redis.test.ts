import { describe, expect, it } from 'vitest'

import { createRedisClient, stripRedisDatabaseFromUrl } from './redis.js'

describe('Redis client 配置', () => {
  it('移除 REDIS_URL 中的数据库路径，同时保留连接信息', () => {
    const normalized = new URL(stripRedisDatabaseFromUrl('redis://user:password@localhost:6379/0?keepAlive=1'))

    expect(normalized.pathname).toBe('/')
    expect(normalized.username).toBe('user')
    expect(normalized.password).toBe('password')
    expect(normalized.searchParams.get('keepAlive')).toBe('1')
  })

  it('始终让 REDIS_DB 覆盖 URL 中原有的 /0', () => {
    const client = createRedisClient('redis://localhost:6379/0', { database: 3 })

    expect(client.options?.database).toBe(3)
    expect(new URL(String(client.options?.url)).pathname).toBe('/')
  })
})
