const PreviewTable: FC<{ data: any[] }> = memo(({ data = [] }) => {
  const [dataSource, setDataSource] = useState([]);
  const [columns, setColumns] = useState([]);
  const [columnsWidth, setColumnsWidth] = useState(0);
  console.log(data,'====');
  
  useEffect(() => {
    if (data?.[0]) {
      try {
        let columnsWidth = 0;
        const _columns = data[0].fields
          ?.filter((item: any) => item.checked)
          .map((item: any) => {
            const title = (
              <SvgIcon
                className="mr-2px inline-block"
                localIcon={item.fieldType === "TEXT" ? "text" : "value"}
              />
            );
            columnsWidth += 150;
            return {
              dataIndex: item.name,
              key: item.name,
              width: 150,
              title: (
                <div className="flex items-center whitespace-nowrap">
                  {title}
                  {item.name}
                </div>
              ),
            };
          });
        
        const _dataSource =_columns&&_columns.length>0&& data[0].data?.map((item: any) => {
          const itemObj: any = {};
          data[0].fields.forEach((fItem: any, index: number) => {
            itemObj[fItem.name] = item[index];
          });
          return itemObj;
        })||[];
        setColumns(_columns);
        setColumnsWidth(columnsWidth);
        setDataSource(_dataSource);
      } catch (error) {
        console.log(error);
      }
    }
  }, [data]);

  return (
    <ATable columns={columns} scroll={{y:'max-content',x:columnsWidth}} dataSource={dataSource} pagination={false} />
  );
});

export default PreviewTable;
