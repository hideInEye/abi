import { message } from 'antd'

import type { ApiKeyFormValues, ApiKeyItem, DrawerMode, IpAccessType } from '../types'
import { isIpDuplicated, normalizeIpValue, validateIpOrCidr } from '../utils'

interface ApiKeyDrawerProps {
  readonly mode: DrawerMode
  readonly onClose: () => void
  readonly onSubmit: (values: ApiKeyFormValues, ipWhitelist: string[]) => void
  readonly open: boolean
  readonly options: Array<{ label: string; value: string }>
  readonly record: ApiKeyItem | null
}

const drawerTitleMap: Record<DrawerMode, string> = {
  create: '新建客户端访问授权',
  edit: '编辑客户端访问授权',
  view: '查看客户端访问授权'
}

export function ApiKeyDrawer({ mode, onClose, onSubmit, open, options, record }: ApiKeyDrawerProps) {
  const [form] = AForm.useForm<ApiKeyFormValues>()

  const [ipInput, setIpInput] = useState('')
  const [ipWhitelist, setIpWhitelist] = useState<string[]>([])
  const [importOpen, setImportOpen] = useState(false)
  const [importValue, setImportValue] = useState('')

  const isView = mode === 'view'

  useEffect(() => {
    if (!open) return

    form.setFieldsValue({
      businessSpace: record?.businessSpace || options[0]?.value || '',
      description: record?.description || '',
      ipAccessType: record?.ipAccessType || 'unlimited'
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

  const handleFinish = async () => {
    const values = await form.validateFields()

    if (values.ipAccessType === 'whitelist' && ipWhitelist.length === 0) {
      message.error('请输入至少一个 IP 或 CIDR 网段')
      return
    }

    onSubmit(values, values.ipAccessType === 'whitelist' ? ipWhitelist : [])
  }

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
            <AButton onClick={onClose}>取消</AButton>
            {!isView && (
              <AButton
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
        <div style={{ color: '#1f2937', fontSize: 28, fontWeight: 600 }}>基础信息</div>
        <ADivider />

        <AForm
          disabled={isView}
          form={form}
          layout="vertical"
        >
          <AForm.Item
            label="归属业务空间"
            name="businessSpace"
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
                      disabled={isView}
                      style={{ width: 88 }}
                      onClick={handleAddIp}
                    >
                      添加
                    </AButton>
                  </AInput.Group>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8, marginTop: 10 }}>
                    {ipWhitelist.map(item => (
                      <ATag
                        closable={!isView}
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
                    style={{ alignItems: 'center', color: '#8c8c8c', display: 'flex', justifyContent: 'space-between' }}
                  >
                    <span>支持单个 IP 或 CIDR 网段，例如：192.168.1.10、192.168.1.0/24、2001:db8::/32。</span>
                    {!isView && (
                      <AButton
                        style={{ paddingInline: 0 }}
                        type="link"
                        onClick={() => setImportOpen(true)}
                      >
                        批量导入
                      </AButton>
                    )}
                  </div>
                </div>
              )
            }}
          </AForm.Item>

          <div style={{ color: '#1f2937', fontSize: 28, fontWeight: 600, marginTop: 30 }}>自动生成凭证说明</div>
          <ADivider />
          <div style={{ background: '#f2f4f7', borderRadius: 8, color: '#334155', lineHeight: 2, padding: 16 }}>
            <div>• Client ID、Access Key、Secret Key 将由系统自动生成。</div>
            <div>• Secret Key 仅在创建成功后展示一次，请及时复制并妥善保存。</div>
          </div>
        </AForm>
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
