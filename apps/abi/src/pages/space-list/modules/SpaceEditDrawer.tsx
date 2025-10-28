import { AndroidOutlined, AppleOutlined, DeleteOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons';
import { Space, Table, Tabs } from 'antd';
import type { TableProps } from 'antd';

function info() {
  return (
    <div className="h-100% p-10">
      <div className="flex items-center justify-between">
        <p className="mr6 text-3.5">空间名称</p>
        <AInput
          className="w-10 flex-1"
          placeholder="输入空间名称"
        />
      </div>

      <div className="mt10 flex items-center justify-between">
        <p className="mr6 text-3.5">空间名称</p>
        <AInput
          className="w-10 flex-1"
          placeholder="输入空间名称"
        />
      </div>

      <div className="absolute bottom-0 right-0">
        <AButton>取消</AButton>
        <AButton
          className="ml3"
          type="primary"
        >
          确定
        </AButton>
      </div>
    </div>
  );
}

function createSpaceRole() {
  interface DataType {
    address: string;
    age: number;
    key: string;
    name: string;
    tags: string[];
  }

  const columns: TableProps<DataType>['columns'] = [
    {
      dataIndex: 'name',
      key: 'name',
      render: text => <a>{text}</a>,
      title: 'Name'
    },
    {
      dataIndex: 'age',
      key: 'age',
      title: 'Age'
    },
    {
      dataIndex: 'address',
      key: 'address',
      title: 'Address'
    },

    {
      key: 'action',
      render: _ => (
        <Space size="middle">
          <AButton
            color="primary"
            icon={<EditOutlined />}
            size="small"
            variant="link"
          />
          <AButton
            color="danger"
            icon={<DeleteOutlined />}
            size="small"
            variant="link"
          />
        </Space>
      ),
      title: 'Action'
    }
  ];

  const data: DataType[] = [
    {
      address: 'New York No. 1 Lake Park',
      age: 32,
      key: '1',
      name: 'John Brown',
      tags: ['nice', 'developer']
    },
    {
      address: 'London No. 1 Lake Park',
      age: 42,
      key: '2',
      name: 'Jim Green',
      tags: ['loser']
    },
    {
      address: 'Sydney No. 1 Lake Park',
      age: 32,
      key: '3',
      name: 'Joe Black',
      tags: ['cool', 'teacher']
    }
  ];
  return (
    <section>
      <div className="my4 flex items-center justify-between">
        <AInput
          className="w-260px"
          placeholder="请输入关键字搜索"
          prefix={<SearchOutlined />}
          size="middle"
        />
        <AButton type="primary">新建角色</AButton>
      </div>

      <Table<DataType>
        columns={columns}
        dataSource={data}
      />
    </section>
  );
}

export default function SpaceEditDrawer() {
  const onChange = (key: string) => {
    console.log(key);
  };

  const tabs = [
    {
      children: info(),
      icon: <AppleOutlined />,
      key: '1',
      label: `基本信息`
    },
    {
      children: createSpaceRole(),
      icon: <AndroidOutlined />,
      key: '2',
      label: `角色管理`
    },
    {
      children: `12`,
      icon: <AndroidOutlined />,
      key: '3',
      label: `组织管理`
    },
    {
      children: `12`,
      icon: <AndroidOutlined />,
      key: '4',
      label: `用户管理`
    }
  ];

  return (
    <div className="relative h-100%">
      <Tabs
        defaultActiveKey="2"
        items={tabs.map(item => {
          return {
            children: item.children,
            icon: item.icon,
            key: item.key,
            label: item.label
          };
        })}
        onChange={onChange}
      />
    </div>
  );
}
