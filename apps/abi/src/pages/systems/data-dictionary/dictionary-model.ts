import type { TableColumnsType } from 'antd'

import type {
  DictDataCreateParams,
  DictDataFilters,
  DictDataFormValues,
  DictDataListParams,
  DictDataUpdateParams,
  DictTypeCreateParams,
  DictTypeFilters,
  DictTypeFormValues,
  DictTypeListParams,
  DictTypeUpdateParams,
  SysDictData,
  SysDictType
} from './types'

export const EMPTY_DICT_DATA_FILTERS: DictDataFilters = {
  dictLabel: '',
  dictType: '',
  status: ''
}

export const DEFAULT_DICT_DATA_FORM: DictDataFormValues = {
  cssClass: '',
  dictLabel: '',
  dictSort: null,
  dictType: '',
  dictValue: '',
  isDefault: 'N',
  listClass: '',
  remark: '',
  status: '0'
}

export const DICT_TYPE_PATTERN = /^[a-z][a-z0-9_]*$/

export const EMPTY_DICT_TYPE_FILTERS: DictTypeFilters = {
  dictName: '',
  dictType: '',
  status: ''
}

export const DEFAULT_DICT_TYPE_FORM: DictTypeFormValues = {
  dictName: '',
  dictType: '',
  remark: '',
  status: '0'
}

export const TABLE_SELECTION_COLUMN_WIDTH = 48

function trim(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function buildDictDataListParams(
  filters: DictDataFilters,
  pageNum: number,
  pageSize: number
): DictDataListParams {
  return {
    dictLabel: trim(filters.dictLabel) || undefined,
    dictType: trim(filters.dictType) || undefined,
    pageNum,
    pageSize,
    status: filters.status || undefined
  }
}

export function buildDictDataCreateParams(values: DictDataFormValues): DictDataCreateParams {
  const params: DictDataCreateParams = {
    cssClass: trim(values.cssClass),
    dictLabel: trim(values.dictLabel),
    dictType: trim(values.dictType),
    dictValue: trim(values.dictValue),
    isDefault: values.isDefault === 'Y' ? 'Y' : 'N',
    listClass: trim(values.listClass),
    remark: trim(values.remark),
    status: values.status === '1' ? '1' : '0'
  }

  if (typeof values.dictSort === 'number' && Number.isFinite(values.dictSort)) {
    params.dictSort = values.dictSort
  }

  return params
}

export function buildDictDataUpdateParams(record: SysDictData, values: DictDataFormValues): DictDataUpdateParams {
  return {
    ...buildDictDataCreateParams(values),
    dictCode: record.dictCode
  }
}

export function buildDictTypeListParams(
  filters: DictTypeFilters,
  pageNum: number,
  pageSize: number
): DictTypeListParams {
  return {
    dictName: trim(filters.dictName) || undefined,
    dictType: trim(filters.dictType) || undefined,
    pageNum,
    pageSize,
    status: filters.status || undefined
  }
}

export function buildDictTypeCreateParams(values: DictTypeFormValues): DictTypeCreateParams {
  return {
    dictName: trim(values.dictName),
    dictType: trim(values.dictType),
    remark: trim(values.remark),
    status: values.status === '1' ? '1' : '0'
  }
}

export function buildDictTypeUpdateParams(record: SysDictType, values: DictTypeFormValues): DictTypeUpdateParams {
  return {
    ...buildDictTypeCreateParams(values),
    dictId: record.dictId
  }
}

export function dictTypeToFormValues(record: SysDictType): DictTypeFormValues {
  return {
    dictName: record.dictName,
    dictType: record.dictType,
    remark: record.remark,
    status: record.status
  }
}

export function dictDataToFormValues(record: SysDictData): DictDataFormValues {
  return {
    cssClass: record.cssClass,
    dictLabel: record.dictLabel,
    dictSort: record.dictSort,
    dictType: record.dictType,
    dictValue: record.dictValue,
    isDefault: record.isDefault,
    listClass: record.listClass,
    remark: record.remark,
    status: record.status
  }
}

export function getLastPageAfterDelete(total: number, deletedCount: number, pageSize: number): number {
  return Math.max(1, Math.ceil(Math.max(0, total - deletedCount) / pageSize))
}

export function getDictTableScrollWidth<RecordType extends object>(columns: TableColumnsType<RecordType>): number {
  return columns.reduce(
    (total, column) => total + (typeof column.width === 'number' ? column.width : 0),
    TABLE_SELECTION_COLUMN_WIDTH
  )
}

export function getResponsiveOverlayWidths(isDesktop: boolean | undefined): {
  confirmWidth: string
  drawerWidth: string
} {
  return isDesktop ? { confirmWidth: '50%', drawerWidth: '50%' } : { confirmWidth: '90%', drawerWidth: '96%' }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readNonEmptyMessage(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function getRequestErrorMessage(error: unknown, fallbackMessage: string): string {
  if (!isRecord(error)) return readNonEmptyMessage(error) ?? fallbackMessage

  const response = isRecord(error.response) ? error.response : null
  const responseData = response && isRecord(response.data) ? response.data : null
  const candidates = [responseData?.msg, responseData?.message, error.msg, error.message]

  for (const candidate of candidates) {
    const message = readNonEmptyMessage(candidate)
    if (message) return message
  }

  return fallbackMessage
}
