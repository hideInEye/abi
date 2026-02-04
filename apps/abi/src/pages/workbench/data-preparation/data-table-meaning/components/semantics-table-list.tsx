import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import type { TableProps } from 'antd';

interface DataType {
  bizName: string;
  createBy: string;
  createTime: string;
  techName: string;
  updateBy: string;
  updateTime: string;
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
      align: 'center',
      dataIndex: 'bizName',
      key: 'bizName',
      width: 200,
      fixed: 'left',
      render: text => {
        return (
          <APopover content={text}>
            <span className="max-w-100 overflow-hidden text-ellipsis">{text && text.length > 10 ? text.slice(0, 10) + '...' : text}</span>
          </APopover>
        );
      },
      title: '主机名'
    },
    {
      align: 'center',
      dataIndex: 'createBy',
      key: 'createBy',
      title: '创建人',
      width: 150
    },
    {
      align: 'center',
      dataIndex: 'createTime',
      key: 'createTime',
      title: '创建时间'
    },
    {
      align: 'center',
      dataIndex: 'updateBy',
      key: 'updateBy',
      title: '操作人',
    },
    {
      align: 'center',
      dataIndex: 'updateTime',
      key: 'updateTime',
      title: '操作时间'
    },
    {
      align: 'center',
      key: 'action',
      render: (_, record) => (
        <ASpace size="middle">
          <ATooltip title="编辑">
            <AButton
              color="primary"
              icon={<EditOutlined style={{ fontSize: '1rem' }} />}
              size="small"
              variant="link"
              onClick={() => editTable(record)}
            />
          </ATooltip>

          <ATooltip title="删除">
            <AButton
              color="danger"
              icon={<DeleteOutlined style={{ fontSize: '1rem' }} />}
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
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  return (
    <div 
      style={{ 
        border: '0.0625rem solid #d9d9d9', 
        borderRadius: '0.5rem',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 12.5rem)',
        minHeight: 400,
        overflow: 'hidden',
      }}
    >
      <div style={{ flex: 1, overflow: 'auto' }}>
        <ATable
          columns={columns}
          scroll={{ x: columnWidth }}
          dataSource={tableSchemaList}
          size="small"
          className="semantics-table"
          pagination={false}
        />
      </div>
      <div 
        style={{ 
          padding: '0.75rem 1rem',
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <APagination
          current={currentPage}
          pageSize={pageSize}
          total={tableSchemaList.length}
          showSizeChanger
          onChange={(page, size) => {
            setCurrentPage(page);
            setPageSize(size);
          }}
        />
      </div>
    </div>
  );
}
