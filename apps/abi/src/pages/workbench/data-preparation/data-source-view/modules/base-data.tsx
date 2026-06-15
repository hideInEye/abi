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
      title: '字段名称'
    },
    {
      align: 'center',
      dataIndex: 'type',
      key: 'type',
      title: '字段类型'
    },
    {
      align: 'center',
      dataIndex: 'name',
      key: 'name',
      title: '描述'
    }
  ];

  const getTableList = async () => {
    if (sourceId && tableName) {
      getFieldsList({ sourceId, tableName }, curDatasource?.sourceType);
    }
  };

  useEffect(() => {
    getTableList();
  }, [tableName]);

  return (
    <div
      style={{
        border: '1px solid rgba(130,140,200,0.18)',
        borderRadius: '12px',
        overflow: 'hidden',
        flex: 1,
        minHeight: 0,
      }}
    >
      <div className="assistant-table-scroll" style={{ overflow: 'auto', maxHeight: 'calc(100vh - 320px)' }}>
        <ATable<any>
          columns={columns as any[]}
          dataSource={fieldsList}
          pagination={false}
          scroll={{ x: 'max-content' }}
          size="middle"
          className="abi-std-table"
        />
      </div>
    </div>
  );
});
