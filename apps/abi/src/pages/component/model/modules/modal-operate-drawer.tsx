// import { enableStatusOptions } from '@/constants/business';

// import { useFormRules } from '@/hooks/common/form';
import { CloseOutlined } from '@ant-design/icons';
import { Form, message } from 'antd';

import { LLM_TYPE_OPTIONS, MODAL_TYPE_OPTIONS, PROVIDER_OPTIONS } from '@/constants/manage';
import { fetchTestModel } from '@/service/api';

import SliderAndInput from './slider-and-input';

type Props = Page.OperateDrawerProps;

// type Model = 'dbName' | 'host' | 'name' | 'password' | 'port' | 'sourceType' | 'userName';

// type RuleKey = Exclude<keyof Model, 'name'>;

const DatasourceOperateDrawer: FC<Props> = memo(({ form, handleSubmit, onClose, open, operateType }) => {
  const { t } = useTranslation();
  const modelTypeVal = Form.useWatch('modelType', form);
  const [submitDisabled, setSubmitDisabled] = useState(true);
  const originalApiKeyRef = useRef<string | undefined>();
  const originalSecretKeyRef = useRef<string | undefined>();
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

  useEffect(() => {
    if (open && operateType === 'edit') {
      const ak = form.getFieldValue('apiKey');
      const sk = form.getFieldValue('secretKey');
      originalApiKeyRef.current = ak;
      originalSecretKeyRef.current = sk;
      if (ak) form.setFieldsValue({ apiKey: maskValue(ak) });
      if (sk) form.setFieldsValue({ secretKey: maskValue(sk) });
    }
    if (!open) {
      originalApiKeyRef.current = undefined;
      originalSecretKeyRef.current = undefined;
    }
  }, [open, operateType, form, maskValue]);
  // const { defaultRequiredRule } = useFormRules();

  // const [buttonAuthVisible, { setFalse: closeButtonAuthModal, setTrue: openButtonAuthModal }] = useBoolean();

  // const [menuAuthVisible, { setFalse: closeMenuAuthModal, setTrue: openMenuAuthModal }] = useBoolean();

  // const rules: Record<RuleKey, App.Global.FormRule> = {
  //   dbName: defaultRequiredRule,
  //   host: defaultRequiredRule,
  //   password: defaultRequiredRule,
  //   port: defaultRequiredRule,
  //   sourceType: defaultRequiredRule,
  //   userName: defaultRequiredRule
  // };

  // useEffect(() => {
  //   if (operateType === 'edit') {
  //     const config = JSON.parse(row.configuration);
  //     form.setFieldsValue(row);
  //   }
  // }, [row, operateType])

  const handleTest = async () => {
    try {
      const values = await form.validateFields();
      if (values.baseUrl) {
        values.baseUrl = values.baseUrl.trim().replace(/`/g, '');
      }
      const { providerName, modelName, modelType, remark, type, ...restValues } = values;
      
      // 构建 modelConfig 对象，排除 type 字段（type 是表单字段，不应在 modelConfig 中）
      const modelConfig: any = {
        baseUrl: values.baseUrl || '',
        apiKey: operateType === 'edit' ? unmaskIfUnchanged(values.apiKey, originalApiKeyRef.current) : (values.apiKey || ''),
        secretKey: operateType === 'edit' ? unmaskIfUnchanged(values.secretKey, originalSecretKeyRef.current) : (values.secretKey || ''),
        modelUID: values.modelUID || ''
      };
      
      // 如果是 llm 类型，添加 llm 特有的参数配置字段
      if (modelType === 'llm') {
        modelConfig.temperature = values.temperature ?? 0.0;
        modelConfig.max_token = values.max_token || 4096;
        modelConfig.timeOut = values.timeOut || 60;
        modelConfig.maxRetries = values.maxRetries || 3;
        modelConfig.context_length = values.context_length || 4096;
      } else if (modelType === 'embedding') {
        // embedding 类型也需要这些字段，使用默认值
        modelConfig.temperature = 0.0;
        modelConfig.max_token = 4096;
        modelConfig.timeOut = 60;
        modelConfig.maxRetries = 3;
        modelConfig.context_length = 4096;
      }
      
      const params = {
        providerName,
        modelName,
        modelType,
        remark: remark || '',
        modelConfig: JSON.stringify(modelConfig)
      };
      const res: any = await fetchTestModel(params);
      if (!res.error) {
        message.success('测试连接成功');
        setSubmitDisabled(false);
      } else {
        message.error(res.response?.data?.err_msg);
      }
    } catch (error: any) {
      const errMsg = error?.response?.data?.err_msg || error?.response?.data?.msg || error?.message || '测试连接失败';
      message.error(errMsg);
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
        secretKey: operateType === 'edit' ? unmaskIfUnchanged(values.secretKey, originalSecretKeyRef.current) : (values.secretKey || '')
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
        <AFlex justify="flex-end">
          <AButton onClick={onClose}>{t('common.cancel')}</AButton>
          <AButton
            className="mx-2"
            type="primary"
            onClick={handleTest}
          >
            {t('page.dataPreparation.dataSource.testConnect')}
          </AButton>
          <AButton
            disabled={submitDisabled}
            type="primary"
            onClick={submit}
          >
            {t('common.confirm')}
          </AButton>
        </AFlex>
      }
      onClose={handleClose}
    >
      <AForm
        form={form}
        layout="vertical"
      >
        <div className="mb-2">
          <b>模型基本信息</b>
        </div>
        <AForm.Item
          label="供应商"
          name="providerName"
          rules={[{ required: true }]}
        >
          <ASelect
            options={PROVIDER_OPTIONS}
            placeholder="请选择供应商"
          />
        </AForm.Item>
        <AForm.Item
          label="模型名称"
          name="modelName"
          rules={[{ required: true }, { max: 100, message: '模型名称不能超过100个字符' }]}
        >
          <AInput placeholder="请输入模型名称" />
        </AForm.Item>
        <AForm.Item
          label="模型类型"
          name="modelType"
          rules={[{ required: true }]}
        >
          <ASelect
            options={MODAL_TYPE_OPTIONS}
            placeholder="请选择模型类型"
          />
        </AForm.Item>
        {modelTypeVal === 'llm' && (
          <AForm.Item
            label="LLM类型"
            name="type"
            rules={[{ required: true }]}
          >
            <ASelect
              options={LLM_TYPE_OPTIONS}
              placeholder="请选择LLM类型"
            />
          </AForm.Item>
        )}
        <AForm.Item
          label="基础url"
          name="baseUrl"
          rules={[{ required: true }]}
        >
          <AInput placeholder="请输入基础url" />
        </AForm.Item>
        <AForm.Item
          label="apiKey"
          name="apiKey"
        >
          <AInput placeholder="请输入apiKey" />
        </AForm.Item>
        <AForm.Item
          label="secretKey"
          name="secretKey"
        >
          <AInput placeholder="请输入secretKey" />
        </AForm.Item>
        {modelTypeVal === 'llm' && (
          <AForm.Item
            label="模型UID"
            name="modelUID"
          >
            <AInput placeholder="请输入模型UID" />
          </AForm.Item>
        )}
        <AForm.Item
          label="描述"
          name="remark"
          // rules={[{ required: true }]}
        >
          <AInput.TextArea placeholder="请输入描述" />
        </AForm.Item>
        {modelTypeVal === 'llm' && (
          <>
            <div className="mb-2">
              <b>模型参数配置</b>
            </div>
            <AForm.Item
              label="温度"
              name="temperature"
              // rules={[{ required: true }]}
            >
              <SliderAndInput
                max={1}
                min={0}
                precision={1}
                step="0.1"
              />
            </AForm.Item>
            <AForm.Item
              label="最大token上限"
              name="max_token"
              // rules={[{ required: true }]}
            >
              <SliderAndInput max={32000} />
            </AForm.Item>
            <AForm.Item
              label="超时（s）"
              name="timeOut"
              // rules={[{ required: true }]}
            >
              <SliderAndInput max={300} />
            </AForm.Item>
            <AForm.Item
              label="最大重复次数"
              name="maxRetries"
              // rules={[{ required: true }]}
            >
              <SliderAndInput max={5} />
            </AForm.Item>
            <AForm.Item
              label="模型上下文长度"
              name="context_length"
              // rules={[{ required: true }]}
            >
              <SliderAndInput max={32000} />
            </AForm.Item>
          </>
        )}
      </AForm>
    </ADrawer>
  );
});

export default DatasourceOperateDrawer;
