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

  it('keeps API levelPath for the dimension list path display', () => {
    const item = mapDimensionFromApi({
      bizName: '地区',
      dimId: 2,
      levelPath: '客户/地区',
      path: '旧目录'
    })

    expect(item.levelPath).toBe('客户/地区')
    expect(item.path).toBe('旧目录')
  })
})
