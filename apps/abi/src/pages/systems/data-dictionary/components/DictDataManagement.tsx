import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { Button, Grid, Modal, Pagination, Table, Tooltip, message } from 'antd'
import type { TableColumnsType } from 'antd'
import { useMemo, useRef, useState } from 'react'

import { ViewControls } from '@/components/ViewControls'
import type { ColumnOption } from '@/components/ViewControls'

import styles from '../data-dictionary.module.scss'
import {
  EMPTY_DICT_DATA_FILTERS,
  getDictTableScrollWidth,
  getLastPageAfterDelete,
  getRequestErrorMessage,
  getResponsiveOverlayWidths
} from '../dictionary-model'
import { useDictDataManagement } from '../hooks/useDictDataManagement'
import type {
  DictDataCode,
  DictDataFilters as DictDataFiltersValue,
  DictDataFormValues,
  SysDictData,
  SysDictType
} from '../types'

import { DictDataDetailDrawer } from './DictDataDetailDrawer'
import { DictDataDrawer } from './DictDataDrawer'
import { DictDataFilters } from './DictDataFilters'

type ExistingPanelMode = 'detail' | 'edit'
type PanelState = { mode: 'create' } | { mode: ExistingPanelMode; record: SysDictData } | null
type PanelLoadingState = { dictCode: DictDataCode; mode: ExistingPanelMode } | null
type DeleteConfirmation = { dictCodes: DictDataCode[]; label: string } | null

interface DictDataManagementProps {
  readonly onRetryTypeOptions: () => void
  readonly selectedType: SysDictType | null
  readonly typeOptions: SysDictType[]
  readonly typeOptionsError: boolean
  readonly typeOptionsLoading: boolean
}

const DEFAULT_COLUMN_OPTIONS: ColumnOption[] = [
  { key: 'dictType', label: '字典类型', visible: true },
  { key: 'dictLabel', label: '字典标签', visible: true },
  { key: 'dictValue', label: '字典键值', visible: true },
  { key: 'dictSort', label: '排序', visible: true },
  { key: 'isDefault', label: '默认项', visible: true },
  { key: 'status', label: '状态', visible: true },
  { key: 'updateTime', label: '更新时间', visible: true },
  { key: 'dictCode', label: '字典编码', visible: false },
  { key: 'remark', label: '备注', visible: false }
]

function createInitialFilters(selectedType: SysDictType | null): DictDataFiltersValue {
  return { ...EMPTY_DICT_DATA_FILTERS, dictType: selectedType?.dictType ?? '' }
}

function canCreateDictData(selectedType: SysDictType | null, typeOptions: SysDictType[]): boolean {
  return Boolean(selectedType || typeOptions.length > 0)
}

function DictTypeOptionsErrorBanner({
  onRetryTypeOptions,
  typeOptionsError,
  typeOptionsLoading
}: Pick<DictDataManagementProps, 'onRetryTypeOptions' | 'typeOptionsError' | 'typeOptionsLoading'>) {
  if (!typeOptionsError) return null

  return (
    <div
      className={styles.optionErrorBanner}
      role="alert"
    >
      <span>字典类别选项加载失败，列表仍可浏览；新增、编辑或按类别筛选前请重试。</span>
      <Button
        icon={<ReloadOutlined />}
        loading={typeOptionsLoading}
        size="small"
        onClick={onRetryTypeOptions}
      >
        重试类别
      </Button>
    </div>
  )
}

export function DictDataManagement({
  onRetryTypeOptions,
  selectedType,
  typeOptions,
  typeOptionsError,
  typeOptionsLoading
}: DictDataManagementProps) {
  const screens = Grid.useBreakpoint()
  const { confirmWidth, drawerWidth } = getResponsiveOverlayWidths(screens.lg)
  const [messageApi, messageContext] = message.useMessage()
  const [draftFilters, setDraftFilters] = useState<DictDataFiltersValue>(() => createInitialFilters(selectedType))
  const [appliedFilters, setAppliedFilters] = useState<DictDataFiltersValue>(() => createInitialFilters(selectedType))
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [columnOptions, setColumnOptions] = useState<ColumnOption[]>(() =>
    DEFAULT_COLUMN_OPTIONS.map(column => ({ ...column }))
  )
  const [panelState, setPanelState] = useState<PanelState>(null)
  const [panelLoading, setPanelLoading] = useState<PanelLoadingState>(null)
  const panelRequestSequence = useRef(0)
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>(null)
  const [deletePending, setDeletePending] = useState(false)

  const { createItem, deleteItems, error, fetchDetail, fetchTypeItems, loading, records, refresh, total, updateItem } =
    useDictDataManagement({
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
    const nextFilters = createInitialFilters(selectedType)
    setDraftFilters(nextFilters)
    setAppliedFilters({ ...nextFilters })
    setCurrentPage(1)
    setSelectedRowKeys([])
  }

  async function openExistingPanel(record: SysDictData, mode: ExistingPanelMode): Promise<void> {
    panelRequestSequence.current += 1
    const requestId = panelRequestSequence.current
    setPanelLoading({ dictCode: record.dictCode, mode })
    try {
      const detail = await fetchDetail(record.dictCode)
      if (requestId !== panelRequestSequence.current) return
      setPanelState({ mode, record: detail })
    } catch (detailError) {
      if (requestId === panelRequestSequence.current) {
        messageApi.error(getRequestErrorMessage(detailError, '字典详情加载失败，请重试'))
      }
    } finally {
      if (requestId === panelRequestSequence.current) setPanelLoading(null)
    }
  }

  function closePanel(): void {
    panelRequestSequence.current += 1
    setPanelLoading(null)
    setPanelState(null)
  }

  async function handleSubmit(values: DictDataFormValues): Promise<void> {
    try {
      if (panelState?.mode === 'edit') {
        await updateItem(panelState.record, values)
        await refresh()
        messageApi.success('字典项保存成功')
        return
      }

      await createItem(values)
      if (currentPage === 1) await refresh()
      else setCurrentPage(1)
      messageApi.success('字典项创建成功')
    } catch (submitError) {
      messageApi.error(getRequestErrorMessage(submitError, '字典项保存失败，请重试'))
      throw submitError
    }
  }

  function requestSingleDelete(record: SysDictData): void {
    setDeleteConfirmation({
      dictCodes: [record.dictCode],
      label: `确认删除字典项“${record.dictLabel}”？删除后不可恢复。`
    })
  }

  function requestBatchDelete(): void {
    if (!selectedRowKeys.length) return
    setDeleteConfirmation({
      dictCodes: selectedRowKeys.map(key => key as DictDataCode),
      label: `确认删除已选择的 ${selectedRowKeys.length} 条字典项？删除后不可恢复。`
    })
  }

  async function confirmDelete(): Promise<void> {
    if (!deleteConfirmation) return
    const pendingConfirmation = deleteConfirmation
    setDeletePending(true)
    try {
      await deleteItems(pendingConfirmation.dictCodes)
      const lastPage = getLastPageAfterDelete(total, pendingConfirmation.dictCodes.length, pageSize)
      setSelectedRowKeys([])
      setDeleteConfirmation(null)
      if (currentPage > lastPage) setCurrentPage(lastPage)
      else await refresh()
      messageApi.success(pendingConfirmation.dictCodes.length > 1 ? '批量删除成功' : '删除成功')
    } catch (deleteError) {
      messageApi.error(
        getRequestErrorMessage(
          deleteError,
          pendingConfirmation.dictCodes.length > 1 ? '批量删除失败，请重试' : '删除失败，请重试'
        )
      )
    } finally {
      setDeletePending(false)
    }
  }

  function handlePaginationChange(page: number, nextPageSize: number): void {
    setCurrentPage(nextPageSize === pageSize ? page : 1)
    setPageSize(nextPageSize)
    setSelectedRowKeys([])
  }

  const columns: TableColumnsType<SysDictData> = [
    {
      align: 'center',
      dataIndex: 'dictType',
      ellipsis: true,
      key: 'dictType',
      render: (dictType: string) => <code className={styles.typeCode}>{dictType || '-'}</code>,
      title: '字典类型',
      width: 220
    },
    {
      align: 'center',
      dataIndex: 'dictLabel',
      ellipsis: true,
      key: 'dictLabel',
      render: (dictLabel: string) => (
        <span
          className={styles.dataLabel}
          title={dictLabel}
        >
          {dictLabel || '-'}
        </span>
      ),
      title: '字典标签',
      width: 200
    },
    {
      align: 'center',
      dataIndex: 'dictValue',
      ellipsis: true,
      key: 'dictValue',
      render: (dictValue: string) => (
        <code
          className={styles.valuePill}
          title={dictValue}
        >
          {dictValue || '-'}
        </code>
      ),
      title: '字典键值',
      width: 220
    },
    {
      align: 'center',
      dataIndex: 'dictSort',
      key: 'dictSort',
      render: (dictSort: number | null) => dictSort ?? '-',
      title: '排序',
      width: 90
    },
    {
      align: 'center',
      dataIndex: 'isDefault',
      key: 'isDefault',
      render: (isDefault: SysDictData['isDefault']) => (
        <span className={`${styles.defaultBadge} ${isDefault === 'Y' ? styles.defaultBadgeActive : ''}`}>
          {isDefault === 'Y' ? '默认' : '否'}
        </span>
      ),
      title: '默认项',
      width: 100
    },
    {
      align: 'center',
      dataIndex: 'status',
      key: 'status',
      render: (status: SysDictData['status']) => (
        <span className={`abi-status-tag ${status === '0' ? 'status-normal' : 'status-error'}`}>
          {status === '0' ? '正常' : '停用'}
        </span>
      ),
      title: '状态',
      width: 100
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
      dataIndex: 'dictCode',
      ellipsis: true,
      key: 'dictCode',
      render: (dictCode: DictDataCode) => <code className={styles.subtleCode}>{String(dictCode)}</code>,
      title: '字典编码',
      width: 180
    },
    {
      align: 'center',
      dataIndex: 'remark',
      ellipsis: true,
      key: 'remark',
      render: (remark: string) => remark || '-',
      title: '备注',
      width: 220
    },
    {
      align: 'center',
      fixed: 'right',
      key: 'operation',
      render: (_, record) => (
        <div className="ds-action-group">
          <Button
            className="abi-action-link"
            icon={<EyeOutlined />}
            loading={panelLoading?.mode === 'detail' && panelLoading.dictCode === record.dictCode}
            size="small"
            type="link"
            onClick={() => openExistingPanel(record, 'detail').catch(() => undefined)}
          >
            详情
          </Button>
          <Button
            className="abi-action-link"
            icon={<EditOutlined />}
            loading={panelLoading?.mode === 'edit' && panelLoading.dictCode === record.dictCode}
            size="small"
            type="link"
            onClick={() => openExistingPanel(record, 'edit').catch(() => undefined)}
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
      width: 260
    }
  ]

  const visibleColumns = columns.filter(
    column => column.key === 'operation' || visibleColumnKeys.has(String(column.key))
  )
  const tableScrollWidth = getDictTableScrollWidth(visibleColumns)
  const hasSelection = selectedRowKeys.length > 0
  const canCreate = canCreateDictData(selectedType, typeOptions)
  const defaultDictType = selectedType?.dictType || draftFilters.dictType

  return (
    <>
      {messageContext}
      <div className={styles.managementPane}>
        <DictTypeOptionsErrorBanner
          typeOptionsError={typeOptionsError}
          typeOptionsLoading={typeOptionsLoading}
          onRetryTypeOptions={onRetryTypeOptions}
        />

        <DictDataFilters
          loadingTypes={typeOptionsLoading}
          typeOptions={typeOptions}
          value={draftFilters}
          onChange={setDraftFilters}
          onQuery={applyFilters}
          onReset={resetFilters}
        />
        <main
          aria-label="系统字典数据列表"
          className="abi-data-area min-h-0 flex flex-col flex-1"
        >
          <div className={`abi-toolbar ${styles.toolbar}`}>
            <div className={`abi-toolbar-left ${styles.toolbarActions}`}>
              <Tooltip title={canCreate ? undefined : '请先创建并加载字典类别'}>
                <span className="inline-flex">
                  <Button
                    className="btn-accent-gradient"
                    disabled={!canCreate}
                    icon={<PlusOutlined />}
                    type="primary"
                    onClick={() => setPanelState({ mode: 'create' })}
                  >
                    新增字典项
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title={hasSelection ? undefined : '请先选择字典项'}>
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
                <span>列表加载失败，已保留上一次成功结果。</span>
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
                <Table<SysDictData>
                  className={`${styles.dictionaryTable} abi-std-table`}
                  columns={visibleColumns}
                  dataSource={records}
                  loading={loading}
                  locale={{ emptyText: <TableEmpty description="暂无符合条件的字典项" /> }}
                  pagination={false}
                  rowKey="dictCode"
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

      <DictDataDrawer
        defaultDictType={defaultDictType}
        loadingTypes={typeOptionsLoading}
        open={panelState?.mode === 'create' || panelState?.mode === 'edit'}
        record={panelState?.mode === 'edit' ? panelState.record : null}
        typeOptions={typeOptions}
        width={drawerWidth}
        onClose={closePanel}
        onSubmit={handleSubmit}
      />
      <DictDataDetailDrawer
        fetchTypeItems={fetchTypeItems}
        open={panelState?.mode === 'detail'}
        record={panelState?.mode === 'detail' ? panelState.record : null}
        width={drawerWidth}
        onClose={closePanel}
        onEdit={record => setPanelState({ mode: 'edit', record })}
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
        title={deleteConfirmation && deleteConfirmation.dictCodes.length > 1 ? '批量删除确认' : '删除确认'}
        width={confirmWidth}
        onCancel={() => setDeleteConfirmation(null)}
        onOk={() => confirmDelete().catch(() => undefined)}
      >
        <p>{deleteConfirmation?.label}</p>
      </Modal>
    </>
  )
}
