import { CloseOutlined, SettingOutlined, SlidersOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { Form, Radio, Tabs, message } from 'antd'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'

import { MODAL_TYPE_OPTIONS } from '@/constants/manage'
import { fetchTestModel } from '@/service/api'

import SliderAndInput from './slider-and-input'

interface ProviderItem {
  providerId: number
  providerName: string
  providerKey: string
  providerType: string
  iconUrl?: string
}

type Props = Page.OperateDrawerProps & {
  providers?: ProviderItem[]
}

const MODEL_SOURCE_OPTIONS = [
  { label: '公有', value: '1' },
  { label: '本地', value: '2' },
]

/** v5 分区标题 — 简洁风格，无色彩竖线 */
const SectionTitle: FC<{ icon: React.ReactNode; title: string; color?: string }> = ({ icon, title, color = '#5b7cf7' }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 0',
      marginBottom: 16,
      borderBottom: '1px solid rgba(130, 140, 200, 0.10)',
    }}
  >
    <div
      style={{
        width: 26,
        height: 26,
        borderRadius: 7,
        background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: 13,
        boxShadow: `0 2px 8px ${color}30`,
      }}
    >
      {icon}
    </div>
    <span style={{ fontSize: 14, fontWeight: 600, color: '#1a2744', letterSpacing: '0.02em' }}>{title}</span>
  </div>
)

const DatasourceOperateDrawer: FC<Props> = memo(({ form, handleSubmit, onClose, open, operateType, providers = [] }) => {
  const { t } = useTranslation()
  const modelTypeVal = Form.useWatch('modelType', form)
  const modelSourceVal = Form.useWatch('modelSource', form)
  const providerIdVal = Form.useWatch('providerId', form)
  const [submitDisabled, setSubmitDisabled] = useState(true)
  const [testLoading, setTestLoading] = useState(false)
  const originalApiKeyRef = useRef<string | undefined>()
  const maskValue = useCallback((val?: string) => {
    if (!val) return ''
    const startKeep = 8
    const endKeep = 4
    if (val.length <= startKeep + endKeep) return val
    const maskedLen = Math.max(4, val.length - startKeep - endKeep)
    return `${val.slice(0, startKeep)}${'*'.repeat(maskedLen)}${val.slice(-endKeep)}`
  }, [])
  const unmaskIfUnchanged = useCallback(
    (inputVal?: string, original?: string) => {
      if (!original) return inputVal || ''
      const masked = maskValue(original)
      return inputVal === masked ? original : inputVal || ''
    },
    [maskValue],
  )

  // 当模型来源或供应商变化时自动清空供应商/基础模型
  const prevModelSourceRef = useRef<string | undefined>()
  const prevProviderRef = useRef<string | undefined>()
  const initialSourceRef = useRef<string | undefined>()
  const initialProviderRef = useRef<number | undefined>()
  const initialModelKeyRef = useRef<string | undefined>()
  useEffect(() => {
    if (!open) return
    if (prevModelSourceRef.current !== undefined && prevModelSourceRef.current !== modelSourceVal) {
      if (operateType === 'edit' && modelSourceVal === initialSourceRef.current) {
        form.setFieldsValue({
          providerId: initialProviderRef.current,
          modelKey: initialModelKeyRef.current,
        })
      } else {
        form.setFieldsValue({ providerId: undefined, modelKey: undefined })
      }
    }
    prevModelSourceRef.current = modelSourceVal
  }, [modelSourceVal])
  useEffect(() => {
    if (!open) return
    if (prevProviderRef.current !== undefined && prevProviderRef.current !== providerIdVal) {
      if (operateType === 'edit' && providerIdVal === initialProviderRef.current) {
        form.setFieldsValue({ modelKey: initialModelKeyRef.current })
      } else {
        form.setFieldsValue({ modelKey: undefined })
      }
    }
    prevProviderRef.current = providerIdVal
  }, [providerIdVal])

  useEffect(() => {
    if (open && operateType === 'edit') {
      const ak = form.getFieldValue('apiKey')
      originalApiKeyRef.current = ak
      if (ak) form.setFieldsValue({ apiKey: maskValue(ak) })
      initialSourceRef.current = form.getFieldValue('modelSource')
      initialProviderRef.current = form.getFieldValue('providerId')
      initialModelKeyRef.current = form.getFieldValue('modelKey')
    }
    if (!open) {
      originalApiKeyRef.current = undefined
      prevModelSourceRef.current = undefined
      prevProviderRef.current = undefined
      initialSourceRef.current = undefined
      initialProviderRef.current = undefined
      initialModelKeyRef.current = undefined
    }
  }, [open, operateType, form, maskValue])

  const filteredProviders = useMemo(() => {
    if (!modelSourceVal) return providers
    return providers.filter((p: ProviderItem) => p.providerType === modelSourceVal)
  }, [modelSourceVal, providers])

  const selectedProvider = useMemo(() => {
    return providers.find((p: ProviderItem) => p.providerId === providerIdVal)
  }, [providerIdVal, providers])

  const handleTest = async () => {
    try {
      setTestLoading(true)
      const values = await form.validateFields(['providerId', 'modelKey', 'apiKey', 'apiBase', 'modelType'])
      const params = {
        providerId: String(values.providerId),
        modelKey: values.modelKey || '',
        apiKey: operateType === 'edit' ? unmaskIfUnchanged(values.apiKey, originalApiKeyRef.current) : values.apiKey || '',
        apiBase: (values.apiBase || '').trim().replace(/`/g, ''),
        modelType: values.modelType ? String(values.modelType) : '',
      }
      const res: any = await fetchTestModel(params)
      if (!res.error && res?.response?.data?.code === 200) {
        message.success('测试连接成功')
        setSubmitDisabled(false)
      } else {
        message.error(res?.response?.data?.msg || res?.response?.data?.err_msg || '测试连接失败')
      }
    } catch (error: any) {
      const errMsg = error?.response?.data?.msg || error?.response?.data?.err_msg || error?.message || '测试连接失败'
      message.error(errMsg)
    } finally {
      setTestLoading(false)
    }
  }

  const handleClose = () => {
    setSubmitDisabled(true)
    onClose()
  }

  const submit = async () => {
    try {
      const values = await form.validateFields()
      const submitValues = {
        ...values,
        apiKey: operateType === 'edit' ? unmaskIfUnchanged(values.apiKey, originalApiKeyRef.current) : values.apiKey || '',
      }
      await handleSubmit(submitValues)
      setSubmitDisabled(true)
    } catch (err) {
      console.log(err)
    }
  }

  const drawerTitle = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #5b7cf7 0%, #7091fa 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 18,
          boxShadow: '0 4px 12px rgba(91, 124, 247, 0.3)',
        }}
      >
        <ThunderboltOutlined />
      </div>
      <div>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#1a2744', letterSpacing: '0.02em' }}>{operateType === 'add' ? '添加大模型' : '编辑大模型'}</div>
        <div style={{ fontSize: 12, color: '#768a9f', marginTop: 2 }}>{operateType === 'add' ? '配置并接入新的大语言模型' : '修改模型配置参数'}</div>
      </div>
    </div>
  )

  return (
    <CommonDrawer
      className="ds-operate-drawer"
      destroyOnClose
      open={open}
      size="large"
      icon={null}
      title={drawerTitle}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, padding: '4px 0' }}>
          <AButton
            onClick={handleClose}
            style={{
              height: 38,
              padding: '0 20px',
              borderRadius: 8,
              fontWeight: 500,
              border: '1px solid rgba(130, 140, 200, 0.18)',
              color: '#5f7490',
              background: 'transparent',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {t('common.cancel')}
          </AButton>
          <AButton
            loading={testLoading}
            onClick={handleTest}
            style={{
              height: 38,
              padding: '0 24px',
              borderRadius: 8,
              fontWeight: 600,
              border: '1px solid #5b7cf7',
              color: '#5b7cf7',
              background: 'rgba(91, 124, 247, 0.04)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <ThunderboltOutlined /> {t('page.dataPreparation.dataSource.testConnect')}
          </AButton>
          <AButton
            disabled={submitDisabled}
            type="primary"
            onClick={submit}
            style={{
              height: 38,
              padding: '0 28px',
              borderRadius: 8,
              fontWeight: 600,
              background: submitDisabled ? undefined : 'linear-gradient(135deg, #5b7cf7, #7091fa)',
              boxShadow: submitDisabled ? undefined : '0 2px 10px rgba(91, 124, 247, 0.3)',
              border: 'none',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {t('common.confirm')}
          </AButton>
        </div>
      }
      onClose={handleClose}
    >
      <AForm form={form} layout="vertical">
        <Tabs
          type="line"
          animated
          items={[
            {
              key: 'basic',
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <SettingOutlined />
                  基础设置
                </span>
              ),
              children: (
                <div style={{ minHeight: 580, display: 'flex', flexDirection: 'column', paddingTop: 8 }}>
                  <SectionTitle icon={<SettingOutlined />} title="模型配置" color="#5b7cf7" />

                  {/* 模型来源 */}
                  <AForm.Item label={<span style={{ fontWeight: 500, color: '#3e5068' }}>模型来源</span>} name="modelSource" initialValue="1">
                    <Radio.Group options={MODEL_SOURCE_OPTIONS} optionType="button" buttonStyle="solid" />
                  </AForm.Item>

                  {/* 模型名称 */}
                  <AForm.Item
                    label={<span style={{ fontWeight: 500, color: '#3e5068' }}>模型名称</span>}
                    name="modelName"
                    rules={[
                      { required: true, message: '请输入模型名称' },
                      { max: 100, message: '模型名称不能超过100个字符' },
                    ]}
                  >
                    <AInput placeholder="请输入模型名称" />
                  </AForm.Item>

                  <SectionTitle icon={<SettingOutlined />} title="接入配置" color="#10b981" />

                  {/* 供应商 */}
                  <AForm.Item label={<span style={{ fontWeight: 500, color: '#3e5068' }}>供应商</span>} name="providerId" rules={[{ required: true, message: '请选择供应商' }]}>
                    <ASelect options={filteredProviders.map((p: ProviderItem) => ({ label: p.providerName, value: p.providerId }))} placeholder="请选择供应商" showSearch allowClear />
                  </AForm.Item>

                  {/* 模型类型 */}
                  <AForm.Item label={<span style={{ fontWeight: 500, color: '#3e5068' }}>模型类型</span>} name="modelType" rules={[{ required: true, message: '请选择模型类型' }]}>
                    <ASelect options={MODAL_TYPE_OPTIONS} placeholder="请选择模型类型" />
                  </AForm.Item>

                  {/* 基础模型 (modelKey) */}
                  <AForm.Item label={<span style={{ fontWeight: 500, color: '#3e5068' }}>基础模型</span>} name="modelKey">
                    <AInput placeholder="请输入基础模型名称（如 gpt-4o）" />
                  </AForm.Item>

                  {/* API Key */}
                  <AForm.Item label={<span style={{ fontWeight: 500, color: '#3e5068' }}>API Key</span>} name="apiKey">
                    <AInput.Password placeholder="请输入 API Key" />
                  </AForm.Item>

                  {/* API Base */}
                  <AForm.Item label={<span style={{ fontWeight: 500, color: '#3e5068' }}>API Base</span>} name="apiBase">
                    <AInput placeholder={modelSourceVal === '1' ? '可选，不填则使用供应商默认地址' : '请输入本地服务地址'} />
                  </AForm.Item>

                  <SectionTitle icon={<SettingOutlined />} title="状态与描述" color="#f59e0b" />

                  <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
                    {/* 状态 */}
                    <AForm.Item
                      label={<span style={{ fontWeight: 500, color: '#3e5068' }}>状态</span>}
                      name="status"
                      valuePropName="checked"
                      getValueFromEvent={(checked: boolean) => (checked ? '1' : '0')}
                      getValueProps={(value: string) => ({ checked: value === '1' || value === undefined })}
                    >
                      <ASwitch checkedChildren="启用" unCheckedChildren="禁用" />
                    </AForm.Item>

                    {/* 是否支持关闭思考 (isSupportThinking：0=不支持，1=支持) */}
                    <AForm.Item
                      label={<span style={{ fontWeight: 500, color: '#3e5068' }}>是否支持关闭思考</span>}
                      name="isSupportThinking"
                      initialValue={0}
                      valuePropName="checked"
                      getValueFromEvent={(checked: boolean) => (checked ? 1 : 0)}
                      getValueProps={(value: number | string) => ({ checked: value === 1 || value === '1' })}
                    >
                      <ASwitch checkedChildren="支持" unCheckedChildren="不支持" />
                    </AForm.Item>

                    {/* 是否支持多模态 (isMultimodal：0=不支持，1=支持) */}
                    <AForm.Item
                      label={<span style={{ fontWeight: 500, color: '#3e5068' }}>是否支持多模态</span>}
                      name="isMultimodal"
                      initialValue={0}
                      valuePropName="checked"
                      getValueFromEvent={(checked: boolean) => (checked ? 1 : 0)}
                      getValueProps={(value: number | string) => ({ checked: value === 1 || value === '1' })}
                    >
                      <ASwitch checkedChildren="支持" unCheckedChildren="不支持" />
                    </AForm.Item>
                  </div>

                  {/* 描述 */}
                  <AForm.Item label={<span style={{ fontWeight: 500, color: '#3e5068' }}>描述</span>} name="remark">
                    <AInput.TextArea placeholder="请输入描述" rows={3} />
                  </AForm.Item>
                </div>
              ),
            },
            {
              key: 'advanced',
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <SlidersOutlined />
                  高级设置
                </span>
              ),
              children: (
                <div style={{ minHeight: 580, display: 'flex', flexDirection: 'column', paddingTop: 8 }}>
                  {modelTypeVal === '1' ? (
                    <>
                      <SectionTitle icon={<SlidersOutlined />} title="推理参数" color="#8b5cf6" />
                      <AForm.Item label={<span style={{ fontWeight: 500, color: '#3e5068' }}>最大 Token 上限</span>} name="max_token">
                        <SliderAndInput max={32000} />
                      </AForm.Item>
                      <AForm.Item label={<span style={{ fontWeight: 500, color: '#3e5068' }}>温度</span>} name="temperature">
                        <SliderAndInput max={1} min={0} precision={1} step="0.1" />
                      </AForm.Item>

                      <SectionTitle icon={<SlidersOutlined />} title="稳定性参数" color="#ec4899" />
                      <AForm.Item label={<span style={{ fontWeight: 500, color: '#3e5068' }}>超时（s）</span>} name="timeOut">
                        <SliderAndInput max={300} />
                      </AForm.Item>
                      <AForm.Item label={<span style={{ fontWeight: 500, color: '#3e5068' }}>最大重试次数</span>} name="maxRetries">
                        <SliderAndInput max={5} />
                      </AForm.Item>
                      <AForm.Item label={<span style={{ fontWeight: 500, color: '#3e5068' }}>模型上下文长度</span>} name="context_length">
                        <SliderAndInput max={32000} />
                      </AForm.Item>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                      <AEmpty description="该模型类型暂无高级设置" image={AEmpty.PRESENTED_IMAGE_SIMPLE} />
                    </div>
                  )}
                </div>
              ),
            },
          ]}
        />
      </AForm>
    </CommonDrawer>
  )
})

export default DatasourceOperateDrawer
