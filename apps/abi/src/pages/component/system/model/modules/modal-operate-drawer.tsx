import { CloseOutlined } from '@ant-design/icons';
import { Form, Radio, Tabs, message } from 'antd';

import { MODAL_TYPE_OPTIONS } from '@/constants/manage';
import { fetchTestModel } from '@/service/api';

import SliderAndInput from './slider-and-input';

interface ProviderItem {
  providerId: number;
  providerName: string;
  providerKey: string;
  providerType: string;
  iconUrl?: string;
}

type Props = Page.OperateDrawerProps & {
  providers?: ProviderItem[];
};

const MODEL_SOURCE_OPTIONS = [
  { label: '公有', value: '1' },
  { label: '本地', value: '2' },
];

const DatasourceOperateDrawer: FC<Props> = memo(({ form, handleSubmit, onClose, open, operateType, providers = [] }) => {
  const { t } = useTranslation();
  const modelTypeVal = Form.useWatch('modelType', form);
  const modelSourceVal = Form.useWatch('modelSource', form);
  const providerIdVal = Form.useWatch('providerId', form);
  const [submitDisabled, setSubmitDisabled] = useState(true);
  const [testLoading, setTestLoading] = useState(false);
  const originalApiKeyRef = useRef<string | undefined>();
  const maskValue = useCallback((val?: string) => {
    if (!val) return '';
    const startKeep = 8;
    const endKeep = 4;
    if (val.length <= startKeep + endKeep) return val;
    const maskedLen = Math.max(4, val.length - startKeep - endKeep);
    return `${val.slice(0, startKeep)}${'*'.repeat(maskedLen)}${val.slice(-endKeep)}`;
  }, []);
  const unmaskIfUnchanged = useCallback((inputVal?: string, original?: string) => {
    if (!original) return inputVal || '';
    const masked = maskValue(original);
    return inputVal === masked ? original : (inputVal || '');
  }, [maskValue]);

  // 当模型来源或供应商变化时自动清空供应商/基础模型
  const prevModelSourceRef = useRef<string | undefined>();
  const prevProviderRef = useRef<string | undefined>();
  // 编辑态下记录初始的模型来源、供应商、基础模型，用于来回切换时恢复
  const initialSourceRef = useRef<string | undefined>();
  const initialProviderRef = useRef<number | undefined>();
  const initialModelKeyRef = useRef<string | undefined>();
  useEffect(() => {
    if (!open) return;
    if (prevModelSourceRef.current !== undefined && prevModelSourceRef.current !== modelSourceVal) {
      // 切回编辑初始来源时恢复原供应商与基础模型，否则清空
      if (operateType === 'edit' && modelSourceVal === initialSourceRef.current) {
        form.setFieldsValue({
          providerId: initialProviderRef.current,
          modelKey: initialModelKeyRef.current,
        });
      } else {
        form.setFieldsValue({ providerId: undefined, modelKey: undefined });
      }
    }
    prevModelSourceRef.current = modelSourceVal;
  }, [modelSourceVal]);
  useEffect(() => {
    if (!open) return;
    if (prevProviderRef.current !== undefined && prevProviderRef.current !== providerIdVal) {
      // 若切换到的供应商就是编辑初始供应商，保留原基础模型；否则清空
      if (operateType === 'edit' && providerIdVal === initialProviderRef.current) {
        form.setFieldsValue({ modelKey: initialModelKeyRef.current });
      } else {
        form.setFieldsValue({ modelKey: undefined });
      }
    }
    prevProviderRef.current = providerIdVal;
  }, [providerIdVal]);

  useEffect(() => {
    if (open && operateType === 'edit') {
      const ak = form.getFieldValue('apiKey');
      originalApiKeyRef.current = ak;
      if (ak) form.setFieldsValue({ apiKey: maskValue(ak) });
      // 记录进入编辑时的初始来源/供应商/基础模型
      initialSourceRef.current = form.getFieldValue('modelSource');
      initialProviderRef.current = form.getFieldValue('providerId');
      initialModelKeyRef.current = form.getFieldValue('modelKey');
    }
    if (!open) {
      originalApiKeyRef.current = undefined;
      prevModelSourceRef.current = undefined;
      prevProviderRef.current = undefined;
      initialSourceRef.current = undefined;
      initialProviderRef.current = undefined;
      initialModelKeyRef.current = undefined;
    }
  }, [open, operateType, form, maskValue]);

  // 根据当前模型来源过滤供应商列表
  const filteredProviders = useMemo(() => {
    if (!modelSourceVal) return providers;
    // providerType '1'=公有, '2'=本地
    return providers.filter((p: ProviderItem) => p.providerType === modelSourceVal);
  }, [modelSourceVal, providers]);

  // 获取当前选中供应商
  const selectedProvider = useMemo(() => {
    return providers.find((p: ProviderItem) => p.providerId === providerIdVal);
  }, [providerIdVal, providers]);

  const handleTest = async () => {
    try {
      setTestLoading(true);
      const values = await form.validateFields(['providerId', 'modelKey', 'apiKey', 'apiBase']);
      const params = {
        providerId: String(values.providerId),
        modelKey: values.modelKey || '',
        apiKey: operateType === 'edit' ? unmaskIfUnchanged(values.apiKey, originalApiKeyRef.current) : (values.apiKey || ''),
        apiBase: (values.apiBase || '').trim().replace(/`/g, ''),
      };
      const res: any = await fetchTestModel(params);
      if (!res.error && res?.response?.data?.code === 200) {
        message.success('测试连接成功');
        setSubmitDisabled(false);
      } else {
        message.error(res?.response?.data?.msg || res?.response?.data?.err_msg || '测试连接失败');
      } 
    } catch (error: any) {
      const errMsg = error?.response?.data?.msg || error?.response?.data?.err_msg || error?.message || '测试连接失败';
      message.error(errMsg);
    } finally {
      setTestLoading(false);
    }
  };

  const handleClose = () => {
    setSubmitDisabled(true);
    onClose();
  };

  const submit = async () => {
    try {
      const values = await form.validateFields();
      const submitValues = {
        ...values,
        apiKey: operateType === 'edit' ? unmaskIfUnchanged(values.apiKey, originalApiKeyRef.current) : (values.apiKey || ''),
      };
      await handleSubmit(submitValues);
      setSubmitDisabled(true);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <ADrawer
      closeIcon={null}
      extra={<CloseOutlined onClick={handleClose} />}
      open={open}
      size="large"
      title={operateType === 'add' ? '添加大模型' : '编辑大模型'}
      footer={
        <AFlex justify="space-between" align="center">
          <AButton
            loading={testLoading}
            onClick={handleTest}
          >
            {t('page.dataPreparation.dataSource.testConnect')}
          </AButton>
          <AFlex gap={8}>
            <AButton onClick={handleClose}>{t('common.cancel')}</AButton>
            <AButton
              disabled={submitDisabled}
              type="primary"
              onClick={submit}
            >
              {t('common.confirm')}
            </AButton>
          </AFlex>
        </AFlex>
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
              label: '基础设置',
              children: (
                <div style={{ minHeight: 580, display: 'flex', flexDirection: 'column', paddingTop: 16 }}>
                  {/* 模型来源 */}
                  <AForm.Item label="模型来源" name="modelSource" initialValue="1">
                    <Radio.Group
                      options={MODEL_SOURCE_OPTIONS}
                      optionType="button"
                      buttonStyle="solid"
                    />
                  </AForm.Item>

                  {/* 模型名称 */}
                  <AForm.Item
                    label="模型名称"
                    name="modelName"
                    rules={[{ required: true, message: '请输入模型名称' }, { max: 100, message: '模型名称不能超过100个字符' }]}
                  >
                    <AInput placeholder="请输入模型名称" />
                  </AForm.Item>

                  {/* 供应商 */}
                  <AForm.Item
                    label="供应商"
                    name="providerId"
                    rules={[{ required: true, message: '请选择供应商' }]}
                  >
                    <ASelect
                      options={filteredProviders.map((p: ProviderItem) => ({ label: p.providerName, value: p.providerId }))}
                      placeholder="请选择供应商"
                      showSearch
                      allowClear
                    />
                  </AForm.Item>

                  {/* 模型类型 */}
                  <AForm.Item
                    label="模型类型"
                    name="modelType"
                    rules={[{ required: true, message: '请选择模型类型' }]}
                  >
                    <ASelect
                      options={MODAL_TYPE_OPTIONS}
                      placeholder="请选择模型类型"
                    />
                  </AForm.Item>

                  {/* 基础模型 (modelKey) */}
                  <AForm.Item label="基础模型" name="modelKey">
                    <AInput placeholder="请输入基础模型名称（如 gpt-4o）" />
                  </AForm.Item>

                  {/* API Key */}
                  <AForm.Item label="API Key" name="apiKey">
                    <AInput.Password placeholder="请输入 API Key" />
                  </AForm.Item>

                  {/* API Base */}
                  <AForm.Item label="API Base" name="apiBase">
                    <AInput
                      placeholder={
                        modelSourceVal === '1'
                          ? '可选，不填则使用供应商默认地址'
                          : '请输入本地服务地址'
                      }
                    />
                  </AForm.Item>

                  {/* 状态 */}
                  <AForm.Item
                    label="状态"
                    name="status"
                    valuePropName="checked"
                    getValueFromEvent={(checked: boolean) => checked ? '1' : '0'}
                    getValueProps={(value: string) => ({ checked: value === '1' || value === undefined })}
                  >
                    <ASwitch
                      checkedChildren="启用"
                      unCheckedChildren="禁用"
                    />
                  </AForm.Item>

                  {/* 描述 */}
                  <AForm.Item label="描述" name="remark">
                    <AInput.TextArea placeholder="请输入描述" rows={3} />
                  </AForm.Item>
                </div>
              ),
            },
            {
              key: 'advanced',
              label: '高级设置',
              children: (
                <div style={{ minHeight: 580, display: 'flex', flexDirection: 'column', paddingTop: 16 }}>
                  {modelTypeVal === '1' ? (
                    <>
                      <AForm.Item label="最大 Token 上限" name="max_token">
                        <SliderAndInput max={32000} />
                      </AForm.Item>
                      <AForm.Item label="温度" name="temperature">
                        <SliderAndInput max={1} min={0} precision={1} step="0.1" />
                      </AForm.Item>
                      <AForm.Item label="超时（s）" name="timeOut">
                        <SliderAndInput max={300} />
                      </AForm.Item>
                      <AForm.Item label="最大重试次数" name="maxRetries">
                        <SliderAndInput max={5} />
                      </AForm.Item>
                      <AForm.Item label="模型上下文长度" name="context_length">
                        <SliderAndInput max={32000} />
                      </AForm.Item>
                    </>
                  ) : (
                    <AEmpty description="该模型类型暂无高级设置" style={{ marginTop: 80 }} />
                  )}
                </div>
              ),
            },
          ]}
        />
      </AForm>
    </ADrawer>
  );
});

export default DatasourceOperateDrawer;
