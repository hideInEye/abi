import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SyncOutlined,
  TagsOutlined
} from '@ant-design/icons'
import { Button, Grid, Modal, Pagination, Table, Tooltip, message } from 'antd'
import type { TableColumnsType } from 'antd'
import { useMemo, useState } from 'react'

import { ViewControls } from '@/components/ViewControls'
import type { ColumnOption } from '@/components/ViewControls'

import styles from '../data-dictionary.module.scss'
import {
  EMPTY_DICT_TYPE_FILTERS,
  getDictTableScrollWidth,
  getLastPageAfterDelete,
  getRequestErrorMessage,
  getResponsiveOverlayWidths
} from '../dictionary-model'
import { useDictTypeManagement } from '../hooks/useDictTypeManagement'
import type { DictTypeFilters as DictTypeFiltersValue, DictTypeFormValues, DictTypeId, SysDictType } from '../types'

import { DictTypeDrawer } from './DictTypeDrawer'
import { DictTypeFilters } from './DictTypeFilters'

type PanelState = { mode: 'create' } | { mode: 'edit'; record: SysDictType } | null
type DeleteConfirmation = { dictIds: DictTypeId[]; label: string } | null

interface DictTypeManagementProps {
  readonly onManageData: (record: SysDictType) => void
  readonly onTypesChanged: () => void
}

const DEFAULT_COLUMN_OPTIONS: ColumnOption[] = [
  { key: 'dictName', label: '字典名称', visible: true },
  { key: 'dictType', label: '字典类型', visible: true },
  { key: 'status', label: '状态', visible: true },
  { key: 'remark', label: '备注', visible: true },
  { key: 'updateTime', label: '更新时间', visible: true },
  { key: 'dictId', label: '字典主键', visible: false }
]

export function DictTypeManagement({ onManageData, onTypesChanged }: DictTypeManagementProps) {
  const screens = Grid.useBreakpoint()
  const { confirmWidth, drawerWidth } = getResponsiveOverlayWidths(screens.lg)
  const [messageApi, messageContext] = message.useMessage()
  const [draftFilters, setDraftFilters] = useState<DictTypeFiltersValue>({ ...EMPTY_DICT_TYPE_FILTERS })
  const [appliedFilters, setAppliedFilters] = useState<DictTypeFiltersValue>({ ...EMPTY_DICT_TYPE_FILTERS })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [columnOptions, setColumnOptions] = useState<ColumnOption[]>(() =>
    DEFAULT_COLUMN_OPTIONS.map(column => ({ ...column }))
  )
  const [panelState, setPanelState] = useState<PanelState>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>(null)
  const [deletePending, setDeletePending] = useState(false)
  const [cacheConfirmationOpen, setCacheConfirmationOpen] = useState(false)
  const [cachePending, setCachePending] = useState(false)

  const { createItem, deleteItems, error, loading, records, refresh, refreshCache, total, updateItem } =
    useDictTypeManagement({
      filters: appliedFilters,
      pageNum: currentPage,
      pageSize
    })

  const visibleColumnKeys = useMemo(
    () => new Set(columnOptions.filter(column => column.visible).map(column => column.key)),
    [columnOptions]
  )

  function applyFilters(): void {
    setAppliedFilters({ ...draftFilters })
    setCurrentPage(1)
    setSelectedRowKeys([])
  }

  function resetFilters(): void {
    setDraftFilters({ ...EMPTY_DICT_TYPE_FILTERS })
    setAppliedFilters({ ...EMPTY_DICT_TYPE_FILTERS })
    setCurrentPage(1)
    setSelectedRowKeys([])
  }

  async function handleSubmit(values: DictTypeFormValues): Promise<void> {
    try {
      if (panelState?.mode === 'edit') {
        await updateItem(panelState.record, values)
        await refresh()
        onTypesChanged()
        messageApi.success('字典类别保存成功')
        return
      }

      await createItem(values)
      if (currentPage === 1) await refresh()
      else setCurrentPage(1)
      onTypesChanged()
      messageApi.success('字典类别创建成功')
    } catch (submitError) {
      messageApi.error(getRequestErrorMessage(submitError, '字典类别保存失败，请重试'))
      throw submitError
    }
  }

  function requestSingleDelete(record: SysDictType): void {
    setDeleteConfirmation({
      dictIds: [record.dictId],
      label: `确认删除字典类别“${record.dictName}”？类别下仍有字典数据时，后端将拒绝删除。`
    })
  }

  function requestBatchDelete(): void {
    if (!selectedRowKeys.length) return
    setDeleteConfirmation({
      dictIds: selectedRowKeys.map(key => key as DictTypeId),
      label: `确认删除已选择的 ${selectedRowKeys.length} 个字典类别？已分配数据的类别不会被删除。`
    })
  }

  async function confirmDelete(): Promise<void> {
    if (!deleteConfirmation) return
    const pendingConfirmation = deleteConfirmation
    setDeletePending(true)
    try {
      await deleteItems(pendingConfirmation.dictIds)
      const lastPage = getLastPageAfterDelete(total, pendingConfirmation.dictIds.length, pageSize)
      setSelectedRowKeys([])
      setDeleteConfirmation(null)
      if (currentPage > lastPage) setCurrentPage(lastPage)
      else await refresh()
      onTypesChanged()
      messageApi.success(pendingConfirmation.dictIds.length > 1 ? '批量删除成功' : '删除成功')
    } catch (deleteError) {
      messageApi.error(
        getRequestErrorMessage(
          deleteError,
          pendingConfirmation.dictIds.length > 1 ? '批量删除失败，请重试' : '删除失败，请重试'
        )
      )
    } finally {
      setDeletePending(false)
    }
  }

  async function confirmRefreshCache(): Promise<void> {
    setCachePending(true)
    try {
      await refreshCache()
      setCacheConfirmationOpen(false)
      messageApi.success('字典缓存刷新成功')
    } catch (cacheError) {
      messageApi.error(getRequestErrorMessage(cacheError, '字典缓存刷新失败，请重试'))
    } finally {
      setCachePending(false)
    }
  }

  function handlePaginationChange(page: number, nextPageSize: number): void {
    setCurrentPage(nextPageSize === pageSize ? page : 1)
    setPageSize(nextPageSize)
    setSelectedRowKeys([])
  }

  const columns: TableColumnsType<SysDictType> = [
    {
      align: 'center',
      dataIndex: 'dictName',
      ellipsis: true,
      key: 'dictName',
      render: (dictName: string, record) => (
        <button
          className={styles.typeNameButton}
          type="button"
          onClick={() => onManageData(record)}
        >
          <span className={styles.typeNameMark}>{dictName.slice(0, 1) || '字'}</span>
          <span>{dictName || '-'}</span>
        </button>
      ),
      title: '字典名称',
      width: 220
    },
    {
      align: 'center',
      dataIndex: 'dictType',
      ellipsis: true,
      key: 'dictType',
      render: (dictType: string) => <code className={styles.typeCode}>{dictType || '-'}</code>,
      title: '字典类型',
      width: 240
    },
    {
      align: 'center',
      dataIndex: 'status',
      key: 'status',
      render: (status: SysDictType['status']) => (
        <span className={`abi-status-tag ${status === '0' ? 'status-normal' : 'status-error'}`}>
          {status === '0' ? '正常' : '停用'}
        </span>
      ),
      title: '状态',
      width: 100
    },
    {
      align: 'center',
      dataIndex: 'remark',
      ellipsis: true,
      key: 'remark',
      render: (remark: string) => remark || '-',
      title: '备注',
      width: 260
    },
    {
      align: 'center',
      dataIndex: 'updateTime',
      ellipsis: true,
      key: 'updateTime',
      render: (updateTime: string, record) => updateTime || record.createTime || '-',
      title: '更新时间',
      width: 180
    },
    {
      align: 'center',
      dataIndex: 'dictId',
      ellipsis: true,
      key: 'dictId',
      render: (dictId: DictTypeId) => <code className={styles.subtleCode}>{String(dictId)}</code>,
      title: '字典主键',
      width: 180
    },
    {
      align: 'center',
      fixed: 'right',
      key: 'operation',
      render: (_, record) => (
        <div className="ds-action-group">
          <Button
            className="abi-action-link"
            icon={<TagsOutlined />}
            size="small"
            type="link"
            onClick={() => onManageData(record)}
          >
            字典数据
          </Button>
          <Button
            className="abi-action-link"
            icon={<EditOutlined />}
            size="small"
            type="link"
            onClick={() => setPanelState({ mode: 'edit', record })}
          >
            编辑
          </Button>
          <Button
            className="abi-action-link-danger"
            icon={<DeleteOutlined />}
            size="small"
            type="link"
            onClick={() => requestSingleDelete(record)}
          >
            删除
          </Button>
        </div>
      ),
      title: '操作',
      width: 300
    }
  ]

  const visibleColumns = columns.filter(
    column => column.key === 'operation' || visibleColumnKeys.has(String(column.key))
  )
  const tableScrollWidth = getDictTableScrollWidth(visibleColumns)
  const hasSelection = selectedRowKeys.length > 0

  return (
    <>
      {messageContext}
      <div className={styles.managementPane}>
        <DictTypeFilters
          value={draftFilters}
          onChange={setDraftFilters}
          onQuery={applyFilters}
          onReset={resetFilters}
        />
        <main
          aria-label="字典类别列表"
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
                新增类别
              </Button>
              <Tooltip title={hasSelection ? undefined : '请先选择字典类别'}>
                <span className="inline-flex">
                  <Button
                    danger
                    disabled={!hasSelection || loading || deletePending}
                    icon={<DeleteOutlined />}
                    onClick={requestBatchDelete}
                  >
                    批量删除{hasSelection ? `(${selectedRowKeys.length})` : ''}
                  </Button>
                </span>
              </Tooltip>
              <Button
                icon={<SyncOutlined />}
                loading={cachePending}
                onClick={() => setCacheConfirmationOpen(true)}
              >
                刷新缓存
              </Button>
              <Tooltip title="刷新列表">
                <Button
                  aria-label="刷新列表"
                  icon={<ReloadOutlined />}
                  loading={loading}
                  onClick={() => refresh().catch(() => undefined)}
                />
              </Tooltip>
            </div>
            <ViewControls
              hideViewToggle
              columns={columnOptions}
              onColumnToggle={(key, visible) => {
                setColumnOptions(options =>
                  options.map(column => (column.key === key ? { ...column, visible } : column))
                )
              }}
            />
          </div>

          <div className={styles.tableRegion}>
            {error ? (
              <div
                className={styles.tableErrorBanner}
                role="alert"
              >
                <span>类别列表加载失败，已保留上一次成功结果。</span>
                <Button
                  icon={<ReloadOutlined />}
                  size="small"
                  onClick={() => refresh().catch(() => undefined)}
                >
                  重试
                </Button>
              </div>
            ) : null}
            <div className={styles.tableFrame}>
              <div className="assistant-table-scroll max-h-full overflow-auto">
                <Table<SysDictType>
                  className={`${styles.dictionaryTable} abi-std-table`}
                  columns={visibleColumns}
                  dataSource={records}
                  loading={loading}
                  locale={{ emptyText: <TableEmpty description="暂无符合条件的字典类别" /> }}
                  pagination={false}
                  rowKey="dictId"
                  scroll={{ x: tableScrollWidth }}
                  size="middle"
                  tableLayout="fixed"
                  rowSelection={{
                    columnWidth: 48,
                    fixed: true,
                    onChange: setSelectedRowKeys,
                    preserveSelectedRowKeys: true,
                    selectedRowKeys
                  }}
                />
              </div>
            </div>
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

      <DictTypeDrawer
        open={Boolean(panelState)}
        record={panelState?.mode === 'edit' ? panelState.record : null}
        width={drawerWidth}
        onClose={() => setPanelState(null)}
        onSubmit={handleSubmit}
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
        rootClassName={styles.dictionaryOverlayRoot}
        title={deleteConfirmation && deleteConfirmation.dictIds.length > 1 ? '批量删除确认' : '删除确认'}
        width={confirmWidth}
        onCancel={() => setDeleteConfirmation(null)}
        onOk={() => confirmDelete().catch(() => undefined)}
      >
        <p>{deleteConfirmation?.label}</p>
      </Modal>

      <Modal
        centered
        cancelButtonProps={{ disabled: cachePending }}
        cancelText="取消"
        closable={!cachePending}
        confirmLoading={cachePending}
        keyboard={!cachePending}
        maskClosable={!cachePending}
        okText="确认刷新"
        open={cacheConfirmationOpen}
        rootClassName={styles.dictionaryOverlayRoot}
        title="刷新字典缓存"
        width={confirmWidth}
        onCancel={() => setCacheConfirmationOpen(false)}
        onOk={() => confirmRefreshCache().catch(() => undefined)}
      >
        <p>将清空并按数据库内容全量重建字典缓存，确认继续吗？</p>
      </Modal>
    </>
  )
}
