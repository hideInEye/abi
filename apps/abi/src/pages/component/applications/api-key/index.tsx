import { DeleteOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { useDebounceFn } from 'ahooks'
import { message, Modal } from 'antd'
import copy from 'copy-to-clipboard'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'

import { ViewControls } from '@/components/ViewControls'
import type { ColumnOption } from '@/components/ViewControls'
import { SearchFilterBar, SearchFilterField, getFilterPopupContainer } from '@/components/SearchFilterBar'

// import PageTitle from '@/components/stateless/common/PageTitle'
import {
  type AbiClientDetailItem,
  type AbiClientListItem,
  addAbiClient,
  deleteAbiClient,
  getAbiClientDetail,
  queryAbiClientList,
  resetAbiClientSk,
  updateAbiClientStatus
} from '@/service/api/abi-client'
import { spaceList } from '@/service/api/data-space'
import { isFlatRequestSuccess } from '@/service/request/flat-result'
import { getSpaceId } from '@/store/slice/app'
import { useAppSelector } from '@/hooks/business/useStore'

import { ApiKeyDrawer } from './components/ApiKeyDrawer'
import { ApiKeyTable } from './components/ApiKeyTable'
import { ShareAssistantDrawer } from './components/ShareAssistantDrawer'
import type { ApiKeyFormValues, ApiKeyItem, ApiKeyQueryValues, DrawerMode } from './types'

const PAGE_SIZE = 12
const DEFAULT_ACTIVE_TIMEOUT = 1800

function extractSecretKey(resp: any): string {
  const respData = resp?.response?.data
  const dataField = respData?.data

  if (typeof dataField === 'string') {
    return dataField
  }

  if (dataField && typeof dataField === 'object' && typeof dataField.secretKey === 'string') {
    return dataField.secretKey
  }

  return respData?.secretKey || (typeof resp?.data?.secretKey === 'string' ? resp.data.secretKey : '') || ''
}

function extractSecretKeyFromReset(resp: any): string {
  const respData = resp?.response?.data
  const dataField = respData?.data

  if (typeof respData?.secretKey === 'string') {
    return respData.secretKey
  }

  if (typeof dataField === 'string') {
    return dataField
  }

  if (dataField && typeof dataField === 'object' && typeof dataField.secretKey === 'string') {
    return dataField.secretKey
  }

  return typeof resp?.data?.secretKey === 'string' ? resp.data.secretKey : ''
}

function showOneTimeSecretKeyModal(secretKey: string, title: string) {
  AModal.info({
    content: (
      <div>
        <div>Secret Key 仅展示一次，关闭弹窗后将无法再次查看，请立即复制并妥善保存。</div>
        <div style={{ fontFamily: 'monospace', marginTop: 12, wordBreak: 'break-all' }}>{secretKey}</div>
        <AButton
          style={{ marginTop: 12, paddingInline: 0 }}
          type="link"
          onClick={() => {
            copy(secretKey)
            message.success('Secret Key已复制')
          }}
        >
          复制 Secret Key
        </AButton>
      </div>
    ),
    title
  })
}

function parseWhitelist(item: Partial<AbiClientListItem & AbiClientDetailItem>): string[] {
  if (Array.isArray(item.whitelist)) {
    return item.whitelist.map(row => row.whitelist).filter(Boolean)
  }

  if (typeof item.ipWhitelist === 'string') {
    return item.ipWhitelist
      .split(/[,\n]/)
      .map(v => v.trim())
      .filter(Boolean)
  }

  return []
}

function isRestrictedIp(value: unknown): boolean {
  return value === true || value === 1 || value === '1'
}

function isDisabled(value: unknown): boolean {
  return value === 1 || value === '1'
}

function mapQueryRestrictedIp(value: ApiKeyQueryValues['ipAccessType']): 0 | 1 | undefined {
  if (!value) return undefined
  return value === 'whitelist' ? 1 : 0
}

function mapQueryStatus(value: ApiKeyQueryValues['status']): '0' | '1' | undefined {
  if (!value) return undefined
  return value === 'disabled' ? '1' : '0'
}

function mapClientRowToView(item: AbiClientListItem, fallbackSpaceId: number): ApiKeyItem {
  return {
    accessKey: item.accessKey || '',
    businessSpace: item.spaceName || '',
    clientId: item.clientId || '',
    createdAt: item.createTime || '',
    description: item.remark || '',
    expireTime: item.expireTime || null,
    id: Number(item.id),
    ipAccessType: isRestrictedIp(item.restrictedIp) ? 'whitelist' : 'unlimited',
    ipWhitelist: parseWhitelist(item),
    name: item.name || '',
    rawSecretKey: item.secretKey || '',
    secretKey: item.secretKey || '',
    spaceId: Number(item.spaceId || fallbackSpaceId),
    status: isDisabled(item.status) ? 'disabled' : 'normal',
    timeoutSeconds: item.activeTimeout
  }
}

function mapClientDetailToView(item: AbiClientDetailItem, fallback: ApiKeyItem | null): ApiKeyItem {
  const fallbackSpaceId = fallback?.spaceId || Number(localStorage.getItem('spaceId')) || 0
  const base = mapClientRowToView(
    {
      ...item,
      accessKey: item.accessKey || fallback?.accessKey || '',
      clientId: item.clientId || fallback?.clientId || '',
      createTime: item.createTime || fallback?.createdAt || '',
      name: item.name ?? fallback?.name,
      remark: item.remark || '',
      spaceId: item.spaceId || fallbackSpaceId,
      spaceName: fallback?.businessSpace || ''
    },
    fallbackSpaceId
  )

  return {
    ...base,
    rawSecretKey: item.secretKey || '',
    secretKey: item.secretKey || ''
  }
}

export function Component() {
  const [queryForm] = AForm.useForm()
  const reduxSpaceId = useAppSelector(getSpaceId)
  const currentSpaceId = reduxSpaceId || 0
  const [rows, setRows] = useState<ApiKeyItem[]>([])
  const [total, setTotal] = useState(0)
  const [current, setCurrent] = useState(1)
  const [listLoading, setListLoading] = useState(false)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('create')
  const [currentRecord, setCurrentRecord] = useState<ApiKeyItem | null>(null)
  // 分享助手抽屉：当前触发入口的 API Key（为空时关闭）
  const [shareAssistantRecord, setShareAssistantRecord] = useState<ApiKeyItem | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [spaceOptions, setSpaceOptions] = useState<Array<{ label: string; value: number }>>([])
  const [queryValues, setQueryValues] = useState<ApiKeyQueryValues>({
    spaceId: currentSpaceId || undefined
  })
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card')
  const [columnOptions, setColumnOptions] = useState<ColumnOption[]>([
    { key: 'name', label: '名称', visible: true },
    { key: 'businessSpace', label: '业务空间', visible: true },
    { key: 'clientId', label: 'Client ID', visible: true },
    { key: 'accessKey', label: 'Access Key', visible: true },
    { key: 'status', label: '状态', visible: true },
    { key: 'expireTime', label: '过期时间', visible: true },
    { key: 'createdAt', label: '创建时间', visible: true },
    { key: 'operate', label: '操作', visible: true },
  ])
  const handleColumnToggle = (key: string, visible: boolean) => {
    setColumnOptions(prev => prev.map(c => c.key === key ? { ...c, visible } : c))
  }

  // 切换视图时清空批量选中态，避免切到卡片视图后批量删除按钮仍可点击
  const handleViewModeChange = (mode: 'list' | 'card') => {
    setSelectedRowKeys([])
    setViewMode(mode)
  }

  const loadList = useCallback(
    async (pageNum: number, query: ApiKeyQueryValues) => {
      const effectiveSpaceId = query.spaceId || currentSpaceId
      if (!effectiveSpaceId) {
        setRows([])
        setTotal(0)
        return
      }

      setListLoading(true)

      try {
        const res = await queryAbiClientList({
          accessKey: query.accessKey || undefined,
          clientId: query.clientId || undefined,
          entCreateTime: query.entCreateTime || undefined,
          pageNum,
          pageSize: PAGE_SIZE,
          restrictedIp: mapQueryRestrictedIp(query.ipAccessType),
          spaceId: effectiveSpaceId,
          startCreateTime: query.startCreateTime || undefined,
          status: mapQueryStatus(query.status)
        })

        const payload = (res as any).response?.data || {}
        const list = (payload.rows || []) as AbiClientListItem[]

        setRows(list.map(item => mapClientRowToView(item, effectiveSpaceId)))
        setTotal(Number(payload.total || 0))
      } finally {
        setListLoading(false)
      }
    },
    [currentSpaceId]
  )

  useEffect(() => {
    if (!currentSpaceId) return
    queryForm.setFieldValue('spaceId', currentSpaceId)
    setQueryValues(prev => ({ ...prev, spaceId: currentSpaceId }))
    setCurrent(1)
  }, [currentSpaceId, queryForm])

  useEffect(() => {
    let cancelled = false
    spaceList({ isAsc: 'asc', orderByColumn: 'createTime', pageNum: 1, pageSize: 200 })
      .then((res: any) => {
        if (cancelled) return
        const payload = (res as any).response?.data || {}
        const rows = (payload.rows || []) as Array<{ spaceId: number; spaceName?: string }>
        const opts = rows
          .filter(r => r.spaceId)
          .map(r => ({ label: r.spaceName || `空间${r.spaceId}`, value: Number(r.spaceId) }))
        setSpaceOptions(opts)
      })
      .catch(() => { /* ignore */ })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    loadList(current, queryValues)
  }, [current, loadList, queryValues])

  const refreshList = (targetPage?: number) => {
    if (typeof targetPage === 'number' && targetPage !== current) {
      setCurrent(targetPage)
      return
    }

    loadList(typeof targetPage === 'number' ? targetPage : current, queryValues)
  }

  const openCreate = () => {
    setDrawerMode('create')
    setCurrentRecord(null)
    setDrawerOpen(true)
  }

  const openView = async (record: ApiKeyItem) => {
    const res = await getAbiClientDetail(record.id)
    const payload = (res as any).response?.data || {}
    const detail = (payload.data || {}) as AbiClientDetailItem

    const mapped = mapClientDetailToView(detail, record)

    setDrawerMode('view')
    setCurrentRecord(mapped)
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    setCurrentRecord(null)
  }

  const handleSubmit = async (values: ApiKeyFormValues, ipWhitelist: string[]) => {
    setSubmitLoading(true)

    const restrictedIp: 0 | 1 = values.ipAccessType === 'whitelist' ? 1 : 0
    let expireTime: string | null = null
    if (values.expireTime) {
      expireTime = dayjs.isDayjs(values.expireTime)
        ? values.expireTime.format('YYYY-MM-DD HH:mm:ss')
        : String(values.expireTime)
    }
    const payload = {
      activeTimeout: values.activeTimeout || DEFAULT_ACTIVE_TIMEOUT,
      expireTime,
      ips: values.ipAccessType === 'whitelist' ? ipWhitelist.map(whitelist => ({ whitelist })) : undefined,
      name: values.name,
      remark: values.description || '',
      restrictedIp,
      spaceId: values.spaceId
    }

    try {
      const res = await addAbiClient(payload)
      if (!isFlatRequestSuccess(res)) return

      const msg = (res as any).response?.data?.msg || '创建成功'
      const createdSecretKey = extractSecretKey(res)

      message.success(msg)
      closeDrawer()

      if (createdSecretKey) {
        showOneTimeSecretKeyModal(createdSecretKey, '创建成功，请妥善保存 Secret Key')
      }

      refreshList(1)
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleToggleStatus = async (record: ApiKeyItem) => {
    const nextStatus: 0 | 1 = record.status === 'normal' ? 1 : 0
    const effectiveSpaceId = queryValues.spaceId || record.spaceId || currentSpaceId
    const res = await updateAbiClientStatus({
      id: record.id,
      spaceId: effectiveSpaceId,
      status: nextStatus
    })

    message.success((res as any).response?.data?.msg || '操作成功')
    refreshList()
  }

  const handleDelete = async (record: ApiKeyItem) => {
    const effectiveSpaceId = queryValues.spaceId || record.spaceId || currentSpaceId
    const res = await deleteAbiClient({
      id: record.id,
      spaceId: effectiveSpaceId
    })

    message.success((res as any).response?.data?.msg || '删除成功')

    if (rows.length === 1 && current > 1) {
      refreshList(current - 1)
      return
    }

    refreshList()
  }

  const handleResetSk = async (record: ApiKeyItem) => {
    const resetRes = await resetAbiClientSk(record.id)
    message.success((resetRes as any).response?.data?.msg || '重置成功')

    const resetSecretKey = extractSecretKeyFromReset(resetRes)
    if (resetSecretKey) {
      showOneTimeSecretKeyModal(resetSecretKey, 'Secret Key 已重置，请妥善保存')
    } else {
      message.warning('未获取到 Secret Key，请联系管理员确认接口返回')
    }

    refreshList()
  }

  const handleSearch = async () => {
    const values = (await queryForm.validateFields()) as {
      accessKey?: string
      clientId?: string
      createTimeRange?: [Dayjs, Dayjs]
      ipAccessType?: 'unlimited' | 'whitelist'
      spaceId: number
      status?: 'disabled' | 'normal'
    }

    setQueryValues({
      accessKey: values.accessKey?.trim(),
      clientId: values.clientId?.trim(),
      entCreateTime: values.createTimeRange?.[1] ? values.createTimeRange[1].format('YYYY-MM-DD') : undefined,
      ipAccessType: values.ipAccessType,
      spaceId: values.spaceId,
      startCreateTime: values.createTimeRange?.[0] ? values.createTimeRange[0].format('YYYY-MM-DD') : undefined,
      status: values.status
    })

    setCurrent(1)
  }

  // 搜索框停止输入 1s 后自动查询
  const { cancel: cancelDebouncedSearch, run: runDebouncedSearch } = useDebounceFn(() => { void handleSearch() }, { wait: 1000 })

  const handleResetSearch = () => {
    queryForm.resetFields()
    queryForm.setFieldValue('spaceId', currentSpaceId || undefined)
    setQueryValues({
      spaceId: currentSpaceId || undefined
    })
    setCurrent(1)
  }

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的 API Key')
      return
    }
    Modal.confirm({
      title: '批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个 API Key 吗？`,
      okText: '确认',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        let successCount = 0
        for (const id of selectedRowKeys) {
          const record = rows.find(r => r.id === id)
          if (!record) continue
          const effectiveSpaceId = queryValues.spaceId || record.spaceId || currentSpaceId
          try {
            await deleteAbiClient({ id: record.id, spaceId: effectiveSpaceId })
            successCount++
          } catch {
            // continue with others
          }
        }
        message.success(`成功删除 ${successCount} 个 API Key`)
        setSelectedRowKeys([])
        refreshList(1)
      },
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* v5 Searchbar */}
      <section className="abi-searchbar">
        <SearchFilterBar
          searchSlot={
            <AInput
              allowClear
              className="abi-field-input flex-1 min-w-0"
              placeholder="请输入 Access Key"
              prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
              onChange={(e) => {
                const value = e.target.value
                queryForm.setFieldValue('accessKey', value)
                if (value === '') {
                  cancelDebouncedSearch()
                  void handleSearch()
                } else {
                  runDebouncedSearch()
                }
              }}
              onPressEnter={() => { cancelDebouncedSearch(); void handleSearch() }}
            />
          }
          onQuery={handleSearch}
          onReset={handleResetSearch}
          filters={
            <>
              <SearchFilterField label="时间范围">
                <ADatePicker.RangePicker
                  allowClear
                  className="abi-field-input"
                  format="YYYY-MM-DD"
                  getPopupContainer={getFilterPopupContainer}
                  placeholder={['开始时间', '结束时间']}
                  onChange={(dates) => queryForm.setFieldValue('createTimeRange', dates)}
                />
              </SearchFilterField>
              <SearchFilterField label="状态">
                <ASelect
                  allowClear
                  className="abi-field-input w-full"
                  getPopupContainer={getFilterPopupContainer}
                  placeholder="状态"
                  options={[
                    { label: '正常', value: 'normal' },
                    { label: '停用', value: 'disabled' }
                  ]}
                  onChange={(v) => queryForm.setFieldValue('status', v)}
                />
              </SearchFilterField>
            </>
          }
        />
      </section>

      {/* v5 Data Area */}
      <section className="abi-data-area">
        <div className="abi-toolbar">
          <div className="abi-toolbar-left">
            <AButton className="btn-accent-gradient" onClick={openCreate}>
              <PlusOutlined />新增APIKey
            </AButton>
            <AButton danger
              disabled={selectedRowKeys.length === 0}
              onClick={handleBatchDelete}
            >
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

        <ApiKeyTable
          columnOptions={columnOptions}
          current={current}
          dataSource={rows}
          loading={listLoading}
          pageSize={PAGE_SIZE}
          selectedRowKeys={selectedRowKeys}
          total={total}
          viewMode={viewMode}
          onDelete={handleDelete}
          onPageChange={setCurrent}
          onResetSk={handleResetSk}
          onSelectedRowKeysChange={setSelectedRowKeys}
          onShareAssistant={setShareAssistantRecord}
          onToggleStatus={handleToggleStatus}
          onView={openView}
        />
      </section>

      <ApiKeyDrawer
        defaultSpaceId={currentSpaceId}
        mode={drawerMode}
        open={drawerOpen}
        options={spaceOptions}
        record={currentRecord}
        submitLoading={submitLoading}
        onClose={closeDrawer}
        onSubmit={handleSubmit}
      />

      <ShareAssistantDrawer
        apiKey={shareAssistantRecord}
        open={Boolean(shareAssistantRecord)}
        onClose={() => setShareAssistantRecord(null)}
      />
    </div>
  )
}
