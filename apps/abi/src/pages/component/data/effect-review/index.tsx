import {
  AuditOutlined,
  DeleteOutlined,
  LeftOutlined,
  MoreOutlined,
  ReloadOutlined,
  RightOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { Dropdown, Modal, Popconfirm, Tag, message } from 'antd'
import { useDebounceFn } from 'ahooks'
import dayjs from 'dayjs'
import { Suspense, lazy, useMemo, useState, type Key } from 'react'

import { ViewControls } from '@/components/ViewControls'
import type { ColumnOption } from '@/components/ViewControls'
import { DeferredRangePicker, SearchFilterBar, SearchFilterField, getFilterPopupContainer } from '@/components/SearchFilterBar'
import { filterByCreateTime } from '@/utils/date'
import { EVAL_LLM_OPTIONS, MEMORY_CHAT_MODE_OPTIONS, MEMORY_STATUS_OPTIONS } from '@/constants/assistant-config'
import { useAppSelector } from '@/hooks/business/useStore'
import {
  fetchBatchDeleteMemory,
  fetchDeleteMemory,
  fetchEditMemory,
  fetchMemoryDetail,
  fetchMemoryList,
} from '@/service/api/assistant-manage'
import { getSpaceId } from '@/store/slice/app'

const ALL_COLUMNS: ColumnOption[] = [
  { key: 'question', label: '问题', visible: true },
  { key: 'chat_mode', label: '场景类型', visible: true },
  { key: 'ai_response', label: 'ai信息', visible: true },
  { key: 'view_response', label: 'view信息', visible: true },
  { key: 'create_by', label: '提交人', visible: true },
  { key: 'eval_user', label: '提交意见', visible: true },
  { key: 'status', label: '审核状态', visible: true },
  { key: 'eval_by', label: '评估人', visible: true },
  { key: 'expert_opinion', label: '评估意见', visible: true },
  { key: 'eval_llm', label: '模型评估结果', visible: true },
  { key: 'llm_opinion', label: '模型评估意见', visible: true },
  { key: 'eval_time', label: '审核时间', visible: true },
  { key: 'create_time', label: '提交时间', visible: true },
]

const EffectReviewOperateDrawer = lazy(() => import('./modules/effect-review-operate-drawer'))
/**
 * 效果评审页面
 * 原位于「助手配置」抽屉的「记忆管理」tab，迁移到「组件 > 数据资产」菜单下
 */
export function Component() {
  const { t } = useTranslation()
  const spaceId = useAppSelector(getSpaceId)
  const [jumpValue, setJumpValue] = useState('')
  const [dateRange, setDateRange] = useState<[any, any] | null>(null)
  const [columnOptions, setColumnOptions] = useState<ColumnOption[]>(ALL_COLUMNS)
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card')

  // 将对象的 camelCase 键统一转换为 snake_case，兼容表格列/编辑/删除中使用的下划线字段名
  const toSnakeCaseKeys = (obj: any) => {
    if (!obj || typeof obj !== 'object') return obj
    const result: any = {}
    Object.keys(obj).forEach(key => {
      const snakeKey = key.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`)
      result[snakeKey] = obj[key]
    })
    return result
  }

  // 问题字段可能是纯文本，也可能是带文件信息的 JSON 字符串（如 {"question":"分析excel","file_name":...}），统一提取其中的 question
  const normalizeQuestion = (val: any) => {
    if (val == null) return val
    if (typeof val === 'object') return val.question ?? JSON.stringify(val)
    if (typeof val === 'string') {
      const trimmed = val.trim()
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed)
          if (parsed && typeof parsed === 'object' && typeof parsed.question === 'string') return parsed.question
        } catch {
          // 非合法 JSON，按原文本展示
        }
      }
    }
    return val
  }

  const fetchEffectReviewList = async (params: any) => {
    try {
      // 将表格内部的 snake_case 分页/查询参数映射为接口要求的 camelCase 参数
      const body = {
        chatMode: params.chat_mode || params.chatMode || undefined,
        page: params.page ?? params.pageNum ?? 1,
        pageSize: params.page_size ?? params.pageSize ?? 10,
        question: params.question || undefined,
        spaceId: params.space_id ?? params.spaceId ?? spaceId,
        status: params.status ?? undefined,
      }
      const res: any = await fetchMemoryList(body)
      if (res?.error) {
        return { data: { data: [], total: 0 } }
      }
      // 接口返回结构：{ code, msg, data: { total, data: [...], totalPages, pageSize, pageNum } }
      // transformBackendResponse 已展平取 data，故 res.data 即内层 { total, data, ... }
      const inner = res?.data ?? res?.response?.data?.data ?? {}
      const rawList = inner.data || inner.rows || inner.items || inner.records || (Array.isArray(inner) ? inner : []) || []
      const list = rawList.map(toSnakeCaseKeys).map((row: any) => ({ ...row, question: normalizeQuestion(row.question) }))
      const total = inner.total ?? inner.total_count ?? list.length ?? 0
      return { data: { data: list, total } }
    } catch {
      return { data: { data: [], total: 0 } }
    }
  }

  const visibleKeys = useMemo(() => new Set(columnOptions.filter(c => c.visible).map(c => c.key)), [columnOptions])

  const handleColumnToggle = (key: string, visible: boolean) => {
    setColumnOptions(prev => prev.map(c => (c.key === key ? { ...c, visible } : c)))
  }

  // 切换视图时清空批量选中态，避免切到卡片视图后批量删除按钮仍可点击
  const handleViewModeChange = (mode: 'list' | 'card') => {
    setSelectedRowKeys([])
    setViewMode(mode)
  }

  const {
    columnChecks,
    data,
    run,
    searchProps,
    setColumnChecks,
    tableProps,
    updateSearchParams,
    searchParams,
  } = useTable({
    apiFn: fetchEffectReviewList as any,
    apiParams: {
      page: 1,
      page_size: 10,
      space_id: spaceId,
    } as any,
    columns: () =>
      [
        {
          align: 'left',
          className: 'col-left',
          dataIndex: 'question',
          ellipsis: true,
          key: 'question',
          minWidth: 200,
          onHeaderCell: () => ({ className: 'col-left-header' }),
          render: (text: string) => (
            <ATooltip placement="topLeft" title={text}>
              <div
                style={{
                  maxWidth: 300,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {text}
              </div>
            </ATooltip>
          ),
          title: '问题',
          width: 300,
        },
        {
          align: 'center',
          dataIndex: 'chat_mode',
          key: 'chat_mode',
          minWidth: 100,
          render: (chatMode: string) => MEMORY_CHAT_MODE_OPTIONS.find((item: any) => item.value === chatMode)?.label || '未知',
          title: '场景类型',
          width: 100,
        },
        {
          align: 'left',
          className: 'col-left',
          dataIndex: 'ai_response',
          ellipsis: true,
          key: 'ai_response',
          minWidth: 200,
          onHeaderCell: () => ({ className: 'col-left-header' }),
          title: 'ai信息',
          width: 200,
        },
        {
          align: 'left',
          className: 'col-left',
          dataIndex: 'view_response',
          ellipsis: true,
          key: 'view_response',
          minWidth: 200,
          onHeaderCell: () => ({ className: 'col-left-header' }),
          title: 'view信息',
          width: 200,
        },
        {
          align: 'center',
          dataIndex: 'create_by',
          key: 'create_by',
          minWidth: 120,
          title: '提交人',
          width: 120,
        },
        {
          align: 'center',
          dataIndex: 'eval_user',
          key: 'eval_user',
          render: (evalExpert: string) => (
            <span>
              {evalExpert === '0' && '👍'}
              {evalExpert === '1' && '👎'}
            </span>
          ),
          title: '提交意见',
          width: 100,
        },
        {
          align: 'center',
          dataIndex: 'status',
          key: 'status',
          render: (status: number) => MEMORY_STATUS_OPTIONS.find((item: any) => item.value === `${status}`)?.label || '未审核',
          title: '审核状态',
          width: 100,
        },
        {
          align: 'center',
          dataIndex: 'eval_by',
          key: 'eval_by',
          minWidth: 120,
          title: '评估人',
          width: 120,
        },
        {
          align: 'left',
          className: 'col-left',
          dataIndex: 'expert_opinion',
          ellipsis: true,
          key: 'expert_opinion',
          minWidth: 200,
          onHeaderCell: () => ({ className: 'col-left-header' }),
          title: '评估意见',
          width: 200,
        },
        {
          align: 'center',
          dataIndex: 'eval_llm',
          key: 'eval_llm',
          render: (evalLlm: string) => EVAL_LLM_OPTIONS.find((item: any) => item.value === evalLlm)?.label,
          title: '模型评估结果',
          width: 120,
        },
        {
          align: 'left',
          className: 'col-left',
          dataIndex: 'llm_opinion',
          ellipsis: true,
          key: 'llm_opinion',
          minWidth: 200,
          onHeaderCell: () => ({ className: 'col-left-header' }),
          title: '模型评估意见',
          width: 200,
        },
        {
          align: 'center',
          dataIndex: 'eval_time',
          key: 'eval_time',
          minWidth: 180,
          render: (time: string) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-'),
          title: '审核时间',
          width: 180,
        },
        {
          align: 'center',
          dataIndex: 'create_time',
          key: 'create_time',
          minWidth: 180,
          render: (time: string) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-'),
          title: '提交时间',
          width: 180,
        },
        {
          align: 'center',
          dataIndex: 'operation',
          fixed: 'right',
          key: 'operate',
          minWidth: 240,
          render: (_: unknown, record: any) => (
            <div className="ds-action-group">
              <AButton className="abi-action-link" size="small" variant="link" onClick={() => openEval(record)}>
                <AuditOutlined style={{ marginRight: 3, fontSize: 12 }} />评估
              </AButton>
              <Popconfirm title="删除后不可恢复，确定删除吗？" onConfirm={() => handleDelete(record)}>
                <AButton className="abi-action-link-danger" size="small" variant="link">
                  <DeleteOutlined style={{ marginRight: 3, fontSize: 12 }} />删除
                </AButton>
              </Popconfirm>
            </div>
          ),
          title: '操作',
          width: 240,
        }, 
      ] as any,
    rowKey: 'fb_id',
  } as any)

  const filteredColumns = useMemo(() => {
    const cols = tableProps.columns as any[]
    if (!cols) return cols
    return cols.filter((col: any) => col.key === 'operate' || visibleKeys.has(col.key))
  }, [tableProps.columns, visibleKeys])

  const { checkedRowKeys, editingData, generalPopupOperation, handleEdit, onDeleted } = useTableOperate(
    data as any,
    run,
    async (res: any, type) => {
      if (type === 'add') {
        return
      }

      // 编辑反馈（专家评估）：后端在编辑成功后会自动同步向量库
      const editRes: any = await fetchEditMemory({
        evalExpert: res.eval_expert ?? undefined,
        expertOpinion: res.expert_opinion ?? undefined,
        fbId: editingData?.fb_id,
        remark: res.remark ?? undefined,
        status: res.status,
      })
      if (editRes?.error) return false
    },
  )

  /** 将文本字段归一化为字符串，避免对象值传入 CodeMirror / TextArea 报错 */
  const toText = (val: any) => {
    if (val == null) return ''
    return typeof val === 'string' ? val : JSON.stringify(val, null, 2)
  }

  /** 打开人工评估抽屉：先调 detail 详情接口（传 fbId）拿最新数据，再将数值型字段归一化为字符串以匹配单选项 */
  const openEval = async (rawRecord: any) => {
    let record = rawRecord
    try {
      const res: any = await fetchMemoryDetail(rawRecord.fb_id)
      if (!res?.error) {
        // 详情接口返回单条记录：{ code, msg, data: {...} }；若后端返数组结构则取第一条兼容
        const inner = res?.data ?? res?.response?.data?.data ?? {}
        const raw = Array.isArray(inner?.data) ? inner.data[0] : Array.isArray(inner) ? inner[0] : inner
        if (raw && typeof raw === 'object' && Object.keys(raw).length > 0) {
          const detail = toSnakeCaseKeys(raw)
          record = { ...rawRecord, ...detail, question: normalizeQuestion(detail.question ?? rawRecord.question) }
        }
      }
    } catch (error) {
      // 详情查询失败时降级使用列表行数据，保证抽屉仍可打开
      console.log('查询评审详情失败:', error)
    }
    handleEdit({
      ...record,
      ai_response: toText(record.ai_response),
      eval_expert: record.eval_expert != null ? `${record.eval_expert}` : undefined,
      eval_llm: record.eval_llm != null ? `${record.eval_llm}` : undefined,
      status: record.status != null ? `${record.status}` : undefined,
      view_response: toText(record.view_response),
    })
  }

  async function handleDelete(record: any) {
    try {
      // 删除反馈记录，后端会同步清理关联的向量数据
      const res: any = await fetchDeleteMemory(record.fb_id)
      if (!res?.error) {
        onDeleted()
      }
    } catch (error) {
      console.log('删除失败:', error)
    }
  }

  /** 批量删除：调用后端 batchDelete 接口，后端会同步清理关联的向量数据 */
  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的数据')
      return
    }
    Modal.confirm({
      title: '批量删除',
      content: `删除后不可恢复，确定删除选中的 ${selectedRowKeys.length} 条数据吗？`,
      okText: '确认',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const res: any = await fetchBatchDeleteMemory(selectedRowKeys as (string | number)[])
          if (!res?.error) {
            message.success('批量删除成功')
            setSelectedRowKeys([])
            run()
          }
        } catch (error) {
          console.log('批量删除失败:', error)
        }
      },
    })
  }

  const handleReset = () => {
    searchProps.form.resetFields()
    setDateRange(null)
    run()
  }

  const handleSearch = () => {
    const values: any = searchProps.form.getFieldsValue()
    updateSearchParams({
      ...values,
      page: 1,
      pageNum: 1,
      space_id: spaceId,
    } as any)
    run()
  }

  // 搜索框停止输入 1s 后自动查询；清空时立即查询
  const { cancel: cancelDebouncedSearch, run: runDebouncedSearch } = useDebounceFn(handleSearch, { wait: 1000 })
  const handleSearchValuesChange = (changed: Record<string, unknown>): void => {
    if (!Object.prototype.hasOwnProperty.call(changed, 'question')) return
    const value = changed.question
    if (value === undefined || value === null || value === '') {
      cancelDebouncedSearch()
      handleSearch()
    } else {
      runDebouncedSearch()
    }
  }

  const pagination = tableProps.pagination as any
  const currentPage = searchParams.current?.pageNum || searchParams.current?.page || 1
  const pageSizeVal = searchParams.current?.pageSize || searchParams.current?.page_size || 10
  // 前端按提交时间（create_time）过滤 + 前端分页（useTable 返回全量数据）
  const filteredData = useMemo(
    () => filterByCreateTime((data as any[]) || [], dateRange, 'create_time'),
    [data, dateRange]
  )
  const totalCount = filteredData.length
  const totalPages = Math.ceil(totalCount / pageSizeVal) || 1
  const pagedData = useMemo(
    () => filteredData.slice((currentPage - 1) * pageSizeVal, currentPage * pageSizeVal),
    [filteredData, currentPage, pageSizeVal]
  )

  const handlePageSizeChange = (value: number) => {
    pagination?.onChange?.(1, value)
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      pagination?.onChange?.(page, pageSizeVal)
    }
  }

  const handlePrev = () => {
    if (currentPage > 1) handlePageChange(currentPage - 1)
  }

  const handleNext = () => {
    if (currentPage < totalPages) handlePageChange(currentPage + 1)
  }

  const handleJump = () => {
    const page = parseInt(jumpValue, 10)
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      handlePageChange(page)
      setJumpValue('')
    }
  }

  const renderPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else if (currentPage <= 3) {
      for (let i = 1; i <= 4; i++) pages.push(i)
      pages.push('...', totalPages)
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, '...')
      for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1, '...')
      pages.push(currentPage - 1, currentPage, currentPage + 1)
      pages.push('...', totalPages)
    }
    return pages.map((page, idx) => {
      if (page === '...') return <span key={`ellipsis-${idx}`} className="page-item page-ellipsis">...</span>
      const isActive = page === currentPage
      return (
        <span key={page} className={`page-item ${isActive ? 'page-active' : ''}`} onClick={() => handlePageChange(page as number)}>
          {page}
        </span>
      )
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <AForm form={searchProps.form as any} layout="inline" style={{ display: 'contents' }} onValuesChange={handleSearchValuesChange}>
        <section className="abi-searchbar">
          <SearchFilterBar
            searchSlot={
              <AForm.Item name="question" className="m-0 flex-1 min-w-0">
                <AInput
                  allowClear
                  className="abi-field-input w-full"
                  placeholder="请输入问题"
                  prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
                  onPressEnter={() => { cancelDebouncedSearch(); handleSearch(); }}
                />
              </AForm.Item>
            }
            onQuery={handleSearch}
            onReset={handleReset}
            filters={
              <>
                <SearchFilterField label="时间范围">
                  <DeferredRangePicker
                    allowClear
                    className="abi-field-input"
                    format="YYYY-MM-DD"
                    getPopupContainer={getFilterPopupContainer}
                    placeholder={['开始时间', '结束时间']}
                    value={dateRange}
                    onChange={(dates) => { setDateRange(dates as [any, any] | null); updateSearchParams({ page: 1, pageNum: 1 } as any); }}
                  />
                </SearchFilterField>
                <SearchFilterField label="场景类型">
                  <AForm.Item name="chat_mode" className="m-0">
                    <ASelect
                      allowClear
                      className="abi-field-input w-full"
                      getPopupContainer={getFilterPopupContainer}
                      options={MEMORY_CHAT_MODE_OPTIONS}
                      placeholder="场景类型"
                    />
                  </AForm.Item>
                </SearchFilterField>
                <SearchFilterField label="审核状态">
                  <AForm.Item name="status" className="m-0">
                    <ASelect
                      allowClear
                      className="abi-field-input w-full"
                      getPopupContainer={getFilterPopupContainer}
                      options={MEMORY_STATUS_OPTIONS}
                      placeholder="审核状态"
                    />
                  </AForm.Item>
                </SearchFilterField>
              </>
            }
          />
        </section>
      </AForm>

      <section className="abi-data-area">
        <div className="abi-toolbar">
          <div className="abi-toolbar-left">
            <AButton danger disabled={selectedRowKeys.length === 0} onClick={handleBatchDelete}>
              <DeleteOutlined /> 批量删除{selectedRowKeys.length ? `(${selectedRowKeys.length})` : ''}
            </AButton>
          </div>
          <ViewControls
            columns={columnOptions}
            viewMode={viewMode}
            onColumnToggle={handleColumnToggle}
            onViewModeChange={handleViewModeChange}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {viewMode === 'list' ? (
            <div
              style={{
                border: '1px solid rgba(130,140,200,0.18)',
                borderRadius: '12px',
                overflow: 'hidden',
                flex: 1,
                minHeight: 0,
              }}
            >
              <div className="assistant-table-scroll" style={{ overflow: 'auto', maxHeight: '100%' }}>
                <ATable
                  columns={filteredColumns as any}
                  dataSource={pagedData}
                  loading={tableProps.loading}
                  pagination={false}
                  rowKey="fb_id"
                  rowSelection={{
                    selectedRowKeys,
                    onChange: (keys: Key[]) => setSelectedRowKeys(keys),
                  }}
                  scroll={pagedData?.length > 0 ? { x: 'max-content' } : undefined}
                  size="middle"
                  locale={{ emptyText: <TableEmpty description="暂无评审数据" /> }}
                  className="effect-review-table abi-std-table"
                />
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
              {(pagedData?.length ?? 0) === 0 ? (
                <div className="abi-card-empty"><AEmpty description="暂无评审数据" image={AEmpty.PRESENTED_IMAGE_SIMPLE} /></div>
              ) : (
                <div className="abi-card-grid">
                  <div className="abi-card-grid-inner">
                    {pagedData.map((record: any) => {
                      return (
                        <div key={record.fb_id} className="abi-data-card" style={{ position: 'relative' }}>
                          <div className="abi-data-card-head">
                            <div className="abi-data-card-title">
                              <ATooltip placement="topLeft" title={record.question}>
                                <span className="abi-data-card-name">{record.question || '-'}</span>
                              </ATooltip>
                            </div>
                            <Tag color="blue" style={{ flexShrink: 0, marginInlineEnd: 0 }}>
                              {MEMORY_CHAT_MODE_OPTIONS.find((item: any) => item.value === record.chat_mode)?.label || '未知'}
                            </Tag>
                          </div>
                          <div className="abi-data-card-body">
                            <div className="row">
                              <span className="lbl">审核状态</span>
                              <span className="val">
                                {MEMORY_STATUS_OPTIONS.find((item: any) => item.value === `${record.status}`)?.label || '未审核'}
                              </span>
                            </div>
                            <div className="row">
                              <span className="lbl">提交人</span>
                              <span className="val">{record.create_by || '-'}</span>
                            </div>
                            <div className="row">
                              <span className="lbl">提交时间</span>
                              <span className="val">{record.create_time ? dayjs(record.create_time).format('YYYY-MM-DD HH:mm:ss') : '-'}</span>
                            </div>
                          </div>
                          <div className="abi-data-card-footer">
                            <button className="abi-card-act" onClick={() => openEval(record)}>
                              <AuditOutlined style={{ marginRight: 3, fontSize: 12 }} />评估
                            </button>
                            <Dropdown
                              menu={{
                                items: [
                                  {
                                    key: 'delete',
                                    danger: true,
                                    label: (
                                      <Popconfirm title="删除后不可恢复，确定删除吗？" onConfirm={() => handleDelete(record)}>
                                        <span>删除</span>
                                      </Popconfirm>
                                    ),
                                  },
                                ],
                              }}
                              trigger={['click']}
                            >
                              <button className="abi-card-more" onClick={(e) => e.stopPropagation()}>
                                <MoreOutlined />
                              </button>
                            </Dropdown>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="data-source-pagination">
            <span className="total-text">共 {totalCount} 条</span>
            <div className="pagination-controls">
              <ASelect
                value={pageSizeVal}
                onChange={handlePageSizeChange}
                options={[
                  { label: '10条/页', value: 10 },
                  { label: '15条/页', value: 15 },
                  { label: '20条/页', value: 20 },
                  { label: '25条/页', value: 25 },
                  { label: '30条/页', value: 30 },
                ]}
                className="page-size-select"
              />
              <button className="page-btn" disabled={currentPage === 1} onClick={handlePrev}>
                <LeftOutlined />
              </button>
              {renderPageNumbers()}
              <button className="page-btn" disabled={currentPage === totalPages} onClick={handleNext}>
                <RightOutlined />
              </button>
              <span className="quick-jumper">
                前往
                <AInput
                  className="jump-input"
                  style={{ width: 48, textAlign: 'center' }}
                  value={jumpValue}
                  onChange={(e) => setJumpValue(e.target.value)}
                  onPressEnter={handleJump}
                />
                页
              </span>
            </div>
          </div>
        </div>
      </section>

      <Suspense>
        <EffectReviewOperateDrawer {...generalPopupOperation} />
      </Suspense>
    </div>
  )
}
