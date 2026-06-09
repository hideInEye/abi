import { message } from 'antd'

import {
  addKnowledgeIndicator,
  deleteKnowledgeIndicator,
  editKnowledgeIndicator,
  queryKnowledgeIndicatorDetail,
  queryKnowledgeIndicators,
  syncAtomicIndicators
} from '@/service/api/knowledge-extraction'

import type { KnowledgeGroupItem, KnowledgeIndicatorItem, KnowledgeSearchParams } from '../types'

const UI_TO_API_QUALITY_LEVEL: Record<string, string> = {
  p0: 'P0-核心',
  p1: 'P1-重要',
  p2: 'P2-一般'
}

const initialSearchParams: KnowledgeSearchParams = {
  keyword: '',
  status: undefined,
  type: ''
}

function trimOrUndefined(value: any) {
  if (typeof value !== 'string') {
    return value
  }
  const text = value.trim()
  return text || undefined
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

function toApiQualityLevel(value: any) {
  const key = String(value || '').trim()
  return UI_TO_API_QUALITY_LEVEL[key] || key || undefined
}

function toPublicFlag(value: any) {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  return value === true || String(value) === '1' ? '1' : '0'
}

function compactPayload<T extends Record<string, any>>(payload: T): Partial<T> {
  const entries = Object.entries(payload).filter(([, value]) => value !== undefined && value !== null)
  return Object.fromEntries(entries) as Partial<T>
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

function normalizeDetail(res: any) {
  const data = res?.response?.data?.data ?? res?.data
  if (!data || Array.isArray(data)) {
    return null
  }
  return data
}

function buildCalcLogic(values: Record<string, any>) {
  return compactPayload({
    accumulateStartDate: values.accumulateStartDate,
    aggMethod: values.aggMethod,
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
    divideZeroStrategy: values.divideZeroStrategy,
    expr: values.expr,
    nullStrategy: values.nullStrategy,
    percentileValue: values.percentileValue,
    ratioDenominatorId: values.ratioDenominatorId,
    ratioNumeratorId: values.ratioNumeratorId,
    ratioPrecision: values.ratioPrecision,
    relItemId: values.relItemId,
    rollingWindowSize: values.rollingWindowSize,
    techId: values.techId,
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
  const selectedGroupId = toNumberOrUndefined(selectedGroup?.groupId)

  return compactPayload({
    alertConfig: payload.alertConfig,
    bizName: trimOrUndefined(payload.bizName),
    businessDefinition: trimOrUndefined(payload.businessDefinition),
    calcLogic: buildCalcLogic(payload),
    dataType: trimOrUndefined(payload.dataType),
    groupId: selectedGroupId ?? toNumberOrUndefined(payload.groupId),
    indAlias: trimOrUndefined(payload.indAlias),
    indicatorClass: trimOrUndefined(payload.indicatorClass),
    indicatorCode: trimOrUndefined(payload.indicatorCode),
    indicatorOwner: trimOrUndefined(payload.indicatorOwner),
    indId: toNumberOrUndefined(payload.termId ?? payload.indId),
    isPublic: toPublicFlag(payload.isPublic),
    measurementUnit: trimOrUndefined(payload.measurementUnit),
    ownerEmail: trimOrUndefined(payload.ownerEmail),
    ownerPhone: trimOrUndefined(payload.ownerPhone),
    qualityLevel: toApiQualityLevel(payload.qualityLevel),
    relateDims: parseRelateDimsPayload(payload.dimensionFieldIds),
    spaceId: Number(localStorage.getItem('spaceId')),
    status: trimOrUndefined(payload.status),
    techId: payload.techId,
    techName: trimOrUndefined(payload.techName),
    technicalDefinition: trimOrUndefined(payload.technicalDefinition),
    updateFrequency: trimOrUndefined(payload.updateFrequency),
    versionStatus: trimOrUndefined(payload.versionStatus)
  })
}

export function useKnowledgeExtraction(selectedGroup: KnowledgeGroupItem | null) {
  const [loading, setLoading] = useState(false)
  const [tableData, setTableData] = useState<KnowledgeIndicatorItem[]>([])
  const [searchParams, setSearchParams] = useState<KnowledgeSearchParams>(initialSearchParams)
  const [customDrawerOpen, setCustomDrawerOpen] = useState(false)
  const [atomicDrawerOpen, setAtomicDrawerOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<KnowledgeIndicatorItem | null>(null)

  const fetchTableData = async (params?: Partial<KnowledgeSearchParams>) => {
    if (!selectedGroup?.groupId) {
      setTableData([])
      return
    }
    const queryParams = {
      ...searchParams,
      ...(params || {})
    }
    setLoading(true)
    try {
      const res = await queryKnowledgeIndicators({
        groupId: selectedGroup.groupId,
        indicatorClass: queryParams.type || undefined,
        keyword: queryParams.keyword || undefined,
        pageNum: 1,
        pageSize: 10,
        spaceId: Number(localStorage.getItem('spaceId')),
        status: queryParams.status
      })
      const list = (res?.response?.data?.data?.list || []) as KnowledgeIndicatorItem[]
      setTableData(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTableData(searchParams)
  }, [selectedGroup?.groupId])


  const handleSearchChange = (value: Partial<KnowledgeSearchParams>) => {
    setSearchParams(prev => ({
      ...prev,
      ...value
    }))
  }

  const handleQuery = () => {
    fetchTableData(searchParams)
  }

  const handleReset = () => {
    setSearchParams(initialSearchParams)
    fetchTableData(initialSearchParams)
  }

  const handleAddCustom = () => {
    if (!selectedGroup?.groupId) {
      message.error('请先选择知识提取组')
      return
    }
  
    setEditingItem(null)
    setCustomDrawerOpen(true)
  }

  const handleAddAtomic = () => {
    if (!selectedGroup?.groupId) {
      message.error('请先选择知识提取组')
      return
    }
    setAtomicDrawerOpen(true)
  }

  const handleEdit = async (record: KnowledgeIndicatorItem) => {
    const indicatorId = Number(record.indId ?? record.termId)
    if (!indicatorId) {
      message.error('缺少指标ID，无法获取详情')
      return
    }

    const res = await queryKnowledgeIndicatorDetail({
      id: indicatorId
    })
    if (!isApiSuccess(res)) {
      message.error(getApiErrorMessage(res, '获取指标详情失败'))
      return
    }

    const detail = normalizeDetail(res)
    if (!detail) {
      message.error('获取指标详情失败')
      return
    }
    setEditingItem(detail)
    setCustomDrawerOpen(true)
  }

  const handleDelete = async (record: KnowledgeIndicatorItem) => {
    const indicatorId = Number(record.indId ?? record.termId)
    if (!indicatorId) {
      message.error('缺少指标ID，无法删除')
      return
    }
    const res = await deleteKnowledgeIndicator({
      id: indicatorId,
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

  const handleAtomicMappingSubmit = async (payload: Array<Record<string, any>>) => {
    const res = await syncAtomicIndicators(payload as any)
    const code = Number(res?.response?.data?.code ?? res?.code ?? 200)
    if (code !== 200) {
      message.error(getApiErrorMessage(res, '原子指标映射保存失败'))
      return false
    }
    message.success('原子指标映射保存成功')
    await fetchTableData()
    return true
  }

  const closeCustomDrawer = (refresh?: boolean) => {
    setCustomDrawerOpen(false)
    setEditingItem(null)
    if (refresh) {
      fetchTableData()
    }
  }

  const closeAtomicDrawer = (refresh?: boolean) => {
    setAtomicDrawerOpen(false)
    if (refresh) {
      fetchTableData()
    }
  }

  return {
    atomicDrawerOpen,
    closeAtomicDrawer,
    closeCustomDrawer,
    customDrawerOpen,
    editingItem,
    handleAddAtomic,
    handleAddCustom,
    handleDelete,
    handleEdit,
    handleAtomicMappingSubmit,
    handleQuery,
    handleReset,
    handleSearchChange,
    handleSubmit,
    loading,
    searchParams,
    tableData
  }
}
