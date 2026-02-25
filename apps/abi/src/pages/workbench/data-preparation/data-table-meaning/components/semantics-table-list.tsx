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
      align: 'left',
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
      fixed: 'right',
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

          <APopconfirm
            title="提示"
            description="确定要删除吗？"
            onConfirm={() => deleteTable(record)}
          >
            <ATooltip title="删除">
              <AButton
                color="danger"
                icon={<DeleteOutlined style={{ fontSize: '1rem' }} />}
                size="small"
                variant="link"
              />
            </ATooltip>
          </APopconfirm>
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
  const pagedTableSchemaList = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return tableSchemaList.slice(startIndex, startIndex + pageSize);
  }, [currentPage, pageSize, tableSchemaList]);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, tableSchemaList]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div
        style={{
          border: '0.0625rem solid #d9d9d9',
          borderRadius: '0.5rem',
          overflow: 'hidden',
          width: '100%',
          maxHeight: '100%'
        }}
      >
        <div className="assistant-table-scroll" style={{ overflow: 'auto', maxHeight: '100%' }}>
          <ATable
            columns={columns}
            scroll={pagedTableSchemaList?.length > 0 ? { x: columnWidth } : undefined}
            dataSource={pagedTableSchemaList}
            size="small"
            className="semantics-table"
            pagination={false}
          />
        </div>
      </div>
      <div 
      style={{ 
        padding: '0.75rem 0', 
        display: 'flex',
        justifyContent: 'flex-end',
        marginTop: 'auto'
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
