import { Table } from 'antd';
import type { TableProps } from 'antd';
import React, { Suspense } from 'react';

type requestParameter = {
  readonly basicData: any;
  //   readonly spaceId: string;
};
interface DataType {
  address: string;
  age: number;
  key: string;
  name: string;
  tags: string[];
}

const columns: TableProps<DataType>['columns'] = [
  {
    align: 'center',
    dataIndex: 'rname',
    key: 'index',
    title: '源节点'
  },
  {
    align: 'center',
    dataIndex: 'rtype',
    key: 'index',
    minWidth: 120,
    title: '源类型'
  },
  {
    align: 'center',
    dataIndex: 'name',
    key: 'index',
    minWidth: 120,
    title: '目标节点'
  },
  {
    dataIndex: 'type',
    key: 'index',
    minWidth: 120,
    title: '目标类型'
  }
];
const App: React.FC<{
  basicData: any;
}> = ({ basicData }: requestParameter) => {
  const [tableOptions, setTableOptions] = useState<any>([]);
  function formatata(obj: any) {
    const list: any = [];
    obj.tables?.forEach((item: any) => {
      list.push({
        name: item.tableName,
        rname: obj.sourceName,
        rtype: obj.sourceType,
        type: 'tables'
      });
      const list2 = obj.datasets?.filter((el: any) => {
        return el.viewId === item.viewId;
      });
      list2?.forEach((el: any) => {
        list.push({
          name: el.viewName,
          rname: item.tableName,
          rtype: 'tables',
          type: 'datasets'
        });
      });
    });
    setTableOptions(list);
  }
  useEffect(() => {
    formatata(basicData);
  }, [basicData]);

  return (
    <Suspense fallback={null}>
      <Table
        columns={columns}
        dataSource={tableOptions}
      />
    </Suspense>
  );
};
export default App;
