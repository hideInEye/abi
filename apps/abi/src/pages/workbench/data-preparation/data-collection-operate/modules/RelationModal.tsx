import { CloseOutlined, MinusCircleOutlined } from '@ant-design/icons'
import { Form } from 'antd'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'

import { DataCollectionOperateContext } from '../context'

import { TableSelection } from './FieldSelectModal'

interface RSelectPropsType {
  onChange?: (val: string) => void
  value?: any
}

const RSelect: React.FC<RSelectPropsType & any> = memo(({ handleValidate, onChange, value, ...elseProps }) => {
  const realVal = useMemo(() => value?.originName, [value])
  const handleChange = (_val: string, valObj: any) => {
    onChange(valObj)
    handleValidate()
  }
  return <ASelect {...elseProps} value={realVal} onChange={handleChange} />
})

interface PropsType {
  data?: any
  onClose: (submit?: boolean, values?: any) => void
}

const typeOptions = [
  {
    label: '左连接',
    value: 'left',
  },
  {
    label: '右连接',
    value: 'right',
  },
  {
    label: '内连接',
    value: 'inner',
  },
  // {
  //   label: '全连接',
  //   value: 'full'
  // }
]

const mergeSelectedRows = (rows: any[] = [], unionRows: any[] = []) => {
  const map = new Map<string, any>()
  rows?.forEach((item) => {
    if (!item?.originName) return
    map.set(item.originName, item)
  })
  unionRows?.forEach((item) => {
    if (!item?.originName) return
    map.set(item.originName, { ...item, checked: true })
  })
  return Array.from(map.values())
}

const RelationModal: React.FC<PropsType> = memo(({ data, onClose }) => {
  const { curDatasourceType } = useContext(DataCollectionOperateContext)

  const { current, parent } = data
  const { currentDs, unionToParent } = current
  const { currentDs: parentDs } = parent
  const [selectedCurRows, setSelectedCurRows] = useState<any[]>([])
  const [selectedParentRows, setSelectedParentRows] = useState<any[]>([])
  const { getFieldsList } = useDatasource()
  const [curFieldsList, setCurFieldsList] = useState<any[]>([])
  const [parentFieldsList, setParentFieldsList] = useState<any[]>([])
  const [form] = Form.useForm()
  const unionFields = Form.useWatch(['unionToParent', 'unionFields'], form)
  const parentUnionRows = useMemo(() => (Array.isArray(unionFields) ? unionFields.map((item) => item?.parentField).filter(Boolean) : []), [unionFields])
  const currentUnionRows = useMemo(() => (Array.isArray(unionFields) ? unionFields.map((item) => item?.currentField).filter(Boolean) : []), [unionFields])
  const lockedParentKeys = useMemo(() => parentUnionRows.map((item: any) => item.originName).filter(Boolean), [parentUnionRows])
  const lockedCurrentKeys = useMemo(() => currentUnionRows.map((item: any) => item.originName).filter(Boolean), [currentUnionRows])
  const mergedParentRows = useMemo(() => mergeSelectedRows(selectedParentRows, parentUnionRows), [selectedParentRows, parentUnionRows])
  const mergedCurrentRows = useMemo(() => mergeSelectedRows(selectedCurRows, currentUnionRows), [selectedCurRows, currentUnionRows])

  useEffect(() => {
    if (unionToParent) {
      form.setFieldsValue({ unionToParent })
    }
  }, [unionToParent])

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const res = {
      currentDs,
      currentDsFields: mergedCurrentRows,
      parentDsFields: mergedParentRows,
      ...values,
      uniqueId: current.uniqueId,
    }
    onClose(true, res)
  }

  const getCurFields = () => {
    const { sourceId, tableName } = currentDs
    getFieldsList({ sourceId, tableName }, curDatasourceType).then((curResData) => {
      setCurFieldsList(curResData)
    })
  }

  const getParentFields = () => {
    const { sourceId, tableName } = parentDs
    getFieldsList({ sourceId, tableName }, curDatasourceType).then((curResData) => {
      setParentFieldsList(curResData)
    })
  }

  useEffect(() => {
    getCurFields()
    getParentFields()
  }, [data])

  return (
    <CommonDrawer
      open={true}
      title="编辑关联关系"
      width={1000}
      footer={
        <ASpace className="w-full flex justify-end">
          <AButton onClick={() => onClose()}>取消</AButton>
          <AButton type="primary" onClick={handleSubmit}>
            确定
          </AButton>
        </ASpace>
      }
      onClose={() => onClose()}
    >
      <div className="flex border">
        <div className="w-50% border-r p-2">
          <header>{parentDs?.tableName}</header>
          <TableSelection data={parent} fieldsList={parentFieldsList} lockedRowKeys={lockedParentKeys} selectedRows={mergedParentRows} setSelectedRows={setSelectedParentRows} />
        </div>
        <div className="w-50% p-2">
          <header>{currentDs?.tableName}</header>
          <TableSelection data={current} fieldsList={curFieldsList} lockedRowKeys={lockedCurrentKeys} selectedRows={mergedCurrentRows} setSelectedRows={setSelectedCurRows} />
        </div>
      </div>
      <AForm
        form={form}
        initialValues={{
          unionToParent: { unionFields: [{ currentField: undefined, parentField: undefined }], unionType: 'left' },
        }}
        className="relative"
        // name="dynamic_form_item"
        // {...formItemLayoutWithOutLabel}
        // onFinish={onFinish}
        // style={{ maxWidth: 600 }}
      >
        <header className="flex items-center justify-between py-2">
          <span className="text-14px">关联关系</span>
          <div className="pr-140px">
            <AForm.Item noStyle name={['unionToParent', 'unionType']}>
              <ASelect options={typeOptions} />
            </AForm.Item>
          </div>
        </header>
        <AForm.List
          name={['unionToParent', 'unionFields']}
          rules={[
            {
              validator: async (_, relations) => {
                if (!relations[0].currentField || !relations[0].parentField) {
                  return Promise.reject(new Error('关联字段不能为空'))
                }
                return Promise.resolve()
              },
            },
          ]}
        >
          {(fields, { add, remove }, { errors }) => (
            <>
              <AButton className="absolute right-0 top-8px" type="primary" onClick={() => add()}>
                + 添加关联字段
              </AButton>
              <div className="mb-2 flex">
                <span className="w-50%">{parentDs?.tableName}</span>
                <span className="w-50%">{currentDs?.tableName}</span>
              </div>
              {fields.map((field, index) => {
                return (
                  <AForm.Item
                    key={index}
                    // {...(index === 0 ? formItemLayout : formItemLayoutWithOutLabel)}
                    // label={index === 0 ? 'Passengers' : ''}
                    // required={false}
                  >
                    <div className="flex">
                      <AForm.Item
                        {...field}
                        noStyle
                        name={[field.name, 'parentField']}
                        // validateTrigger={['onChange', 'onBlur']}
                        // rules={[
                        //   {
                        //     message: "Please input passenger's name or delete this field.",
                        //     required: true,
                        //     whitespace: true
                        //   }
                        // ]}
                      >
                        <RSelect fieldNames={{ label: 'originName', value: 'originName' }} handleValidate={() => form.validateFields()} options={parentFieldsList} placeholder="请选择" />
                      </AForm.Item>
                      <SvgIcon className="mx-2 text-34px" localIcon="relation" />
                      <AForm.Item {...field} noStyle name={[field.name, 'currentField']}>
                        <RSelect fieldNames={{ label: 'originName', value: 'originName' }} handleValidate={() => form.validateFields()} options={curFieldsList} placeholder="请选择" />
                      </AForm.Item>
                      {fields.length > 1 ? <MinusCircleOutlined className="dynamic-delete-button" onClick={() => remove(field.name)} /> : null}
                    </div>
                  </AForm.Item>
                )
              })}
              {/* <AForm.Item>
                <Button
                  icon={<PlusOutlined />}
                  style={{ width: '60%' }}
                  type="dashed"
                  onClick={() => add()}
                >
                  Add field
                </Button>
                <Button
                  icon={<PlusOutlined />}
                  style={{ marginTop: '20px', width: '60%' }}
                  type="dashed"
                  onClick={() => {
                    add('The head item', 0);
                  }}
                >
                  Add field at head
                </Button>
              </AForm.Item> */}
              <AForm.ErrorList className="text-#f5222d" errors={errors} />
            </>
          )}
        </AForm.List>
      </AForm>
    </CommonDrawer>
  )
})

export default RelationModal
