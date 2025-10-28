import {
  fetchDataSourceList,
  fetchDataSourceTypeOptions,
  fetchTablesBySource,
  getFieldByDataSource
} from '@/service/api';

export function useDatasource() {
  const [dataSourceList, setDataSourceList] = useState<any>([]);
  const [sourceTypeOptions, setSourceTypeOptions] = useState<any>([]);
  const [tableList, setTables] = useState([]);
  const [fieldsList, setFieldsList] = useState([]);

  const getSourceTypeOptions = async () => {
    const res = await fetchDataSourceTypeOptions();
    setSourceTypeOptions(res.data);
  };

  const getDatasourceList = async (data?: any) => {
    const res: any = await fetchDataSourceList({ ...data, pageNum: 1, pageSize: 10000 });
    setDataSourceList(res.data?.data || []);
  };

  const getTableListBySource = async (data: any) => {
    const res = await fetchTablesBySource(data);
    setTables(res.data || []);
  };

  const getFieldsList = async (data: any) => {
    const res = await getFieldByDataSource(data);
    const resData = res.data.map((item: any) => ({ ...item, tfieldAlias: item.name }));
    setFieldsList(resData);
    return resData;
  };

  // useEffect(() => {
  //   getSourceTypeOptions();
  // }, []);

  return {
    dataSourceList,
    fieldsList,
    getDatasourceList,
    getFieldsList,
    getSourceTypeOptions,
    getTableListBySource,
    sourceTypeOptions,
    tableList
  };
}
