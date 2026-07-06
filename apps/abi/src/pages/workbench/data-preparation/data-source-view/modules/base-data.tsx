import { Typography } from 'antd'

interface PropsType {
  curDatasource?: any;
  sourceId?: string;
  tableName: string;
}

export const BaseData: React.FC<PropsType> = memo(({ curDatasource, sourceId, tableName }) => {
  const { fieldsList, getFieldsList } = useDatasource();
  const columns = [
    {
      align: 'center',
      dataIndex: 'originName',
      key: 'originName',
      title: '字段名称',
    },
    {
      align: 'center',
      dataIndex: 'type',
      key: 'type',
      title: '字段类型',
    },
    {
      align: 'left' as const,
      className: 'col-base-data-desc',
      dataIndex: 'name',
      key: 'name',
      title: '描述',
      minWidth: 200,
      onHeaderCell: () => ({ className: 'col-base-data-desc' }),
      onCell: () => ({ style: { whiteSpace: 'normal', wordBreak: 'break-all' as const, maxWidth: 300 } }),
      render: (text: string) => text
        ? <Typography.Paragraph ellipsis={{ rows: 2, tooltip: text }} style={{ marginBottom: 0, fontSize: 'inherit', color: 'inherit', maxWidth: 260 }}>{text}</Typography.Paragraph>
        : <span style={{ color: '#9ca3af' }}>-</span>,
    },
  ];

  const getTableList = async () => {
    if (sourceId && tableName) {
      getFieldsList({ sourceId, tableName }, curDatasource?.sourceType);
    }
  };

  useEffect(() => {
    getTableList();
  }, [sourceId, tableName]);

  return (
    <div className="ds-view-tab-content">
      <div
        style={{
          border: '1px solid rgba(130,140,200,0.18)',
          borderRadius: '12px',
          overflow: 'hidden',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="assistant-table-scroll" style={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
          <ATable<any>
            columns={columns as any[]}
            dataSource={fieldsList}
            pagination={false}
            scroll={{ x: 'max-content' }}
            size="middle"
            className="base-data-table abi-std-table"
          />
        </div>
      </div>
    </div>
  );
});
