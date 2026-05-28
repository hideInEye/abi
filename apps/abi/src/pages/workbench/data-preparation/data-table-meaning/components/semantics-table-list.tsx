import { ApartmentOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import type { TableProps } from 'antd';

import MetadataAnalysisDrawer from '@/components/metadata-analysis/MetadataAnalysisDrawer';
import type { MetadataAnalysisContext } from '@/components/metadata-analysis/types';

interface DataType {
  bizName: string;
  createBy: string;
  createTime: string;
  id?: number | string;
  relViewId?: number | string;
  schemaId?: number | string;
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
  const [analysisContext, setAnalysisContext] = useState<MetadataAnalysisContext | null>(null);
  const columns: TableProps<DataType>['columns'] = [
    {
      align: 'center',
      dataIndex: 'bizName',
      key: 'bizName',
      minWidth: 160,
      fixed: 'left',
      render: text => {
        return (
          <APopover content={text}>
            <span className="max-w-100 overflow-hidden text-ellipsis">{text && text.length > 10 ? `${text.slice(0, 10)}...` : text}</span>
          </APopover>
        );
      },
      title: '主机名'
    },
    {
      align: 'center',
      dataIndex: 'createBy',
      key: 'createBy',
      minWidth: 100,
      title: '创建人',
    },
    {
      align: 'center',
      dataIndex: 'createTime',
      key: 'createTime',
      minWidth: 140,
      title: '创建时间'
    },
    {
      align: 'center',
      dataIndex: 'updateBy',
      key: 'updateBy',
      minWidth: 100,
      title: '操作人',
    },
    {
      align: 'center',
      dataIndex: 'updateTime',
      key: 'updateTime',
      minWidth: 140,
      title: '操作时间'
    },
    {
      align: 'center',
      fixed: 'right',
      key: 'action',
      minWidth: 160,
      title: '操作',
      render: (_, record) => (
        <div className="flex items-center justify-center gap-12px">
          <AButton color="primary" size="small" variant="link" onClick={() => editTable(record)}>
            编辑
          </AButton>
          <AButton
            color="primary"
            size="small"
            variant="link"
            onClick={() => setAnalysisContext({ nodeId: record.schemaId, nodeName: record.bizName, nodeType: 'TABLE_SEMANTIC', spaceId: Number(localStorage.getItem('spaceId')) || undefined })}
          >
            元数据分析
          </AButton>
          <APopconfirm title="提示" description="确定要删除吗？" onConfirm={() => deleteTable(record)}>
            <AButton color="danger" size="small" variant="link">删除</AButton>
          </APopconfirm>
        </div>
      ),
    }
  ];

  const columnWidth = useMemo(() => {
    return columns!.reduce((total, column: any) => total + (column.minWidth || column.width || 100), 0);
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
            size="middle"
            className="semantics-table abi-std-table"
            pagination={false}
            style={{ fontFamily: 'PingFangSC, PingFang SC', fontWeight: 400, fontSize: '0.875rem', color: '#333333' }}
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
      <MetadataAnalysisDrawer
        context={analysisContext}
        open={Boolean(analysisContext)}
        onClose={() => setAnalysisContext(null)}
      />
    </div>
  );
}
