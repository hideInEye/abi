import { message } from 'antd'
import dayjs from 'dayjs'

import PageTitle from '@/components/stateless/common/PageTitle'

import { ApiKeyDrawer } from './components/ApiKeyDrawer'
import { ApiKeyTable } from './components/ApiKeyTable'
import type { ApiKeyFormValues, ApiKeyItem, DrawerMode } from './types'
import { generateCredential } from './utils'

const PAGE_SIZE = 10

const initialData: ApiKeyItem[] = [
  {
    accessKey: 'ak_1a2b3c4d5e',
    businessSpace: '默认业务空间',
    clientId: 'cli_3f8a9afc61',
    createdAt: '2026-04-15 10:23:13',
    description: '默认空间的客户端访问授权',
    id: 1,
    ipAccessType: 'unlimited',
    ipWhitelist: [],
    secretKey: 'sk_7f4f8a22a1',
    status: 'normal'
  },
  {
    accessKey: 'ak_6f7g8h9i0j',
    businessSpace: '开发测试空间',
    clientId: 'cli_7b8c9d0e1f',
    createdAt: '2026-01-28 09:16:49',
    description: '开发空间 API Key',
    id: 2,
    ipAccessType: 'whitelist',
    ipWhitelist: ['192.168.1.10', '192.168.1.0/24'],
    secretKey: 'sk_9b5e3c11d2',
    status: 'disabled'
  }
]

export function Component() {
  const [rows, setRows] = useState<ApiKeyItem[]>(initialData)
  const [current, setCurrent] = useState(1)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('create')
  const [currentRecord, setCurrentRecord] = useState<ApiKeyItem | null>(null)

  const businessSpaceOptions = useMemo(() => {
    const spaces = new Set(rows.map(item => item.businessSpace))
    if (!spaces.size) spaces.add('默认业务空间')

    return Array.from(spaces).map(item => ({ label: item, value: item }))
  }, [rows])

  const pagedRows = useMemo(() => {
    const start = (current - 1) * PAGE_SIZE
    return rows.slice(start, start + PAGE_SIZE)
  }, [current, rows])

  const openCreate = () => {
    setDrawerMode('create')
    setCurrentRecord(null)
    setDrawerOpen(true)
  }

  const openView = (record: ApiKeyItem) => {
    setDrawerMode('view')
    setCurrentRecord(record)
    setDrawerOpen(true)
  }

  const openEdit = (record: ApiKeyItem) => {
    setDrawerMode('edit')
    setCurrentRecord(record)
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    setCurrentRecord(null)
  }

  const handleSubmit = (values: ApiKeyFormValues, ipWhitelist: string[]) => {
    if (drawerMode === 'create') {
      const newItem: ApiKeyItem = {
        accessKey: generateCredential('ak'),
        businessSpace: values.businessSpace,
        clientId: generateCredential('cli'),
        createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        description: values.description || '',
        id: Date.now(),
        ipAccessType: values.ipAccessType,
        ipWhitelist,
        secretKey: generateCredential('sk'),
        status: 'normal'
      }

      setRows(prev => [newItem, ...prev])
      message.success('创建成功')
    }

    if (drawerMode === 'edit' && currentRecord) {
      setRows(prev =>
        prev.map(item => {
          if (item.id !== currentRecord.id) return item

          return {
            ...item,
            businessSpace: values.businessSpace,
            description: values.description || '',
            ipAccessType: values.ipAccessType,
            ipWhitelist
          }
        })
      )
      message.success('保存成功')
    }

    closeDrawer()
  }

  const handleToggleStatus = (record: ApiKeyItem) => {
    setRows(prev =>
      prev.map(item => {
        if (item.id !== record.id) return item
        return { ...item, status: item.status === 'normal' ? 'disabled' : 'normal' }
      })
    )
  }

  const handleDelete = (record: ApiKeyItem) => {
    setRows(prev => prev.filter(item => item.id !== record.id))
    message.success('删除成功')
  }

  const handleResetSk = (record: ApiKeyItem) => {
    const secretKey = generateCredential('sk')

    setRows(prev => prev.map(item => (item.id === record.id ? { ...item, secretKey } : item)))

    AModal.info({
      content: (
        <div>
          <div>新的 Secret Key 仅展示一次，请立即保存：</div>
          <div style={{ fontFamily: 'monospace', marginTop: 12, wordBreak: 'break-all' }}>{secretKey}</div>
        </div>
      ),
      title: 'Secret Key 已重置'
    })
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
          dataSource={pagedRows}
          pageSize={PAGE_SIZE}
          total={rows.length}
          onDelete={handleDelete}
          onEdit={openEdit}
          onPageChange={setCurrent}
          onResetSk={handleResetSk}
          onToggleStatus={handleToggleStatus}
          onView={openView}
        />
      </ACard>

      <ApiKeyDrawer
        mode={drawerMode}
        open={drawerOpen}
        options={businessSpaceOptions}
        record={currentRecord}
        onClose={closeDrawer}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
