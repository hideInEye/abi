import { useCallback, useEffect, useRef, useState } from 'react'

import {
  createDictData,
  deleteDictData,
  getDictDataDetail,
  queryDictDataList,
  queryDictionaryDataByType,
  updateDictData
} from '@/service/api/dictionary'
import { assertFlatRequestSuccess } from '@/service/request/flat-result'

import { adaptDictDataDetail, adaptDictDataPage, adaptDictDataTypeList } from '../dictionary-adapter'
import { buildDictDataCreateParams, buildDictDataListParams, buildDictDataUpdateParams } from '../dictionary-model'
import type { DictDataCode, DictDataFilters, DictDataFormValues, SysDictData } from '../types'

interface UseDictDataManagementParams {
  filters: DictDataFilters
  pageNum: number
  pageSize: number
}

interface UseDictDataManagementResult {
  createItem: (values: DictDataFormValues) => Promise<void>
  deleteItems: (dictCodes: DictDataCode[]) => Promise<void>
  error: boolean
  fetchDetail: (dictCode: DictDataCode) => Promise<SysDictData>
  fetchTypeItems: (dictType: string) => Promise<SysDictData[]>
  loading: boolean
  records: SysDictData[]
  refresh: () => Promise<boolean>
  total: number
  updateItem: (record: SysDictData, values: DictDataFormValues) => Promise<void>
}

export function useDictDataManagement({
  filters,
  pageNum,
  pageSize
}: UseDictDataManagementParams): UseDictDataManagementResult {
  const [records, setRecords] = useState<SysDictData[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const requestSequence = useRef(0)

  const refresh = useCallback(async (): Promise<boolean> => {
    requestSequence.current += 1
    const requestId = requestSequence.current
    setLoading(true)
    setError(false)

    try {
      const result = await queryDictDataList(buildDictDataListParams(filters, pageNum, pageSize))
      assertFlatRequestSuccess(result)
      if (requestId !== requestSequence.current) return false

      const page = adaptDictDataPage(result)
      setRecords(page.records)
      setTotal(page.total)
      return true
    } catch {
      if (requestId === requestSequence.current) setError(true)
      return false
    } finally {
      if (requestId === requestSequence.current) setLoading(false)
    }
  }, [filters, pageNum, pageSize])

  useEffect(() => {
    refresh().catch(() => undefined)
    return () => {
      requestSequence.current += 1
    }
  }, [refresh])

  const fetchDetail = useCallback(async (dictCode: DictDataCode): Promise<SysDictData> => {
    const result = await getDictDataDetail(dictCode)
    assertFlatRequestSuccess(result)
    const detail = adaptDictDataDetail(result)
    if (!detail) throw new Error('字典详情不存在或数据格式异常')
    return detail
  }, [])

  const fetchTypeItems = useCallback(async (dictType: string): Promise<SysDictData[]> => {
    const result = await queryDictionaryDataByType(dictType)
    assertFlatRequestSuccess(result)
    return adaptDictDataTypeList(result)
  }, [])

  const createItem = useCallback(async (values: DictDataFormValues): Promise<void> => {
    const result = await createDictData(buildDictDataCreateParams(values))
    assertFlatRequestSuccess(result)
  }, [])

  const updateItem = useCallback(async (record: SysDictData, values: DictDataFormValues): Promise<void> => {
    const result = await updateDictData(buildDictDataUpdateParams(record, values))
    assertFlatRequestSuccess(result)
  }, [])

  const deleteItems = useCallback(async (dictCodes: DictDataCode[]): Promise<void> => {
    const result = await deleteDictData(dictCodes)
    assertFlatRequestSuccess(result)
  }, [])

  return {
    createItem,
    deleteItems,
    error,
    fetchDetail,
    fetchTypeItems,
    loading,
    records,
    refresh,
    total,
    updateItem
  }
}
