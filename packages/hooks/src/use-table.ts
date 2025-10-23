import { useEffect, useRef, useState } from 'react'

import useBoolean from './use-boolean'
import useLoading from './use-loading'

export type MaybePromise<T> = T | Promise<T>

export type ApiFn = (args: any) => Promise<unknown>

export type TableColumnCheck = {
  checked: boolean
  key: string
  title: string
}

export type TableDataWithIndex<T> = T & { index: number }

export type TransformedData<T> = {
  data: TableDataWithIndex<T>[]
  pageNum: number
  pageSize: number
  total: number
}

export type Transformer<T, Response> = (response: Response) => TransformedData<T>

export type TableConfig<A extends ApiFn, T, C> = {
  /** api function to get table data */
  apiFn: A
  /** api params */
  apiParams?: Parameters<A>[0]
  /** columns factory */
  columns: () => C[]
  /**
   * get column checks
   *
   * @param columns
   */
  getColumnChecks: (columns: C[]) => TableColumnCheck[]
  /**
   * get columns
   *
   * @param columns
   */
  getColumns: (columns: C[], checks: TableColumnCheck[]) => C[]
  /**
   * whether to get data immediately
   *
   * @default true
   */
  immediate?: boolean
  /**
   * callback when response fetched
   *
   * @param transformed transformed data
   */
  onFetched?: (transformed: TransformedData<T>) => MaybePromise<void>
  /** transform api response to table data */
  transformer: Transformer<T, Awaited<ReturnType<A>>>
}

export default function useHookTable<A extends ApiFn, T, C>(config: TableConfig<A, T, C>) {
  const { apiFn, apiParams, getColumnChecks, getColumns, immediate = true, transformer } = config

  const { endLoading, loading, startLoading } = useLoading()

  const { bool: empty, setBool: setEmpty } = useBoolean()

  const searchParams = useRef<any>(apiParams || { pageNum: 1, pageSize: 10 })

  const allColumns: C[] = config.columns()

  const [data, setData] = useState<TableDataWithIndex<T>[]>([])

  const [columnChecks, setColumnChecks] = useState<TableColumnCheck[]>(getColumnChecks(allColumns))

  const columns = getColumns(allColumns, columnChecks)

  const defaultTransformer = (res: any): any => {
    const { data: records = [], total: totalNum = 0 } = res.data || {}
    let resRecords = records
    if (records.items) {
      resRecords = records.items
    }
    const pageNum = searchParams.current.pageNum || searchParams.current.page || 1
    const pageSize = searchParams.current.pageSize || searchParams.current.page_size || 10
    const recordsWithIndex = resRecords.map((item: any, index: number) => {
      return {
        ...item,
        index: (pageNum - 1) * pageSize + index + 1,
      }
    })

    return {
      data: recordsWithIndex,
      pageNum: searchParams.current.pageNum,
      pageSize: searchParams.current.pageSize,
      total: totalNum || records.total_count,
    }
  }

  const finalTransformer = transformer || defaultTransformer

  async function getData() {
    startLoading()

    const formattedParams = formatSearchParams(searchParams.current)

    const response = await apiFn(formattedParams)

    const transformed = finalTransformer(response as Awaited<ReturnType<A>>)

    setData(transformed.data)

    setEmpty(transformed.data.length === 0)

    await config.onFetched?.(transformed)

    endLoading()
  }

  /**
   * update search params
   *
   * @param params
   */
  function updateSearchParams(params: Partial<Parameters<A>[0]> | { current?: number }) {
    Object.assign(searchParams.current, params)
    getData()
  }

  /** reset search params */
  function resetSearchParams() {
    Object.assign(searchParams.current, apiParams)
    getData()
  }

  useEffect(() => {
    if (immediate) getData()
  }, [])

  return {
    columnChecks,
    columns,
    data,
    empty,
    getData,
    loading,
    resetSearchParams,
    searchParams,
    setColumnChecks,
    updateSearchParams,
  }
}

function formatSearchParams(params: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(params).filter(([_, value]) => value !== null && value !== undefined))
}
