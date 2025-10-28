import { DeleteOutlined, EditOutlined } from '@ant-design/icons';

import type { DictionaryEnumItem } from '../types';

interface TableEnumProps {
  readonly dataSource:
    | {
        code: number;
        msg: string;
        rows: any[];
        total: number;
      }
    | undefined;
  readonly dictNumber: number;
  readonly onDelete: (record: DictionaryEnumItem) => void;
  readonly onEdit: (obj: any) => void;
  readonly onPageChange: (page: number) => void;
}

export const TableEnum: React.FC<TableEnumProps> = ({
  dataSource,
  dictNumber,
  onDelete,
  onEdit,
  onPageChange
}: TableEnumProps) => {
  const handleEdit = (record: any) => {
    onEdit(record);
  };

  const handleDelete = (record: DictionaryEnumItem) => {
    onDelete(record);
  };

  const pageChange = (page: number) => {
    onPageChange(page);
  };

  const columns = [
    {
      dataIndex: 'dictCode',
      title: '字典编码'
    },
    {
      dataIndex: 'dictLabel',
      title: '字典标签'
    },
    {
      dataIndex: 'dictValue',
      title: '字典键值'
    },
    {
      dataIndex: 'dictSort',
      title: '字典排序'
    },
    {
      dataIndex: 'status',
      render: (status: string) => <ASwitch checked={status !== '1'} />,
      title: '状态'
    },
    {
      dataIndex: 'remark',
      title: '备注'
    },
    {
      dataIndex: 'createTime',
      title: '创建时间'
    },

    {
      dataIndex: '操作',
      render: (_: any, record: any) => {
        return (
          <div className="flex items-center gap-2">
            <AButton
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />

            <APopconfirm
              cancelText="取消"
              description="确定要删除该字典枚举吗？"
              okText="确认"
              title="删除字典枚举"
              onCancel={() => {}}
              onConfirm={() => handleDelete(record)}
            >
              <AButton icon={<DeleteOutlined />} />
            </APopconfirm>
          </div>
        );
      },
      title: '操作'
    }
  ];

  return (
    <ATable
      columns={columns}
      dataSource={dataSource?.rows}
      pagination={{
        current: dictNumber,
        onChange: (page: number) => {
          pageChange(page);
        },
        total: dataSource?.total
      }}
    />
  );
};
