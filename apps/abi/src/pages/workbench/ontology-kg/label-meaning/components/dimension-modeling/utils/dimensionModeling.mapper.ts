import { isFlatRequestSuccess } from '../../../../../../../service/request/flat-result'

import { DEFAULT_DIMENSION_TIME_FORMAT, DIMENSION_TIME_GRANULARITY_OPTIONS } from '../constants/dimensionModeling.constants'
import type {
  DimensionBatchCreatePayloadItem,
  DimensionBatchMappingRow,
  DimensionFieldOption,
  DimensionFormValues,
  DimensionModelItem,
  DimensionRelatedMetric,
  DimensionSchemaInfo,
  DimensionType
} from '../types/dimensionModeling.types'
import {
  buildMappedBizName,
  buildMappedTechName,
  getMappedBizNameDisplay,
  getMappedBizNameParts,
  getMappedTechNameDisplay,
  getMappedTechNameParts,
  restoreMappedBizName,
  restoreMappedTechName
} from '../../../utils/ontologyName'

const MODEL_DETAIL_KEYS = new Set(['dimensions', 'identifiers'])
const VALID_TIME_GRANULARITY_VALUES = new Set(DIMENSION_TIME_GRANULARITY_OPTIONS.map(item => item.value))
const TIME_GRANULARITY_ALIAS_MAP: Record<string, string> = {
  date: 'day',
  daily: 'day',
  day: 'day',
  halfYear: 'half_year',
  half_year: 'half_year',
  halfyear: 'half_year',
  hourly: 'hour',
  hour: 'hour',
  month: 'month',
  quarter: 'quarter',
  week: 'week',
  year: 'year',
  year_month: 'month',
  year_month_day: 'day',
  year_quarter: 'quarter',
  year_week: 'week'
}

function parseJson(value: any) {
  if (!value) {
    return null
  }
  if (typeof value === 'object') {
    return value
  }
  if (typeof value !== 'string') {
    return null
  }
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function trim(value: any) {
  return typeof value === 'string' ? value.trim() : value
}

function toNumber(value: any) {
  if (value === '' || value === null || value === undefined) {
    return undefined
  }
  const num = Number(value)
  return Number.isNaN(num) ? undefined : num
}

function toPositiveNumber(value: unknown) {
  if (typeof value !== 'number' && typeof value !== 'string') {
    return undefined
  }
  const text = String(value).trim()
  if (!text) {
    return undefined
  }
  const number = Number(text)
  return Number.isFinite(number) && number > 0 ? number : undefined
}

export function getSubmittedDimensionId(res: any, existingId?: number) {
  const data = res?.data
  const responseData = res?.response?.data
  const candidates = [
    existingId,
    data?.dimId,
    data?.id,
    data?.dimensionId,
    data?.data?.dimId,
    data?.data?.id,
    data?.data?.dimensionId,
    data?.data,
    data,
    responseData?.data?.dimId,
    responseData?.data?.id,
    responseData?.data?.dimensionId,
    responseData?.data,
    responseData?.dimId,
    responseData?.id,
    responseData?.dimensionId,
  ]

  return candidates.map(toPositiveNumber).find(id => id !== undefined)
}

export function findSubmittedDimensionId(rows: any[], submitted: { bizName?: unknown; techName?: unknown }) {
  const bizName = String(submitted.bizName ?? '').trim()
  const techName = String(submitted.techName ?? '').trim()
  const matched = rows.find((row) => {
    const item = mapDimensionFromApi(row)
    return (!bizName || item.rawZhName === bizName) && (!techName || item.rawEnglishName === techName)
  })

  return matched ? getSubmittedDimensionId({ data: matched }) : undefined
}

function normalizeType(value: any): DimensionType {
  const text = String(value || '')
    .trim()
    .toLowerCase()
  if (text === 'time' || text === '时间维') {
    return 'time'
  }
  return 'std'
}

function normalizeStatus(value: any) {
  if (value === '' || value === null || value === undefined) {
    return 1
  }
  const text = String(value).trim()
  if (text === '启用' || text === '1') {
    return 1
  }
  if (text === '禁用' || text === '0') {
    return 0
  }
  const num = Number(text)
  return Number.isNaN(num) ? 1 : num
}

function parseRelatedFields(value: any): DimensionFieldOption[] {
  if (Array.isArray(value)) {
    return value
      .filter(item => item && (item.techId || item.tfieldId || item.key))
      .map(item => ({
        bizName: trim(item.bizName || item.alias || item.fieldName) || trim(item.techId || item.tfieldId) || '',
        fieldName: trim(item.fieldName || item.originName || item.name || item.techName),
        fieldType: trim(item.fieldType || item.type),
        key: trim(item.key || item.techId || item.tfieldId) || '',
        originName: trim(item.originName || item.name || item.fieldName || item.techName),
        relViewId: trim(item.relViewId),
        rtableName: trim(item.rtableName),
        sourceId: trim(item.sourceId),
        sourceTableName: trim(item.sourceTableName || item.tableBizName || item.tableName || item.rtableName || item.tableRemarks),
        tableName: trim(item.tableName),
        tableRemarks: trim(item.tableRemarks),
        tdesc: trim(item.tdesc),
        techId: trim(item.techId || item.tfieldId || item.key) || '',
        techName: trim(item.techName),
        tfieldName: trim(item.tfieldName),
        timeFormat: trim(item.timeFormat || item.format || item.dateFormat)
      }))
  }

  const parsed = parseJson(value)
  if (Array.isArray(parsed)) {
    return parseRelatedFields(parsed)
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
      .map(key => ({
        bizName: key,
        key,
        originName: key,
        techId: key
      }))
  }

  return []
}

function parseRelatedMetrics(value: any): DimensionRelatedMetric[] {
  const parsed = parseJson(value) || value
  if (!Array.isArray(parsed)) {
    return []
  }

  return parsed
    .filter(item => item && (item.name || item.bizName || item.indicatorName || item.indName))
    .map(item => ({
      groupName: trim(pickFirst(item, ['groupName', 'indicatorCategory', 'categoryName', 'category'])),
      id: pickFirst(item, ['id', 'indId', 'indicatorId']),
      name: trim(pickFirst(item, ['name', 'bizName', 'indicatorName', 'indName'])) || '',
      refType: trim(pickFirst(item, ['refType', 'referenceType', 'relateType', 'bindType'])),
      updateTime: trim(pickFirst(item, ['updateTime', 'lastUpdateTime', 'modifyTime']))
    }))
}

function getByPath(source: any, path: string) {
  if (!path) {
    return source
  }
  return path.split('.').reduce((acc: any, key) => acc?.[key], source)
}

function getFirstArray(source: any, paths: string[]) {
  const found = paths.map(path => getByPath(source, path)).find(item => Array.isArray(item))
  return Array.isArray(found) ? found : []
}

function pickFirst(source: any, keys: string[], fallback?: any) {
  const hit = keys
    .map(key => getByPath(source, key))
    .find(value => value !== undefined && value !== null && value !== '')
  return hit ?? fallback
}

function normalizeTimeGranularity(value: any) {
  const rawList = Array.isArray(value) ? value : String(value || '').split(',')
  const valueSet = new Set(
    rawList
      .map((item: any) => String(item).trim())
      .filter(Boolean)
      .map(item => TIME_GRANULARITY_ALIAS_MAP[item] || item)
      .filter(item => VALID_TIME_GRANULARITY_VALUES.has(item))
  )

  if (!valueSet.size) {
    return []
  }
  return DIMENSION_TIME_GRANULARITY_OPTIONS.map(item => item.value).filter(item => valueSet.has(item))
}

function normalizeSampleValues(value: any) {
  if (Array.isArray(value)) {
    return value.join(',')
  }
  if (typeof value === 'string') {
    return value
  }
  return ''
}

function isTimeFieldType(fieldType: any) {
  const value = String(fieldType || '')
    .trim()
    .toLowerCase()
  if (!value) {
    return false
  }
  return (
    value.includes('datetime') ||
    value.includes('timestamp') ||
    value.includes('date') ||
    value.includes('time') ||
    value.includes('日期') ||
    value.includes('时间')
  )
}

function isDatetimeDimensionType(value: any) {
  return String(value || '').trim().toLowerCase() === 'datetime'
}

function getSchemaName(schema: DimensionSchemaInfo) {
  return trim(pickFirst(schema, ['rtableName', 'bizName', 'techName', 'schemaName', 'name'])) || '-'
}

function getSchemaTechName(schema: DimensionSchemaInfo, fallback?: string) {
  return trim(pickFirst(schema, ['tableName', 'techName', 'originName', 'schemaName', 'name'], fallback)) || fallback || '-'
}

function getSchemaId(schema: DimensionSchemaInfo) {
  return pickFirst(schema, ['schemaId', 'id', 'semanticSchemaId'])
}

function getFieldKey(item: any) {
  return String(pickFirst(item, ['techId', 'tfieldId', 'fieldName', 'originName'], '') || '').trim()
}

export function getDimensionFieldLookupKeys(field: Partial<DimensionFieldOption>) {
  const valueKeys = [
    field.key,
    field.fieldName,
    field.techId,
    field.originName,
    field.tfieldName,
    field.techName,
    field.bizName
  ]
    .map(item => String(item || '').trim())
    .filter(Boolean)
  const sourceKeys = [
    field.sourceTableName,
    field.tableName,
    field.tableRemarks,
    field.rtableName,
    field.tdesc,
    field.sourceId
  ]
    .map(item => String(item || '').trim())
    .filter(Boolean)

  return Array.from(
    new Set(
      [
        ...valueKeys,
        ...sourceKeys.flatMap(source => valueKeys.map(value => `${source}::${value}`))
      ]
    )
  )
}

function buildDimensionFieldOptionKeyMap(fields: DimensionFieldOption[]) {
  const keyMap = new Map<string, string>()
  fields.forEach(field => {
    const canonicalKey = String(field.key || '').trim()
    if (!canonicalKey) {
      return
    }
    getDimensionFieldLookupKeys(field).forEach(key => {
      if (!keyMap.has(key)) {
        keyMap.set(key, canonicalKey)
      }
    })
  })
  return keyMap
}

export function normalizeDimensionFieldSelectionKeys(selectedKeys: string[], fields: DimensionFieldOption[]) {
  const keyMap = buildDimensionFieldOptionKeyMap(fields)

  return Array.from(
    new Set(
      selectedKeys
        .map(key => String(key || '').trim())
        .filter(Boolean)
        .map(key => keyMap.get(key) || key)
    )
  )
}

export function normalizeDimensionSelectedFieldsToOptionKeys(selectedFields: DimensionFieldOption[], optionFields: DimensionFieldOption[], fallbackKeys: string[] = []) {
  if (!selectedFields.length) {
    return normalizeDimensionFieldSelectionKeys(fallbackKeys, optionFields)
  }

  const keyMap = buildDimensionFieldOptionKeyMap(optionFields)
  return Array.from(
    new Set(
      selectedFields
        .map((field, index) => {
          const matchedKey = getDimensionFieldLookupKeys(field)
            .map(key => keyMap.get(key))
            .find(Boolean)
          return matchedKey || String(fallbackKeys[index] || field.key || '').trim()
        })
        .filter(Boolean)
    )
  )
}

export function normalizeRows(res: any): any[] {
  return getFirstArray(res, [
    '',
    'rows',
    'list',
    'data.rows',
    'data.list',
    'data',
    'response.data.data.rows',
    'response.data.rows',
    'response.data.data'
  ])
}

export function normalizeDetail(res: any): any | null {
  const rows = normalizeRows(res)
  if (rows.length) {
    return rows[0]
  }

  const detail = pickFirst(res, ['data', 'detail', 'response.data.data', 'response.data.detail', 'response.data'])

  return detail && !Array.isArray(detail) && typeof detail === 'object' ? detail : null
}

export function mapDimensionFromApi(item: any): DimensionModelItem {
  const typeParams = parseJson(item.typeParams)
  const relFields = parseRelatedFields(
    pickFirst(item, ['relFields', 'relatedFields', 'relateFields', 'techId', 'techIds'])
  )
  const rawDimCategory = pickFirst(item, ['dimCategory', 'dimensionCategory'])
  const dimCategory = rawDimCategory === undefined || rawDimCategory === null ? undefined : String(rawDimCategory).trim()
  const dimType = normalizeType(pickFirst(item, ['dimType', 'dimensionType']))
  const drillDirection = trim(pickFirst(item, ['drillDirection', 'drillConfig.direction']))
  const rawEnglishName = trim(pickFirst(item, ['rawEnglishName', 'englishName', 'techName', 'dimCode', 'dimensionCode', 'dimTechName'])) || ''
  const englishName = getMappedTechNameDisplay(rawEnglishName)
  const id = Number(pickFirst(item, ['id', 'dimId', 'dimensionId'], 0))
  const owner = trim(pickFirst(item, ['owner', 'dimOwner', 'indicatorOwner'])) || ''
  const path = trim(pickFirst(item, ['path', 'groupPath', 'indicatorCategory'])) || ''
  const levelPath = trim(item.levelPath) || ''
  const semanticSchemaId = pickFirst(item, ['semanticSchemaId', 'relSchemaId'])
  const semanticsGroupId = pickFirst(item, ['semanticsGroupId', 'semanticGroupId'])
  const semanticSchemaName = trim(pickFirst(item, ['semanticSchemaName', 'relSchemaName']))
  const status = normalizeStatus(pickFirst(item, ['status', 'versionStatus']))
  const timeGranularity = normalizeTimeGranularity(item.timeGranularity || typeParams?.timeGranularity)
  const updateFreq = trim(pickFirst(item, ['updateFreq', 'updateFrequency']))
  const updateTime = trim(pickFirst(item, ['updateTime', 'createTime'])) || '-'
  const createBy = trim(item.createBy)
  const createTime = trim(pickFirst(item, ['createTime', 'updateTime'])) || '-'
  const viewId = toNumber(pickFirst(item, ['viewId', 'relViewId']))
  const rawZhName = trim(pickFirst(item, ['rawZhName', 'zhName', 'bizName', 'dimName', 'dimensionName', 'name'])) || ''
  const zhName = getMappedBizNameDisplay(rawZhName)
  const timeField = trim(item.timeField || typeParams?.timeField || relFields[0]?.techId)
  const timeFormat = trim(item.timeFormat || typeParams?.timeFormat)
  const fieldType = trim(pickFirst(item, ['fieldType', 'semanticType']))
  const relatedFields =
    dimType === 'time'
      ? relFields.map(field => ({
          ...field,
          timeFormat: trim(field.timeFormat) || timeFormat || DEFAULT_DIMENSION_TIME_FORMAT
        }))
      : relFields
        
  return {
    alias: trim(pickFirst(item, ['alias', 'dimAlias'])),
    bizDesc: trim(pickFirst(item, ['bizDesc', 'businessDefinition', 'remark'])),
    createBy,
    createTime,
    dimCategory,
    // 元数据节点使用后端主键原值，避免 Long 字符串经数值转换后丢失精度。
    dimId: pickFirst(item, ['dimId', 'dim_id', 'id', 'dimensionId']),
    dimType,
    drillDirection,
    englishName,
    groupId: item.groupId,
    groupName: trim(item.groupName),
    id,
    levelPath,
    modelDetail: trim(item.modelDetail),
    owner,
    ownerEmail: trim(item.ownerEmail),
    path,
    rawEnglishName,
    rawZhName,
    relatedFields,
    relatedMetrics: parseRelatedMetrics(
      pickFirst(item, ['relatedMetrics', 'relatedIndicators', 'indicatorRefs', 'indicators', 'dimensionIndicators'])
    ),
    sampleValues: normalizeSampleValues(item.sampleValues),
    semanticSchemaId,
    semanticSchemaName,
    semanticsGroupId,
    status,
    timeField,
    timeFormat,
    timeGranularity,
    updateFreq,
    updateTime,
    viewId,
    zhName,
    ...(fieldType === 'datetime' ? { dimType: 'time' } : {})
  }
}

export function buildFormValues(item: DimensionModelItem): DimensionFormValues {
  const mappedBizNameParts = getMappedBizNameParts(item.rawZhName || item.zhName)
  const mappedTechNameParts = getMappedTechNameParts(item.rawEnglishName || item.englishName)

  return {
    alias: item.alias || '',
    bizDesc: item.bizDesc || '',
    dimCategory: item.dimCategory === undefined || item.dimCategory === null ? undefined : String(item.dimCategory),
    dimCategoryName: item.dimCategory === undefined || item.dimCategory === null ? undefined : String(item.dimCategory),
    dimType: item.dimType || 'std',
    drillDirection: item.drillDirection || 'down',
    englishName: item.englishName || '',
    groupId: item.groupId,
    id: item.id,
    mappedBizNameTableName: mappedBizNameParts.isMapped ? mappedBizNameParts.tableName : undefined,
    mappedTechNameTableName: mappedTechNameParts.isMapped ? mappedTechNameParts.tableName : undefined,
    owner: item.owner || '',
    ownerEmail: item.ownerEmail || '',
    relatedFieldKeys: item.relatedFields.map(field => field.key),
    sampleValues: item.sampleValues || '',
    semanticGroupId: item.semanticsGroupId || item.semanticGroupId,
    semanticSchemaId: item.semanticSchemaId,
    semanticsGroupId: item.semanticsGroupId || item.semanticGroupId,
    status: item.status ?? 1,
    timeField: item.timeField || '',
    timeFormat: item.timeFormat || '',
    timeGranularity: item.timeGranularity?.length ? item.timeGranularity : ['day'],
    updateFreq: item.updateFreq || 'daily',
    zhName: item.zhName || ''
  }
}

export function getApiErrorMessage(res: any, fallback: string) {
  return res?.response?.data?.errMsg || res?.response?.data?.msg || fallback
}

export function isApiSuccess(res: any) {
  return isFlatRequestSuccess(res)
}

export function buildSubmitPayload(params: {
  formValues: DimensionFormValues
  id?: number
  relatedFields: DimensionFieldOption[]
  selectedGroupId?: number | string
  selectedSchema?: DimensionSchemaInfo
}) {
  const { formValues, id, relatedFields, selectedGroupId, selectedSchema } = params
  const sampleValues = String(formValues.sampleValues || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
  const semanticType = formValues.dimType === 'time' ? 'datetime' : 'categorical'
  const bizName = restoreMappedBizName(formValues.zhName, formValues.mappedBizNameTableName)
  const techName = restoreMappedTechName(formValues.englishName, formValues.mappedTechNameTableName)
  const typeParams =
    formValues.dimType === 'time'
      ? JSON.stringify({
          timeGranularity: formValues.timeGranularity || []
        })
      : undefined
  const fieldType = formValues.dimType === 'time' ? 'datetime' : 'varchar'
  const techIdList = relatedFields.map(item => item.techId).join(',')
  const relatedFieldObjects = relatedFields.map(item =>
    Object.fromEntries(
      Object.entries({
        bizName: trim(item.bizName),
        fieldName: trim(item.fieldName),
        fieldType: trim(item.fieldType),
        key: trim(item.techId || item.key),
        originName: trim(item.originName),
        sourceId: trim(item.sourceId),
        sourceTableName: trim(item.sourceTableName),
        techId: trim(item.techId),
        timeFormat: formValues.dimType === 'time' ? trim(item.timeFormat) || DEFAULT_DIMENSION_TIME_FORMAT : undefined
      }).filter(([, value]) => value !== undefined && value !== null)
    )
  )
  // const relatedFieldJson = JSON.stringify(relatedFieldObjects)
  const relatedFieldJson = relatedFieldObjects

  const payload = {
    bizName,
    cardinality: undefined,
    dimAlias: trim(formValues.alias),
    dimCategory: trim(formValues.dimCategoryName || formValues.dimCategory),
    dimId: id,
    dimLevel: 1,
    dimOwner: trim(formValues.owner),
    drillConfig: {
      drill_direction: trim(formValues.drillDirection) || 'down',
      granularity: formValues.dimType === 'time' ? (formValues.timeGranularity || []).slice(-1)[0] || 'day' : undefined
    },
    expr: techName || techIdList,
    fieldType,
    groupId: selectedGroupId || formValues.groupId,
    isLeaf: '1',
    levelPath: '1',
    ownerEmail: trim(formValues.ownerEmail),
    // parentDimId: 0,
    prevVersionId: undefined,
    relFields: relatedFieldJson,
    relSchemaId: toNumber(formValues.semanticSchemaId),
    relViewId: trim(selectedSchema?.relViewId || relatedFields[0]?.relViewId),
    remark: trim(formValues.bizDesc),
    sampleValues,
    semanticsGroupId: formValues.semanticsGroupId || formValues.semanticGroupId,
    semanticType,
    spaceId: Number(localStorage.getItem('spaceId')),
    status: String(formValues.status ?? 1),
    techId: relatedFieldJson,
    techIds: techIdList,
    techName,
    typeParams,
    updateFreq: trim(formValues.updateFreq),
    versionNo: 'v1.0',
    versionStatus: String(formValues.status ?? 1)
  } as Record<string, any>

  const compactPayload = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== '')
  )

  if (compactPayload.drillConfig && typeof compactPayload.drillConfig === 'object') {
    compactPayload.drillConfig = Object.fromEntries(
      Object.entries(compactPayload.drillConfig).filter(
        ([, value]) => value !== undefined && value !== null && value !== ''
      )
    )
  }

  return compactPayload
}

export function buildDimensionFieldPayload(
  field: DimensionFieldOption,
  options: { bizName?: string; techName?: string } = {}
): DimensionFieldOption {
  return Object.fromEntries(
    Object.entries({
      bizName: trim(options.bizName || field.bizName),
      fieldType: trim(field.fieldType),
      key: trim(field.techId || field.key),
      originName: trim(field.originName),
      sourceId: trim(field.sourceId),
      sourceTableName: trim(field.sourceTableName),
      techId: trim(field.techId),
      techName: trim(options.techName || field.techName)
    }).filter(([, value]) => value !== undefined && value !== null && value !== '')
  ) as DimensionFieldOption
}

export function buildSchemaFieldOptions(schema?: DimensionSchemaInfo): DimensionFieldOption[] {
  if (!schema?.modelDetail) {
    return []
  }
  try {
    const modelDetailObj = parseJson(schema.modelDetail)
    if (!modelDetailObj || typeof modelDetailObj !== 'object') {
      return []
    }
    const list: DimensionFieldOption[] = []
    Object.keys(modelDetailObj).forEach(rawKey => {
      const key = String(rawKey || '')
        .trim()
        .toLowerCase()
      if (!MODEL_DETAIL_KEYS.has(key)) {
        return
      }
      const items = Array.isArray(modelDetailObj[rawKey]) ? modelDetailObj[rawKey] : []
      items
        .filter((item: any) => item?.techId || item?.tfieldId)
        .forEach((item: any) => {
          const techId = String(item.techId || item.tfieldId || '')
          list.push({
            bizName: item.bizName || item.alias || techId,
            fieldName: item.fieldName || item.originName || item.name || item.techName || techId,
            fieldType: item.type || item.fieldType || item.semanticType,
            key: techId,
            originName: item.originName || item.name || item.fieldName || item.techName || techId,
            relViewId: schema.relViewId,
            rtableName: item.rtableName,
            sourceId: item.sourceId,
            sourceTableName: item.sourceTableName || item.tableBizName || item.tableName || item.rtableName || item.tableRemarks,
            tableName: item.tableName,
            tableRemarks: item.tableRemarks,
            tdesc: item.tdesc,
            techId,
            techName: item.techName,
            tfieldName: item.tfieldName,
            timeFormat: DEFAULT_DIMENSION_TIME_FORMAT
          })
        })
    })
    return list
  } catch {
    return []
  }
}

export function filterSelectableFields(allFields: DimensionFieldOption[], dimType: DimensionType) {
  if (dimType === 'time') {
    return allFields.filter(field => isTimeFieldType(field.fieldType))
  }
  return allFields.filter(field => !isTimeFieldType(field.fieldType))
}

export function buildDimensionBatchRows(schemas: DimensionSchemaInfo[], existingItems: DimensionModelItem[] = []): DimensionBatchMappingRow[] {
  const existingKeySet = new Set(
    existingItems.flatMap(item => [
      String(item.englishName || '').trim(),
      ...((item.relatedFields || []).flatMap(field => [
        String(field.fieldName || '').trim(),
        String(field.techId || '').trim(),
        String(field.key || '').trim()
      ]))
    ]).filter(Boolean)
  )
  const rowKeySet = new Set<string>()

  return schemas.flatMap((schema) => {
    const parsed = parseJson(schema.modelDetail)
    if (!parsed || typeof parsed !== 'object') {
      return []
    }
    const schemaId = getSchemaId(schema)
    if (!schemaId) {
      return []
    }
    const schemaName = getSchemaName(schema)
    const schemaTechName = getSchemaTechName(schema, schemaName)
    return Object.keys(parsed).flatMap((rawKey) => {
      const modelKey = String(rawKey || '').trim().toLowerCase()
      if (!MODEL_DETAIL_KEYS.has(modelKey)) {
        return []
      }
      const items = Array.isArray((parsed as Record<string, any>)[rawKey]) ? (parsed as Record<string, any[]>)[rawKey] : []
      return items.flatMap((item) => {
        const techId = getFieldKey(item)
        if (!techId) {
          return []
        }
        const fieldName = trim(pickFirst(item, ['fieldName', 'originName', 'techName'], techId)) || techId
        const rowKey = `${schemaId}-${fieldName}`
        if (rowKeySet.has(rowKey)) {
          return []
        }
        rowKeySet.add(rowKey)
        const rawType = trim(item.type)
        const fieldType = trim(pickFirst(item, ['type', 'fieldType', 'semanticType']))
        const dimType: DimensionType = isDatetimeDimensionType(rawType) ? 'time' : 'std'
        const field: DimensionFieldOption = {
          bizName: trim(pickFirst(item, ['bizName', 'alias', 'fieldName'], techId)) || techId,
          fieldName,
          fieldType,
          key: techId,
          originName: trim(pickFirst(item, ['originName', 'name', 'fieldName', 'techName'], techId)) || techId,
          relViewId: schema.relViewId,
          rtableName: trim(item.rtableName),
          sourceId: trim(item.sourceId || schema.sourceId),
          sourceTableName: trim(pickFirst(item, ['sourceTableName', 'tableBizName', 'tableName', 'rtableName', 'tableRemarks'], schemaName)),
          tableName: trim(item.tableName),
          tableRemarks: trim(item.tableRemarks),
          tdesc: trim(item.tdesc),
          techId,
          techName: trim(item.techName),
          tfieldName: trim(item.tfieldName),
          timeFormat: dimType === 'time' ? DEFAULT_DIMENSION_TIME_FORMAT : undefined
        }
        return [{
          disabled: existingKeySet.has(fieldName) || existingKeySet.has(techId),
          dimType,
          field,
          fieldType,
          key: rowKey,
          relSchemaId: schemaId,
          relViewId: schema.relViewId,
          semanticSchemaName: schemaName,
          semanticSchemaTechName: schemaTechName,
          semanticsGroupId: schema.groupId
        }]
      })
    })
  })
}

export function buildDimensionBatchCreatePayload(params: {
  rows: DimensionBatchMappingRow[]
  selectedGroupId?: number | string
  semanticsGroupId?: number | string
}): DimensionBatchCreatePayloadItem[] {
  const { rows, selectedGroupId, semanticsGroupId } = params
  const spaceId = Number(localStorage.getItem('spaceId')) || 0

  return rows
    .filter(row => !row.disabled)
    .map(row => {
      const tableBizName = row.field.rtableName || row.semanticSchemaName
      const tableTechName = row.field.tableName || row.semanticSchemaTechName || row.semanticSchemaName
      const fieldBizName = row.field.bizName || row.field.fieldName || row.field.techId
      const fieldTechName = row.field.techName || row.field.originName || row.field.fieldName || row.field.techId
      return {
        spaceId,
        techId: [
          buildDimensionFieldPayload(row.field, {
            bizName: buildMappedBizName(tableBizName, fieldBizName),
            techName: buildMappedTechName(tableTechName, fieldTechName)
          })
        ],
        semanticsGroupId: semanticsGroupId ?? row.semanticsGroupId,
        groupId: selectedGroupId,
        relSchemaId: row.relSchemaId,
        relViewId: row.relViewId
      }
    })
    .filter(item => item.techId.length)
}
