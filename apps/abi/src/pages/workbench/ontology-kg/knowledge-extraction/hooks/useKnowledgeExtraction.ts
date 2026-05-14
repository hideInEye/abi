import { message } from 'antd'

import {
  addKnowledgeIndicator,
  deleteKnowledgeIndicator,
  editKnowledgeIndicator,
  queryKnowledgeIndicators
} from '@/service/api/knowledge-extraction'

import type { KnowledgeGroupItem, KnowledgeIndicatorItem, KnowledgeSearchParams } from '../types'

const INDICATOR_TYPE_TO_API_CLASS: Record<string, string> = {
  atomic: 'atomic',
  derived: '派生',
  extended: '衍生'
}

const API_CLASS_TO_INDICATOR_TYPE: Record<string, string> = {
  atomic: 'atomic',
  derived: 'derived',
  extended: 'extended',
  派生: 'derived',
  衍生: 'extended'
}

const UI_TO_API_FREQUENCY: Record<string, string> = {
  day: 'daily',
  hour: 'hourly',
  month: 'monthly',
  week: 'weekly'
}

const API_TO_UI_FREQUENCY: Record<string, string> = {
  daily: 'day',
  day: 'day',
  hour: 'hour',
  hourly: 'hour',
  month: 'month',
  monthly: 'month',
  week: 'week',
  weekly: 'week'
}

const UI_TO_API_QUALITY_LEVEL: Record<string, string> = {
  p0: 'P0-核心',
  p1: 'P1-重要',
  p2: 'P2-一般'
}

const API_TO_UI_QUALITY_LEVEL: Record<string, string> = {
  P0: 'p0',
  p0: 'p0',
  'P0-核心': 'p0',
  P1: 'p1',
  p1: 'p1',
  'P1-重要': 'p1',
  P2: 'p2',
  p2: 'p2',
  'P2-一般': 'p2'
}

const UI_TO_API_DATA_TYPE: Record<string, string> = {
  amount: 'decimal',
  number: 'decimal',
  percent: 'decimal',
  text: 'string'
}

const API_TO_UI_DATA_TYPE: Record<string, string> = {
  decimal: 'number',
  string: 'text',
  varchar: 'text'
}

const STATUS_TEXT_MAP: Record<string, number> = {
  archive: 0,
  draft: 2,
  published: 1,
  停用: 0,
  启用: 1,
  草稿: 2
}

const initialSearchParams: KnowledgeSearchParams = {
  keyword: '',
  status: undefined,
  type: ''
}

function asObject(value: any): Record<string, any> {
  if (!value) {
    return {}
  }
  if (typeof value === 'object') {
    return value as Record<string, any>
  }
  if (typeof value !== 'string') {
    return {}
  }
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

function trimOrUndefined(value: any) {
  if (typeof value !== 'string') {
    return value
  }
  const text = value.trim()
  return text || undefined
}

function normalizeRelateDimsFieldValue(value: any) {
  if (!value) {
    return undefined
  }
  if (Array.isArray(value)) {
    return JSON.stringify(value)
  }
  return trimOrUndefined(value)
}

function parseRelateDimsPayload(value: any) {
  if (!value) {
    return undefined
  }
  if (Array.isArray(value)) {
    return value
  }
  if (typeof value !== 'string') {
    return value
  }
  const text = value.trim()
  if (!text) {
    return undefined
  }
  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) {
      return parsed
    }
  } catch {
    return text
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
      .map(item => ({
        dimId: Number(item),
        techName: item
      }))
  }
  return undefined
}

function toNumberOrUndefined(value: any) {
  if (value === '' || value === null || value === undefined) {
    return undefined
  }
  const num = Number(value)
  return Number.isNaN(num) ? undefined : num
}

function normalizeIndicatorType(value: any) {
  const key = String(value || '').trim()
  return API_CLASS_TO_INDICATOR_TYPE[key] || key || 'atomic'
}

function normalizeFrequency(value: any) {
  const key = String(value || '').trim()
  return API_TO_UI_FREQUENCY[key] || key || 'day'
}

function normalizeQualityLevel(value: any) {
  const key = String(value || '').trim()
  return API_TO_UI_QUALITY_LEVEL[key] || key || 'p1'
}

function normalizeDataType(value: any) {
  const key = String(value || '').trim()
  return API_TO_UI_DATA_TYPE[key] || key || 'number'
}

function normalizeStatus(value: any) {
  if (value === '' || value === null || value === undefined) {
    return 2
  }
  const text = String(value).trim()
  if (text in STATUS_TEXT_MAP) {
    return STATUS_TEXT_MAP[text]
  }
  const num = Number(text)
  if (!Number.isNaN(num)) {
    return num
  }
  return 2
}

function toApiFrequency(value: any) {
  const key = String(value || '').trim()
  return UI_TO_API_FREQUENCY[key] || key || undefined
}

function toApiQualityLevel(value: any) {
  const key = String(value || '').trim()
  return UI_TO_API_QUALITY_LEVEL[key] || key || undefined
}

function toApiDataType(value: any) {
  const key = String(value || '').trim()
  return UI_TO_API_DATA_TYPE[key] || key || undefined
}

function compactPayload<T extends Record<string, any>>(payload: T): Partial<T> {
  const entries = Object.entries(payload).filter(([, value]) => value !== undefined && value !== null)
  return Object.fromEntries(entries) as Partial<T>
}

// eslint-disable-next-line complexity
function normalizeRows(res: any): KnowledgeIndicatorItem[] {
  if (Array.isArray(res)) {
    return res as KnowledgeIndicatorItem[]
  }
  if (Array.isArray(res?.rows)) {
    return res.rows as KnowledgeIndicatorItem[]
  }
  if (Array.isArray(res?.list)) {
    return res.list as KnowledgeIndicatorItem[]
  }
  if (Array.isArray(res?.data)) {
    return res.data as KnowledgeIndicatorItem[]
  }
  if (Array.isArray(res?.response?.data?.data?.rows)) {
    return res.response.data.data.rows as KnowledgeIndicatorItem[]
  }
  if (Array.isArray(res?.response?.data?.rows)) {
    return res.response.data.rows as KnowledgeIndicatorItem[]
  }
  if (Array.isArray(res?.response?.data?.data)) {
    return res.response.data.data as KnowledgeIndicatorItem[]
  }
  return []
}

// eslint-disable-next-line complexity
function mapIndicatorFromApi(item: any): KnowledgeIndicatorItem {
  const calcLogic = asObject(item.calcLogic)
  const termId = toNumberOrUndefined(item.indId ?? item.termId)

  return {
    ...item,
    accumulateStartDate: item.accumulateStartDate ?? calcLogic.accumulateStartDate,
    aggMethod: trimOrUndefined(item.projectionFunc) || item.aggMethod || calcLogic.aggMethod,
    atomicMetricId: item.atomicMetricId ?? calcLogic.atomicMetricId,
    bizName: trimOrUndefined(item.bizName),
    calcPeriod: item.calcPeriod ?? calcLogic.calcPeriod,
    compareMetricId: item.compareMetricId ?? calcLogic.compareMetricId,
    comparePeriod: item.comparePeriod ?? calcLogic.comparePeriod,
    compareType: item.compareType ?? calcLogic.compareType,
    comparisonOutputType: item.comparisonOutputType ?? calcLogic.comparisonOutputType,
    cumulativeMetricId: item.cumulativeMetricId ?? calcLogic.cumulativeMetricId,
    cumulativeMode: item.cumulativeMode ?? calcLogic.cumulativeMode,
    cumulativeTimeRange: item.cumulativeTimeRange ?? calcLogic.cumulativeTimeRange,
    dataFrequency: normalizeFrequency(item.updateFrequency ?? item.dataFrequency),
    dataType: normalizeDataType(item.dataType),
    derivedConditionExpr: item.derivedConditionExpr ?? calcLogic.derivedConditionExpr,
    derivedConditions: item.derivedConditions ?? calcLogic.derivedConditions,
    derivedTimeWindow: item.derivedTimeWindow ?? calcLogic.derivedTimeWindow,
    dimensionFieldIds: normalizeRelateDimsFieldValue(item.relateDims ?? item.dimensionFieldIds),
    divideZeroStrategy: item.divideZeroStrategy ?? calcLogic.divideZeroStrategy,
    expr: trimOrUndefined(item.expr) || calcLogic.expr,
    groupId: toNumberOrUndefined(item.groupId),
    groupName: trimOrUndefined(item.groupName),
    indicatorCode: trimOrUndefined(item.indicatorCode),
    indicatorType: normalizeIndicatorType(item.indicatorClass ?? item.indicatorType),
    measurementUnit: trimOrUndefined(item.measurementUnit),
    nullStrategy: item.nullStrategy ?? calcLogic.nullStrategy,
    owner: trimOrUndefined(item.indicatorOwner ?? item.owner),
    percentileValue: item.percentileValue ?? calcLogic.percentileValue,
    qualityLevel: normalizeQualityLevel(item.qualityLevel),
    ratioDenominatorId: item.ratioDenominatorId ?? calcLogic.ratioDenominatorId,
    ratioNumeratorId: item.ratioNumeratorId ?? calcLogic.ratioNumeratorId,
    ratioPrecision: item.ratioPrecision ?? calcLogic.ratioPrecision,
    relItemId: trimOrUndefined(item.techId ?? item.relItemId ?? calcLogic.relItemId),
    relViewid: trimOrUndefined(item.relViewId ?? item.relViewid),
    remark: trimOrUndefined(item.businessDefinition ?? item.remark),
    rollingWindowSize: item.rollingWindowSize ?? calcLogic.rollingWindowSize,
    semanticGroupId: toNumberOrUndefined(item.semanticGroupId),
    semanticSchemaId: toNumberOrUndefined(item.relSchemaId ?? item.semanticSchemaId),
    semanticSchemaName: trimOrUndefined(item.relSchemaName ?? item.semanticSchemaName),
    status: normalizeStatus(item.status),
    techName: trimOrUndefined(item.techName),
    technicalRemark: trimOrUndefined(item.technicalDefinition ?? item.technicalRemark),
    templateParams: item.templateParams ?? calcLogic.templateParams,
    templateType: trimOrUndefined(item.templateType ?? calcLogic.templateType),
    termAlias: trimOrUndefined(item.indAlias ?? item.termAlias),
    termId,
    thresholdMax: trimOrUndefined(item.thresholdMax ?? calcLogic.thresholdMax),
    thresholdMin: trimOrUndefined(item.thresholdMin ?? calcLogic.thresholdMin),
    variableMappings: item.variableMappings ?? calcLogic.variableMappings,
    versionStatus: trimOrUndefined(item.versionStatus),
    volatilityDataRange: item.volatilityDataRange ?? calcLogic.volatilityDataRange,
    volatilityMethod: item.volatilityMethod ?? calcLogic.volatilityMethod,
    volatilityMetricId: item.volatilityMetricId ?? calcLogic.volatilityMetricId
  }
}

function getApiErrorMessage(res: any, fallback: string) {
  return res?.response?.data?.errMsg || res?.response?.data?.msg || fallback
}

function isApiSuccess(res: any) {
  const success = res?.response?.data?.success
  if (typeof success === 'boolean') {
    return success
  }
  const code = Number(res?.response?.data?.code ?? 200)
  return Number.isNaN(code) || code <= 200
}

function buildCalcLogic(values: Record<string, any>) {
  return compactPayload({
    accumulateStartDate: values.accumulateStartDate,
    aggMethod: values.aggMethod,
    atomicMetricId: values.atomicMetricId,
    calcPeriod: values.calcPeriod,
    compareMetricId: values.compareMetricId,
    comparePeriod: values.comparePeriod,
    compareType: values.compareType,
    comparisonOutputType: values.comparisonOutputType,
    cumulativeMetricId: values.cumulativeMetricId,
    cumulativeMode: values.cumulativeMode,
    cumulativeTimeRange: values.cumulativeTimeRange,
    derivedConditionExpr: values.derivedConditionExpr,
    derivedConditions: values.derivedConditions,
    derivedTimeWindow: values.derivedTimeWindow,
    divideZeroStrategy: values.divideZeroStrategy,
    expr: values.expr,
    nullStrategy: values.nullStrategy,
    percentileValue: values.percentileValue,
    ratioDenominatorId: values.ratioDenominatorId,
    ratioNumeratorId: values.ratioNumeratorId,
    ratioPrecision: values.ratioPrecision,
    relItemId: values.relItemId,
    rollingWindowSize: values.rollingWindowSize,
    templateType: values.templateType,
    thresholdMax: values.thresholdMax,
    thresholdMin: values.thresholdMin,
    variableMappings: values.variableMappings,
    variableName: values.variableName,
    volatilityDataRange: values.volatilityDataRange,
    volatilityMethod: values.volatilityMethod,
    volatilityMetricId: values.volatilityMetricId
  })
}

function buildSubmitPayload(payload: Record<string, any>, selectedGroup: KnowledgeGroupItem | null) {
  const indicatorType = String(payload.indicatorType || 'atomic')
  const indicatorClass = INDICATOR_TYPE_TO_API_CLASS[indicatorType] || indicatorType
  const selectedGroupId = toNumberOrUndefined(selectedGroup?.groupId)

  return compactPayload({
    alertConfig: payload.alertConfig,
    bizName: trimOrUndefined(payload.bizName),
    businessDefinition: trimOrUndefined(payload.remark),
    calcLogic: buildCalcLogic(payload),
    dataType: toApiDataType(payload.dataType),
    groupId: selectedGroupId ?? toNumberOrUndefined(payload.groupId),
    indAlias: trimOrUndefined(payload.termAlias),
    indicatorCategory: trimOrUndefined(selectedGroup?.groupName),
    indicatorClass,
    indicatorCode: trimOrUndefined(payload.indicatorCode),
    indicatorOwner: trimOrUndefined(payload.owner),
    indId: toNumberOrUndefined(payload.termId ?? payload.indId),
    measurementUnit: trimOrUndefined(payload.measurementUnit),
    projectionFunc: trimOrUndefined(payload.aggMethod),
    qualityLevel: toApiQualityLevel(payload.qualityLevel),
    relateDims: parseRelateDimsPayload(payload.dimensionFieldIds),
    relSchemaId: toNumberOrUndefined(payload.semanticSchemaId),
    relViewId: trimOrUndefined(payload.relViewid),
    remark: trimOrUndefined(payload.remark),
    spaceId: Number(localStorage.getItem('spaceId')),
    status: String(payload.status ?? 2),
    technicalDefinition: trimOrUndefined(payload.technicalRemark),
    updateFrequency: toApiFrequency(payload.dataFrequency),
    versionStatus: String(payload.status ?? 2)
  })
}

export function useKnowledgeExtraction(selectedGroup: KnowledgeGroupItem | null) {
  const [loading, setLoading] = useState(false)
  const [tableData, setTableData] = useState<KnowledgeIndicatorItem[]>([])
  const [searchParams, setSearchParams] = useState<KnowledgeSearchParams>(initialSearchParams)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<KnowledgeIndicatorItem | null>(null)

  const fetchTableData = async () => {
    if (!selectedGroup?.groupId) {
      setTableData([])
      return
    }
    setLoading(true)
    try {
      const res = await queryKnowledgeIndicators({
        pageNum: 1,
        pageSize: 1000,
        spaceId: Number(localStorage.getItem('spaceId'))
      })
      const list = normalizeRows(res)
        .map(item => mapIndicatorFromApi(item))
        .filter(item => Number(item.groupId) === Number(selectedGroup.groupId))
        .map(item => ({
          ...item,
          groupName: item.groupName || selectedGroup.groupName
        }))
      setTableData(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTableData()
  }, [selectedGroup?.groupId])

  const filteredData = useMemo(() => {
    return tableData.filter(item => {
      const typeMatch = searchParams.type ? item.indicatorType === searchParams.type : true
      const statusMatch =
        typeof searchParams.status === 'number' ? Number(item.status ?? 2) === Number(searchParams.status) : true
      const keyword = String(searchParams.keyword || '').trim()
      const keywordMatch = keyword
        ? String(item.bizName || '').includes(keyword) || String(item.techName || '').includes(keyword)
        : true
      return typeMatch && statusMatch && keywordMatch
    })
  }, [searchParams, tableData])

  const handleSearchChange = (value: Partial<KnowledgeSearchParams>) => {
    setSearchParams(prev => ({
      ...prev,
      ...value
    }))
  }

  const handleQuery = () => {
    fetchTableData()
  }

  const handleReset = () => {
    setSearchParams(initialSearchParams)
    fetchTableData()
  }

  const handleAdd = () => {
    if (!selectedGroup?.groupId) {
      message.error('请先选择知识提取组')
      return
    }
    setEditingItem(null)
    setDrawerOpen(true)
  }

  const handleEdit = (record: KnowledgeIndicatorItem) => {
    setEditingItem(record)
    setDrawerOpen(true)
  }

  const handleDelete = async (record: KnowledgeIndicatorItem) => {
    if (!record.termId) {
      message.error('缺少指标ID，无法删除')
      return
    }
    const res = await deleteKnowledgeIndicator({
      id: record.termId,
      spaceId: Number(localStorage.getItem('spaceId')),
      techName: record.techName
    })
    if (!isApiSuccess(res)) {
      message.error(getApiErrorMessage(res, '删除失败'))
      return
    }
    message.success('删除成功')
    fetchTableData()
  }

  const handleSubmit = async (payload: Record<string, any>, isEdit: boolean) => {
    const params = buildSubmitPayload(payload, selectedGroup)
    const res = isEdit ? await editKnowledgeIndicator(params) : await addKnowledgeIndicator(params)
    if (!isApiSuccess(res)) {
      message.error(getApiErrorMessage(res, isEdit ? '编辑失败' : '新增失败'))
      return false
    }
    message.success(isEdit ? '编辑成功' : '新增成功')
    await fetchTableData()
    return true
  }

  const closeDrawer = (refresh?: boolean) => {
    setDrawerOpen(false)
    setEditingItem(null)
    if (refresh) {
      fetchTableData()
    }
  }

  return {
    closeDrawer,
    drawerOpen,
    editingItem,
    filteredData,
    handleAdd,
    handleDelete,
    handleEdit,
    handleQuery,
    handleReset,
    handleSearchChange,
    handleSubmit,
    loading,
    searchParams,
    tableData
  }
}
