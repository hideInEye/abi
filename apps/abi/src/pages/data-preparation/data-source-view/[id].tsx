import type { TabsProps } from 'antd';

import { useRoute } from '~/packages/simple-router/src/hooks/useRoute';

import styles from './index.module.css';
import { BaseData } from './modules/base-data';
import { ViewData } from './modules/view-data';

/**
 * 数据源查看页面组件 用于查看指定数据源的表结构和数据内容 支持两个标签页：
 *
 * 1. 基本数据 - 显示表结构、字段信息、统计信息等
 * 2. 预览数据 - 显示表中的实际数据内容 左侧为数据表列表，右侧为详细信息展示区域 支持表名搜索过滤功能
 */
export function Component() {
  const [datasource, setDatasource] = useState<string | undefined>(undefined);
  const [dataTableKeyword, setDataTableKeyword] = useState('');
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const { dataSourceList, getDatasourceList, getTableListBySource, tableList = [] } = useDatasource();
  const route = useRoute();
  const { id } = route.params;

  const curDatasource = useMemo(
    () => dataSourceList.find((item: any) => item.sourceId === datasource),
    [dataSourceList, datasource]
  );

  const items: TabsProps['items'] = [
    {
      children: (
        <BaseData
          curDatasource={curDatasource}
          sourceId={datasource}
          tableName={selectedTable}
        />
      ),
      key: '1',
      label: '基本数据'
    },
    {
      children: (
        <ViewData
          sourceId={datasource}
          tableName={selectedTable}
        />
      ),
      key: '2',
      label: '预览数据'
    }
  ];

  const filterTableList = useMemo(
    () =>
      dataTableKeyword
        ? tableList.filter((item: any) => item.tableName.toLowerCase().includes(dataTableKeyword.toLowerCase()))
        : tableList,
    [tableList, dataTableKeyword]
  );

  useEffect(() => {
    getDatasourceList({ spaceId: Number(localStorage.getItem('spaceId')) });
  }, []);

  useEffect(() => {
    if (id) {
      setDatasource(id);
    }
  }, [id]);

  useEffect(() => {
    if (datasource) {
      if (curDatasource) {
        getTableListBySource({
          sourceId: datasource,
          sourceType: curDatasource?.sourceType,
          spaceId: Number(localStorage.getItem('spaceId'))
        });
      }
    }
  }, [datasource, curDatasource]);

  return (
    <ACard>
      <div className="relative h-full flex">
        {/* 左边 */}
        <div
          className="relative h-full pr-16px"
          style={{ width: '220px' }}
        >
          <div className="w-full">
            <div className="py-2">数据源</div>
            <ASelect
              className="w-full"
              fieldNames={{ label: 'sourceName', value: 'sourceId' }}
              options={dataSourceList}
              placeholder="请选择"
              value={datasource}
              onChange={val => setDatasource(val)}
            />
          </div>
          <div className="w-full">
            <div className="py-2">数据表</div>
            <AInput
              className="w-full"
              placeholder="请输入内容"
              value={dataTableKeyword}
              onChange={e => setDataTableKeyword(e.target.value)}
            />
          </div>
          <div
            className={styles['table-data-container']}
            style={{ marginTop: '10px' }}
          >
            {filterTableList?.map((item: any) => (
              <div
                className={`flex cursor-pointer items-center rounded px-2 py-1 hover:bg-gray-200 ${item.tableName === selectedTable ? 'bg-gray-200' : ''}`}
                key={item.tableName}
                onClick={() => setSelectedTable(item.tableName)}
              >
                <SvgIcon
                  className="mr-2 min-w-1rem"
                  localIcon="db"
                />
                <span title={item.tableName} className='inline-block max-w-170px overflow-hidden text-ellipsis whitespace-nowrap'>
                  {item.tableName}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 右边 */}
        <div style={{ width: 'calc(100% - 220px)' }}>
          <ATabs
            defaultActiveKey="1"
            items={items}
          />
        </div>
      </div>
    </ACard>
  );
}
