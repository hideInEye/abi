import { message } from 'antd'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  addDimensionModel,
  batchCreateDimensionModels,
  deleteDimensionModelBatch,
  deleteDimensionModel,
  editDimensionHierarchy,
  editDimensionModel,
  queryDimensionDetail,
  queryDimensionHierarchyByDimId,
  queryDimensionList
} from '@/service/api/dimension-modeling'
import { assertFlatRequestSuccess } from '@/service/request/flat-result'

import type {
  DimensionFieldOption,
  DimensionBatchMappingRow,
  DimensionFormValues,
  DimensionGroup,
  DimensionHierarchyEditItem,
  DimensionHierarchyEditPayload,
  DimensionModelItem,
  DimensionPagination,
  DimensionSchemaInfo,
  DimensionSearchParams
} from '../types/dimensionModeling.types'
import {
  buildSubmitPayload,
  buildDimensionBatchCreatePayload,
  getApiErrorMessage,
  isApiSuccess,
  mapDimensionFromApi,
  normalizeDetail,
  normalizeRows
} from '../utils/dimensionModeling.mapper'

const initialSearchParams: DimensionSearchParams = {
  bizName: '',
  techName: ''
}

const initialPagination: DimensionPagination = {
  pageNum: 1,
  pageSize: 10,
  total: 0
}

function getResponseTotal(res: any, fallback = 0) {
  const value =
    res?.data?.total ??
    res?.response?.data?.data?.total ??
    res?.response?.data?.total ??
    res?.total ??
    fallback
  const total = Number(value)
  return Number.isNaN(total) ? fallback : total
}

function toNumber(value: any) {
  if (value === '' || value === null || value === undefined) {
    return undefined
  }
  const num = Number(value)
  return Number.isNaN(num) ? undefined : num
}

function normalizeHierarchyItem(item: any): DimensionHierarchyEditItem {
  return {
    ...item,
    childDimId: toNumber(item?.childDimId),
    dimId: toNumber(item?.dimId || item?.dimensionId) || 0,
    hierarchyId: toNumber(item?.hierarchyId || item?.id || item?.hierarchyID),
    levelOrder: toNumber(item?.levelOrder || item?.level) || 0,
    parentDimId: toNumber(item?.parentDimId),
    spaceId: toNumber(item?.spaceId) || Number(localStorage.getItem('spaceId')) || 0
  }
}

function normalizeHierarchyGroup(group: any, owner: any = {}): DimensionHierarchyEditItem[] {
  const levels = Array.isArray(group?.levels) ? group.levels : []
  const groupHierarchyId = toNumber(group?.hierarchyId ?? group?.hierarchyID)

  return levels.map((level: any) => {
    const levelRest = { ...(level || {}) }
    const levelHierarchyId = toNumber(levelRest.hierarchyId ?? levelRest.hierarchyID)
    delete levelRest.hierarchyId
    delete levelRest.hierarchyID
    delete levelRest.id
    return normalizeHierarchyItem({
      ...levelRest,
      dimId: level?.dimId ?? owner?.dimId ?? owner?.dimensionId,
      drillDirection: group?.drillDirection ?? level?.drillDirection,
      hierarchyId: groupHierarchyId ?? levelHierarchyId,
      hierarchyName: group?.hierarchyName ?? level?.hierarchyName,
      isDefault: group?.isDefault ?? level?.isDefault,
      parentDimId: level?.parentDimId,
      remark: group?.remark ?? level?.remark,
      spaceId: level?.spaceId ?? group?.spaceId ?? owner?.spaceId,
      status: group?.status ?? level?.status
    })
  })
}

function normalizeHierarchyRows(rows: any[]): DimensionHierarchyEditItem[] {
  return rows.flatMap((item) => {
    const groups = Array.isArray(item?.groups) ? item.groups : []
    if (Array.isArray(item?.levels)) {
      return normalizeHierarchyGroup(item)
    }
    if (!groups.length) {
      return [normalizeHierarchyItem(item)]
    }

    return groups.flatMap((group: any) => normalizeHierarchyGroup(group, item))
  })
}

export function useDimensionModeling(selectedGroup: DimensionGroup | null) {
  const [loading, setLoading] = useState(false)
  const [searchParams, setSearchParams] = useState<DimensionSearchParams>(initialSearchParams)
  const [queryParams, setQueryParams] = useState<DimensionSearchParams>(initialSearchParams)
  const [tableData, setTableData] = useState<DimensionModelItem[]>([])
  const [pagination, setPagination] = useState<DimensionPagination>(initialPagination)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [batchDrawerOpen, setBatchDrawerOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<DimensionModelItem | null>(null)
  const [hierarchyOpen, setHierarchyOpen] = useState(false)
  const [hierarchyTarget, setHierarchyTarget] = useState<DimensionModelItem | null>(null)
  const [hierarchyItems, setHierarchyItems] = useState<DimensionHierarchyEditItem[]>([])
  const [hierarchyLoading, setHierarchyLoading] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const latestSearchParamsRef = useRef(searchParams)
  const latestPaginationRef = useRef(initialPagination)

  const fetchTableData = useCallback(async (
    _params: DimensionSearchParams = latestSearchParamsRef.current,
    nextPagination: DimensionPagination = latestPaginationRef.current
  ) => {
    if (!selectedGroup?.groupId) {
      setTableData([])
      setPagination(initialPagination)
      latestPaginationRef.current = initialPagination
      return true
    }
    setLoading(true)
    try {
      const res = await queryDimensionList({
        bizName: _params.bizName?.trim() || undefined,
        groupId: selectedGroup.groupId,
        pageNum: nextPagination.pageNum,
        pageSize: nextPagination.pageSize,
        spaceId: Number(localStorage.getItem('spaceId')),
        techName: _params.techName?.trim() || undefined
      })
      assertFlatRequestSuccess(res)
      const rows = normalizeRows(res)
      const list = rows.map(item =>
        mapDimensionFromApi({
          ...item,
          groupId: item.groupId ?? selectedGroup.groupId,
          groupName: item.groupName ?? selectedGroup.groupName
        })
      )
      setTableData(list)
      setSelectedRowKeys([])
      const nextPaginationState = {
        pageNum: nextPagination.pageNum,
        pageSize: nextPagination.pageSize,
        total: getResponseTotal(res)
      }
      latestPaginationRef.current = nextPaginationState
      setPagination(nextPaginationState)
      return true
    } catch {
      return false
    } finally {
      setLoading(false)
    }
  }, [selectedGroup?.groupId, selectedGroup?.groupName])

  useEffect(() => {
    const nextPagination = {
      ...latestPaginationRef.current,
      pageNum: 1
    }
    fetchTableData(latestSearchParamsRef.current, nextPagination)
  }, [fetchTableData])

  const handleSearchChange = (value: Partial<DimensionSearchParams>) => {
    const nextSearchParams = {
      ...latestSearchParamsRef.current,
      ...value
    }
    latestSearchParamsRef.current = nextSearchParams
    setSearchParams(prev => ({
      ...prev,
      ...value
    }))
  }

  const handleQuery = () => {
    const nextParams = latestSearchParamsRef.current
    const nextPagination = {
      ...latestPaginationRef.current,
      pageNum: 1
    }
    setQueryParams(nextParams)
    fetchTableData(nextParams, nextPagination)
  }

  const handleReset = () => {
    latestSearchParamsRef.current = initialSearchParams
    const nextPagination = {
      ...latestPaginationRef.current,
      pageNum: 1
    }
    setSearchParams(initialSearchParams)
    setQueryParams(initialSearchParams)
    fetchTableData(initialSearchParams, nextPagination)
  }

  const handleAdd = () => {
    if (!selectedGroup?.groupId) {
      message.error('请先选择维度分组')
      return
    }
    setEditingItem(null)
    setDrawerOpen(true)
  }

  const handleAddBatch = () => {
    if (!selectedGroup?.groupId) {
      message.error('请先选择维度分组')
      return
    }
    setBatchDrawerOpen(true)
  }

  const handleEdit = async (record: DimensionModelItem) => {
    const id = Number(record.id)
    if (!id) {
      setEditingItem(record)
      setDrawerOpen(true)
      return
    }
    const res = await queryDimensionDetail({
      id
    })
    if (!isApiSuccess(res)) {
      message.warning(getApiErrorMessage(res, '获取详情失败'))
      return
    }
    const detailData = normalizeDetail(res)
    const detail = detailData ? mapDimensionFromApi({ ...record, ...detailData }) : record
    setEditingItem(detail)
    setDrawerOpen(true)
  }

  const handleDelete = async (record: DimensionModelItem) => {
    if (!record.id) {
      message.error('缺少维度ID，无法删除')
      return
    }
    const res = await deleteDimensionModel({
      id: Number(record.id)
    })
    if (!isApiSuccess(res)) {
      const errorMessage = getApiErrorMessage(res, '删除失败')
      message.error(errorMessage)
      assertFlatRequestSuccess(res, errorMessage)
    }
    message.success('删除成功')
    await fetchTableData()
  }

  const handleBatchDelete = async () => {
    const ids = selectedRowKeys.map(item => Number(item)).filter(item => !Number.isNaN(item))
    if (!ids.length) {
      message.warning('请先选择要删除的维度')
      return
    }
    const res = await deleteDimensionModelBatch({ ids })
    if (!isApiSuccess(res)) {
      const errorMessage = getApiErrorMessage(res, '批量删除失败')
      message.error(errorMessage)
      assertFlatRequestSuccess(res, errorMessage)
    }
    message.success('批量删除成功')
    await fetchTableData()
  }

  const handleSubmit = async (params: {
    formValues: DimensionFormValues
    id?: number
    relatedFields: DimensionFieldOption[]
    selectedSchema?: DimensionSchemaInfo
  }) => {
    const { formValues, id, relatedFields, selectedSchema } = params
    const payload = buildSubmitPayload({
      formValues,
      id,
      relatedFields,
      selectedGroupId: selectedGroup?.groupId,
      selectedSchema
    })
    const isEdit = Boolean(id)
    const res = isEdit ? await editDimensionModel(payload) : await addDimensionModel(payload)
    if (!isApiSuccess(res)) {
      message.error(getApiErrorMessage(res, isEdit ? '编辑失败' : '新增失败'))
      return false
    }
    message.success(isEdit ? '编辑成功' : '新增成功')
    await fetchTableData()
    return true
  }

  const handleBatchMappingSubmit = async (rows: DimensionBatchMappingRow[], semanticsGroupId?: number | string) => {
    const selectedRows = rows.filter(item => !item.disabled)
    if (!selectedRows.length) {
      message.warning('请选择未生成的维度字段')
      return false
    }

    const payload = buildDimensionBatchCreatePayload({
      rows: selectedRows,
      selectedGroupId: selectedGroup?.groupId,
      semanticsGroupId
    })
    if (!payload.length) {
      message.warning('请选择未生成的维度字段')
      return false
    }

    const res = await batchCreateDimensionModels(payload)
    if (!isApiSuccess(res)) {
      message.error(getApiErrorMessage(res, '维度批量映射保存失败'))
      return false
    }

    message.success(`已生成 ${payload.length} 个维度`)
    await fetchTableData()
    return true
  }

  const handlePaginationChange = (page: number, pageSize: number) => {
    const nextPagination = {
      pageNum: page,
      pageSize,
      total: latestPaginationRef.current.total
    }
    fetchTableData(queryParams, nextPagination)
  }

  const openHierarchyModal = async (record: DimensionModelItem) => {
    setHierarchyTarget(record)
    setHierarchyOpen(true)
    setHierarchyItems([])
    if (!record?.id) {
      return
    }
    setHierarchyLoading(true)
    try {
      const res = await queryDimensionHierarchyByDimId({ dimId: Number(record.id) })
      if (!isApiSuccess(res)) {
        message.warning(getApiErrorMessage(res, '查询层级配置失败'))
        return
      }
      const rows = normalizeRows(res)
      const list = normalizeHierarchyRows(rows.filter(Boolean))
      setHierarchyItems(list)
    } finally {
      setHierarchyLoading(false)
    }
  }

  const closeHierarchyModal = () => {
    setHierarchyOpen(false)
    setHierarchyTarget(null)
    setHierarchyItems([])
    setHierarchyLoading(false)
  }

  const saveHierarchyConfig = async (items: DimensionHierarchyEditPayload) => {
    if (!items?.groups?.length) {
      message.warning('请先配置层级结构')
      return false
    }
    const res = await editDimensionHierarchy(items)
    if (!isApiSuccess(res)) {
      message.error(getApiErrorMessage(res, '保存层级失败'))
      return false
    }
    message.success('层级配置已保存')
    closeHierarchyModal()
    await fetchTableData()
    return true
  }

  const closeDrawer = (refresh?: boolean) => {
    setDrawerOpen(false)
    setEditingItem(null)
    if (refresh) {
      void fetchTableData()
    }
  }

  const closeBatchDrawer = (refresh?: boolean) => {
    setBatchDrawerOpen(false)
    if (refresh) {
      void fetchTableData()
    }
  }

  return {
    batchDrawerOpen,
    closeBatchDrawer,
    closeDrawer,
    closeHierarchyModal,
    drawerOpen,
    editingItem,
    handleAdd,
    handleAddBatch,
    handleBatchDelete,
    handleBatchMappingSubmit,
    handleDelete,
    handleEdit,
    handlePaginationChange,
    handleQuery,
    handleReset,
    handleSearchChange,
    handleSubmit,
    hierarchyItems,
    hierarchyLoading,
    hierarchyOpen,
    hierarchyTarget,
    loading,
    openHierarchyModal,
    pagination,
    queryParams,
    saveHierarchyConfig,
    searchParams,
    selectedRowKeys,
    setSelectedRowKeys,
    tableData
  }
}
