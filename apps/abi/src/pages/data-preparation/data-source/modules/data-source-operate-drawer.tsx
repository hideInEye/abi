import { CloseOutlined, CloudUploadOutlined, UploadOutlined } from '@ant-design/icons';
import { message, Modal } from 'antd';

import { useDatasource } from '@/hooks/data-preparation/useDataSource';
import { validDataSource } from '@/service/api';

import DataPreview from './data-preview';
import Uploader from './uploader';

type Props = Page.OperateDrawerProps& {
  editingData?: any;
};

const DatasourceOperateDrawer: FC<Props> = memo(({ form, handleSubmit, onClose, open, operateType,editingData }) => { 
  const { t } = useTranslation();
  const [submitDisabled, setSubmitDisabled] = useState(true);
  const sourceTypeVal = AForm.useWatch('sourceType', form);
  const sourceFileVal = AForm.useWatch('sourceFile', form);
  const [uploadError, setUploadError] = useState({messageTitle:'上传失败', message:'请检查文件格式和内容是否正确'});
  const [previewVisible, setPreviewVisible] = useState(false);

  const { getSourceTypeOptions, sourceTypeOptions } = useDatasource();

  useEffect(() => {
    getSourceTypeOptions();
  }, []);
  
  useEffect(()=>{
    if (sourceFileVal && sourceFileVal.length > 0 && sourceFileVal[0].sheets && sourceFileVal[0].sheets.length > 0) {
      form.setFieldValue('dbTableName', sourceFileVal[0]?.dbTableName);
    }
  },[sourceFileVal])

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
      message.destroy();
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
  const sourceTypeDisabled = useMemo(()=>{
    if(!editingData){
      return false;
    }
    console.log(editingData);

    if(editingData?.excelDatasourceFlag){
      return true;
    }
    return false;
  },[editingData])
  return (
    <ADrawer
      closeIcon={null}
      extra={<CloseOutlined onClick={handleClose} />}
      open={open}
      size="large"
      footer={
        <AFlex justify="flex-end">
          <AButton onClick={handleClose}>{t("common.cancel")}</AButton>
          {sourceTypeVal === "Excel" ? null : (
            <AButton className="ml-2" type="primary" onClick={handleTest}>
              {t("page.dataPreparation.dataSource.testConnect")}
            </AButton>
          )}

          <AButton
            className="ml-2"
            disabled={submitDisabled && sourceTypeVal !== 'Excel'}
            type="primary"
            onClick={submit}
          >
            {t("common.confirm")}
          </AButton>
        </AFlex>
      }
      title={
        operateType === "add"
          ? t("page.dataPreparation.dataSource.addDatasource")
          : t("page.dataPreparation.dataSource.editDatasource")
      }
      onClose={handleClose}
    >
      <AForm
        form={form}
        initialValues={{ connectionType: "sid" }}
        layout="vertical"
      >
        <AForm.Item
          label={t("page.dataPreparation.dataSource.type")}
          name="sourceType"
          rules={[{ required: true }]}
        >
          <ASelect
            fieldNames={{ label: "name", value: "sourceType" }}
            options={sourceTypeOptions}
            disabled={ operateType === "edit"&&sourceTypeVal==='Excel'&& sourceTypeDisabled}
            placeholder={t("page.dataPreparation.dataSource.form.type")}
          />
        </AForm.Item>

        {sourceTypeVal === "Excel" ? (
          <>
            {
              <>
                <AForm.Item
                  label={t("page.dataPreparation.dataSource.type")}
                  name="sourceFile"
                  rules={[{ required: true ,message:'请选择文件'}]}
                  hidden={!!sourceFileVal}
                >
                  <Uploader
                    setData={(val) => {
                      form.setFieldValue("sheets", val);
                      form.setFieldValue("sourceName", val[0].fileName);
                    }}
                    setPreviewVisible={setPreviewVisible}
                    maxSize={10 * 1024 * 1024}
                    setUploadError={setUploadError}
                  >
                    <>
                      <p className="ant-upload-drag-icon">
                        <CloudUploadOutlined />
                      </p>
                      <p className="ant-upload-text">
                        点击或将文件拖拽到这里上传
                      </p>
                      <p className="ant-upload-hint">支持扩展名: .xls,.csv</p>
                      <p className="ant-upload-hint">
                        限制：文件大小不超过10MB，最多一个文件
                      </p>
                    </>
                  </Uploader>
                </AForm.Item>
                <ASpace
                  style={{ display: !sourceFileVal ? "block" : "none" }}
                  direction="vertical"
                  size="small"
                >
                  <span className="text-red">注意：</span>
                  <ASpace
                    direction="vertical"
                    size="small"
                    className="indent-[2em] text-gray-500 mb-4"
                  >
                    <span>
                      1.
                      请上传包含标准标题行（表头）的二维数据表，表头仅允许汉字、字母、数字、下划线；
                    </span>
                    <span>
                      2. CSV 文件必须使用 英文逗号 (,) 或 英文分号 (;)
                      作为分隔符；
                    </span>
                    <span>
                      3. CSV 文件建议以 UTF-8 编码保存，避免中文乱码；
                    </span>
                    <span>4. 每个文件内字段数 ≤100 列，文件大小 ≤10MB；</span>
                    <span>5. 不允许存在合并单元格、公式或空标题列；</span>
                    <span>
                      6. 表头命名建议使用 中文字段名，不能重复，有助于解析匹配；
                    </span>
                    <span>
                      7. 文件内容应为纯文本格式，禁止含有脚本或计算公式等。
                    </span>
                  </ASpace>
                </ASpace>
              </>
            }
            {sourceFileVal?.length > 0 && (
              <>
                <AForm.Item
                  label="数据源名称"
                  name="sourceName"
                  rules={[{ required: true }]}
                >
                  <AInput maxLength={50} placeholder="请输入数据源名称" />
                </AForm.Item>
                <AForm.Item
                  label="数据表名称"
                  name="dbTableName"
                  rules={[{ required: true }]}
                >
                  <AInput disabled placeholder="请输入数据表名称" />
                </AForm.Item>
                <AForm.Item label="数据预览" name="sheets">
                  <DataPreview operateType={operateType} />
                </AForm.Item>
                <AForm.Item name="editType" hidden={true} initialValue={0} />
              </>
            )}
          </>
        ) : (
          <>
            <AForm.Item
              label={t("page.dataPreparation.dataSource.name")}
              name="sourceName"
              rules={[{ required: true }]}
            >
              <AInput
                maxLength={50}
                placeholder={t("page.dataPreparation.dataSource.form.name")}
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
              label={t("page.dataPreparation.dataSource.port")}
              name="port"
              rules={[{ required: true }]}
            >
              <AInputNumber
                className="w-full"
                min={0}
                placeholder={t("page.dataPreparation.dataSource.form.port")}
                precision={0}
              />
            </AForm.Item>
            <AForm.Item
              label="数据库"
              name="dbName"
              rules={[
                {
                  required: sourceTypeVal?.toLowerCase() !== "dm",
                  message: "请输入数据库",
                },
              ]}
            >
              <AInput
                placeholder={t("page.dataPreparation.dataSource.form.database")}
              />
            </AForm.Item>
            <AForm.Item
              label={t("page.dataPreparation.dataSource.username")}
              name="userName"
              rules={[{ required: true }]}
            >
              <AInput
                placeholder={t("page.dataPreparation.dataSource.form.username")}
              />
            </AForm.Item>
            <AForm.Item
              label={t("page.dataPreparation.dataSource.password")}
              name="password"
              rules={[{ required: true }]}
            >
              <AInput.Password
                placeholder={t("page.dataPreparation.dataSource.form.password")}
              />
            </AForm.Item>

            {/* <AForm.Item
              label="连接方式"
              name="connectionType"
              rules={[{ required: true }]}
            >
              <ARadio.Group>
                <ARadio value="sid">SID</ARadio>
                <ARadio value="serviceName">服务名</ARadio>
              </ARadio.Group>
            </AForm.Item> */}
          </>
        )}
      </AForm>
      <AModal
        title={
          <div className="text-lg font-semibold text-[#1f1f1f]">
            文件导入 - 本地文件
          </div>
        }
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width={520}
        footer={null}
        className="
        !rounded-xl
        [&_.ant-modal-content]:!rounded-xl
        [&_.ant-modal-header]:!border-none
        [&_.ant-modal-title]:!text-lg
      "
      >
        <div className="flex flex-col items-center py-10">
          <div className="text-[#ff4d4f] text-lg font-semibold mb-4">
            {uploadError?.messageTitle || "导入失败"}
          </div>

          <div
            className="px-6 py-3 bg-gray-100 rounded-lg text-gray-600 text-sm 
                    border border-dashed border-gray-300"
          >
            {uploadError?.message || "请检查文件格式和大小后重试"}
          </div>
        </div>
        <div className="flex justify-center gap-4 border-t pt-6">
          <AButton
            onClick={() => {
              setPreviewVisible(false);
              handleClose();
            }}
          >
            关闭
          </AButton>

          <AButton type="primary" onClick={() => setPreviewVisible(false)}>
            重新上传
          </AButton>
        </div>
      </AModal>
    </ADrawer>
  );
});

export default DatasourceOperateDrawer;
