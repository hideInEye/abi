import { SearchOutlined, PlusOutlined } from '@ant-design/icons'
import { message } from 'antd'
import copy from 'copy-to-clipboard'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'

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
import { getSpaceId } from '@/store/slice/app'
import { useAppSelector } from '@/hooks/business/useStore'

import { ApiKeyDrawer } from './components/ApiKeyDrawer'
import { ApiKeyTable } from './components/ApiKeyTable'
import type { ApiKeyFormValues, ApiKeyItem, ApiKeyQueryValues, DrawerMode } from './types'

const PAGE_SIZE = 10
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
  const [submitLoading, setSubmitLoading] = useState(false)

  const [spaceOptions, setSpaceOptions] = useState<Array<{ label: string; value: number }>>([])
  const [queryValues, setQueryValues] = useState<ApiKeyQueryValues>({
    spaceId: currentSpaceId || undefined
  })

  const loadSpaceOptions = useCallback(async () => {
    try {
      const res = await spaceList({
        isAsc: 'desc',
        orderByColumn: 'spaceId',
        pageNum: 1,
        pageSize: 1000
      })

      const list = ((res as any).response?.data?.rows || []) as Array<{ spaceId: number; spaceName: string }>

      const options = list.map(item => ({
        label: item.spaceName,
        value: Number(item.spaceId)
      }))

      setSpaceOptions(options)
    } catch {
      message.warning('加载空间列表失败')
    }
  }, [])

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
    loadSpaceOptions()
  }, [loadSpaceOptions])

  useEffect(() => {
    if (!currentSpaceId) return
    queryForm.setFieldValue('spaceId', currentSpaceId)
    setQueryValues(prev => ({ ...prev, spaceId: currentSpaceId }))
    setCurrent(1)
  }, [currentSpaceId, queryForm])

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

    const matchedSpace = spaceOptions.find(item => item.value === mapped.spaceId)
    if (matchedSpace) mapped.businessSpace = matchedSpace.label

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
      remark: values.description || '',
      restrictedIp,
      spaceId: values.spaceId
    }

    try {
      const res = await addAbiClient(payload)
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

  const handleResetSearch = () => {
    queryForm.resetFields()
    queryForm.setFieldValue('spaceId', currentSpaceId || undefined)
    setQueryValues({
      spaceId: currentSpaceId || undefined
    })
    setCurrent(1)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <div style={{ color: '#475569', padding: '12px 28px 0' }}>
        用于管理业务空间下的客户端访问授权凭证，支持 AK/SK 生成、IP 访问限制和启停控制。
      </div>
      {/* v5 Searchbar */}
      <section className="abi-searchbar">
        <div className="abi-search-row">
          <ASelect
            options={spaceOptions}
            placeholder="请选择业务空间"
            className="abi-field-input"
            style={{ width: 200 }}
            defaultValue={queryValues.spaceId}
            onChange={(v: number) => queryForm.setFieldValue('spaceId', v)}
          />
          <AInput
            allowClear
            placeholder="请输入 Client ID"
            prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
            className="abi-field-input"
            style={{ width: 200 }}
            onChange={(e) => queryForm.setFieldValue('clientId', e.target.value)}
            onPressEnter={handleSearch}
          />
          <AInput
            allowClear
            placeholder="请输入 Access Key"
            prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
            className="abi-field-input"
            style={{ width: 200 }}
            onChange={(e) => queryForm.setFieldValue('accessKey', e.target.value)}
            onPressEnter={handleSearch}
          />
          <ASelect
            allowClear
            placeholder="状态"
            className="abi-field-input"
            style={{ width: 120 }}
            options={[
              { label: '正常', value: 'normal' },
              { label: '停用', value: 'disabled' }
            ]}
            onChange={(v) => queryForm.setFieldValue('status', v)}
          />
          <ASelect
            allowClear
            placeholder="IP访问限制"
            className="abi-field-input"
            style={{ width: 140 }}
            options={[
              { label: '不限制', value: 'unlimited' },
              { label: '仅白名单', value: 'whitelist' }
            ]}
            onChange={(v) => queryForm.setFieldValue('ipAccessType', v)}
          />
          <ADatePicker.RangePicker
            allowClear
            format="YYYY-MM-DD"
            placeholder={['开始时间', '结束时间']}
            className="abi-field-input"
            onChange={(dates) => queryForm.setFieldValue('createTimeRange', dates)}
          />
          <AButton type="primary" className="btn-accent-gradient" onClick={handleSearch}>
            <SearchOutlined /> 查询
          </AButton>
          <AButton className="btn-ghost-v5" onClick={handleResetSearch}>
            重置
          </AButton>
        </div>
      </section>

      {/* v5 Data Area */}
      <section className="abi-data-area">
        <div className="abi-toolbar">
          <div className="abi-toolbar-left">
            <AButton className="btn-accent-gradient" onClick={openCreate}>
              <PlusOutlined />新建 API Key
            </AButton>
          </div>
        </div>

        <ApiKeyTable
          current={current}
          dataSource={rows}
          loading={listLoading}
          pageSize={PAGE_SIZE}
          total={total}
          onDelete={handleDelete}
          onPageChange={setCurrent}
          onResetSk={handleResetSk}
          onToggleStatus={handleToggleStatus}
          onView={openView}
        />
      </section>

      <ApiKeyDrawer
        mode={drawerMode}
        open={drawerOpen}
        options={spaceOptions}
        record={currentRecord}
        submitLoading={submitLoading}
        onClose={closeDrawer}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
