import { CloseOutlined, DeleteOutlined, DownOutlined, EditOutlined } from '@ant-design/icons'
import type { TableProps } from 'antd'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'

import OrganizationCreation from './OrganizationCreation'

const treeData: any = [
  {
    children: [
      {
        children: [
          {
            key: '0-0-0-0',
            title: 'leaf',
          },
          {
            key: '0-0-0-1',
            title: 'leaf',
          },
          {
            key: '0-0-0-2',
            title: 'leaf',
          },
        ],
        key: '0-0-0',
        title: 'parent 1-0',
      },
      {
        children: [
          {
            key: '0-0-1-0',
            title: 'leaf',
          },
        ],
        key: '0-0-1',
        title: 'parent 1-1',
      },
      {
        children: [
          {
            key: '0-0-2-0',
            title: 'leaf',
          },
          {
            key: '0-0-2-1',
            title: 'leaf',
          },
        ],
        key: '0-0-2',
        title: 'parent 1-2',
      },
    ],
    key: '0-0',
    title: 'parent 1',
  },
]

interface DataType {
  address: string
  age: number
  key: string
  name: string
  tags: string[]
}

const columns: TableProps<DataType>['columns'] = [
  {
    dataIndex: 'name',
    key: 'name',
    render: (text) => <a>{text}</a>,
    title: 'Name',
  },
  {
    dataIndex: 'age',
    key: 'age',
    title: 'Age',
  },
  {
    dataIndex: 'address',
    key: 'address',
    title: 'Address',
  },

  {
    key: 'action',
    render: (_) => (
      <ASpace size="middle">
        <AButton color="primary" icon={<EditOutlined />} size="small" variant="link" />
        <AButton color="danger" icon={<DeleteOutlined />} size="small" variant="link" />
      </ASpace>
    ),
    title: 'Action',
  },
]

const tableData: DataType[] = [
  {
    address: 'New York No. 1 Lake Park',
    age: 32,
    key: '1',
    name: 'John Brown',
    tags: ['nice', 'developer'],
  },
  {
    address: 'London No. 1 Lake Park',
    age: 42,
    key: '2',
    name: 'Jim Green',
    tags: ['loser'],
  },
  {
    address: 'Sydney No. 1 Lake Park',
    age: 32,
    key: '3',
    name: 'Joe Black',
    tags: ['cool', 'teacher'],
  },
]

export default function Component() {
  const onSelect = () => {}
  const [drawerOpen, setDrawerOpen] = useState(false)
  return (
    <div>
      <AFlex className="gap-6">
        <ASpace direction="vertical">
          <AInput placeholder="请输入关键字检索" />
          <ATree showLine defaultExpandedKeys={['0-0-0']} switcherIcon={<DownOutlined />} treeData={treeData} onSelect={onSelect} />
        </ASpace>

        <ASpace className="flex-1" direction="vertical">
          <ASpace className="flex justify-between">
            <AInput placeholder="请输入关键字检索" />
            <AButton type="primary" onClick={() => setDrawerOpen(true)}>
              创建组织
            </AButton>
          </ASpace>

          <ATable<DataType> columns={columns} dataSource={tableData} />
        </ASpace>
      </AFlex>
      <CommonDrawer
        open={drawerOpen}
        title="创建组织"
        width={700}
        footer={
          <AFlex className="mt-4 gap-4" justify="flex-end">
            <AButton type="default" onClick={() => setDrawerOpen(false)}>
              取消
            </AButton>
            <AButton type="primary" onClick={() => setDrawerOpen(false)}>
              确定
            </AButton>
          </AFlex>
        }
        onClose={() => setDrawerOpen(false)}
      >
        <OrganizationCreation />
      </CommonDrawer>
    </div>
  )
}
