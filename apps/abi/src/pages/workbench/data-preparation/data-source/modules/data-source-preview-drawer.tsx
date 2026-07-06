import { CloseOutlined, DatabaseOutlined, EyeOutlined, SearchOutlined, TableOutlined } from '@ant-design/icons'
import type { TabsProps } from 'antd'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'

import styles from '../../data-source-view/index.module.css'
import { BaseData } from '../../data-source-view/modules/base-data'
import { ViewData } from '../../data-source-view/modules/view-data'

interface Props {
  onClose: () => void
  open: boolean
  sourceId?: string
}

const DataSourcePreviewDrawer: React.FC<Props> = memo(({ onClose, open, sourceId }) => {
  const [dataSource, setDataSource] = useState<string | undefined>(undefined)
  const [dataTableKeyword, setDataTableKeyword] = useState('')
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [tabKey, setTabKey] = useState('1')
  const { dataSourceList, getDatasourceList, getTableListBySource, tableList = [] } = useDatasource()

  const curDatasource = useMemo(() => dataSourceList.find((item: any) => item.sourceId === dataSource), [dataSourceList, dataSource])

  const items: TabsProps['items'] = [
    {
      children: <BaseData curDatasource={curDatasource} sourceId={dataSource} tableName={selectedTable!} />,
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
      children: <ViewData sourceId={dataSource} tableName={selectedTable!} />,
      forceRender: true,
      key: '2',
      label: (
        <span className="ds-view-tab-label">
          <TableOutlined />
          预览数据
        </span>
      ),
    },
  ]

  const filterTableList = useMemo(
    () => (dataTableKeyword ? tableList.filter((item: any) => item.tableName.toLowerCase().includes(dataTableKeyword.toLowerCase())) : tableList),
    [tableList, dataTableKeyword],
  )

  // Init on open
  useEffect(() => {
    if (open) {
      getDatasourceList({ spaceId: Number(localStorage.getItem('spaceId')) })
      setDataTableKeyword('')
      setSelectedTable(null)
      setTabKey('1')
    }
  }, [open])

  // Set datasource from sourceId prop
  useEffect(() => {
    if (open && sourceId) {
      setDataSource(sourceId)
    }
  }, [open, sourceId])

  // Load table list when datasource changes
  useEffect(() => {
    if (dataSource && curDatasource) {
      getTableListBySource({
        sourceId: dataSource,
        sourceType: curDatasource?.sourceType,
        spaceId: Number(localStorage.getItem('spaceId')),
      })
      setSelectedTable(null)
    }
  }, [dataSource, curDatasource])

  const handleSourceChange = (val: string) => {
    setDataSource(val)
    setSelectedTable(null)
    setTabKey('1')
  }

  return (
    <CommonDrawer
      className="ds-preview-drawer"
      destroyOnClose={false}
      open={open}
      styles={{
        body: { padding: 0, display: 'flex', flexDirection: 'column' },
      }}
      description={curDatasource?.sourceName}
      icon={<EyeOutlined />}
      title="数据源预览"
      width={1200}
      onClose={onClose}
    >
      {/* Source switcher */}
      <div className="ds-view-drawer-toolbar">
        <div className="ds-view-drawer-toolbar-left">
          <span className="ds-view-drawer-toolbar-label">数据源</span>
          <ASelect
            className="ds-view-source-select"
            fieldNames={{ label: 'sourceName', value: 'sourceId' }}
            options={dataSourceList}
            placeholder="选择数据源"
            value={dataSource}
            onChange={handleSourceChange}
            size="small"
          />
        </div>
      </div>

      {/* Body: sidebar + content */}
      <div className="ds-view-body">
        {/* Left sidebar */}
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
            {filterTableList?.length === 0 && <div className="ds-view-sidebar-empty">{dataTableKeyword ? '无匹配结果' : '暂无数据表'}</div>}
            {filterTableList?.map((item: any) => (
              <div
                className={`ds-view-table-item ${item.tableName === selectedTable ? 'active' : ''}`}
                key={item.tableName}
                onClick={() => {
                  setSelectedTable(item.tableName)
                  setTabKey('1')
                }}
              >
                <TableOutlined className="ds-view-table-item-icon" />
                <span className="ds-view-table-item-name" title={item.tableName}>
                  {item.tableName}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right content */}
        <div className="ds-view-content">
          {!selectedTable ? (
            <div className="ds-view-empty">
              <TableOutlined className="ds-view-empty-icon" />
              <p>请从左侧选择一个数据表查看详情</p>
            </div>
          ) : (
            <ATabs activeKey={tabKey} items={items} className="ds-view-tabs" onChange={(key) => setTabKey(key)} />
          )}
        </div>
      </div>
    </CommonDrawer>
  )
})

export default DataSourcePreviewDrawer
