// import { enableStatusOptions } from '@/constants/business';

// import { useFormRules } from '@/hooks/common/form';
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
    await form.validateFields();
    // const { sourceId, sourceName, sourceType, ...elseValues } = values;
    // const configuration = JSON.stringify({ ...elseValues, extraParams: 'compress_algorithm=gzip' });
    // const formatParams = {
    //   configuration,
    //   sourceId,
    //   sourceName,
    //   sourceType,
    //   spaceId: 1
    // };

    const res = await fetchTestModel({
      model: form.getFieldValue('modelName'),
      prompt: '你好，请回复',
      stream: false
    });
    if (!res.error) {
      message.success('测试连接成功');
      setSubmitDisabled(false);
    }
  };

  const handleClose = () => {
    setSubmitDisabled(true);
    onClose();
  };

  const submit = async () => {
    try {
      const values = await form.validateFields();
      await handleSubmit(values);
      setSubmitDisabled(true);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <ADrawer
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
          rules={[{ required: true }]}
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
        {modelTypeVal === 'embedding' && (
          <AForm.Item
            label="模型UID"
            name="modelUID"
            rules={[{ required: true }]}
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
      </AForm>
    </ADrawer>
  );
});

export default DatasourceOperateDrawer;
