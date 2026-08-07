import { CloseOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import type { TableRowSelection } from 'antd/es/table/interface'
import type { Dispatch, SetStateAction } from 'react'

import { useAppSelector } from '@/hooks/business/useStore'
import { getSpaceId } from '@/store/slice/app'
import { DataCollectionOperateContext } from '../context'

interface TableSelectionProps {
  data: any
  fieldsList: any[]
  selectedRows: any[]
  setSelectedRows: Dispatch<SetStateAction<any[]>>
  lockedRowKeys?: string[]
}

const formatFieldsList = (fetchData: any, checkedData: any) => {
  return fetchData.map((item: any) => {
    let checked = false
    // let tfieldId = String(new Date().getTime() + Math.random()) + item.originName; // 前端自己生成的字段id
    if (checkedData?.length) {
      const findItem = checkedData.find((cItem: any) => cItem.originName === item.originName)
      checked = findItem?.checked || false
      // tfieldId = findItem?.tfieldId;
    }
    return {
      ...item,
      checked,
      // tfieldId
    }
  })
}

export const TableSelection: React.FC<TableSelectionProps> = memo(({ data, fieldsList, selectedRows = [], setSelectedRows, lockedRowKeys = [] }) => {
  const { currentDsFields } = data
  const [selectedRowKeys, setSelectedRowKeys] = useState<any[]>([])
  const [dataSource, setDataSource] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const lockedKeySet = useMemo(() => new Set(lockedRowKeys), [lockedRowKeys])
  const onSelectChange = (_newSelectedRowKeys: React.Key[], selected: any[]) => {
    const manualSelected = selected.filter((item) => !lockedKeySet.has(item.originName)).map((item) => ({ ...item, checked: true }))
    const manualKeys = manualSelected.map((item) => item.originName)
    const nextKeys = Array.from(new Set([...manualKeys, ...lockedRowKeys]))
    setSelectedRowKeys(nextKeys)
    setSelectedRows(manualSelected)
  }
  const rowSelection: TableRowSelection<DataType> = {
    onChange: onSelectChange,
    selectedRowKeys,
    getCheckboxProps: (record: DataType) => ({
      disabled: lockedKeySet.has(record.originName),
    }),
  }
  const filterData = useMemo(() => {
    return dataSource?.filter((item: DataType) => item.originName.toLowerCase().includes(search.toLowerCase()))
  }, [dataSource, search])
  const columns: TableColumnsType<DataType> = [
    { dataIndex: 'originName', title: '物理字段名' },
    { dataIndex: 'name', title: '字段备注' },
  ]

  useEffect(() => {
    if (fieldsList?.length) {
      const res = formatFieldsList(fieldsList, currentDsFields)
      const selectedR = res.filter((item: any) => item.checked)
      setSelectedRows(selectedR)
      setDataSource(res)
    }
  }, [fieldsList, currentDsFields, setSelectedRows])

  useEffect(() => {
    const keys = selectedRows?.length || lockedRowKeys.length ? Array.from(new Set([...(selectedRows?.map((item: any) => item.originName).filter(Boolean) || []), ...lockedRowKeys])) : []
    setSelectedRowKeys(keys)
  }, [selectedRows, lockedRowKeys])

  return (
    <>
      <div className="flex items-center justify-between pb-4">
        <span className="whitespace-nowrap">
          字段选择（{selectedRowKeys.length}/{dataSource?.length}）
        </span>
        <AInput.Search className="w-200px" placeholder="通过字段名称搜索" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <ATable<DataType> columns={columns} dataSource={filterData} pagination={false} rowKey="originName" rowSelection={rowSelection} />
    </>
  )
})

interface PropsType {
  data?: any
  onClose: (submit?: boolean, values?: any) => void
}

interface DataType {
  name: string
  originName: string
}

// const demoData = {
//   datasource: 'Demo',
//   dataSource: [
//     {
//       fieldRemark: '备注',
//       key: '1',
//       name: 'test'
//     }
//   ],
//   name: 'QRTZ_BLOB_TRIGGERS',
//   tableRemark: '表备注'
// };

const FieldSelectModal: React.FC<PropsType> = memo(({ data, onClose }) => {
  const { curDatasourceType } = useContext(DataCollectionOperateContext)
  const spaceId = useAppSelector(getSpaceId)

  const { currentDs } = data
  const [selectedRows, setSelectedRows] = useState<any[]>([])
  const { dataSourceList, fieldsList, getDatasourceList, getFieldsList } = useDatasource()

  useEffect(() => {
    getDatasourceList({ spaceId: spaceId || 0 })
  }, [])

  useEffect(() => {
    const { sourceId, tableName } = currentDs
    getFieldsList({ sourceId, tableName }, curDatasourceType)
  }, [currentDs])

  const handleSubmit = async () => {
    // const values = await form.validateFields();
    const currentDsFields = selectedRows.map((item) => ({ ...item, checked: true, tfieldAlias: item.name }))
    onClose(true, { ...data, currentDsFields })
  }

  return (
    <CommonDrawer
      open={true}
      width={600}
      footer={
        <ASpace className="w-full flex justify-end">
          <AButton onClick={() => onClose()}>取消</AButton>
          <AButton type="primary" onClick={handleSubmit}>
            确定
          </AButton>
        </ASpace>
      }
      description={
        <>
          数据源：{dataSourceList.find((item: any) => item.sourceId === currentDs.sourceId)?.sourceName} · 表备注：{currentDs.remark}
        </>
      }
      title={currentDs?.tableName}
      onClose={() => onClose()}
    >
      <TableSelection data={data} fieldsList={fieldsList} selectedRows={selectedRows} setSelectedRows={setSelectedRows} />
    </CommonDrawer>
  )
})

export default FieldSelectModal
