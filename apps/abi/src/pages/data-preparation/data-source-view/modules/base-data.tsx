interface PropsType {
  sourceId?: string;
  tableName: string;
}

export const BaseData: React.FC<PropsType> = memo(({ sourceId, tableName }) => {
  const { fieldsList, getFieldsList } = useDatasource();
  const dataSource = useMemo(() => fieldsList?.filter((item: any) => item.checked), [fieldsList]);
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
      getFieldsList({ sourceId, tableName });
    }
  };

  useEffect(() => {
    getTableList();
  }, [tableName]);

  return (
    <ATable<any>
      columns={columns}
      dataSource={dataSource}
      pagination={false}
      scroll={{ y: 'calc(100vh - 320px)' }}
    />
  );
});
