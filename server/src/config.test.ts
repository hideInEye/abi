import { afterEach, describe, expect, it } from 'vitest'

import { loadConfig } from './config.js'

const originalRedisDb = process.env.REDIS_DB

afterEach(() => {
  if (originalRedisDb === undefined) {
    delete process.env.REDIS_DB
  } else {
    process.env.REDIS_DB = originalRedisDb
  }
})

describe('REDIS_DB 配置', () => {
  it('未配置时默认使用 DB3', () => {
    delete process.env.REDIS_DB
    expect(loadConfig().redisDb).toBe(3)
  })

  it('允许通过环境变量显式覆盖 Redis DB', () => {
    process.env.REDIS_DB = '7'
    expect(loadConfig().redisDb).toBe(7)
  })

  it('拒绝小数或负数 DB', () => {
    process.env.REDIS_DB = '3.5'
    expect(() => loadConfig()).toThrow('REDIS_DB must be a non-negative safe integer')

    process.env.REDIS_DB = '-1'
    expect(() => loadConfig()).toThrow('REDIS_DB must be a non-negative number')
  })
})
