import { CloseOutlined, EyeOutlined, KeyOutlined, LockOutlined, SettingOutlined } from '@ant-design/icons'
import { message } from 'antd'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import copy from 'copy-to-clipboard'
import dayjs from 'dayjs'

import type { ApiKeyFormValues, ApiKeyItem, DrawerMode, IpAccessType } from '../types'
import { isIpDuplicated, normalizeIpValue, validateIpOrCidr } from '../utils'

interface ApiKeyDrawerProps {
  readonly defaultSpaceId?: number
  readonly mode: DrawerMode
  readonly onClose: () => void
  readonly onSubmit: (values: ApiKeyFormValues, ipWhitelist: string[]) => void
  readonly open: boolean
  readonly options: Array<{ label: string; value: number }>
  readonly record: ApiKeyItem | null
  readonly submitLoading?: boolean
}

const drawerTitleMap: Record<DrawerMode, string> = {
  create: '新建客户端访问授权',
  view: '查看客户端访问授权',
}

export function ApiKeyDrawer({ defaultSpaceId, mode, onClose, onSubmit, open, options, record, submitLoading = false }: ApiKeyDrawerProps) {
  const [form] = AForm.useForm<ApiKeyFormValues>()

  const [ipInput, setIpInput] = useState('')
  const [ipWhitelist, setIpWhitelist] = useState<string[]>([])
  const [importOpen, setImportOpen] = useState(false)
  const [importValue, setImportValue] = useState('')

  const isView = mode === 'view'
  const statusText = record?.status === 'normal' ? '正常' : '停用'
  const ipLimitText = record?.ipAccessType === 'whitelist' ? '仅白名单' : '不限制'

  useEffect(() => {
    if (!open) return

    const resolvedSpaceId = record?.spaceId || (mode === 'create' && defaultSpaceId ? defaultSpaceId : undefined) || options[0]?.value

    form.setFieldsValue({
      activeTimeout: record?.timeoutSeconds || 1800,
      description: record?.description || '',
      expireTime: record?.expireTime ? dayjs(record.expireTime) : undefined,
      ipAccessType: record?.ipAccessType || 'unlimited',
      name: '',
      spaceId: resolvedSpaceId,
    })

    setIpWhitelist(record?.ipWhitelist || [])
    setIpInput('')
    setImportValue('')
  }, [form, open, options, record, mode, defaultSpaceId])

  const tryAddIp = (rawValue: string) => {
    const value = normalizeIpValue(rawValue)

    if (!value) {
      message.error('请输入至少一个 IP 或 CIDR 网段')
      return false
    }

    if (!validateIpOrCidr(value)) {
      message.error('请输入正确的 IP 或 CIDR 网段')
      return false
    }

    if (isIpDuplicated(ipWhitelist, value)) {
      message.error('该 IP 或 CIDR 已存在')
      return false
    }

    setIpWhitelist((prev) => [...prev, value])
    setIpInput('')
    return true
  }

  const handleAddIp = () => {
    if (isView) return
    tryAddIp(ipInput)
  }

  const handleImport = () => {
    const lines = importValue
      .split('\n')
      .map((item) => normalizeIpValue(item))
      .filter(Boolean)

    if (!lines.length) {
      message.error('请输入至少一个 IP 或 CIDR 网段')
      return
    }

    if (lines.some((item) => !validateIpOrCidr(item))) {
      message.error('请输入正确的 IP 或 CIDR 网段')
      return
    }

    const mergedSet = new Set(ipWhitelist.map((item) => item.toLowerCase()))

    for (const item of lines) {
      const key = item.toLowerCase()
      if (mergedSet.has(key)) {
        message.error('该 IP 或 CIDR 已存在')
        return
      }
      mergedSet.add(key)
    }

    setIpWhitelist((prev) => [...prev, ...lines])
    setImportValue('')
    setImportOpen(false)
  }

  const removeTag = (value: string) => {
    setIpWhitelist((prev) => prev.filter((item) => item !== value))
  }

  const copyCredential = (value: string | undefined, label: string) => {
    if (!value) {
      message.warning(`${label}为空，无法复制`)
      return
    }

    copy(value)
    message.success(`${label}已复制`)
  }

  const handleFinish = async () => {
    const values = await form.validateFields()

    if (values.ipAccessType === 'whitelist' && ipWhitelist.length === 0) {
      message.error('请输入至少一个 IP 或 CIDR 网段')
      return
    }

    onSubmit(
      {
        ...values,
        expireTime: values.expireTime ? dayjs(values.expireTime).format('YYYY-MM-DD HH:mm:ss') : null,
      },
      values.ipAccessType === 'whitelist' ? ipWhitelist : [],
    )
  }

  const renderViewMode = () => {
    const sectionHeaderStyle = (icon: React.ReactNode, title: string) => (
      <div
        style={{
          alignItems: 'center',
          borderBottom: '1px solid rgba(130,140,200,0.10)',
          display: 'flex',
          gap: 10,
          marginBottom: 20,
          padding: '10px 0',
        }}
      >
        <div
          style={{
            alignItems: 'center',
            background: 'linear-gradient(135deg, #5b7cf7 0%, #7091fa 100%)',
            borderRadius: 7,
            boxShadow: '0 2px 8px rgba(91,124,247,0.25)',
            color: '#fff',
            display: 'flex',
            fontSize: 13,
            height: 26,
            justifyContent: 'center',
            width: 26,
          }}
        >
          {icon}
        </div>
        <span style={{ color: '#1a2744', fontSize: 14, fontWeight: 600, letterSpacing: '0.02em' }}>{title}</span>
      </div>
    )

    const infoRowStyle = (label: string, value: React.ReactNode, isLast = false) => (
      <div
        style={{
          alignItems: 'center',
          borderBottom: isLast ? 'none' : '1px dashed rgba(130,140,200,0.10)',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 13,
          padding: '10px 14px',
        }}
      >
        <span style={{ color: '#768a9f', fontWeight: 500 }}>{label}</span>
        <span style={{ color: '#1a2744', fontWeight: 500, maxWidth: '60%', textAlign: 'right' }}>{value}</span>
      </div>
    )

    return (
      <div style={{ padding: '0 24px 24px' }}>
        {/* 基础信息 */}
        {sectionHeaderStyle(<SettingOutlined />, '基础信息')}
        <div
          style={{
            background: '#fff',
            border: '1px solid rgba(130,140,200,0.12)',
            borderRadius: 12,
            boxShadow: '0 1px 4px rgba(91,124,247,0.04)',
            overflow: 'hidden',
          }}
        >
          {infoRowStyle('归属业务空间', record?.businessSpace || '-')}
          {infoRowStyle('当前状态', <ATag color={record?.status === 'normal' ? 'default' : 'error'}>{statusText}</ATag>)}
          {infoRowStyle('创建时间', record?.createdAt || '-')}
          {infoRowStyle('描述', record?.description || '-', true)}
        </div>

        {/* 凭证配置 */}
        <div style={{ marginTop: 24 }}>
          {sectionHeaderStyle(<KeyOutlined />, '凭证配置')}
          <div
            style={{
              background: '#fff',
              border: '1px solid rgba(130,140,200,0.12)',
              borderRadius: 12,
              boxShadow: '0 1px 4px rgba(91,124,247,0.04)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                alignItems: 'center',
                borderBottom: '1px dashed rgba(130,140,200,0.10)',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 13,
                padding: '10px 14px',
              }}
            >
              <span style={{ color: '#768a9f', fontWeight: 500 }}>Client ID</span>
              <span style={{ alignItems: 'center', color: '#1a2744', display: 'flex', gap: 8, maxWidth: '60%' }}>
                <span style={{ wordBreak: 'break-all' }}>{record?.clientId || '-'}</span>
                <AButton size="small" type="link" onClick={() => copyCredential(record?.clientId, 'Client ID')}>
                  复制
                </AButton>
              </span>
            </div>
            <div
              style={{
                alignItems: 'center',
                borderBottom: 'none',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 13,
                padding: '10px 14px',
              }}
            >
              <span style={{ color: '#768a9f', fontWeight: 500 }}>Access Key</span>
              <span style={{ alignItems: 'center', color: '#1a2744', display: 'flex', gap: 8, maxWidth: '60%' }}>
                <span style={{ wordBreak: 'break-all' }}>{record?.accessKey || '-'}</span>
                <AButton size="small" type="link" onClick={() => copyCredential(record?.accessKey, 'Access Key')}>
                  复制
                </AButton>
              </span>
            </div>
          </div>
        </div>

        {/* 访问配置 */}
        <div style={{ marginTop: 24 }}>
          {sectionHeaderStyle(<LockOutlined />, '访问配置')}
          <div
            style={{
              background: '#fff',
              border: '1px solid rgba(130,140,200,0.12)',
              borderRadius: 12,
              boxShadow: '0 1px 4px rgba(91,124,247,0.04)',
              overflow: 'hidden',
            }}
          >
            {infoRowStyle('IP访问限制', ipLimitText)}
            {infoRowStyle('Token活跃超时时间', typeof record?.timeoutSeconds === 'number' ? `${record.timeoutSeconds} 秒` : '-')}
            {infoRowStyle('过期时间', record?.expireTime || '永久有效')}
            {record?.ipAccessType === 'whitelist' && (
              <div
                style={{
                  borderBottom: 'none',
                  fontSize: 13,
                  padding: '10px 14px',
                }}
              >
                <div style={{ color: '#768a9f', fontWeight: 500, marginBottom: 8 }}>IP 白名单</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(record?.ipWhitelist || []).length > 0 ? record?.ipWhitelist?.map((ip) => <ATag key={ip}>{ip}</ATag>) : <span style={{ color: '#a3b3c8' }}>-</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <CommonDrawer
        className="ds-operate-drawer"
        destroyOnClose
        open={open}
        description={isView ? '查看 API Key 详细配置信息' : '创建新的客户端访问授权凭证'}
        icon={isView ? <EyeOutlined /> : <KeyOutlined />}
        title={drawerTitleMap[mode]}
        width={isView ? 490 : 980}
        footer={
          <div style={{ alignItems: 'center', display: 'flex', gap: 12, justifyContent: 'flex-end', padding: '4px 0' }}>
            {isView ? (
              <AButton
                onClick={onClose}
                style={{
                  background: 'linear-gradient(135deg, #5b7cf7, #7091fa)',
                  border: 'none',
                  borderRadius: 8,
                  boxShadow: '0 2px 10px rgba(91,124,247,0.3)',
                  fontWeight: 600,
                  height: 38,
                  padding: '0 28px',
                }}
                type="primary"
              >
                关闭
              </AButton>
            ) : (
              <>
                <AButton
                  onClick={onClose}
                  style={{ background: 'transparent', border: '1px solid rgba(130,140,200,0.18)', borderRadius: 8, color: '#5f7490', fontWeight: 500, height: 38, padding: '0 20px' }}
                >
                  取消
                </AButton>
                <AButton
                  loading={submitLoading}
                  onClick={handleFinish}
                  style={{
                    background: 'linear-gradient(135deg, #5b7cf7, #7091fa)',
                    border: 'none',
                    borderRadius: 8,
                    boxShadow: '0 2px 10px rgba(91,124,247,0.3)',
                    fontWeight: 600,
                    height: 38,
                    padding: '0 28px',
                  }}
                  type="primary"
                >
                  {mode === 'create' ? '确认新建' : '确认保存'}
                </AButton>
              </>
            )}
          </div>
        }
        onClose={onClose}
      >
        {isView ? (
          renderViewMode()
        ) : (
          <AForm form={form} initialValues={{ ipAccessType: 'unlimited' }} layout="vertical" style={{ padding: '0 24px 24px' }}>
            {/* 基础信息 Section */}
            <div
              style={{
                alignItems: 'center',
                borderBottom: '1px solid rgba(130,140,200,0.10)',
                display: 'flex',
                gap: 10,
                marginBottom: 20,
                padding: '10px 0',
              }}
            >
              <div
                style={{
                  alignItems: 'center',
                  background: 'linear-gradient(135deg, #5b7cf7 0%, #7091fa 100%)',
                  borderRadius: 7,
                  boxShadow: '0 2px 8px rgba(91,124,247,0.25)',
                  color: '#fff',
                  display: 'flex',
                  fontSize: 13,
                  height: 26,
                  justifyContent: 'center',
                  width: 26,
                }}
              >
                <SettingOutlined />
              </div>
              <span style={{ color: '#1a2744', fontSize: 14, fontWeight: 600, letterSpacing: '0.02em' }}>基础信息</span>
            </div>

            <div
              style={{
                background: '#fff',
                border: '1px solid rgba(130,140,200,0.12)',
                borderRadius: 12,
                boxShadow: '0 1px 4px rgba(91,124,247,0.04)',
                padding: '20px',
                marginBottom: 24,
              }}
            >
              <AForm.Item
                label={<span style={{ color: '#3e5068', fontWeight: 500 }}>名称</span>}
                name="name"
                rules={[
                  { message: '请输入名称', required: true },
                  { message: '名称仅支持中英文、数字和下划线', pattern: /^[\u4e00-\u9fffA-Za-z0-9_]+$/ },
                ]}
              >
                <AInput placeholder="请输入名称，仅支持中英文、数字和下划线" />
              </AForm.Item>

              <AForm.Item label={<span style={{ color: '#3e5068', fontWeight: 500 }}>归属业务空间</span>} name="spaceId" rules={[{ message: '请选择归属业务空间', required: true }]}>
                <ASelect disabled options={options} placeholder="请选择归属业务空间" />
              </AForm.Item>

              <AForm.Item label={<span style={{ color: '#3e5068', fontWeight: 500 }}>描述</span>} name="description">
                <AInput.TextArea maxLength={200} placeholder="请输入描述信息，用于说明该 API Key 的用途" rows={4} style={{ borderRadius: 8 }} />
              </AForm.Item>
            </div>

            {/* 访问配置 Section */}
            <div
              style={{
                alignItems: 'center',
                borderBottom: '1px solid rgba(130,140,200,0.10)',
                display: 'flex',
                gap: 10,
                marginBottom: 20,
                padding: '10px 0',
              }}
            >
              <div
                style={{
                  alignItems: 'center',
                  background: 'linear-gradient(135deg, #5b7cf7 0%, #7091fa 100%)',
                  borderRadius: 7,
                  boxShadow: '0 2px 8px rgba(91,124,247,0.25)',
                  color: '#fff',
                  display: 'flex',
                  fontSize: 13,
                  height: 26,
                  justifyContent: 'center',
                  width: 26,
                }}
              >
                <LockOutlined />
              </div>
              <span style={{ color: '#1a2744', fontSize: 14, fontWeight: 600, letterSpacing: '0.02em' }}>访问配置</span>
            </div>

            <div
              style={{
                background: '#fff',
                border: '1px solid rgba(130,140,200,0.12)',
                borderRadius: 12,
                boxShadow: '0 1px 4px rgba(91,124,247,0.04)',
                padding: '20px',
                marginBottom: 24,
              }}
            >
              <AForm.Item label={<span style={{ color: '#3e5068', fontWeight: 500 }}>IP 访问限制</span>} name="ipAccessType">
                <ARadio.Group>
                  <ARadio value="unlimited">不限制</ARadio>
                  <ARadio value="whitelist">仅白名单</ARadio>
                </ARadio.Group>
              </AForm.Item>

              <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
                <AForm.Item
                  label={<span style={{ color: '#3e5068', fontWeight: 500 }}>Token活跃超时时间 (秒)</span>}
                  name="activeTimeout"
                  rules={[
                    { message: '请输入Token活跃超时时间', required: true },
                    { message: '请输入大于0的整数', min: 1, type: 'number' },
                  ]}
                >
                  <AInputNumber min={1} placeholder="请输入Token活跃超时时间(秒)" precision={0} style={{ width: '100%' }} />
                </AForm.Item>

                <AForm.Item label={<span style={{ color: '#3e5068', fontWeight: 500 }}>过期时间</span>} name="expireTime">
                  <ADatePicker showTime format="YYYY-MM-DD HH:mm:ss" placeholder="请选择过期时间，留空表示永久有效" style={{ width: '100%' }} />
                </AForm.Item>
              </div>

              <AForm.Item noStyle shouldUpdate={(prev, next) => prev.ipAccessType !== next.ipAccessType}>
                {({ getFieldValue }) => {
                  const ipAccessType = getFieldValue('ipAccessType') as IpAccessType

                  if (ipAccessType !== 'whitelist') {
                    return null
                  }

                  return (
                    <div>
                      <div style={{ color: '#3e5068', fontWeight: 500, marginBottom: 8 }}>IP 白名单</div>
                      <AInput.Group compact>
                        <AInput
                          placeholder="请输入 IP 或 CIDR，按 Enter 添加"
                          style={{ borderRadius: '8px 0 0 8px', width: 'calc(100% - 88px)' }}
                          value={ipInput}
                          onChange={(e) => setIpInput(e.target.value)}
                          onPressEnter={(e) => {
                            e.preventDefault()
                            handleAddIp()
                          }}
                        />
                        <AButton style={{ borderRadius: '0 8px 8px 0', width: 88 }} onClick={handleAddIp}>
                          添加
                        </AButton>
                      </AInput.Group>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8, marginTop: 10 }}>
                        {ipWhitelist.map((item) => (
                          <ATag
                            closable
                            key={item}
                            onClose={(e) => {
                              e.preventDefault()
                              removeTag(item)
                            }}
                          >
                            {item}
                          </ATag>
                        ))}
                      </div>

                      <div
                        style={{
                          alignItems: 'center',
                          color: '#8c8c8c',
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>支持单个 IP 或 CIDR 网段，例如：192.168.1.10、192.168.1.0/24、2001:db8::/32。</span>
                        <AButton style={{ paddingInline: 0 }} type="link" onClick={() => setImportOpen(true)}>
                          批量导入
                        </AButton>
                      </div>
                    </div>
                  )
                }}
              </AForm.Item>
            </div>

            {/* 自动生成凭证说明 Section */}
            <div
              style={{
                alignItems: 'center',
                borderBottom: '1px solid rgba(130,140,200,0.10)',
                display: 'flex',
                gap: 10,
                marginBottom: 20,
                padding: '10px 0',
              }}
            >
              <div
                style={{
                  alignItems: 'center',
                  background: 'linear-gradient(135deg, #5b7cf7 0%, #7091fa 100%)',
                  borderRadius: 7,
                  boxShadow: '0 2px 8px rgba(91,124,247,0.25)',
                  color: '#fff',
                  display: 'flex',
                  fontSize: 13,
                  height: 26,
                  justifyContent: 'center',
                  width: 26,
                }}
              >
                <KeyOutlined />
              </div>
              <span style={{ color: '#1a2744', fontSize: 14, fontWeight: 600, letterSpacing: '0.02em' }}>自动生成凭证说明</span>
            </div>

            <div
              style={{
                background: 'rgba(91,124,247,0.04)',
                border: '1px solid rgba(91,124,247,0.12)',
                borderRadius: 10,
                color: '#3e5068',
                lineHeight: 2,
                padding: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ color: '#5b7cf7', fontWeight: 600 }}>•</span>
                <span>Client ID、Access Key、Secret Key 将由系统自动生成。</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ color: '#5b7cf7', fontWeight: 600 }}>•</span>
                <span>Secret Key 仅在创建成功后展示一次，请及时复制并妥善保存。</span>
              </div>
            </div>
          </AForm>
        )}
      </CommonDrawer>

      <AModal destroyOnClose open={importOpen} title="批量导入 IP 白名单" onCancel={() => setImportOpen(false)} onOk={handleImport}>
        <AInput.TextArea placeholder="每行输入一个 IP 或 CIDR" rows={8} value={importValue} onChange={(e) => setImportValue(e.target.value)} />
      </AModal>
    </>
  )
}
