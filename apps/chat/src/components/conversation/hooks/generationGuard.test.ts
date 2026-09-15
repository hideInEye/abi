import { describe, expect, it } from 'vitest'

import { createGenerationGuard } from './generationGuard'

describe('generation guard', () => {
  it('invalidates callbacks from older streams', () => {
    const guard = createGenerationGuard()
    const first = guard.begin()
    const second = guard.begin()
    expect(guard.isCurrent(first)).toBe(false)
    expect(guard.isCurrent(second)).toBe(true)
    guard.invalidate()
    expect(guard.isCurrent(second)).toBe(false)
  })
})
