import { UploadOutlined } from '@ant-design/icons';
import { message } from 'antd';

import { useDatasource } from '@/hooks/data-preparation/useDataSource';
import { validDataSource } from '@/service/api';

import DataPreview from './data-preview';
import Uploader from './uploader';

type Props = Page.OperateDrawerProps;

const DatasourceOperateDrawer: FC<Props> = memo(({ form, handleSubmit, onClose, open, operateType }) => {
  const { t } = useTranslation();
  const [submitDisabled, setSubmitDisabled] = useState(true);
  const sourceTypeVal = AForm.useWatch('sourceType', form);
  const sourceFileVal = AForm.useWatch('sourceFile', form);

  const { getSourceTypeOptions, sourceTypeOptions } = useDatasource();

  useEffect(() => {
    getSourceTypeOptions();
  }, []);

  const handleTest = async () => {
    const values = await form.validateFields();
    if (values.sourceName) {
      values.sourceName = values.sourceName.trim();
    }
    const { sourceId, sourceName, sourceType, ...elseValues } = values;
    const configuration = JSON.stringify({ ...elseValues, extraParams: 'compress_algorithm=gzip' });
    const formatParams = {
      configuration,
      sourceId,
      sourceName,
      sourceType,
      spaceId: Number(localStorage.getItem('spaceId'))
    };

    const res = await validDataSource(formatParams);
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
      await handleSubmit({ ...values });
      setSubmitDisabled(true);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <ADrawer
      open={open}
      size="large"
      footer={
        <AFlex justify="flex-end">
          <AButton onClick={handleClose}>{t('common.cancel')}</AButton>
          {sourceTypeVal === 'Excel' ? null : (
            <AButton
              className="ml-2"
              type="primary"
              onClick={handleTest}
            >
              {t('page.dataPreparation.dataSource.testConnect')}
            </AButton>
          )}

          <AButton
            className="ml-2"
            disabled={submitDisabled && sourceTypeVal !== 'Excel'}
            type="primary"
            onClick={submit}
          >
            {t('common.confirm')}
          </AButton>
        </AFlex>
      }
      title={
        operateType === 'add'
          ? t('page.dataPreparation.dataSource.addDatasource')
          : t('page.dataPreparation.dataSource.editDatasource')
      }
      onClose={handleClose}
    >
      <AForm
        form={form}
        initialValues={{ connectionType: 'sid', editType: 0 }}
        layout="vertical"
      >
        <AForm.Item
          label={t('page.dataPreparation.dataSource.type')}
          name="sourceType"
          rules={[{ required: true }]}
        >
          <ASelect
            fieldNames={{ label: 'name', value: 'sourceType' }}
            options={sourceTypeOptions}
            placeholder={t('page.dataPreparation.dataSource.form.type')}
          />
        </AForm.Item>

        {sourceTypeVal === 'Excel' ? (
          <>
            <AForm.Item
              label={t('page.dataPreparation.dataSource.type')}
              name="sourceFile"
              rules={[{ required: true }]}
            >
              <Uploader
                setData={val => {
                  form.setFieldValue('sheets', val);
                  form.setFieldValue('sourceName', val[0].fileName);
                }}
              >
                <>
                  <UploadOutlined />
                  上传文件
                </>
              </Uploader>
            </AForm.Item>
            <AForm.Item
              label="数据源名称"
              name="sourceName"
              rules={[{ required: true }]}
            >
              <AInput
                maxLength={50}
                placeholder="请输入数据源名称"
              />
            </AForm.Item>

            <AForm.Item name="editType" />

            {sourceFileVal?.length > 0 && (
              <AForm.Item
                label="数据预览"
                name="sheets"
              >
                <DataPreview />
              </AForm.Item>
            )}
          </>
        ) : (
          <>
            <AForm.Item
              label={t('page.dataPreparation.dataSource.name')}
              name="sourceName"
              rules={[{ required: true }]}
            >
              <AInput
                maxLength={50}
                placeholder={t('page.dataPreparation.dataSource.form.name')}
              />
            </AForm.Item>

            <AForm.Item
              label="数据库地址"
              name="host"
              rules={[{ required: true }]}
            >
              <AInput placeholder="请输入数据库地址" />
            </AForm.Item>

            <AForm.Item
              label={t('page.dataPreparation.dataSource.port')}
              name="port"
              rules={[{ required: true }]}
            >
              <AInputNumber
                className="w-full"
                min={0}
                placeholder={t('page.dataPreparation.dataSource.form.port')}
                precision={0}
              />
            </AForm.Item>
            <AForm.Item
              label="数据库"
              name="dbName"
              rules={[{ required: true }]}
            >
              <AInput placeholder={t('page.dataPreparation.dataSource.form.database')} />
            </AForm.Item>
            <AForm.Item
              label={t('page.dataPreparation.dataSource.username')}
              name="userName"
              rules={[{ required: true }]}
            >
              <AInput placeholder={t('page.dataPreparation.dataSource.form.username')} />
            </AForm.Item>
            <AForm.Item
              label={t('page.dataPreparation.dataSource.password')}
              name="password"
              rules={[{ required: true }]}
            >
              <AInput.Password placeholder={t('page.dataPreparation.dataSource.form.password')} />
            </AForm.Item>

            <AForm.Item
              label="连接方式"
              name="connectionType"
              rules={[{ required: true }]}
            >
              <ARadio.Group>
                <ARadio value="sid">SID</ARadio>
                <ARadio value="serviceName">服务名</ARadio>
              </ARadio.Group>
            </AForm.Item>
          </>
        )}
      </AForm>
    </ADrawer>
  );
});

export default DatasourceOperateDrawer;
