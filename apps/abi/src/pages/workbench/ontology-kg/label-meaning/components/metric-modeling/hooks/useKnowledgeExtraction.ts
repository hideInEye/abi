import { message } from 'antd'

import {
  addKnowledgeIndicator,
  deleteKnowledgeIndicatorBatch,
  deleteKnowledgeIndicator,
  editKnowledgeIndicator,
  queryKnowledgeIndicatorDetail,
  queryKnowledgeIndicators,
  syncAtomicIndicators
} from '@/service/api/knowledge-extraction'

import type { AtomicMappingPayload, KnowledgeGroupItem, KnowledgeIndicatorItem, KnowledgePagination, KnowledgeSearchParams, KnowledgeSubmitPayload } from '../types/metricModeling.types'
import { getKnowledgeSpaceId } from '../utils/space'
import { buildKnowledgeCalcLogic } from '../utils/knowledgeSubmitPayload'
import { buildKnowledgeIndicatorListQuery, normalizeKnowledgeIndicatorListItem } from '../utils/knowledgeIndicator.mapper'

const UI_TO_API_QUALITY_LEVEL: Record<string, string> = {
  p0: 'P0-核心',
  p1: 'P1-重要',
  p2: 'P2-一般'
}

interface ApiResponseLike {
  code?: number | string
  data?: unknown
  response?: {
    data?: {
      code?: number | string
      data?: unknown
      errMsg?: string
      msg?: string
      success?: boolean
    }
  }
}

const initialSearchParams: KnowledgeSearchParams = {
  bizName: '',
  status: undefined,
  type: ''
}

const initialPagination: KnowledgePagination = {
  pageNum: 1,
  // 一次性拉取全部数据，前端做时间筛选与分页
  pageSize: 100000,
  total: 0
}

function getIndicatorPageData(res: any) {
  return res?.data ?? res?.response?.data?.data ?? res?.response?.data ?? {}
}

function getIndicatorTotal(res: any, fallback = 0) {
  const total = Number(getIndicatorPageData(res)?.total ?? fallback)
  return Number.isNaN(total) ? fallback : total
}

function trimOrUndefined(value: unknown) {
  if (typeof value !== 'string') {
    return value
  }
  const text = value.trim()
  return text || undefined
}

function parseRelateDimsPayload(value: unknown) {
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

function toNumberOrUndefined(value: unknown) {
  if (value === '' || value === null || value === undefined) {
    return undefined
  }
  const num = Number(value)
  return Number.isNaN(num) ? undefined : num
}

function toApiQualityLevel(value: unknown) {
  const key = String(value || '').trim()
  return UI_TO_API_QUALITY_LEVEL[key] || key || undefined
}

function toPublicFlag(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  return value === true || String(value) === '1' ? '1' : '0'
}

function compactPayload<T extends Record<string, unknown>>(payload: T): Partial<T> {
  const entries = Object.entries(payload).filter(([, value]) => value !== undefined && value !== null)
  return Object.fromEntries(entries) as Partial<T>
}

function getApiErrorMessage(res: ApiResponseLike, fallback: string) {
  return res?.response?.data?.errMsg || res?.response?.data?.msg || fallback
}

function isApiSuccess(res: ApiResponseLike) {
  const success = res?.response?.data?.success
  if (typeof success === 'boolean') {
    return success
  }
  const code = Number(res?.response?.data?.code ?? 200)
  return Number.isNaN(code) || code <= 200
}

function normalizeDetail(res: ApiResponseLike): KnowledgeIndicatorItem | null {
  const data = res?.response?.data?.data ?? res?.data
  if (!data || Array.isArray(data)) {
    return null
  }
  return data as KnowledgeIndicatorItem
}

function buildSubmitPayload(payload: KnowledgeSubmitPayload, selectedGroup: KnowledgeGroupItem | null) {
  return compactPayload({
    alertConfig: payload.alertConfig,
    bizName: trimOrUndefined(payload.bizName),
    businessDefinition: trimOrUndefined(payload.businessDefinition),
    calcLogic: buildKnowledgeCalcLogic(payload),
    dataType: trimOrUndefined(payload.dataType),
    groupId: selectedGroup?.groupId ?? payload.groupId,
    indAlias: trimOrUndefined(payload.indAlias),
    indicatorClass: trimOrUndefined(payload.indicatorClass),
    indicatorCode: trimOrUndefined(payload.indicatorCode),
    indicatorOwner: trimOrUndefined(payload.indicatorOwner),
    indId: toNumberOrUndefined(payload.termId ?? payload.indId),
    isPublic: toPublicFlag(payload.isPublic),
    measurementUnit: trimOrUndefined(payload.measurementUnit),
    ownerEmail: trimOrUndefined(payload.ownerEmail),
    ownerPhone: trimOrUndefined(payload.ownerPhone),
    projectionFunc: trimOrUndefined(payload.projectionFunc),
    qualityLevel: toApiQualityLevel(payload.qualityLevel),
    relateDims: parseRelateDimsPayload(payload.dimensionFieldIds),
    relItemId: trimOrUndefined(payload.relItemId),
    spaceId: getKnowledgeSpaceId(),
    status: trimOrUndefined(payload.status),
    templateParams: payload.templateParams,
    templateType: trimOrUndefined(payload.templateType),
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
  const [pagination, setPagination] = useState<KnowledgePagination>(initialPagination)
  const [customDrawerOpen, setCustomDrawerOpen] = useState(false)
  const [atomicDrawerOpen, setAtomicDrawerOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<KnowledgeIndicatorItem | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])

  const fetchTableData = async (params?: Partial<KnowledgeSearchParams>, nextPagination: KnowledgePagination = pagination) => {
    if (!selectedGroup?.groupId) {
      setTableData([])
      setPagination(initialPagination)
      return
    }
    const queryParams = {
      ...searchParams,
      ...(params || {})
    }
    setLoading(true)
    try {
      const res = await queryKnowledgeIndicators(buildKnowledgeIndicatorListQuery({
        groupId: selectedGroup.groupId,
        pagination: nextPagination,
        searchParams: queryParams,
        spaceId: getKnowledgeSpaceId()
      }))
      const pageData = getIndicatorPageData(res)
      const list = ((pageData?.list || []) as KnowledgeIndicatorItem[]).map(normalizeKnowledgeIndicatorListItem)
      setTableData(list)
      setSelectedRowKeys([])
      setPagination(current => ({
        ...current,
        pageNum: nextPagination.pageNum,
        pageSize: nextPagination.pageSize,
        total: getIndicatorTotal(res)
      }))
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
    fetchTableData(searchParams, { ...pagination, pageNum: 1 })
  }

  const handleReset = () => {
    setSearchParams(initialSearchParams)
    fetchTableData(initialSearchParams, { ...pagination, pageNum: 1 })
  }

  const handlePaginationChange = (pageNum: number, pageSize: number) => {
    fetchTableData(searchParams, {
      pageNum,
      pageSize,
      total: pagination.total
    })
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
    setEditingItem(normalizeKnowledgeIndicatorListItem(detail))
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
      spaceId: getKnowledgeSpaceId(),
      techName: record.rawTechName || record.techName
    })
    if (!isApiSuccess(res)) {
      message.error(getApiErrorMessage(res, '删除失败'))
      return
    }
    message.success('删除成功')
    fetchTableData()
  }

  const handleBatchDelete = async () => {
    const ids = selectedRowKeys.map(item => Number(item)).filter(item => !Number.isNaN(item))
    if (!ids.length) {
      message.warning('请先选择要删除的指标')
      return
    }
    const res = await deleteKnowledgeIndicatorBatch({ ids })
    if (!isApiSuccess(res)) {
      message.error(getApiErrorMessage(res, '批量删除失败'))
      return
    }
    message.success('批量删除成功')
    await fetchTableData()
  }

  const handleSubmit = async (payload: KnowledgeSubmitPayload, isEdit: boolean) => {
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

  const handleAtomicMappingSubmit = async (payload: AtomicMappingPayload[]) => {
    const res = await syncAtomicIndicators(payload)
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
    handleBatchDelete,
    handleDelete,
    handleEdit,
    handleAtomicMappingSubmit,
    handleQuery,
    handleReset,
    handleSearchChange,
    handleSubmit,
    loading,
    searchParams,
    selectedRowKeys,
    setSelectedRowKeys,
    tableData,
    pagination,
    handlePaginationChange
  }
}
