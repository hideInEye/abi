import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import type { TableProps } from 'antd';

interface DataType {
  bizName: string;
  createBy: string;
  techName: string;
  viewName: string;
}

interface SemanticsTableListProps {
  readonly deleteTable: (record: DataType) => void;
  readonly editTable: (record: DataType) => void;
  readonly tableSchemaList: DataType[];
}

export function SemanticsTableList({ deleteTable, editTable, tableSchemaList }: SemanticsTableListProps) {
  const columns: TableProps<DataType>['columns'] = [
    {
      dataIndex: 'bizName',
      key: 'bizName',
      render: text => <a>{text}</a>,
      title: '表语义名称'
    },
    {
      dataIndex: 'techName',
      key: 'techName',
      title: '英文名称'
    },
    {
      dataIndex: 'viewName',
      key: 'viewName',
      title: '数据集'
    },
    {
      dataIndex: 'createBy',
      key: 'createBy',
      title: '创建人'
    },
    {
      key: 'action',
      render: (_, record) => (
        <ASpace size="middle">
          <ATooltip title="编辑">
            <AButton
              color="primary"
              icon={<EditOutlined />}
              size="small"
              variant="link"
              onClick={() => editTable(record)}
            />
          </ATooltip>

          <ATooltip title="删除">
            <AButton
              color="danger"
              icon={<DeleteOutlined />}
              size="small"
              variant="link"
              onClick={() => {
                AModal.confirm({
                  cancelText: '取消',
                  content: '确定要删除这条记录吗？',
                  okText: '确认',
                  onOk: async () => {
                    deleteTable(record);
                  },
                  title: '确认删除'
                });
              }}
            />
          </ATooltip>
        </ASpace>
      ),
      title: '操作'
    }
  ];
  return (
    <ATable
      columns={columns}
      dataSource={tableSchemaList}
    />
  );
}
