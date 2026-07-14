import {
  DeleteOutlined,
  DeploymentUnitOutlined,
  LeftOutlined,
  ReloadOutlined,
  RightOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Empty, Popconfirm, message } from 'antd'
import dayjs from 'dayjs'
import { Suspense, lazy, useMemo, useState } from 'react'

import { ViewControls } from '@/components/ViewControls'
import type { ColumnOption } from '@/components/ViewControls'
import { EVAL_LLM_OPTIONS, MEMORY_CHAT_MODE_OPTIONS, MEMORY_STATUS_OPTIONS } from '@/constants/assistant-config'
import { useAppSelector } from '@/hooks/business/useStore'
import { fetchModelList } from '@/service/api'
import {
  fetchDeleteMemory,
  fetchEditMemory,
  fetchMemoryList,
  fetchModelEval,
  fetchVectorStorage,
  fetchVectorsDelete,
  getAgentDetailById,
  syncKnowledgeBase,
  fetchTerms,
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
  const [modelEvalLoading, setModelEvalLoading] = useState(false)
  const [jumpValue, setJumpValue] = useState('')
  const [columnOptions, setColumnOptions] = useState<ColumnOption[]>(ALL_COLUMNS)

  const isWenShuScene = (chatMode: string) => chatMode === 'chat_with_db_execute'

  const fetchEffectReviewList = async (params: any) => {
    try {
      const result: any = await fetchMemoryList(params)
      const res = result?.data
      if (res?.error || !res?.data) {
        return { data: { data: [], total: 0 } }
      }
      const inner = res.data
      return {
        data: {
          data: inner.items || inner.data || [],
          total: inner.total_count || inner.total || 0,
        },
      }
    } catch {
      return { data: { data: [], total: 0 } }
    }
  }

  const visibleKeys = useMemo(() => new Set(columnOptions.filter(c => c.visible).map(c => c.key)), [columnOptions])

  const handleColumnToggle = (key: string, visible: boolean) => {
    setColumnOptions(prev => prev.map(c => (c.key === key ? { ...c, visible } : c)))
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
          title: '问题',
          width: 200,
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
          minWidth: 140,
          render: (_: unknown, record: any) => (
            <div className="ds-action-group">
              <ATooltip placement="top" title="人工评估">
                <AButton
                  className="abi-action-link"
                  icon={<UserOutlined />}
                  size="small"
                  variant="link"
                  onClick={() => handleEdit(record)}
                />
              </ATooltip>
              <Popconfirm title="确定进行模型评估吗？" onConfirm={() => handleModelEval(record)}>
                <ATooltip placement="top" title="模型评估">
                  <AButton
                    className="abi-action-link"
                    disabled={modelEvalLoading || ['0', '1'].includes(`${record.status}`) || !isWenShuScene(record.chat_mode)}
                    icon={<DeploymentUnitOutlined />}
                    size="small"
                    variant="link"
                  />
                </ATooltip>
              </Popconfirm>
              <Popconfirm title="删除后不可恢复，确定删除吗？" onConfirm={() => handleDelete(record)}>
                <ATooltip title="删除">
                  <AButton className="abi-action-link" color="danger" icon={<DeleteOutlined />} size="small" variant="link" />
                </ATooltip>
              </Popconfirm>
            </div>
          ),
          title: '操作',
          width: 140,
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

      const currentUserObj = JSON.parse(localStorage.getItem('SOY-REACT_userInfo') || '{}')
      const recordAgentId = editingData?.agent_id

      const updateRes: any = await fetchEditMemory({
        ...res,
        eval_by: currentUserObj.userName,
        fb_id: editingData?.fb_id,
        status: res.status,
      })
      if (!updateRes?.response?.data?.success) return false

      if (res.eval_user === '0' && recordAgentId) {
        const evaluateRes = await fetchVectorStorage({
          fb_id: editingData?.fb_id,
        })
        if (!evaluateRes?.response?.data?.success) return false

        try {
          const detailRes = await getAgentDetailById(recordAgentId)
          const detailData = detailRes.data
          const modelConfig = detailData.modelConfig ? JSON.parse(detailData.modelConfig) : {}
          const cfg = modelConfig?.modelConfigs?.[0] || {}
          let dslObj = modelConfig?.mdlConfigs || {}
          try {
            if (cfg?.termGroupId) {
              const termRes = await fetchTerms({ groupId: cfg.termGroupId, spaceId, termName: '' })
              const termMap: Record<string, string> = {}
              ;(termRes?.data || []).forEach((it: any) => {
                if (it?.techName) termMap[it.techName] = it.bizName
                if (it?.engName) termMap[it.engName] = it.bizName
              })
              const rewrite = (node: any) => {
                if (!node || typeof node !== 'object') return
                if (typeof node.displayName === 'string') {
                  const v = termMap[node.displayName]
                  if (v) node.displayName = v
                }
                Object.keys(node).forEach((k) => rewrite(node[k]))
              }
              rewrite(dslObj)
            }
          } catch {}
          await syncKnowledgeBase({
            agent_id: `${recordAgentId}`,
            dsl: JSON.stringify(dslObj || {}),
            space_id: `${spaceId}`,
          })
        } catch (error) {
          console.log('同步向量知识库失败:', error)
        }
      }
    },
  )

  async function handleDelete(record: any) {
    try {
      const res = await fetchDeleteMemory(record.fb_id)
      if (res?.response?.data?.success) {
        if (record.pk_id) {
          try {
            await fetchVectorsDelete(record.fb_id)
          } catch (error) {
            console.log('删除向量数据库失败:', error)
          }
        }
        onDeleted()
      }
    } catch (error) {
      console.log('删除失败:', error)
    }
  }

  const handleModelEval = async (record: any) => {
    try {
      const modelListRes = await fetchModelList({ pageNum: 1, pageSize: 1000 })
      const modelList = modelListRes?.data?.data || []
      const recordLlmId = record.llm_id ?? record.llms?.[0]
      const modelInfo = modelList.find((item: any) => `${item?.llmId}` === `${recordLlmId}`)
      if (!modelInfo) {
        message.error('未找到模型相关信息')
        return
      }
      setModelEvalLoading(true)
      const modelConfig = modelInfo?.modelConfig ? JSON.parse(modelInfo.modelConfig) : {}
      const contextObj = {
        agent_id: `${record.agent_id}`,
        app_code: '',
        chat_id: `${record.chat_id}`,
        chat_mode: record.chat_mode,
        conv_uid: record.conv_uid,
        extra: {
          fb_id: record.fb_id,
        },
        space_id: `${record.space_id}`,
        sys_code: '1',
        user_name: '1',
      }
      const params = {
        context: contextObj,
        enable_vis: false,
        incremental: false,
        max_new_tokens: modelConfig.max_token,
        messages: '',
        model: modelInfo?.modelName,
        stream: false,
        temperature: modelConfig.temperature,
      }
      const res = await fetchModelEval(params)
      if (res.response?.data?.success) {
        message.success('模型评估成功')
        run()
      } else {
        message.error(res.response?.data?.err_msg)
      }
    } catch (error) {
      console.log(error)
    } finally {
      setModelEvalLoading(false)
    }
  }

  const handleReset = () => {
    searchProps.form.resetFields()
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

  const pagination = tableProps.pagination as any
  const currentPage = searchParams.current?.pageNum || searchParams.current?.page || 1
  const pageSizeVal = searchParams.current?.pageSize || searchParams.current?.page_size || 10
  const totalCount = pagination?.total || 0
  const totalPages = Math.ceil(totalCount / pageSizeVal) || 1

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

  const showEmpty = !tableProps.loading && (!tableProps.dataSource || tableProps.dataSource.length === 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <AForm form={searchProps.form as any} layout="inline">
        <section className="abi-searchbar">
          <div className="abi-search-row">
            <AForm.Item name="question" className="!mb-0">
              <AInput allowClear className="abi-field-input" placeholder="请输入问题" style={{ width: 200 }} />
            </AForm.Item>
            <AForm.Item name="create_by" className="!mb-0">
              <AInput allowClear className="abi-field-input" placeholder="请输入提交人" style={{ width: 160 }} />
            </AForm.Item>
            <AForm.Item name="eval_by" className="!mb-0">
              <AInput allowClear className="abi-field-input" placeholder="请输入评估人" style={{ width: 160 }} />
            </AForm.Item>
            <AForm.Item name="chat_mode" className="!mb-0">
              <ASelect allowClear className="abi-field-input" options={MEMORY_CHAT_MODE_OPTIONS} placeholder="场景类型" style={{ width: 140 }} />
            </AForm.Item>
            <AForm.Item name="status" className="!mb-0">
              <ASelect allowClear className="abi-field-input" options={MEMORY_STATUS_OPTIONS} placeholder="审核状态" style={{ width: 140 }} />
            </AForm.Item>
          </div>
        </section>
      </AForm>

      <section className="abi-data-area">
        <div className="abi-toolbar">
          <div className="abi-toolbar-left">
            <AButton className="btn-accent-gradient" type="primary" onClick={handleSearch}>
              <SearchOutlined /> {t('common.search')}
            </AButton>
            <AButton className="btn-ghost-v5" onClick={handleReset}>
              <ReloadOutlined /> {t('common.reset')}
            </AButton>
          </div>
          <ViewControls hideViewToggle columns={columnOptions} onColumnToggle={handleColumnToggle} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div
            style={{
              border: '1px solid rgba(130,140,200,0.18)',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            {showEmpty ? (
              <div style={{ alignItems: 'center', display: 'flex', flex: 1, justifyContent: 'center' }}>
                <Empty description="暂无数据" />
              </div>
            ) : (
              <div className="assistant-table-scroll" style={{ flex: 1, overflow: 'auto' }}>
                <ATable
                  columns={filteredColumns as any}
                  dataSource={tableProps.dataSource}
                  loading={tableProps.loading}
                  pagination={false}
                  rowKey="fb_id"
                  scroll={{ x: 'max-content' }}
                  size="middle"
                  className="effect-review-table abi-std-table"
                />
              </div>
            )}
          </div>

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
