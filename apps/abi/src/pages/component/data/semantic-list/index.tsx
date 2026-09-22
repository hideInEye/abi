import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  LoadingOutlined,
  MoreOutlined,
  PlusOutlined,
  StopOutlined
} from '@ant-design/icons'
import { Button, Dropdown, Grid, Modal, Pagination, Spin, Switch, Table, Tooltip, message } from 'antd'
import type { TableColumnsType } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ViewControls } from '@/components/ViewControls'
import type { ColumnOption } from '@/components/ViewControls'
import { useAppSelector } from '@/hooks/business/useStore'
import { getSpaceId } from '@/store/slice/app'

import { SemanticListFilters } from './components/SemanticListFilters'
import { SemanticRuleCardList } from './components/SemanticRuleCardList'
import { SemanticRuleDetailDrawer } from './components/SemanticRuleDetailDrawer'
import { SemanticRuleDrawer } from './components/SemanticRuleDrawer'
import { EMPTY_FILTERS, LIST_TYPE_LABELS, PAGE_SIZE, VISIBILITY_LABELS } from './constants'
import { useSemanticListManagement } from './hooks/useSemanticListManagement'
import { TABLE_SELECTION_COLUMN_WIDTH, getResponsiveOverlayWidths, getTableScrollWidth } from './semantic-list-layout'
import styles from './semantic-list.module.scss'
import type { SemanticRule, SemanticRuleDraft, SemanticRuleFilters, SemanticRuleId } from './types'

type ExistingPanelMode = 'detail' | 'edit'
type RulePanelState = { mode: 'create' } | { mode: ExistingPanelMode; rule: SemanticRule } | null

interface PanelLoadingState {
  mode: ExistingPanelMode
  ruleId: SemanticRuleId
}

type DeleteConfirmation = { kind: 'batch'; ruleIds: SemanticRuleId[] } | { kind: 'single'; rule: SemanticRule }

type BatchStatusAction = 'disable' | 'enable'

interface BatchActionState {
  deletePending: boolean
  hasSelection: boolean
  loading: boolean
  statusPending: boolean
}

const DEFAULT_COLUMN_OPTIONS: ColumnOption[] = [
  { key: 'name', label: '规则名称', visible: true },
  { key: 'code', label: '规则编码', visible: true },
  { key: 'visibility', label: '可见性', visible: true },
  { key: 'type', label: '名单类型', visible: true },
  { key: 'category', label: '业务类别', visible: true },
  { key: 'target', label: '匹配目标', visible: true },
  { key: 'enabled', label: '状态', visible: true },
  { key: 'updatedAt', label: '更新时间', visible: true }
]

function shouldDisableBatchActions({ deletePending, hasSelection, loading, statusPending }: BatchActionState) {
  return !hasSelection || loading || deletePending || statusPending
}

function getBatchTooltip(hasSelection: boolean, disabled: boolean): string | undefined {
  if (!hasSelection) return '请先选择规则'
  return disabled ? '操作处理中，请稍候' : undefined
}

function getDeleteConfirmationContent(confirmation: DeleteConfirmation | null): string {
  if (!confirmation) return ''
  if (confirmation.kind === 'batch') {
    return `确认删除已选择的 ${confirmation.ruleIds.length} 条规则？删除后不可恢复。`
  }
  return `确认删除规则“${confirmation.rule.name}”？删除后不可恢复。`
}

export const Component = () => {
  const screens = Grid.useBreakpoint()
  const { confirmWidth, drawerWidth } = getResponsiveOverlayWidths(screens.lg)
  const [messageApi, messageContext] = message.useMessage()
  const spaceId = useAppSelector(getSpaceId) || 0
  const activeSpaceIdRef = useRef(spaceId)
  activeSpaceIdRef.current = spaceId
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list')
  const [columnOptions, setColumnOptions] = useState<ColumnOption[]>(() =>
    DEFAULT_COLUMN_OPTIONS.map(column => ({ ...column }))
  )
  const [draftFilters, setDraftFilters] = useState<SemanticRuleFilters>({ ...EMPTY_FILTERS })
  const [appliedFilters, setAppliedFilters] = useState<SemanticRuleFilters>({ ...EMPTY_FILTERS })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [panelState, setPanelState] = useState<RulePanelState>(null)
  const [panelLoading, setPanelLoading] = useState<PanelLoadingState | null>(null)
  const panelRequestSequence = useRef(0)
  const [statusPendingIds, setStatusPendingIds] = useState<Set<SemanticRuleId>>(new Set())
  const [batchStatusAction, setBatchStatusAction] = useState<BatchStatusAction | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation | null>(null)
  const [deletePending, setDeletePending] = useState(false)

  const {
    businessCategoryOptions,
    createRule,
    deleteRule,
    deleteRules,
    dictionaryLoading,
    fetchRuleDetail,
    loading,
    matchTargetOptions,
    refresh,
    rules,
    total,
    updateRule,
    updateRulesStatus,
    updateRuleStatus
  } = useSemanticListManagement({
    filters: appliedFilters,
    pageNum: currentPage,
    pageSize,
    spaceId
  })

  const visibleColumnKeys = useMemo(
    () => new Set(columnOptions.filter(column => column.visible).map(column => column.key)),
    [columnOptions]
  )
  const targetLabelMap = useMemo(
    () => new Map(matchTargetOptions.map(option => [option.value, option.label])),
    [matchTargetOptions]
  )
  const getTargetLabel = useCallback(
    (target: string): string => (targetLabelMap.get(target) ?? target) || '-',
    [targetLabelMap]
  )
  const categoryLabelMap = useMemo(
    () => new Map(businessCategoryOptions.map(option => [option.value, option.label])),
    [businessCategoryOptions]
  )
  const getCategoryLabel = useCallback(
    (category: string): string => (categoryLabelMap.get(category) ?? category) || '-',
    [categoryLabelMap]
  )

  useEffect(() => {
    panelRequestSequence.current += 1
    setCurrentPage(1)
    setSelectedRowKeys([])
    setStatusPendingIds(new Set())
    setBatchStatusAction(null)
    setPanelState(null)
    setPanelLoading(null)
    setDeleteConfirmation(null)
    setDeletePending(false)
  }, [spaceId])

  function applyFilters() {
    setAppliedFilters({ ...draftFilters })
    setCurrentPage(1)
    setSelectedRowKeys([])
  }

  function resetFilters() {
    setDraftFilters({ ...EMPTY_FILTERS })
    setAppliedFilters({ ...EMPTY_FILTERS })
    setCurrentPage(1)
    setSelectedRowKeys([])
  }

  async function openExistingPanel(rule: SemanticRule, mode: ExistingPanelMode): Promise<void> {
    panelRequestSequence.current += 1
    const requestId = panelRequestSequence.current
    setPanelLoading({ mode, ruleId: rule.id })
    try {
      const detail = await fetchRuleDetail(rule.id)
      if (requestId !== panelRequestSequence.current) return
      setPanelState({ mode, rule: detail })
    } catch {
      if (requestId === panelRequestSequence.current) messageApi.error('规则详情加载失败，请重试')
    } finally {
      if (requestId === panelRequestSequence.current) setPanelLoading(null)
    }
  }

  function closePanel() {
    panelRequestSequence.current += 1
    setPanelLoading(null)
    setPanelState(null)
  }

  async function handleStatusChange(rule: SemanticRule, enabled: boolean): Promise<void> {
    const requestSpaceId = spaceId
    setStatusPendingIds(ids => new Set(ids).add(rule.id))
    try {
      await updateRuleStatus(rule, enabled)
      if (activeSpaceIdRef.current !== requestSpaceId) return
      messageApi.success(enabled ? '已启用' : '已禁用')
      await refresh()
    } catch {
      if (activeSpaceIdRef.current === requestSpaceId) messageApi.error('状态更新失败，请重试')
    } finally {
      if (activeSpaceIdRef.current === requestSpaceId) {
        setStatusPendingIds(ids => {
          const next = new Set(ids)
          next.delete(rule.id)
          return next
        })
      }
    }
  }

  async function handleBatchStatusChange(enabled: boolean): Promise<void> {
    const ruleIds = selectedRowKeys.map(key => key as SemanticRuleId)
    if (!ruleIds.length) return
    const requestSpaceId = spaceId

    setBatchStatusAction(enabled ? 'enable' : 'disable')
    setStatusPendingIds(ids => new Set([...ids, ...ruleIds]))
    try {
      await updateRulesStatus(ruleIds, enabled)
      if (activeSpaceIdRef.current !== requestSpaceId) return
      setSelectedRowKeys([])
      messageApi.success(enabled ? '批量启用成功' : '批量禁用成功')
      await refresh()
    } catch {
      if (activeSpaceIdRef.current === requestSpaceId) {
        messageApi.error(enabled ? '批量启用失败，请重试' : '批量禁用失败，请重试')
      }
    } finally {
      if (activeSpaceIdRef.current === requestSpaceId) {
        setBatchStatusAction(null)
        setStatusPendingIds(ids => {
          const next = new Set(ids)
          ruleIds.forEach(ruleId => next.delete(ruleId))
          return next
        })
      }
    }
  }

  function requestSingleDelete(rule: SemanticRule) {
    setDeleteConfirmation({ kind: 'single', rule })
  }

  function requestBatchDelete() {
    const ruleIds = selectedRowKeys.map(key => key as SemanticRuleId)
    if (!ruleIds.length) return
    setDeleteConfirmation({ kind: 'batch', ruleIds })
  }

  async function confirmDelete(): Promise<void> {
    if (!deleteConfirmation) return
    const requestSpaceId = spaceId
    const isBatch = deleteConfirmation.kind === 'batch'
    const ruleIds = isBatch ? deleteConfirmation.ruleIds : [deleteConfirmation.rule.id]
    setDeletePending(true)
    try {
      if (isBatch) {
        await deleteRules(ruleIds)
      } else {
        await deleteRule(ruleIds[0]!)
      }
      if (activeSpaceIdRef.current !== requestSpaceId) return

      setSelectedRowKeys(keys => (isBatch ? [] : keys.filter(key => key !== ruleIds[0])))
      const remainingTotal = Math.max(0, total - ruleIds.length)
      const lastPage = Math.max(1, Math.ceil(remainingTotal / pageSize))
      if (currentPage > lastPage) {
        setCurrentPage(lastPage)
      } else {
        await refresh()
      }
      messageApi.success(isBatch ? '批量删除成功' : '删除成功')
      setDeleteConfirmation(null)
    } catch {
      if (activeSpaceIdRef.current === requestSpaceId) {
        messageApi.error(deleteConfirmation.kind === 'batch' ? '批量删除失败，请重试' : '删除失败，请重试')
      }
    } finally {
      if (activeSpaceIdRef.current === requestSpaceId) setDeletePending(false)
    }
  }

  async function handleRuleSubmit(draft: SemanticRuleDraft): Promise<void> {
    const requestSpaceId = spaceId
    try {
      if (panelState?.mode === 'edit') {
        await updateRule(panelState.rule, draft)
        if (activeSpaceIdRef.current !== requestSpaceId) return
        await refresh()
        messageApi.success('保存成功')
        return
      }

      await createRule(draft)
      if (activeSpaceIdRef.current !== requestSpaceId) return
      if (currentPage === 1) {
        await refresh()
      } else {
        setCurrentPage(1)
      }
      messageApi.success('创建成功')
    } catch (error) {
      if (activeSpaceIdRef.current === requestSpaceId) messageApi.error('保存失败，请重试')
      throw error
    }
  }

  function handlePaginationChange(page: number, nextPageSize: number) {
    setCurrentPage(nextPageSize === pageSize ? page : 1)
    setPageSize(nextPageSize)
  }

  function handleViewModeChange(mode: 'card' | 'list') {
    if (mode === viewMode) return
    setViewMode(mode)
    setSelectedRowKeys([])
  }

  function handleColumnToggle(key: string, visible: boolean) {
    setColumnOptions(options => options.map(column => (column.key === key ? { ...column, visible } : column)))
  }

  const columns: TableColumnsType<SemanticRule> = [
    {
      dataIndex: 'name',
      key: 'name',
      onCell: () => ({ className: styles.nameColumn }),
      onHeaderCell: () => ({ className: 'col-left-header' }),
      render: (name: string, rule) => (
        <button
          className={styles.ruleName}
          title={name}
          type="button"
          onClick={() => {
            openExistingPanel(rule, 'detail').catch(() => undefined)
          }}
        >
          {name}
        </button>
      ),
      title: '规则名称',
      width: 190
    },
    {
      dataIndex: 'code',
      ellipsis: true,
      key: 'code',
      render: (code: string) => (
        <code
          className={styles.ruleCode}
          title={code || '-'}
        >
          {code || '-'}
        </code>
      ),
      title: '规则编码',
      width: 180
    },
    {
      align: 'center',
      dataIndex: 'visibility',
      key: 'visibility',
      render: (visibility: SemanticRule['visibility']) => VISIBILITY_LABELS[visibility],
      title: '可见性',
      width: 100
    },
    {
      dataIndex: 'type',
      key: 'type',
      align:'center',
      render: (type: SemanticRule['type']) => (
        <span className={`abi-status-tag ${type === 'WHITELIST' ? 'status-normal' : 'status-error'}`}>
          {LIST_TYPE_LABELS[type]}
        </span>
      ),
      title: '名单类型',
      width: 140
    },
    {
      align: 'center',
      dataIndex: 'category',
      ellipsis: true,
      key: 'category',
      render: (category: string) => getCategoryLabel(category),
      title: '业务类别',
      width: 160
    },
    {
      align: 'center',
      className: styles.nowrapCell,
      dataIndex: 'target',
      key: 'target',
      onHeaderCell: () => ({ className: styles.nowrapCell }),
      render: (target: string) => getTargetLabel(target),
      title: '匹配目标',
      width: 150
    },
    {
      align: 'center',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean, rule) => (
        <Switch
          aria-label={`${rule.name}${enabled ? '已启用' : '已禁用'}`}
          checked={enabled}
          disabled={batchStatusAction !== null}
          loading={statusPendingIds.has(rule.id)}
          size="small"
          title={enabled ? '启用' : '禁用'}
          onChange={nextEnabled => {
            handleStatusChange(rule, nextEnabled).catch(() => undefined)
          }}
        />
      ),
      title: '状态',
      width: 90
    },
    {
      align: 'center',
      className: styles.nowrapCell,
      dataIndex: 'updatedAt',
      ellipsis: true,
      key: 'updatedAt',
      render: (updatedAt: string) => updatedAt || '-',
      title: '更新时间',
      width: 180
    },
    {
      align: 'center',
      className: styles.nowrapCell,
      fixed: 'right',
      key: 'operation',
      onHeaderCell: () => ({ className: styles.nowrapCell }),
      render: (_, rule) => (
        <div className="ds-action-group">
          <Button
            className="abi-action-link"
            icon={<EyeOutlined />}
            loading={panelLoading?.mode === 'detail' && panelLoading.ruleId === rule.id}
            size="small"
            type="link"
            onClick={() => {
              openExistingPanel(rule, 'detail').catch(() => undefined)
            }}
          >
            详情
          </Button>
          <Button
            className="abi-action-link"
            icon={<EditOutlined />}
            loading={panelLoading?.mode === 'edit' && panelLoading.ruleId === rule.id}
            size="small"
            type="link"
            onClick={() => {
              openExistingPanel(rule, 'edit').catch(() => undefined)
            }}
          >
            编辑
          </Button>
          <Button
            className="abi-action-link-danger"
            icon={<DeleteOutlined />}
            size="small"
            type="link"
            onClick={() => requestSingleDelete(rule)}
          >
            删除
          </Button>
        </div>
      ),
      title: '操作',
      width: 280
    }
  ]

  const hasSelection = selectedRowKeys.length > 0
  const batchActionsDisabled = shouldDisableBatchActions({
    deletePending,
    hasSelection,
    loading,
    statusPending: statusPendingIds.size > 0
  })
  const visibleColumns = columns.filter(
    column => column.key === 'operation' || visibleColumnKeys.has(String(column.key))
  )
  const tableScrollWidth = getTableScrollWidth(visibleColumns)
  const batchTooltip = getBatchTooltip(hasSelection, batchActionsDisabled)
  const deleteConfirmationContent = getDeleteConfirmationContent(deleteConfirmation)

  return (
    <>
      {messageContext}
      <div className={`${styles.pageRoot} h-full min-h-0 flex flex-col overflow-hidden`}>
        <SemanticListFilters
          businessCategoryOptions={businessCategoryOptions}
          dictionaryLoading={dictionaryLoading}
          matchTargetOptions={matchTargetOptions}
          value={draftFilters}
          onChange={setDraftFilters}
          onQuery={applyFilters}
          onReset={resetFilters}
        />
        <main
          aria-label="语义名单规则列表"
          className="abi-data-area min-h-0 flex flex-col flex-1"
        >
          <div className={`abi-toolbar ${styles.toolbar}`}>
            <div className={`abi-toolbar-left ${styles.toolbarActions}`}>
              <Button
                className="btn-accent-gradient"
                disabled={spaceId <= 0}
                icon={<PlusOutlined />}
                type="primary"
                onClick={() => setPanelState({ mode: 'create' })}
              >
                新增规则
              </Button>
              <Tooltip title={batchTooltip}>
                <span className="inline-flex">
                  <Dropdown
                    menu={{
                      items: [
                        {
                          disabled: batchActionsDisabled,
                          icon: batchStatusAction === 'enable' ? <LoadingOutlined spin /> : <CheckCircleOutlined />,
                          key: 'enable',
                          label: `批量启用${hasSelection ? `(${selectedRowKeys.length})` : ''}`
                        },
                        {
                          disabled: batchActionsDisabled,
                          icon: batchStatusAction === 'disable' ? <LoadingOutlined spin /> : <StopOutlined />,
                          key: 'disable',
                          label: `批量禁用${hasSelection ? `(${selectedRowKeys.length})` : ''}`
                        },
                        {
                          danger: true,
                          disabled: batchActionsDisabled,
                          icon: deletePending ? <LoadingOutlined spin /> : <DeleteOutlined />,
                          key: 'delete',
                          label: `批量删除${hasSelection ? `(${selectedRowKeys.length})` : ''}`
                        }
                      ],
                      onClick: ({ key }) => {
                        if (key === 'enable') handleBatchStatusChange(true).catch(() => undefined)
                        if (key === 'disable') handleBatchStatusChange(false).catch(() => undefined)
                        if (key === 'delete') requestBatchDelete()
                      }
                    }}
                    placement="bottomLeft"
                    trigger={['click']}
                  >
                    <Button
                      icon={<MoreOutlined />}
                    >
                      更多操作
                    </Button>
                  </Dropdown>
                </span>
              </Tooltip>
            </div>
            <ViewControls
              columns={columnOptions}
              viewMode={viewMode}
              onColumnToggle={handleColumnToggle}
              onViewModeChange={handleViewModeChange}
            />
          </div>

          <div className={styles.tableRegion}>
            {viewMode === 'list' ? (
              <div className={styles.tableFrame}>
                <div className="assistant-table-scroll max-h-full overflow-auto">
                  <Table<SemanticRule>
                    className={`${styles.ruleTable} abi-std-table`}
                    columns={visibleColumns}
                    dataSource={rules}
                    loading={loading}
                    locale={{ emptyText: <TableEmpty description="暂无符合条件的规则" /> }}
                    pagination={false}
                    rowKey="id"
                    scroll={{ x: tableScrollWidth }}
                    size="middle"
                    tableLayout="fixed"
                    rowSelection={{
                      columnWidth: TABLE_SELECTION_COLUMN_WIDTH,
                      fixed: true,
                      onChange: keys => setSelectedRowKeys(keys),
                      preserveSelectedRowKeys: true,
                      selectedRowKeys
                    }}
                  />
                </div>
              </div>
            ) : (
              <Spin
                spinning={loading}
                wrapperClassName="abi-data-spin"
              >
                <SemanticRuleCardList
                  dataSource={rules}
                  getCategoryLabel={getCategoryLabel}
                  getTargetLabel={getTargetLabel}
                  statusDisabled={batchStatusAction !== null}
                  statusPendingIds={statusPendingIds}
                  visibleColumnKeys={visibleColumnKeys}
                  onDelete={requestSingleDelete}
                  onDetail={rule => {
                    openExistingPanel(rule, 'detail').catch(() => undefined)
                  }}
                  onEdit={rule => {
                    openExistingPanel(rule, 'edit').catch(() => undefined)
                  }}
                  onStatusChange={(rule, enabled) => {
                    handleStatusChange(rule, enabled).catch(() => undefined)
                  }}
                />
              </Spin>
            )}
            <div className={styles.paginationRoot}>
              <Pagination
                showQuickJumper
                showSizeChanger
                align="end"
                className={styles.systemPagination}
                current={currentPage}
                disabled={loading}
                pageSize={pageSize}
                pageSizeOptions={[10, 20, 30, 40, 50]}
                showTotal={count => `共 ${count} 条`}
                total={total}
                onChange={handlePaginationChange}
              />
            </div>
          </div>
        </main>
      </div>

      <SemanticRuleDrawer
        businessCategoryOptions={businessCategoryOptions}
        dictionaryLoading={dictionaryLoading}
        matchTargetOptions={matchTargetOptions}
        open={panelState?.mode === 'create' || panelState?.mode === 'edit'}
        rule={panelState?.mode === 'edit' ? panelState.rule : null}
        width={drawerWidth}
        onClose={closePanel}
        onSubmit={handleRuleSubmit}
      />
      <SemanticRuleDetailDrawer
        getCategoryLabel={getCategoryLabel}
        getTargetLabel={getTargetLabel}
        open={panelState?.mode === 'detail'}
        rule={panelState?.mode === 'detail' ? panelState.rule : null}
        width={drawerWidth}
        onClose={closePanel}
        onEdit={rule => setPanelState({ mode: 'edit', rule })}
      />

      <Modal
        centered
        cancelButtonProps={{ disabled: deletePending }}
        cancelText="取消"
        closable={!deletePending}
        confirmLoading={deletePending}
        keyboard={!deletePending}
        maskClosable={!deletePending}
        okButtonProps={{ danger: true }}
        okText="确认删除"
        open={Boolean(deleteConfirmation)}
        rootClassName={styles.semanticOverlayRoot}
        title={deleteConfirmation?.kind === 'batch' ? '批量删除确认' : '删除确认'}
        width={confirmWidth}
        onCancel={() => setDeleteConfirmation(null)}
        onOk={() => {
          confirmDelete().catch(() => undefined)
        }}
      >
        <p>{deleteConfirmationContent}</p>
      </Modal>
    </>
  )
}
