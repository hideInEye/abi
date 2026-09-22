import { useCallback, useEffect, useRef, useState } from 'react'

import {
  createDictType,
  deleteDictType,
  queryDictTypeList,
  refreshDictTypeCache,
  updateDictType
} from '@/service/api/dictionary'
import { assertFlatRequestSuccess } from '@/service/request/flat-result'

import { adaptDictTypePage } from '../dictionary-adapter'
import { buildDictTypeCreateParams, buildDictTypeListParams, buildDictTypeUpdateParams } from '../dictionary-model'
import type { DictTypeFilters, DictTypeFormValues, DictTypeId, SysDictType } from '../types'

interface UseDictTypeManagementParams {
  filters: DictTypeFilters
  pageNum: number
  pageSize: number
}

interface UseDictTypeManagementResult {
  createItem: (values: DictTypeFormValues) => Promise<void>
  deleteItems: (dictIds: DictTypeId[]) => Promise<void>
  error: boolean
  loading: boolean
  records: SysDictType[]
  refresh: () => Promise<boolean>
  refreshCache: () => Promise<void>
  total: number
  updateItem: (record: SysDictType, values: DictTypeFormValues) => Promise<void>
}

export function useDictTypeManagement({
  filters,
  pageNum,
  pageSize
}: UseDictTypeManagementParams): UseDictTypeManagementResult {
  const [records, setRecords] = useState<SysDictType[]>([])
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
      const result = await queryDictTypeList(buildDictTypeListParams(filters, pageNum, pageSize))
      assertFlatRequestSuccess(result)
      if (requestId !== requestSequence.current) return false

      const page = adaptDictTypePage(result)
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

  const createItem = useCallback(async (values: DictTypeFormValues): Promise<void> => {
    const result = await createDictType(buildDictTypeCreateParams(values))
    assertFlatRequestSuccess(result)
  }, [])

  const updateItem = useCallback(async (record: SysDictType, values: DictTypeFormValues): Promise<void> => {
    const result = await updateDictType(buildDictTypeUpdateParams(record, values))
    assertFlatRequestSuccess(result)
  }, [])

  const deleteItems = useCallback(async (dictIds: DictTypeId[]): Promise<void> => {
    const result = await deleteDictType(dictIds)
    assertFlatRequestSuccess(result)
  }, [])

  const refreshCache = useCallback(async (): Promise<void> => {
    const result = await refreshDictTypeCache()
    assertFlatRequestSuccess(result)
  }, [])

  return {
    createItem,
    deleteItems,
    error,
    loading,
    records,
    refresh,
    refreshCache,
    total,
    updateItem
  }
}
