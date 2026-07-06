import { ApiOutlined, CheckCircleOutlined, CloseOutlined, CloudUploadOutlined, DatabaseOutlined, FileExcelOutlined, LinkOutlined } from '@ant-design/icons'
import { message, Modal } from 'antd'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'

import { useDatasource } from '@/hooks/data-preparation/useDataSource'
import { validDataSource } from '@/service/api'
import clickhouseIcon from '@/assets/imgs/home/ClickHouse.svg'
import dmIcon from '@/assets/imgs/home/dm.svg'
import dorisIcon from '@/assets/imgs/home/doris.svg'
import excelIcon from '@/assets/imgs/home/excel.svg'
import hiveIcon from '@/assets/imgs/home/Hive.svg'
import mysqlIcon from '@/assets/imgs/home/MySQL.svg'
import oracleIcon from '@/assets/imgs/home/Oracle.svg'
import postgresqlIcon from '@/assets/imgs/home/PostgreSQL.svg'
import starrocksIcon from '@/assets/imgs/home/starrocks.svg'
import kingbaseIcon from '@/assets/imgs/home/dekingbase.svg'

import DataPreview from './data-preview'
import Uploader from './uploader'

type Props = Page.OperateDrawerProps & {
  editingData?: any
}

const DB_TYPE_ICON_MAP: Record<string, string> = {
  clickhouse: clickhouseIcon,
  dm: dmIcon,
  doris: dorisIcon,
  excel: excelIcon,
  hive: hiveIcon,
  mysql: mysqlIcon,
  oracle: oracleIcon,
  postgresql: postgresqlIcon,
  starrocks: starrocksIcon,
  kingbase: kingbaseIcon,
}

function getDbIcon(name?: string, sourceType?: string): string | undefined {
  const n = name?.toLowerCase().trim() || ''
  const st = sourceType?.toLowerCase().trim() || ''
  if (DB_TYPE_ICON_MAP[n]) return DB_TYPE_ICON_MAP[n]
  if (DB_TYPE_ICON_MAP[st]) return DB_TYPE_ICON_MAP[st]
  const nNoSpace = n.replace(/\s+/g, '')
  if (DB_TYPE_ICON_MAP[nNoSpace]) return DB_TYPE_ICON_MAP[nNoSpace]
  for (const key of Object.keys(DB_TYPE_ICON_MAP)) {
    if (n.includes(key) || st.includes(key)) {
      return DB_TYPE_ICON_MAP[key]
    }
  }
  return undefined
}

const DatasourceOperateDrawer: FC<Props> = memo(({ form, handleSubmit, onClose, open, operateType, editingData }) => {
  const { t } = useTranslation()
  const [submitDisabled, setSubmitDisabled] = useState(true)
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const sourceTypeVal = AForm.useWatch('sourceType', form)
  const sourceFileVal = AForm.useWatch('sourceFile', form)
  const [uploadError, setUploadError] = useState({ messageTitle: '上传失败', message: '请检查文件格式和内容是否正确' })
  const [previewVisible, setPreviewVisible] = useState(false)

  const { getSourceTypeOptions, sourceTypeOptions } = useDatasource()

  useEffect(() => {
    getSourceTypeOptions()
  }, [])

  useEffect(() => {
    if (sourceFileVal && sourceFileVal.length > 0 && sourceFileVal[0].sheets && sourceFileVal[0].sheets.length > 0) {
      form.setFieldValue('dbTableName', sourceFileVal[0]?.dbTableName)
    }
  }, [sourceFileVal])

  const handleTest = async () => {
    const values = await form.validateFields()
    if (values.sourceName) {
      values.sourceName = values.sourceName.trim()
    }
    const { sourceId, sourceName, sourceType, ...elseValues } = values
    const configuration = JSON.stringify({ ...elseValues, extraParams: 'compress_algorithm=gzip' })
    const formatParams = {
      configuration,
      sourceId,
      sourceName,
      sourceType,
      spaceId: Number(localStorage.getItem('spaceId')),
    }

    try {
      const res = await validDataSource(formatParams)
      if (!res.error) {
        message.destroy()
        message.success('测试连接成功')
        setTestStatus('success')
        setSubmitDisabled(false)
      } else {
        setTestStatus('error')
      }
    } catch {
      setTestStatus('error')
    }
  }

  const handleClose = () => {
    setSubmitDisabled(true)
    setTestStatus('idle')
    onClose()
  }

  const submit = async () => {
    try {
      const values = await form.validateFields()
      await handleSubmit({ ...values })
      setSubmitDisabled(true)
      setTestStatus('idle')
    } catch (err) {
      console.log(err)
    }
  }

  const sourceTypeDisabled = useMemo(() => {
    if (!editingData) return false
    if (editingData?.excelDatasourceFlag) return true
    return false
  }, [editingData])

  const isExcel = sourceTypeVal === 'Excel'
  const selectedIcon = sourceTypeVal ? getDbIcon(sourceTypeVal, sourceTypeVal) : undefined

  return (
    <CommonDrawer
      open={open}
      size="large"
      className="ds-operate-drawer"
      footer={
        <div className="ds-operate-footer">
          <div className="ds-operate-footer-left">
            {testStatus === 'success' && (
              <span className="ds-test-badge ds-test-badge-success">
                <CheckCircleOutlined /> 连接正常
              </span>
            )}
            {testStatus === 'error' && (
              <span className="ds-test-badge ds-test-badge-error">
                <CloseOutlined /> 连接失败
              </span>
            )}
          </div>
          <div className="ds-operate-footer-right">
            <AButton onClick={handleClose}>取消</AButton>
            {!isExcel && (
              <AButton className="btn-ghost-v5" icon={<ApiOutlined />} onClick={handleTest}>
                测试连接
              </AButton>
            )}
            <AButton className="btn-accent-gradient" disabled={submitDisabled && !isExcel} onClick={submit}>
              {t('common.confirm')}
            </AButton>
          </div>
        </div>
      }
      icon={isExcel ? <FileExcelOutlined /> : <DatabaseOutlined />}
      title={operateType === 'add' ? '新增数据源' : '编辑数据源'}
      onClose={handleClose}
    >
      <AForm form={form} initialValues={{ connectionType: 'sid' }} layout="vertical" className="ds-operate-form">
        {/* Section: 数据源类型 */}
        <div className="ds-form-section">
          <div className="ds-form-section-title">
            <DatabaseOutlined />
            数据源类型
          </div>
          <AForm.Item label="类型" name="sourceType" rules={[{ required: true }]}>
            <ASelect
              fieldNames={{ label: 'name', value: 'sourceType' }}
              options={sourceTypeOptions}
              disabled={operateType === 'edit' && sourceTypeVal === 'Excel' && sourceTypeDisabled}
              placeholder="请选择数据源类型"
              optionRender={(option: any) => {
                const icon = getDbIcon(option.data.name, option.data.sourceType)
                return (
                  <div className="ds-type-option">
                    {icon && <img src={icon} alt="" className="ds-type-option-icon" />}
                    <span>{option.data.name}</span>
                  </div>
                )
              }}
              labelRender={(props: any) => {
                const icon = getDbIcon(props.label, props.value)
                return (
                  <div className="ds-type-option">
                    {icon && <img src={icon} alt="" className="ds-type-option-icon" />}
                    <span>{props.label}</span>
                  </div>
                )
              }}
            />
          </AForm.Item>
        </div>

        {isExcel ? (
          /* ── Excel upload flow ── */
          <div className="ds-form-section">
            <div className="ds-form-section-title">
              <CloudUploadOutlined />
              文件上传
            </div>
            <AForm.Item label="上传文件" name="sourceFile" rules={[{ required: true, message: '请选择文件' }]} hidden={!!sourceFileVal}>
              <Uploader
                setData={(val) => {
                  form.setFieldValue('sheets', val)
                  form.setFieldValue('sourceName', val[0].fileName)
                }}
                setPreviewVisible={setPreviewVisible}
                maxSize={10 * 1024 * 1024}
                setUploadError={setUploadError}
              >
                <div className="ds-upload-area">
                  <CloudUploadOutlined className="ds-upload-icon" />
                  <p className="ds-upload-text">点击或将文件拖拽到这里上传</p>
                  <p className="ds-upload-hint">支持扩展名: .xls, .csv</p>
                  <p className="ds-upload-hint">限制: 文件大小不超过 10MB，最多一个文件</p>
                </div>
              </Uploader>
            </AForm.Item>

            {!sourceFileVal && (
              <div className="ds-upload-tips">
                <div className="ds-upload-tips-title">上传须知：</div>
                <ul className="ds-upload-tips-list">
                  <li>请上传包含标准标题行（表头）的二维数据表，表头仅允许汉字、字母、数字、下划线</li>
                  <li>CSV 文件必须使用英文逗号 (,) 或英文分号 (;) 作为分隔符</li>
                  <li>CSV 文件建议以 UTF-8 编码保存，避免中文乱码</li>
                  <li>每个文件内字段数 ≤ 100 列，文件大小 ≤ 10MB</li>
                  <li>不允许存在合并单元格、公式或空标题列</li>
                  <li>表头命名建议使用中文字段名，不能重复，有助于解析匹配</li>
                  <li>文件内容应为纯文本格式，禁止含有脚本或计算公式等</li>
                </ul>
              </div>
            )}

            {sourceFileVal?.length > 0 && (
              <>
                <AForm.Item label="数据源名称" name="sourceName" rules={[{ required: true }]}>
                  <AInput maxLength={50} placeholder="请输入数据源名称" />
                </AForm.Item>
                <AForm.Item label="数据表名称" name="dbTableName" rules={[{ required: true }]}>
                  <AInput disabled placeholder="请输入数据表名称" />
                </AForm.Item>
                <AForm.Item label="数据预览" name="sheets">
                  <DataPreview operateType={operateType} />
                </AForm.Item>
                <AForm.Item name="editType" hidden={true} initialValue={0} />
              </>
            )}
          </div>
        ) : (
          /* ── DB connection flow ── */
          <>
            <div className="ds-form-section">
              <div className="ds-form-section-title">
                <LinkOutlined />
                基本信息
              </div>
              <AForm.Item label="数据源名称" name="sourceName" rules={[{ required: true }]}>
                <AInput maxLength={50} placeholder="请输入数据源名称" prefix={selectedIcon ? <img src={selectedIcon} alt="" style={{ width: 18, height: 14, objectFit: 'contain' }} /> : undefined} />
              </AForm.Item>
            </div>

            <div className="ds-form-section">
              <div className="ds-form-section-title">
                <ApiOutlined />
                连接配置
              </div>
              <div className="ds-form-row">
                <AForm.Item className="ds-form-col-2" label="数据库地址" name="host" rules={[{ required: true }]}>
                  <AInput placeholder="例如: 192.168.1.100" />
                </AForm.Item>
                <AForm.Item className="ds-form-col-1" label="端口" name="port" rules={[{ required: true }]}>
                  <AInputNumber className="w-full" min={0} placeholder="例如: 3306" precision={0} />
                </AForm.Item>
              </div>
              <AForm.Item
                label="数据库"
                name="dbName"
                rules={[
                  {
                    required: sourceTypeVal?.toLowerCase() !== 'dm',
                    message: '请输入数据库',
                  },
                ]}
              >
                <AInput placeholder="请输入数据库名称" />
              </AForm.Item>
            </div>

            <div className="ds-form-section">
              <div className="ds-form-section-title">
                <DatabaseOutlined />
                认证信息
              </div>
              <AForm.Item label="用户名" name="userName" rules={[{ required: true }]}>
                <AInput placeholder="请输入用户名" />
              </AForm.Item>
              <AForm.Item label="密码" name="password" rules={[{ required: true }]}>
                <AInput.Password placeholder="请输入密码" />
              </AForm.Item>
            </div>
          </>
        )}
      </AForm>

      <AModal
        title={<div style={{ fontSize: 16, fontWeight: 600, color: '#1a2744' }}>文件导入 - 本地文件</div>}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width={520}
        footer={null}
        className="ds-upload-error-modal"
      >
        <div className="ds-upload-error-body">
          <div className="ds-upload-error-title">{uploadError?.messageTitle || '导入失败'}</div>
          <div className="ds-upload-error-msg">{uploadError?.message || '请检查文件格式和大小后重试'}</div>
        </div>
        <div className="ds-upload-error-footer">
          <AButton
            onClick={() => {
              setPreviewVisible(false)
              handleClose()
            }}
          >
            关闭
          </AButton>
          <AButton type="primary" className="btn-accent-gradient" onClick={() => setPreviewVisible(false)}>
            重新上传
          </AButton>
        </div>
      </AModal>
    </CommonDrawer>
  )
})

export default DatasourceOperateDrawer
