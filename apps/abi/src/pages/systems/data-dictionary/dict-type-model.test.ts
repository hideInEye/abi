import { describe, expect, it } from 'vitest'

import { adaptDictTypeOptions, adaptDictTypePage } from './dictionary-adapter'
import {
  DICT_TYPE_PATTERN,
  buildDictTypeCreateParams,
  buildDictTypeListParams,
  buildDictTypeUpdateParams,
  dictTypeToFormValues,
  getRequestErrorMessage
} from './dictionary-model'
import type { SysDictType } from './types'

const record: SysDictType = {
  createBy: 'admin',
  createTime: '2026-09-22 10:00:00',
  dictId: '9007199254740993',
  dictName: '业务类别',
  dictType: 'semantic_biz_type',
  remark: '语义业务分类',
  status: '0',
  updateBy: '',
  updateTime: ''
}

describe('system dictionary type model', () => {
  it('trims list filters and omits empty values', () => {
    expect(buildDictTypeListParams({ dictName: ' 业务 ', dictType: ' ', status: '' }, 2, 20)).toEqual({
      dictName: '业务',
      dictType: undefined,
      pageNum: 2,
      pageSize: 20,
      status: undefined
    })
  })

  it('builds create and update payloads while preserving a Long string ID', () => {
    const values = {
      dictName: ' 风险类别 ',
      dictType: ' risk_type ',
      remark: ' 风险等级 ',
      status: '1' as const
    }

    expect(buildDictTypeCreateParams(values)).toEqual({
      dictName: '风险类别',
      dictType: 'risk_type',
      remark: '风险等级',
      status: '1'
    })
    expect(buildDictTypeUpdateParams(record, values).dictId).toBe('9007199254740993')
    expect(dictTypeToFormValues(record)).toEqual({
      dictName: '业务类别',
      dictType: 'semantic_biz_type',
      remark: '语义业务分类',
      status: '0'
    })
  })

  it('validates the backend dictionary type naming rule', () => {
    expect(DICT_TYPE_PATTERN.test('semantic_biz_type')).toBe(true)
    expect(DICT_TYPE_PATTERN.test('a1')).toBe(true)
    expect(DICT_TYPE_PATTERN.test('1semantic')).toBe(false)
    expect(DICT_TYPE_PATTERN.test('Semantic_Type')).toBe(false)
    expect(DICT_TYPE_PATTERN.test('semantic-type')).toBe(false)
  })

  it('adapts type rows and total without coercing Long IDs', () => {
    const result = {
      data: [{ ...record }],
      error: null,
      response: { data: { code: 200, rows: [{ ...record }], total: 18 } }
    }

    expect(adaptDictTypePage(result)).toEqual({ records: [record], total: 18 })
  })

  it('adapts optionselect arrays and drops records without a primary key', () => {
    expect(adaptDictTypeOptions({ data: [record, { dictName: 'invalid', dictType: 'invalid' }] })).toEqual([record])
  })

  it('prefers the backend failure message over a generic request message', () => {
    const error = {
      message: 'Request failed with status code 500',
      response: { data: { code: 500, msg: '业务类别已分配，不能删除' } }
    }

    expect(getRequestErrorMessage(error, '删除失败')).toBe('业务类别已分配，不能删除')
    expect(getRequestErrorMessage({}, '删除失败')).toBe('删除失败')
  })
})
