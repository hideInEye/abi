import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  StopOutlined
} from '@ant-design/icons'
import { Button, Grid, Modal, Pagination, Switch, Table, message } from 'antd'
import type { TableColumnsType } from 'antd'
import { useEffect, useMemo, useState } from 'react'

import { ViewControls } from '@/components/ViewControls'
import type { ColumnOption } from '@/components/ViewControls'

import { SemanticListFilters } from './components/SemanticListFilters'
import { SemanticRuleCardList } from './components/SemanticRuleCardList'
import { SemanticRuleDetailDrawer } from './components/SemanticRuleDetailDrawer'
import { SemanticRuleDrawer } from './components/SemanticRuleDrawer'
import { EMPTY_FILTERS, LIST_TYPE_LABELS, MATCH_TARGET_LABELS, PAGE_SIZE } from './constants'
import { clampSemanticListPage, filterSemanticRules } from './semantic-list-model'
import styles from './semantic-list.module.scss'
import type { SemanticRule, SemanticRuleDraft, SemanticRuleFilters } from './types'
import { useSemanticListDemo } from './useSemanticListDemo'

type RulePanelState = { mode: 'create' } | { mode: 'detail' | 'edit'; ruleId: number } | null

interface DeleteConfirmation {
  batch: boolean
  content: string
  ids: number[]
}

const TABLE_SELECTION_COLUMN_WIDTH = 48

const DEFAULT_COLUMN_OPTIONS: ColumnOption[] = [
  { key: 'name', label: '规则名称', visible: true },
  { key: 'code', label: '规则编码', visible: true },
  { key: 'type', label: '名单类型', visible: true },
  { key: 'category', label: '业务类别', visible: true },
  { key: 'target', label: '匹配目标', visible: true },
  { key: 'enabled', label: '状态', visible: true },
  { key: 'updatedAt', label: '更新时间', visible: true }
]

function getTableScrollWidth(columns: TableColumnsType<SemanticRule>): number {
  return columns.reduce(
    (total, column) => total + (typeof column.width === 'number' ? column.width : 0),
    TABLE_SELECTION_COLUMN_WIDTH
  )
}

function getResponsiveOverlayWidths(isDesktop: boolean | undefined): {
  confirmWidth: string
  drawerWidth: string
} {
  if (isDesktop) return { confirmWidth: '50%', drawerWidth: '50%' }
  return { confirmWidth: '90%', drawerWidth: '96%' }
}

export const Component = () => {
  const screens = Grid.useBreakpoint()
  const { confirmWidth, drawerWidth } = getResponsiveOverlayWidths(screens.lg)
  const [messageApi, messageContext] = message.useMessage()
  const { createRule, deleteRules, setRuleStatus, state, updateRule } = useSemanticListDemo()
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
  const [statusPendingIds, setStatusPendingIds] = useState<Set<number>>(new Set())
  const [batchAction, setBatchAction] = useState<'enable' | 'disable' | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation | null>(null)
  const [deletePending, setDeletePending] = useState(false)

  const filteredRules = useMemo(() => filterSemanticRules(state.rules, appliedFilters), [appliedFilters, state.rules])
  const pagedRules = useMemo(
    () => filteredRules.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, filteredRules, pageSize]
  )
  const activeRule =
    panelState && panelState.mode !== 'create'
      ? (state.rules.find(rule => rule.id === panelState.ruleId) ?? null)
      : null
  const visibleColumnKeys = useMemo(
    () => new Set(columnOptions.filter(column => column.visible).map(column => column.key)),
    [columnOptions]
  )

  useEffect(() => {
    setCurrentPage(page => clampSemanticListPage(page, filteredRules.length, pageSize))
  }, [filteredRules.length, pageSize])

  useEffect(() => {
    const existingIds = new Set(state.rules.map(rule => rule.id))
    setSelectedRowKeys(keys => keys.filter(key => existingIds.has(Number(key))))
  }, [state.rules])

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

  async function handleStatusChange(rule: SemanticRule, enabled: boolean) {
    setStatusPendingIds(ids => new Set(ids).add(rule.id))
    try {
      await setRuleStatus([rule.id], enabled)
      messageApi.success(enabled ? '已启用' : '已禁用')
    } catch {
      messageApi.error('状态更新失败，请重试')
    } finally {
      setStatusPendingIds(ids => {
        const next = new Set(ids)
        next.delete(rule.id)
        return next
      })
    }
  }

  async function handleBatchStatus(enabled: boolean) {
    const ids = selectedRowKeys.map(Number)
    if (!ids.length) return

    setBatchAction(enabled ? 'enable' : 'disable')
    try {
      await setRuleStatus(ids, enabled)
      setSelectedRowKeys([])
      messageApi.success(`已${enabled ? '启用' : '禁用'} ${ids.length} 条规则`)
    } catch {
      messageApi.error('批量状态更新失败，请重试')
    } finally {
      setBatchAction(null)
    }
  }

  function requestSingleDelete(rule: SemanticRule) {
    setDeleteConfirmation({ batch: false, content: `确认删除规则“${rule.name}”？删除后不可恢复。`, ids: [rule.id] })
  }

  function requestBatchDelete() {
    const ids = selectedRowKeys.map(Number)
    if (!ids.length) return
    setDeleteConfirmation({ batch: true, content: `确认删除已选择的 ${ids.length} 条规则？删除后不可恢复。`, ids })
  }

  async function confirmDelete() {
    if (!deleteConfirmation) return
    setDeletePending(true)
    try {
      await deleteRules(deleteConfirmation.ids)
      setSelectedRowKeys(keys => keys.filter(key => !deleteConfirmation.ids.includes(Number(key))))
      messageApi.success(deleteConfirmation.batch ? '批量删除成功' : '删除成功')
      setDeleteConfirmation(null)
    } catch {
      messageApi.error('删除失败，请重试')
    } finally {
      setDeletePending(false)
    }
  }

  async function handleRuleSubmit(draft: SemanticRuleDraft) {
    try {
      if (panelState?.mode === 'edit') {
        await updateRule(panelState.ruleId, draft)
        messageApi.success('保存成功')
      } else {
        await createRule(draft)
        setCurrentPage(1)
        messageApi.success('创建成功')
      }
    } catch (error) {
      messageApi.error('保存失败，请重试')
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
          onClick={() => setPanelState({ mode: 'detail', ruleId: rule.id })}
        >
          {name}
        </button>
      ),
      title: '规则名称',
      width: 160
    },
    {
      dataIndex: 'code',
      ellipsis: true,
      key: 'code',
      render: (code: string) => (
        <code
          className={styles.ruleCode}
          title={code}
        >
          {code}
        </code>
      ),
      title: '规则编码',
      width: 150
    },
    {
      className: styles.nowrapCell,
      dataIndex: 'type',
      key: 'type',
      onHeaderCell: () => ({ className: styles.nowrapCell }),
      render: (type: SemanticRule['type']) => (
        <span className={`abi-status-tag ${type === 'WHITELIST' ? 'status-normal' : 'status-error'}`}>
          {LIST_TYPE_LABELS[type]}
        </span>
      ),
      title: '名单类型',
      width: 120
    },
    { align: 'center', dataIndex: 'category', ellipsis: true, key: 'category', title: '业务类别', width: 125 },
    {
      align: 'center',
      className: styles.nowrapCell,
      dataIndex: 'target',
      key: 'target',
      onHeaderCell: () => ({ className: styles.nowrapCell }),
      render: (target: SemanticRule['target']) => MATCH_TARGET_LABELS[target],
      title: '匹配目标',
      width: 120
    },
    {
      align: 'center',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean, rule) => (
        <Switch
          aria-label={`${rule.name}${enabled ? '已启用' : '已禁用'}`}
          checked={enabled}
          loading={statusPendingIds.has(rule.id)}
          size="small"
          title={enabled ? '启用' : '禁用'}
          onChange={nextEnabled => {
            handleStatusChange(rule, nextEnabled).catch(() => undefined)
          }}
        />
      ),
      title: '状态',
      width: 70
    },
    {
      align: 'center',
      className: styles.nowrapCell,
      dataIndex: 'updatedAt',
      ellipsis: true,
      key: 'updatedAt',
      title: '更新时间',
      width: 120
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
            size="small"
            type="link"
            onClick={() => setPanelState({ mode: 'detail', ruleId: rule.id })}
          >
            详情
          </Button>
          <Button
            className="abi-action-link"
            icon={<EditOutlined />}
            size="small"
            type="link"
            onClick={() => setPanelState({ mode: 'edit', ruleId: rule.id })}
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
      width: 260
    }
  ]

  const hasSelection = selectedRowKeys.length > 0
  const visibleColumns = columns.filter(
    column => column.key === 'operation' || visibleColumnKeys.has(String(column.key))
  )
  const tableColumns = pagedRules.length
    ? visibleColumns
    : visibleColumns.map(column => ({ ...column, fixed: undefined, width: undefined }))
  const tableScrollWidth = getTableScrollWidth(visibleColumns)

  return (
    <>
      {messageContext}
      <div className={`${styles.pageRoot} h-full min-h-0 flex flex-col overflow-hidden`}>
        <SemanticListFilters
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
                icon={<PlusOutlined />}
                type="primary"
                onClick={() => setPanelState({ mode: 'create' })}
              >
                新增规则
              </Button>
              <Button
                disabled={!hasSelection}
                icon={<CheckCircleOutlined />}
                loading={batchAction === 'enable'}
                onClick={() => {
                  handleBatchStatus(true).catch(() => undefined)
                }}
              >
                批量启用{hasSelection ? `(${selectedRowKeys.length})` : ''}
              </Button>
              <Button
                disabled={!hasSelection}
                icon={<StopOutlined />}
                loading={batchAction === 'disable'}
                onClick={() => {
                  handleBatchStatus(false).catch(() => undefined)
                }}
              >
                批量禁用{hasSelection ? `(${selectedRowKeys.length})` : ''}
              </Button>
              <Button
                danger
                disabled={!hasSelection}
                icon={<DeleteOutlined />}
                onClick={requestBatchDelete}
              >
                批量删除{hasSelection ? `(${selectedRowKeys.length})` : ''}
              </Button>
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
                    columns={tableColumns}
                    dataSource={pagedRules}
                    locale={{ emptyText: <TableEmpty description="暂无符合条件的规则" /> }}
                    pagination={false}
                    rowKey="id"
                    scroll={pagedRules.length ? { x: tableScrollWidth } : undefined}
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
              <SemanticRuleCardList
                dataSource={pagedRules}
                statusPendingIds={statusPendingIds}
                visibleColumnKeys={visibleColumnKeys}
                onDelete={requestSingleDelete}
                onDetail={rule => setPanelState({ mode: 'detail', ruleId: rule.id })}
                onEdit={rule => setPanelState({ mode: 'edit', ruleId: rule.id })}
                onStatusChange={(rule, enabled) => {
                  handleStatusChange(rule, enabled).catch(() => undefined)
                }}
              />
            )}
            <div className={styles.paginationRoot}>
              <Pagination
                showQuickJumper
                showSizeChanger
                align="end"
                className={styles.systemPagination}
                current={currentPage}
                pageSize={pageSize}
                pageSizeOptions={[10, 20, 30, 40, 50]}
                showTotal={total => `共 ${total} 条`}
                total={filteredRules.length}
                onChange={handlePaginationChange}
              />
            </div>
          </div>
        </main>
      </div>

      <SemanticRuleDrawer
        open={panelState?.mode === 'create' || panelState?.mode === 'edit'}
        rule={panelState?.mode === 'edit' ? activeRule : null}
        width={drawerWidth}
        onClose={() => setPanelState(null)}
        onSubmit={handleRuleSubmit}
      />
      <SemanticRuleDetailDrawer
        open={panelState?.mode === 'detail'}
        rule={panelState?.mode === 'detail' ? activeRule : null}
        width={drawerWidth}
        onClose={() => setPanelState(null)}
        onEdit={rule => setPanelState({ mode: 'edit', ruleId: rule.id })}
      />

      <Modal
        centered
        cancelText="取消"
        closable={!deletePending}
        confirmLoading={deletePending}
        keyboard={!deletePending}
        maskClosable={!deletePending}
        okButtonProps={{ danger: true }}
        okText="确认删除"
        open={Boolean(deleteConfirmation)}
        rootClassName={styles.semanticOverlayRoot}
        title="删除确认"
        width={confirmWidth}
        onCancel={() => setDeleteConfirmation(null)}
        onOk={() => {
          confirmDelete().catch(() => undefined)
        }}
      >
        <p>{deleteConfirmation?.content}</p>
      </Modal>
    </>
  )
}
