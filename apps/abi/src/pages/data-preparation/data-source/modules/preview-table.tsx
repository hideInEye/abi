const PreviewTable: FC<{ data: any[] }> = memo(({ data = [] }) => {
  const [dataSource, setDataSource] = useState([]);
  const [columns, setColumns] = useState([]);
  useEffect(() => {
    if (data?.[0]) {
      try {
        const _columns = data[0].fields
          ?.filter((item: any) => item.checked)
          .map((item: any) => ({
            dataIndex: item.name,
            key: item.name,
            title: item.name
          }));

        const _dataSource = data[0].data?.map((item: any) => {
          const itemObj: any = {};
          data[0].fields.forEach((fItem: any, index: number) => {
            itemObj[fItem.name] = item[index];
          });
          return itemObj;
        });

        setColumns(_columns);
        setDataSource(_dataSource);
      } catch (error) {
        console.log(error);
      }
    }
  }, [data]);

  return (
    <ATable
      columns={columns}
      dataSource={dataSource}
      pagination={false}
    />
  );
});

export default PreviewTable;
