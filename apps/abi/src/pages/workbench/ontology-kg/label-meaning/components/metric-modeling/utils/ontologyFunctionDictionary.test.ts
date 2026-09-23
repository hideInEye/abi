import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryDictDataList } from '@/service/api/dictionary'

import {
  ONTOLOGY_FUNCTION_DICTIONARY_TYPES,
  adaptOntologyAggregationMethodOptions,
  adaptOntologyFunctionOptions,
  buildOntologyFunctionSnippet,
  loadOntologyFunctionOptions
} from './ontologyFunctionDictionary'

vi.mock('@/service/api/dictionary', () => ({ queryDictDataList: vi.fn() }))

const queryDictDataListMock = vi.mocked(queryDictDataList)

describe('ontology function dictionaries', () => {
  beforeEach(() => {
    queryDictDataListMock.mockReset()
  })

  it('merges dictionary groups in requested order and filters disabled or duplicated values', () => {
    const options = adaptOntologyFunctionOptions(
      [
        {
          data: {
            rows: [
              { dictCode: 2, dictLabel: '向上取整', dictSort: 20, dictType: 'ontology_fun', dictValue: 'CEIL' },
              { dictCode: 1, dictLabel: '绝对值', dictSort: 10, dictType: 'ontology_fun', dictValue: 'ABS' },
              {
                dictCode: 3,
                dictLabel: '停用函数',
                dictSort: 30,
                dictType: 'ontology_fun',
                dictValue: 'STOP',
                status: '1'
              }
            ]
          },
          error: null
        },
        {
          data: {
            rows: [
              { dictCode: 4, dictLabel: '重复绝对值', dictSort: 1, dictType: 'ontology_atomic', dictValue: 'abs' },
              { dictCode: 5, dictLabel: '求和', dictSort: 2, dictType: 'ontology_atomic', dictValue: 'SUM' }
            ]
          },
          error: null
        }
      ],
      ONTOLOGY_FUNCTION_DICTIONARY_TYPES.atomic
    )

    expect(options.map(item => item.label)).toEqual(['绝对值', '向上取整', '求和'])
  })

  it('builds field expressions directly from configured dictionary templates', () => {
    expect(
      buildOntologyFunctionSnippet(
        { dictType: 'ontology_fun', id: '1', label: '去重', value: 'DISTINCT (X)' },
        'coupon_type'
      )
    ).toBe('DISTINCT (coupon_type)')
    expect(
      buildOntologyFunctionSnippet(
        { dictType: 'ontology_fun', id: '2', label: '自定义', value: 'COALESCE({field}, 0)' },
        'amount'
      )
    ).toBe('COALESCE(amount, 0)')
    expect(
      buildOntologyFunctionSnippet({ dictType: 'ontology_atomic', id: '3', label: '求和', value: 'SUM' }, 'amount')
    ).toBe('SUM')
  })

  it('does not let a legacy label override the configured dictionary value', () => {
    expect(
      buildOntologyFunctionSnippet(
        { dictType: 'ontology_fun', id: '4', label: '去重', value: 'CUSTOM(X)' },
        'coupon_type'
      )
    ).toBe('CUSTOM(coupon_type)')
  })

  it('uses the exact dictionary value for aggregation options', () => {
    expect(
      adaptOntologyAggregationMethodOptions([
        { dictType: 'ontology_atomic', id: '1', label: '求和', value: 'SUM(X)' },
        { dictType: 'ontology_atomic', id: '2', label: '去重', value: 'DISTINCT (X)' }
      ])
    ).toEqual([
      { label: '求和（SUM(X)）', shortLabel: '求和', value: 'SUM(X)' },
      { label: '去重（DISTINCT (X)）', shortLabel: '去重', value: 'DISTINCT (X)' }
    ])
  })

  it('awaits both list requests and only returns options after both responses succeed', async () => {
    queryDictDataListMock
      .mockResolvedValueOnce({ data: { rows: [{ dictCode: 1, dictLabel: '绝对值', dictValue: 'ABS' }] }, error: null })
      .mockResolvedValueOnce({ data: { rows: [{ dictCode: 2, dictLabel: '求和', dictValue: 'SUM' }] }, error: null })

    await expect(loadOntologyFunctionOptions(ONTOLOGY_FUNCTION_DICTIONARY_TYPES.atomic)).resolves.toMatchObject([
      { label: '绝对值', value: 'ABS' },
      { label: '求和', value: 'SUM' }
    ])
    expect(queryDictDataListMock).toHaveBeenNthCalledWith(1, {
      dictType: 'ontology_fun',
      pageNum: 1,
      pageSize: 1000
    })
    expect(queryDictDataListMock).toHaveBeenNthCalledWith(2, {
      dictType: 'ontology_atomic',
      pageNum: 1,
      pageSize: 1000
    })
  })

  it('rejects the combined result when any dictionary request fails', async () => {
    const failure = new Error('dictionary failed')
    queryDictDataListMock
      .mockResolvedValueOnce({ data: { rows: [] }, error: null })
      .mockResolvedValueOnce({ data: null, error: failure })

    await expect(loadOntologyFunctionOptions(ONTOLOGY_FUNCTION_DICTIONARY_TYPES.derivative)).rejects.toBe(failure)
  })
})
