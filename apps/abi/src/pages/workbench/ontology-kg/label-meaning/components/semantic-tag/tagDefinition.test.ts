import { describe, expect, it } from 'vitest'

import {
  getDefinitionStateAfterExpressionChange,
  getDefinitionStateAfterManualChange,
  shouldConfirmDefinitionOverwrite
} from './tagDefinition'

describe('tag definition generation state', () => {
  it('marks generated and manually edited definitions stale after an expression change', () => {
    expect(getDefinitionStateAfterExpressionChange('generated')).toBe('stale')
    expect(getDefinitionStateAfterExpressionChange('manual')).toBe('stale')
    expect(getDefinitionStateAfterExpressionChange('idle')).toBe('idle')
    expect(getDefinitionStateAfterExpressionChange('stale')).toBe('stale')
  })

  it('keeps stale status and detects content that requires overwrite confirmation', () => {
    expect(getDefinitionStateAfterManualChange('generated')).toBe('manual')
    expect(getDefinitionStateAfterManualChange('stale')).toBe('stale')
    expect(shouldConfirmDefinitionOverwrite('手工定义', '')).toBe(true)
    expect(shouldConfirmDefinitionOverwrite('CASE WHEN ... END', 'CASE WHEN ... END')).toBe(false)
    expect(shouldConfirmDefinitionOverwrite('  ', '')).toBe(false)
  })
})
