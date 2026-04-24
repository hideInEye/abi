import { message } from 'antd'
import copy from 'copy-to-clipboard'

import PageTitle from '@/components/stateless/common/PageTitle'
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

import { ApiKeyDrawer } from './components/ApiKeyDrawer'
import { ApiKeyTable } from './components/ApiKeyTable'
import type { ApiKeyFormValues, ApiKeyItem, DrawerMode } from './types'

const PAGE_SIZE = 10
const DEFAULT_ACTIVE_TIMEOUT = 120

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
    rawSecretKey: '',
    secretKey: '',
    spaceId: Number(item.spaceId || fallbackSpaceId),
    status: isDisabled(item.status) ? 'disabled' : 'normal',
    timeoutMinutes: item.activeTimeout
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
  const [rows, setRows] = useState<ApiKeyItem[]>([])
  const [total, setTotal] = useState(0)
  const [current, setCurrent] = useState(1)
  const [listLoading, setListLoading] = useState(false)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('create')
  const [currentRecord, setCurrentRecord] = useState<ApiKeyItem | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)

  const [spaceOptions, setSpaceOptions] = useState<Array<{ label: string; value: number }>>([])

  const currentSpaceId = useMemo(() => Number(localStorage.getItem('spaceId')) || 0, [])

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
    async (pageNum: number) => {
      if (!currentSpaceId) {
        setRows([])
        setTotal(0)
        return
      }

      setListLoading(true)

      try {
        const res = await queryAbiClientList({
          pageNum,
          pageSize: PAGE_SIZE,
          spaceId: currentSpaceId
        })

        const payload = (res as any).response?.data || {}
        const list = (payload.rows || []) as AbiClientListItem[]

        setRows(list.map(item => mapClientRowToView(item, currentSpaceId)))
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
    loadList(current)
  }, [current, loadList])

  const refreshList = (targetPage?: number) => {
    if (typeof targetPage === 'number' && targetPage !== current) {
      setCurrent(targetPage)
      return
    }

    loadList(typeof targetPage === 'number' ? targetPage : current)
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

    const payload = {
      activeTimeout: currentRecord?.timeoutMinutes || DEFAULT_ACTIVE_TIMEOUT,
      expireTime: currentRecord?.expireTime || null,
      ips: values.ipAccessType === 'whitelist' ? ipWhitelist.map(whitelist => ({ whitelist })) : undefined,
      remark: values.description || '',
      restrictedIp: values.ipAccessType === 'whitelist' ? 1 : 0,
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
    const res = await updateAbiClientStatus({
      id: record.id,
      spaceId: record.spaceId || currentSpaceId,
      status: nextStatus
    })

    message.success((res as any).response?.data?.msg || '操作成功')
    refreshList()
  }

  const handleDelete = async (record: ApiKeyItem) => {
    const res = await deleteAbiClient({
      id: record.id,
      spaceId: record.spaceId || currentSpaceId
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

    const detailRes = await getAbiClientDetail(record.id)
    const secretKey = (detailRes as any).response?.data?.data as string | undefined

    AModal.info({
      content: (
        <div>
          <div>Secret Key 已重置，请及时保存：</div>
          <div style={{ fontFamily: 'monospace', marginTop: 12, wordBreak: 'break-all' }}>{secretKey || '-'}</div>
          <AButton
            style={{ marginTop: 12, paddingInline: 0 }}
            type="link"
            onClick={() => {
              if (!secretKey) {
                message.warning('Secret Key为空，无法复制')
                return
              }
              copy(secretKey)
              message.success('Secret Key已复制')
            }}
          >
            复制
          </AButton>
        </div>
      ),
      title: 'Secret Key 已重置'
    })

    refreshList()
  }

  return (
    <div className="h-full min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
      <ACard
        className="h-full flex-col-stretch sm:flex-1-hidden border-0 card-wrapper"
        styles={{ body: { display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, overflow: 'hidden' } }}
      >
        <PageTitle style={{ paddingBottom: '0.5rem' }} />

        <div style={{ color: '#475569', marginBottom: 16 }}>
          用于管理业务空间下的客户端访问授权凭证，支持 AK/SK 生成、IP 访问限制和启停控制。
        </div>

        <AFlex
          justify="end"
          style={{ marginBottom: 16 }}
        >
          <AButton
            type="primary"
            onClick={openCreate}
          >
            新建 API Key
          </AButton>
        </AFlex>

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
      </ACard>

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
