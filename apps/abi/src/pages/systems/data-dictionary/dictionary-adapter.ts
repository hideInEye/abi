import type {
  DictDataApiRecord,
  DictDataCode,
  DictDataPage,
  DictTypeApiRecord,
  DictTypeId,
  DictTypePage,
  SysDictData,
  SysDictType
} from './types'

type UnknownRecord = Record<string, unknown>

const WRAPPER_KEYS = ['data', 'page', 'response', 'result'] as const
const ROW_KEYS = ['records', 'rows', 'list'] as const

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toText(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

function toFiniteNumber(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null
  const numberValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

function normalizeCode(value: unknown): DictDataCode | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) return value
  return null
}

function normalizeTypeId(value: unknown): DictTypeId | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) return value
  return null
}

function findRows(value: unknown, depth = 0): unknown[] | null {
  if (depth > 5) return null
  if (Array.isArray(value)) return value
  if (!isRecord(value)) return null

  for (const key of ROW_KEYS) {
    if (Array.isArray(value[key])) return value[key] as unknown[]
  }
  for (const key of WRAPPER_KEYS) {
    const rows = findRows(value[key], depth + 1)
    if (rows) return rows
  }
  return null
}

function findTotal(value: unknown, depth = 0): number | null {
  if (depth > 5 || !isRecord(value)) return null
  for (const key of ['total', 'totalCount', 'count']) {
    if (Object.hasOwn(value, key)) {
      const total = toFiniteNumber(value[key])
      if (total !== null && total >= 0) return total
    }
  }
  for (const key of WRAPPER_KEYS) {
    const total = findTotal(value[key], depth + 1)
    if (total !== null) return total
  }
  return null
}

function findRecord(value: unknown, depth = 0): DictDataApiRecord | null {
  if (depth > 5 || !isRecord(value)) return null
  if (Object.hasOwn(value, 'dictCode')) return value as DictDataApiRecord
  for (const key of WRAPPER_KEYS) {
    const record = findRecord(value[key], depth + 1)
    if (record) return record
  }
  return null
}

export function mapDictDataRecord(record: DictDataApiRecord): SysDictData | null {
  const dictCode = normalizeCode(record.dictCode)
  if (dictCode === null) return null

  return {
    createBy: toText(record.createBy),
    createTime: toText(record.createTime),
    cssClass: toText(record.cssClass),
    dictCode,
    dictLabel: toText(record.dictLabel),
    dictSort: toFiniteNumber(record.dictSort),
    dictType: toText(record.dictType),
    dictValue: toText(record.dictValue),
    isDefault: record.isDefault === 'Y' ? 'Y' : 'N',
    listClass: toText(record.listClass),
    remark: toText(record.remark),
    status: record.status === '1' ? '1' : '0',
    updateBy: toText(record.updateBy),
    updateTime: toText(record.updateTime)
  }
}

export function adaptDictDataPage(result: unknown): DictDataPage {
  const rows = findRows(result) ?? []
  const records = rows
    .filter(isRecord)
    .map(row => mapDictDataRecord(row as DictDataApiRecord))
    .filter((record): record is SysDictData => record !== null)

  return { records, total: findTotal(result) ?? records.length }
}

export function adaptDictDataDetail(result: unknown): SysDictData | null {
  const record = findRecord(result)
  return record ? mapDictDataRecord(record) : null
}

export function adaptDictDataTypeList(result: unknown): SysDictData[] {
  return (findRows(result) ?? [])
    .filter(isRecord)
    .map(row => mapDictDataRecord(row as DictDataApiRecord))
    .filter((record): record is SysDictData => record !== null)
    .sort((left, right) => (left.dictSort ?? Number.MAX_SAFE_INTEGER) - (right.dictSort ?? Number.MAX_SAFE_INTEGER))
}

export function mapDictTypeRecord(record: DictTypeApiRecord): SysDictType | null {
  const dictId = normalizeTypeId(record.dictId)
  if (dictId === null) return null

  return {
    createBy: toText(record.createBy),
    createTime: toText(record.createTime),
    dictId,
    dictName: toText(record.dictName),
    dictType: toText(record.dictType),
    remark: toText(record.remark),
    status: record.status === '1' ? '1' : '0',
    updateBy: toText(record.updateBy),
    updateTime: toText(record.updateTime)
  }
}

export function adaptDictTypePage(result: unknown): DictTypePage {
  const rows = findRows(result) ?? []
  const records = rows
    .filter(isRecord)
    .map(row => mapDictTypeRecord(row as DictTypeApiRecord))
    .filter((record): record is SysDictType => record !== null)

  return { records, total: findTotal(result) ?? records.length }
}

export function adaptDictTypeOptions(result: unknown): SysDictType[] {
  return (findRows(result) ?? [])
    .filter(isRecord)
    .map(row => mapDictTypeRecord(row as DictTypeApiRecord))
    .filter((record): record is SysDictType => record !== null)
}
