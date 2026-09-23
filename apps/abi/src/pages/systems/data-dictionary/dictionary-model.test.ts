import { describe, expect, it } from 'vitest'

import { adaptDictDataDetail, adaptDictDataPage, adaptDictDataTypeList } from './dictionary-adapter'
import {
  buildDictDataCreateParams,
  buildDictDataListParams,
  buildDictDataUpdateParams,
  getLastPageAfterDelete
} from './dictionary-model'
import type { SysDictData } from './types'

const record: SysDictData = {
  createBy: 'admin',
  createTime: '2026-09-22 10:00:00',
  cssClass: '',
  dictCode: '9007199254740993',
  dictLabel: '高风险',
  dictSort: 10,
  dictType: 'semantic_biz_type',
  dictValue: 'HIGH_RISK',
  isDefault: 'N',
  listClass: 'danger',
  remark: '',
  status: '0',
  updateBy: '',
  updateTime: ''
}

describe('system dictionary model', () => {
  it('trims list filters and omits empty values', () => {
    expect(buildDictDataListParams({ dictLabel: '  风险 ', dictType: '  ', status: '' }, 2, 20)).toEqual({
      dictLabel: '风险',
      dictType: undefined,
      pageNum: 2,
      pageSize: 20,
      status: undefined
    })
  })

  it('builds create and update payloads while preserving a Long string ID', () => {
    const values = {
      cssClass: '  badge-risk ',
      dictLabel: ' 高风险 ',
      dictSort: null,
      dictType: ' semantic_biz_type ',
      dictValue: ' HIGH_RISK ',
      isDefault: 'Y' as const,
      listClass: ' danger ',
      remark: ' 风险业务 ',
      status: '1' as const
    }

    expect(buildDictDataCreateParams(values)).toEqual({
      cssClass: 'badge-risk',
      dictLabel: '高风险',
      dictType: 'semantic_biz_type',
      dictValue: 'HIGH_RISK',
      isDefault: 'Y',
      listClass: 'danger',
      remark: '风险业务',
      status: '1'
    })
    expect(buildDictDataUpdateParams(record, values).dictCode).toBe('9007199254740993')
  })

  it('adapts rows and total from a flat response without coercing Long IDs', () => {
    const result = {
      data: [{ ...record, dictSort: '10' }],
      error: null,
      response: { data: { code: 200, rows: [{ ...record }], total: 37 } }
    }

    expect(adaptDictDataPage(result)).toEqual({ records: [record], total: 37 })
  })

  it('returns null when detail data is absent and maps a valid detail', () => {
    expect(adaptDictDataDetail({ error: null, response: { data: { code: 200 } } })).toBeNull()
    expect(adaptDictDataDetail({ data: record, error: null })).toEqual(record)
  })

  it('sorts type items while keeping unsorted values last', () => {
    const result = {
      data: [
        { ...record, dictCode: 3, dictSort: null },
        { ...record, dictCode: 1, dictSort: 20 },
        { ...record, dictCode: 2, dictSort: 10 }
      ]
    }

    expect(adaptDictDataTypeList(result).map(item => item.dictCode)).toEqual([2, 1, 3])
  })

  it('contracts the page after deleting the last page', () => {
    expect(getLastPageAfterDelete(21, 1, 10)).toBe(2)
    expect(getLastPageAfterDelete(1, 1, 10)).toBe(1)
  })
})
