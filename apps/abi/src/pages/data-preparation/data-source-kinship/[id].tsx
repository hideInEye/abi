import { useRoute } from '@sa/simple-router';
import { Segmented } from 'antd';

import { getBloodRel, getRelResList } from '@/service/api';

import GraphBox from './modules/GraphBox';
import TableBox from './modules/TableBox';

/**
 * 数据源血缘关系查看页面组件 用于查看数据源、数据表、数据集之间的血缘关系 支持两种展示模式：
 *
 * 1. 图形模式 - 使用图形化的方式展示数据依赖关系
 * 2. 表格模式 - 使用表格的方式列出数据关系 支持按资源类型（数据源/数据集）和具体资源名称过滤 可以查看数据的上下游依赖关系，帮助用户理解数据流向
 */

// const TableBox = lazy(() => import('./modules/TableBox'));
// const GraphBox = lazy(() => import('./modules/GraphBox'));
const segmentedOptions = [
  { label: '图形模式', value: 1 },
  { label: '表格模式', value: 2 }
];
// 资源类型
const typeOptions = [
  { label: '数据源', value: 1 },
  { label: '数据集', value: 2 }
];
const initState = {
  name: undefined,
  type: undefined
};

const reducer = (state: any, { name, value }: any) => {
  return { ...state, [name]: value };
};
// {
//   "spaceId": 1,
//   "sourceId": "1088140482892140544",
//   "type": "0",
//   "name": ""
// }
// spaceId 和sourceId 必输
// type默认为0，非必输；0-根据数据源id查询；1-根据数据源id+表名name查询；2-根据数据源id+数据集name查询
// name:当type=1或2时，传值

export function Component() {
  const [tab, setTab] = useState(1);
  const [tables, setTables] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [state, dispatch] = useReducer(reducer, initState);
  const [searchKey, setSearchKey] = useState(true);
  const [basicData, setBasicData] = useState(undefined);
  const route = useRoute();
  const { id } = route.params;
  const { search } = useLocation();
  const query = new URLSearchParams(search);
  const from = query.get('from');
  const name = query.get('name');

  useEffect(() => {}, []);

  // 加载筛选条件
  const getRelResListFn = async (
    params: any = {
      // 固定值
      sourceId: id,
      spaceId: localStorage.getItem('spaceId')
    }
  ) => {
    const res = await getRelResList(params);
    const tableList = res?.data?.tables?.map((item: any) => {
      return { label: item.tableName, value: item.tableName };
    });
    const datasetsList = res?.data?.datasets?.map((item: any) => {
      return { label: item.viewName, value: item.viewName };
    });
    setTables(tableList || []);
    setDatasets(datasetsList || []);
  };
  // 查询数据
  const getBloodRelFn = async (
    params: any = {
      // 固定值
      sourceId: id,
      spaceId: localStorage.getItem('spaceId'),
      ...state
    }
  ) => {
    setSearchKey(false);
    const res = await getBloodRel(params);
    setSearchKey(true);
    setBasicData(res?.data);
  };
  useEffect(() => {
    if (id) {
      const type = Number(from);
      dispatch({ name: 'type', value: type });
      dispatch({ name: 'name', value: name || undefined });
      const params = {
        name,
        sourceId: id,
        spaceId: localStorage.getItem('spaceId'),
        type
      };
      getRelResListFn(params);
      getBloodRelFn(params);
    }
  }, [id, from, name]);

  const handleSearch = () => {
    getBloodRelFn();
  };
  return (
    <div>
      <ACard>
        <AFlex justify="space-between">
          <AFlex justify="space-between">
            <ASelect
              allowClear
              className="mx-2 w-200px"
              options={typeOptions}
              placeholder="请选择资源类型"
              value={state.type}
              onChange={value => {
                dispatch({ name: 'type', value });
                dispatch({ name: 'name', value: undefined });
              }}
            />
            {state.type === 1 && (
              <ASelect
                className="mx-2 w-200px"
                options={tables}
                placeholder="请选择数据源"
                value={state.name}
                onChange={value => dispatch({ name: 'name', value })}
              />
            )}
            {state.type === 2 && (
              <ASelect
                className="mx-2 w-200px"
                options={datasets}
                placeholder="请选择数据源"
                value={state.name}
                onChange={value => dispatch({ name: 'name', value })}
              />
            )}
            <AButton
              type="primary"
              onClick={handleSearch}
            >
              查询
            </AButton>
          </AFlex>
          <div>
            <Segmented
              options={segmentedOptions}
              value={tab}
              onChange={value => {
                setTab(value);
              }}
            />
          </div>
        </AFlex>
        {tab === 1 && searchKey && <GraphBox basicData={basicData} />}
        {tab === 2 && <TableBox basicData={basicData} />}
      </ACard>
    </div>
  );
}
