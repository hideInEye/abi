import { describe, expect, it } from 'vitest'

import { buildFormValues, mapDimensionFromApi } from './dimensionModeling.mapper'

describe('dimensionModeling mapper', () => {
  it('keeps all time granularities from typeParams when editing time dimensions', () => {
    const item = mapDimensionFromApi({
      bizName: '测试时间维',
      dimId: 1,
      dimType: 'time',
      fieldType: 'datetime',
      techName: 'test_time',
      typeParams: '{"timeGranularity":["month","week","day"]}'
    })

    expect(buildFormValues(item).timeGranularity).toEqual(['month', 'week', 'day'])
  })
})
