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
      width: 200,
      fixed: 'left',
      render: text => {
        return (
          <APopover content={text}>
            <span className="max-w-100 overflow-hidden text-ellipsis text-blue">{text && text.length > 10 ? text.slice(0, 10) + '...' : text}</span>
          </APopover>
        );
      },
      title: '表语义名称'
    },
    {
      dataIndex: 'techName',
      key: 'techName',
      title: '英文名称',
      width: 200,
      render: text => {
        return (
          <APopover content={text}>
            <span className="max-w-100 overflow-hidden text-ellipsis text-blue">{text && text.length > 10 ? text.slice(0, 10) + '...' : text}</span>
          </APopover>
        );
      },
    },
    {
      dataIndex: 'viewName',
      key: 'viewName',
      title: '数据集',
      width: 150
    },
    {
      dataIndex: 'createBy',
      key: 'createBy',
      title: '创建人',
      width: 150
    },
    {
      key: 'action',
      width: 150,
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

  const columnWidth = useMemo(() => {
    return columns.reduce((total, column) => total + (column.width as number || 0), 0);
  }, [columns]);
  
  return (
    <ATable
      columns={columns}
      scroll={{x: columnWidth}}
      dataSource={tableSchemaList}
    />
  );
}
