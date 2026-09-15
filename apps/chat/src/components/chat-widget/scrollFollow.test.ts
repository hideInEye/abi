import { describe, expect, it } from 'vitest'

import { nextUserScrolled } from './scrollFollow'

/** 构造滚动采样：容器可视高 400，内容高由 scrollHeight 给定 */
const sample = (prev: boolean, prevScrollTop: number, scrollTop: number, scrollHeight: number, clientHeight = 400) =>
  nextUserScrolled(prev, prevScrollTop, scrollTop, scrollHeight, clientHeight)

describe('nextUserScrolled', () => {
  it('用户上滑且距底超过阈值：暂停自动滚底', () => {
    // 内容高 2000，从底部(1600)上滑到 800，距底 800 > 100
    expect(sample(false, 1600, 800, 2000)).toBe(true)
  })

  it('主动滚回底部区：恢复自动滚底', () => {
    // 距底 10 <= 16 且 scrollTop 增大
    expect(sample(true, 800, 1590, 2000)).toBe(false)
  })

  it('程序化滚底（scrollTop 增大且距底 0）：保持跟随', () => {
    expect(sample(false, 1000, 2000, 2400)).toBe(false)
  })

  it('内容增长但 scrollTop 不变：不误暂停跟随', () => {
    // 流式追加内容后 scrollHeight 变大、scrollTop 未变（不触发 scroll 事件前的状态）
    expect(sample(false, 1600, 1600, 3000)).toBe(false)
  })

  it('暂停态下继续上滑：保持暂停', () => {
    expect(sample(true, 800, 400, 2000)).toBe(true)
  })

  it('暂停态下滑但未回到底部附近：保持暂停', () => {
    // 距底 300，介于两阈值之间
    expect(sample(true, 400, 1300, 2000)).toBe(true)
  })

  it('跟随态下单档滚轮上滑（约 100px，离开底部区）：立即暂停', () => {
    // 距底 100 > 50：首次上滑即生效，不被下一次流式更新拽回
    expect(sample(false, 1600, 1500, 2000)).toBe(true)
  })

  it('跟随态上滑但仍在底部区内：保持跟随', () => {
    // 距底 8 <= 16：视为仍贴在底部，不暂停
    expect(sample(false, 1600, 1592, 2000)).toBe(false)
  })

  it('内容折叠致 scrollTop 被动钳制下移：不误恢复跟随', () => {
    // 暂停态下 scrollHeight 缩水，浏览器钳制 scrollTop 下移且距底 0：非主动下滚，保持暂停
    expect(sample(true, 1600, 1200, 1600)).toBe(true)
  })
})
