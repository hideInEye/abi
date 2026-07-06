import { DATA_COLLECTION_T_FIELD_TYPE_OPTIONS } from '@/constants/data-preparation'

import { DataCollectionOperateContext } from '../context'

import { fieldTypeOptions } from './Commons'
import Editor from './InsetCodemirror'
import QuoteField from './QuoteField'
import QuoteFun from './QuoteFun'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'

interface PropsType {
  data?: any
  onClose: (values?: any) => void
}

const CalculatedFieldModal: React.FC<PropsType> = memo(({ data, onClose }) => {
  const tfieldId = `${new Date().getTime()}`
  const { allFields, datasource } = useContext(DataCollectionOperateContext)
  const [form] = AForm.useForm()
  const [target, setTarget] = useState<any[]>([])
  const editorRef = useRef(null)
  useEffect(() => {
    if (data) {
      form.setFieldsValue(data)
    }
  }, [data, form])
  const handleSubmit = async () => {
    const values = await form.validateFields()
    const resData = {
      ...data,
      ...values,
      checked: true,
      extField: 2,
      fieldType: 'STRING',
      params: target,
      sourceId: datasource,
      tfieldId,
    }
    console.log(resData)
    onClose(resData)
  }

  const insertCode = (val: any) => {
    let text = val
    if (typeof val === 'object') {
      text = `[${val.tfieldId}]`
    }
    if (editorRef?.current?.insertText) {
      editorRef?.current?.insertText(text, false)
    }
  }

  return (
    <CommonDrawer
      open={true}
      title="新建计算字段"
      width={1000}
      extra={
        <ASpace>
          <AButton onClick={() => onClose()}>取消</AButton>
          <AButton type="primary" onClick={handleSubmit}>
            确定
          </AButton>
        </ASpace>
      }
      onClose={() => onClose()}
    >
      <AForm
        form={form}
        layout="vertical"
        // wrapperCol={{ span: 16 }}
        // labelCol={{ span: 8 }}
        // name="basic"
        initialValues={{ tfieldType: 'd', sysFiledType: 0 }}
        // onFinish={onFinish}
        autoComplete="off"
      >
        <div className="w-full flex">
          <div className="w-50% pr-10px">
            <div className="gap flex gap-2">
              <AForm.Item
                className="w-full"
                label="英文名称"
                name="tfieldName"
                rules={[{ message: '请输入英文名称', required: true }, { max: 10 }, { message: '仅允许字母、数字、下划线', pattern: /^[a-zA-Z0-9_]+$/ }]}
              >
                <AInput placeholder="请输入英文名称" />
              </AForm.Item>
              <AForm.Item className="w-full" label="中文名称" name="tfieldShowName" rules={[{ max: 10 }, { message: '请输入中文名称', required: true }]}>
                <AInput placeholder="请输入中文名称" />
              </AForm.Item>
            </div>
            <div className="gap flex gap-2">
              <AForm.Item className="whitespace-nowrap" label="数据类型" name="tfieldType" rules={[{ message: '请选择数据类型', required: true }]}>
                <ARadio.Group buttonStyle="solid" size="small">
                  {DATA_COLLECTION_T_FIELD_TYPE_OPTIONS.map((item) => (
                    <ARadio.Button key={item.value} value={item.value}>
                      {item.label}
                    </ARadio.Button>
                  ))}
                </ARadio.Group>
              </AForm.Item>
              <AForm.Item className="w-full" label="字段类型" name="sysFiledType" rules={[{ message: '请选择字段类型', required: true }]}>
                <ASelect options={fieldTypeOptions} />
              </AForm.Item>
            </div>
            <AForm.Item label="字段表达式" name="originName" rules={[{ message: '请输入字段表达式', required: true }]}>
              <Editor fieldOptions={[...allFields, ...target]} height="200px" mode="name" ref={editorRef} />
            </AForm.Item>
          </div>
          <QuoteField allFields={allFields} setTarget={setTarget} target={target} tfieldId={tfieldId} onSelect={insertCode} />
          <QuoteFun onSelect={insertCode} />
        </div>
      </AForm>
    </CommonDrawer>
  )
})

export default CalculatedFieldModal
