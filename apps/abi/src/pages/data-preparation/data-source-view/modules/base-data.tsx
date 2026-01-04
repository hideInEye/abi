interface PropsType {
  curDatasource?: any;
  sourceId?: string;
  tableName: string;
}

export const BaseData: React.FC<PropsType> = memo(({ curDatasource, sourceId, tableName }) => {
  const { fieldsList, getFieldsList } = useDatasource();
  const columns = [
    {
      dataIndex: 'originName',
      key: 'originName',
      title: '字段名称'
    },
    {
      dataIndex: 'type',
      key: 'type',
      title: '字段类型'
    },
    {
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
    <ATable<any>
      columns={columns}
      dataSource={fieldsList}
      pagination={false}
      scroll={{ y: 'calc(100vh - 320px)' }}
    />
  );
});
