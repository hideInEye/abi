import { message } from 'antd'
import copy from 'copy-to-clipboard'
import dayjs from 'dayjs'

import type { ApiKeyFormValues, ApiKeyItem, DrawerMode, IpAccessType } from '../types'
import { isIpDuplicated, normalizeIpValue, validateIpOrCidr } from '../utils'

interface ApiKeyDrawerProps {
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
  view: '查看客户端访问授权'
}

export function ApiKeyDrawer({
  mode,
  onClose,
  onSubmit,
  open,
  options,
  record,
  submitLoading = false
}: ApiKeyDrawerProps) {
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

    form.setFieldsValue({
      activeTimeout: record?.timeoutSeconds || 1800,
      description: record?.description || '',
      expireTime: record?.expireTime ? dayjs(record.expireTime) : undefined,
      ipAccessType: record?.ipAccessType || 'unlimited',
      spaceId: record?.spaceId || options[0]?.value
    })

    setIpWhitelist(record?.ipWhitelist || [])
    setIpInput('')
    setImportValue('')
  }, [form, open, options, record])

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

    setIpWhitelist(prev => [...prev, value])
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
      .map(item => normalizeIpValue(item))
      .filter(Boolean)

    if (!lines.length) {
      message.error('请输入至少一个 IP 或 CIDR 网段')
      return
    }

    if (lines.some(item => !validateIpOrCidr(item))) {
      message.error('请输入正确的 IP 或 CIDR 网段')
      return
    }

    const mergedSet = new Set(ipWhitelist.map(item => item.toLowerCase()))

    for (const item of lines) {
      const key = item.toLowerCase()
      if (mergedSet.has(key)) {
        message.error('该 IP 或 CIDR 已存在')
        return
      }
      mergedSet.add(key)
    }

    setIpWhitelist(prev => [...prev, ...lines])
    setImportValue('')
    setImportOpen(false)
  }

  const removeTag = (value: string) => {
    setIpWhitelist(prev => prev.filter(item => item !== value))
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
        expireTime: values.expireTime ? dayjs(values.expireTime).format('YYYY-MM-DD HH:mm:ss') : null
      },
      values.ipAccessType === 'whitelist' ? ipWhitelist : []
    )
  }

  const viewRowStyle: React.CSSProperties = {
    borderBottom: '1px solid #d9dfe8',
    display: 'grid',
    gridTemplateColumns: '260px 1fr'
  }

  const viewLabelStyle: React.CSSProperties = {
    background: '#f2f5fa',
    color: '#344054',
    fontSize: 14,
    fontWeight: 500,
    minHeight: 48,
    padding: '10px 12px'
  }

  const viewValueStyle: React.CSSProperties = {
    alignItems: 'center',
    color: '#1f2937',
    display: 'flex',
    fontSize: 14,
    minHeight: 48,
    padding: '10px 12px'
  }

  const viewCardStyle: React.CSSProperties = {
    border: '1px solid #d9dfe8',
    borderRadius: 10,
    overflow: 'hidden'
  }

  const sectionTitleStyle: React.CSSProperties = { color: '#1f2937', fontSize: 14, fontWeight: 600 }

  const renderBaseInfoCard = () => (
    <div style={viewCardStyle}>
      <div style={viewRowStyle}>
        <div style={viewLabelStyle}>归属业务空间</div>
        <div style={viewValueStyle}>{record?.businessSpace || '-'}</div>
      </div>
      <div style={viewRowStyle}>
        <div style={viewLabelStyle}>当前状态</div>
        <div style={viewValueStyle}>
          <ATag color={record?.status === 'normal' ? 'default' : 'error'}>{statusText}</ATag>
        </div>
      </div>
      <div style={viewRowStyle}>
        <div style={viewLabelStyle}>创建时间</div>
        <div style={viewValueStyle}>{record?.createdAt || '-'}</div>
      </div>
      <div style={{ ...viewRowStyle, borderBottom: 'none' }}>
        <div style={viewLabelStyle}>描述</div>
        <div style={viewValueStyle}>{record?.description || '-'}</div>
      </div>
    </div>
  )

  const renderCredentialCard = () => (
    <div style={viewCardStyle}>
      <div style={viewRowStyle}>
        <div style={viewLabelStyle}>Client ID</div>
        <div style={{ ...viewValueStyle, justifyContent: 'space-between' }}>
          <span style={{ marginRight: 12, wordBreak: 'break-all' }}>{record?.clientId || '-'}</span>
          <AButton
            type="link"
            onClick={() => copyCredential(record?.clientId, 'Client ID')}
          >
            复制
          </AButton>
        </div>
      </div>
      <div style={{ ...viewRowStyle, borderBottom: 'none' }}>
        <div style={viewLabelStyle}>Access Key</div>
        <div style={{ ...viewValueStyle, justifyContent: 'space-between' }}>
          <span style={{ marginRight: 12, wordBreak: 'break-all' }}>{record?.accessKey || '-'}</span>
          <AButton
            type="link"
            onClick={() => copyCredential(record?.accessKey, 'Access Key')}
          >
            复制
          </AButton>
        </div>
      </div>
    </div>
  )

  const renderAccessCard = () => {
    const showWhitelist = record?.ipAccessType === 'whitelist'
    const whitelistItems = record?.ipWhitelist || []

    return (
      <div style={viewCardStyle}>
        <div style={viewRowStyle}>
          <div style={viewLabelStyle}>IP访问限制</div>
          <div style={viewValueStyle}>{ipLimitText}</div>
        </div>
        <div style={viewRowStyle}>
          <div style={viewLabelStyle}>Token活跃超时时间(秒)</div>
          <div style={viewValueStyle}>
            {typeof record?.timeoutSeconds === 'number' ? `${record.timeoutSeconds} 秒` : '-'}
          </div>
        </div>
        <div style={viewRowStyle}>
          <div style={viewLabelStyle}>过期时间</div>
          <div style={viewValueStyle}>{record?.expireTime || '永久有效'}</div>
        </div>
        {showWhitelist && (
          <div style={{ ...viewRowStyle, borderBottom: 'none' }}>
            <div style={viewLabelStyle}>IP 白名单</div>
            <div style={{ ...viewValueStyle, alignItems: 'flex-start', display: 'block' }}>
              {whitelistItems.length ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {whitelistItems.map(ip => (
                    <ATag key={ip}>{ip}</ATag>
                  ))}
                </div>
              ) : (
                '-'
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderViewMode = () => (
    <>
      <div style={sectionTitleStyle}>基础与状态信息</div>
      <ADivider style={{ margin: '10px 0' }} />
      {renderBaseInfoCard()}

      <div style={{ ...sectionTitleStyle, marginTop: 12 }}>凭证配置</div>
      <ADivider style={{ margin: '10px 0' }} />
      {renderCredentialCard()}

      <div style={{ ...sectionTitleStyle, marginTop: 12 }}>访问配置</div>
      <ADivider style={{ margin: '10px 0' }} />
      {renderAccessCard()}
    </>
  )

  return (
    <>
      <ADrawer
        destroyOnClose
        open={open}
        title={drawerTitleMap[mode]}
        width={980}
        footer={
          <AFlex
            gap={12}
            justify="end"
          >
            {isView ? (
              <AButton
                type="primary"
                onClick={onClose}
              >
                关闭
              </AButton>
            ) : (
              <AButton onClick={onClose}>取消</AButton>
            )}
            {!isView && (
              <AButton
                loading={submitLoading}
                type="primary"
                onClick={handleFinish}
              >
                {mode === 'create' ? '确认新建' : '确认保存'}
              </AButton>
            )}
          </AFlex>
        }
        onClose={onClose}
      >
        {isView ? (
          renderViewMode()
        ) : (
          <>
            <div style={{ color: '#1f2937', fontSize: 28, fontWeight: 600 }}>基础信息</div>
            <ADivider />

            <AForm
              form={form}
              layout="vertical"
            >
              <AForm.Item
                label="归属业务空间"
                name="spaceId"
                rules={[{ message: '请选择归属业务空间', required: true }]}
              >
                <ASelect
                  options={options}
                  placeholder="请选择归属业务空间"
                />
              </AForm.Item>

              <AForm.Item
                label="描述"
                name="description"
              >
                <AInput.TextArea
                  maxLength={200}
                  placeholder="请输入描述"
                  rows={4}
                />
              </AForm.Item>

              <div style={{ color: '#1f2937', fontSize: 28, fontWeight: 600, marginTop: 16 }}>访问配置</div>
              <ADivider />

              <AForm.Item
                initialValue="unlimited"
                label="IP 访问限制"
                name="ipAccessType"
              >
                <ARadio.Group>
                  <ARadio value="unlimited">不限制</ARadio>
                  <ARadio value="whitelist">仅白名单</ARadio>
                </ARadio.Group>
              </AForm.Item>

              <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
                <AForm.Item
                  label="Token活跃超时时间 (秒)"
                  name="activeTimeout"
                  rules={[
                    { message: '请输入Token活跃超时时间', required: true },
                    { message: '请输入大于0的整数', min: 1, type: 'number' }
                  ]}
                >
                  <AInputNumber
                    min={1}
                    placeholder="请输入Token活跃超时时间(秒)"
                    precision={0}
                    style={{ width: '100%' }}
                  />
                </AForm.Item>

                <AForm.Item
                  label="过期时间"
                  name="expireTime"
                >
                  <ADatePicker
                    showTime
                    format="YYYY-MM-DD HH:mm:ss"
                    placeholder="请选择过期时间，格式 YYYY-MM-D"
                    style={{ width: '100%' }}
                  />
                </AForm.Item>
              </div>

              <AForm.Item
                noStyle
                shouldUpdate={(prev, next) => prev.ipAccessType !== next.ipAccessType}
              >
                {({ getFieldValue }) => {
                  const ipAccessType = getFieldValue('ipAccessType') as IpAccessType

                  if (ipAccessType !== 'whitelist') {
                    return null
                  }

                  return (
                    <div>
                      <div style={{ color: '#1f2937', fontWeight: 500, marginBottom: 8 }}>IP 白名单</div>
                      <AInput.Group compact>
                        <AInput
                          placeholder="请输入 IP 或 CIDR，按 Enter 添加"
                          style={{ width: 'calc(100% - 88px)' }}
                          value={ipInput}
                          onChange={e => setIpInput(e.target.value)}
                          onPressEnter={e => {
                            e.preventDefault()
                            handleAddIp()
                          }}
                        />
                        <AButton
                          style={{ width: 88 }}
                          onClick={handleAddIp}
                        >
                          添加
                        </AButton>
                      </AInput.Group>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8, marginTop: 10 }}>
                        {ipWhitelist.map(item => (
                          <ATag
                            closable
                            key={item}
                            onClose={e => {
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
                          justifyContent: 'space-between'
                        }}
                      >
                        <span>支持单个 IP 或 CIDR 网段，例如：192.168.1.10、192.168.1.0/24、2001:db8::/32。</span>
                        <AButton
                          style={{ paddingInline: 0 }}
                          type="link"
                          onClick={() => setImportOpen(true)}
                        >
                          批量导入
                        </AButton>
                      </div>
                    </div>
                  )
                }}
              </AForm.Item>
            </AForm>

            <div style={{ color: '#1f2937', fontSize: 28, fontWeight: 600, marginTop: 30 }}>自动生成凭证说明</div>
            <ADivider />
            <div style={{ background: '#f2f4f7', borderRadius: 8, color: '#334155', lineHeight: 2, padding: 16 }}>
              <div>• Client ID、Access Key、Secret Key 将由系统自动生成。</div>
              <div>• Secret Key 仅在创建成功后展示一次，请及时复制并妥善保存。</div>
            </div>
          </>
        )}
      </ADrawer>

      <AModal
        destroyOnClose
        open={importOpen}
        title="批量导入 IP 白名单"
        onCancel={() => setImportOpen(false)}
        onOk={handleImport}
      >
        <AInput.TextArea
          placeholder="每行输入一个 IP 或 CIDR"
          rows={8}
          value={importValue}
          onChange={e => setImportValue(e.target.value)}
        />
      </AModal>
    </>
  )
}
