import {
  ArrowLeftOutlined,
  DatabaseOutlined,
  SearchOutlined,
  TableOutlined,
} from '@ant-design/icons';
import type { TabsProps } from 'antd';

import { useRouter } from '~/packages/simple-router/src/hooks/useRouter';
import { useRoute } from '~/packages/simple-router/src/hooks/useRoute';

import styles from './index.module.css';
import { BaseData } from './modules/base-data';
import { ViewData } from './modules/view-data';

/**
 * 数据源预览页面 — 查看指定数据源的表结构和数据内容
 * 支持两个标签页:
 *   1. 基本数据 - 表结构 / 字段信息
 *   2. 预览数据 - 实际数据内容
 */
export function Component() {
  const [datasource, setDatasource] = useState<string | undefined>(undefined);
  const [dataTableKeyword, setDataTableKeyword] = useState('');
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const { dataSourceList, getDatasourceList, getTableListBySource, tableList = [] } = useDatasource();
  const route = useRoute();
  const router = useRouter();
  const { id } = route.params;

  const curDatasource = useMemo(
    () => dataSourceList.find((item: any) => item.sourceId === datasource),
    [dataSourceList, datasource],
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
      forceRender: true,
      key: '1',
      label: (
        <span className="ds-view-tab-label">
          <DatabaseOutlined />
          基本数据
        </span>
      ),
    },
    {
      children: (
        <ViewData
          sourceId={datasource}
          tableName={selectedTable}
        />
      ),
      forceRender: true,
      key: '2',
      label: (
        <span className="ds-view-tab-label">
          <TableOutlined />
          预览数据
        </span>
      ),
    },
  ];

  const filterTableList = useMemo(
    () =>
      dataTableKeyword
        ? tableList.filter((item: any) => item.tableName.toLowerCase().includes(dataTableKeyword.toLowerCase()))
        : tableList,
    [tableList, dataTableKeyword],
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
          spaceId: Number(localStorage.getItem('spaceId')),
        });
      }
    }
  }, [datasource, curDatasource]);

  const handleBack = () => {
    router.push('/workbench/data-preparation/data-source');
  };

  return (
    <div className="ds-view-page">
      {/* Page header */}
      <div className="ds-view-header">
        <div className="ds-view-header-left">
          <button className="ds-view-back-btn" onClick={handleBack} title="返回数据源列表">
            <ArrowLeftOutlined />
          </button>
          <div className="ds-view-header-info">
            <span className="ds-view-header-title">
              数据源预览
            </span>
            {curDatasource && (
              <span className="ds-view-header-sub">
                {curDatasource.sourceName}
              </span>
            )}
          </div>
        </div>
        <div className="ds-view-header-right">
          <ASelect
            className="ds-view-source-select"
            fieldNames={{ label: 'sourceName', value: 'sourceId' }}
            options={dataSourceList}
            placeholder="切换数据源"
            value={datasource}
            onChange={(val) => {
              setDatasource(val);
              setSelectedTable(null);
            }}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="ds-view-body">
        {/* Left sidebar - table list */}
        <div className="ds-view-sidebar">
          <div className="ds-view-sidebar-title">
            <TableOutlined />
            数据表
            <span className="ds-view-sidebar-count">{filterTableList?.length || 0}</span>
          </div>
          <div className="ds-view-sidebar-search">
            <AInput
              allowClear
              placeholder="搜索数据表"
              prefix={<SearchOutlined style={{ color: '#a3b3c8', fontSize: 13 }} />}
              value={dataTableKeyword}
              onChange={(e) => setDataTableKeyword(e.target.value)}
              size="small"
            />
          </div>
          <div className={styles['table-data-container']} style={{ marginTop: '8px' }}>
            {filterTableList?.length === 0 && (
              <div className="ds-view-sidebar-empty">
                {dataTableKeyword ? '无匹配结果' : '暂无数据表'}
              </div>
            )}
            {filterTableList?.map((item: any) => (
              <div
                className={`ds-view-table-item ${item.tableName === selectedTable ? 'active' : ''}`}
                key={item.tableName}
                onClick={() => setSelectedTable(item.tableName)}
              >
                <TableOutlined className="ds-view-table-item-icon" />
                <span className="ds-view-table-item-name" title={item.tableName}>
                  {item.tableName}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right content area */}
        <div className="ds-view-content">
          {!selectedTable ? (
            <div className="ds-view-empty">
              <TableOutlined className="ds-view-empty-icon" />
              <p>请从左侧选择一个数据表查看详情</p>
            </div>
          ) : (
            <ATabs
              defaultActiveKey="1"
              items={items}
              className="ds-view-tabs"
            />
          )}
        </div>
      </div>
    </div>
  );
}
