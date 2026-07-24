import { message } from 'antd'

import {
  addDimensionModel,
  deleteDimensionModelBatch,
  deleteDimensionModel,
  editDimensionHierarchy,
  editDimensionModel,
  queryDimensionDetail,
  queryDimensionHierarchyByDimId,
  queryDimensionList
} from '@/service/api/dimension-modeling'

import type {
  DimensionFieldOption,
  DimensionFormValues,
  DimensionGroup,
  DimensionHierarchyEditItem,
  DimensionModelItem,
  DimensionPagination,
  DimensionSchemaInfo,
  DimensionSearchParams
} from '../types/dimensionModeling.types'
import {
  buildSubmitPayload,
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
  // 一次性拉取全部数据，前端做时间筛选与分页
  pageSize: 100000,
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

export function useDimensionModeling(selectedGroup: DimensionGroup | null) {
  const [loading, setLoading] = useState(false)
  const [searchParams, setSearchParams] = useState<DimensionSearchParams>(initialSearchParams)
  const [queryParams, setQueryParams] = useState<DimensionSearchParams>(initialSearchParams)
  const [tableData, setTableData] = useState<DimensionModelItem[]>([])
  const [pagination, setPagination] = useState<DimensionPagination>(initialPagination)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<DimensionModelItem | null>(null)
  const [hierarchyOpen, setHierarchyOpen] = useState(false)
  const [hierarchyTarget, setHierarchyTarget] = useState<DimensionModelItem | null>(null)
  const [hierarchyItems, setHierarchyItems] = useState<DimensionHierarchyEditItem[]>([])
  const [hierarchyLoading, setHierarchyLoading] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])

  const fetchTableData = async (params: DimensionSearchParams = queryParams, nextPagination: DimensionPagination = pagination) => {
    if (!selectedGroup?.groupId) {
      setTableData([])
      setPagination(initialPagination)
      return
    }
    setLoading(true)
    try {
      const res = await queryDimensionList({
        bizName: params.bizName.trim(),
        groupId: selectedGroup.groupId,
        pageNum: nextPagination.pageNum,
        pageSize: nextPagination.pageSize,
        spaceId: Number(localStorage.getItem('spaceId')),
        techName: params.techName.trim()
      })
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
      setPagination(current => ({
        ...current,
        pageNum: nextPagination.pageNum,
        pageSize: nextPagination.pageSize,
        total: getResponseTotal(res)
      }))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTableData()
  }, [selectedGroup?.groupId])

  const handleSearchChange = (value: Partial<DimensionSearchParams>) => {
    setSearchParams(prev => ({
      ...prev,
      ...value
    }))
  }

  const handleQuery = async () => {
    setQueryParams(searchParams)
    await fetchTableData(searchParams, { ...pagination, pageNum: 1 })
  }

  const handleReset = async () => {
    setSearchParams(initialSearchParams)
    setQueryParams(initialSearchParams)
    await fetchTableData(initialSearchParams, { ...pagination, pageNum: 1 })
  }

  const handleAdd = () => {
    if (!selectedGroup?.groupId) {
      message.error('请先选择维度分组')
      return
    }
    setEditingItem(null)
    setDrawerOpen(true)
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
      message.warning(getApiErrorMessage(res, '获取详情失败，已使用列表数据编辑'))
      setEditingItem(record)
      setDrawerOpen(true)
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
      message.error(getApiErrorMessage(res, '删除失败'))
      return
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
      message.error(getApiErrorMessage(res, '批量删除失败'))
      return
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

  const handlePaginationChange = (page: number, pageSize: number) => {
    fetchTableData(queryParams, {
      pageNum: page,
      pageSize,
      total: pagination.total
    })
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
      const list = rows.filter(Boolean).map(normalizeHierarchyItem)
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

  const saveHierarchyConfig = async (items: DimensionHierarchyEditItem[]) => {
    if (!items.length) {
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
      fetchTableData()
    }
  }

  return {
    closeDrawer,
    closeHierarchyModal,
    drawerOpen,
    editingItem,
    handleAdd,
    handleBatchDelete,
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
    saveHierarchyConfig,
    searchParams,
    selectedRowKeys,
    setSelectedRowKeys,
    tableData
  }
}
