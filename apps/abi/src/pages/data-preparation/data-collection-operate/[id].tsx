import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { sql } from '@codemirror/lang-sql';
import { Input, Modal, Select, Splitter, message } from 'antd';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { DATA_COLLECTION_CONFIG_TYPE_OPTIONS } from '@/constants/data-preparation';
import { addDataSet, getCollectionDetail, getFieldsBySql, saveDataSet } from '@/service/api';
import { genUniqueId, updateNodeDataByAllFields } from '@/utils/data-collection-operate';
import { useRoute, useRouter } from '~/packages/simple-router/src';

import { DataCollectionOperateContext } from './context';
import styles from './index.module.css';
import BottomSql from './modules/BottomSql';
import BottomTabs from './modules/BottomTabs';
import { DragBox } from './modules/DragBox';
import { TreeNodeContainer } from './modules/TreeNodeContainer';

/**
 * 数据集操作页面组件（创建/编辑） 提供可视化的数据集创建和编辑功能 支持两种配置模式：
 *
 * 1. 图形化拖拽模式 - 通过拖拽表格创建数据关联
 * 2. SQL 模式 - 直接编写 SQL 查询语句 包含数据源选择、表格拖拽、字段配置、数据预览等功能 使用 React DnD 实现拖拽功能，支持复杂的数据关联配置
 */

const initialState = {
  // allFields: [], // 所有展示的字段
  nodeType: 'dataset', // 写死，页面暂无元素
  spaceId: Number(localStorage.getItem('spaceId')),
  // union: [], // 数据集的关联关系树，非空。注rtableId 和 tfieldId由前端生成
  viewId: '', // 修改时才有
  viewMode: 0, // 存储模式：只有实时查询，也就是0
  viewName: '', // 保存时需要一个名称
  viewType: 'union' // "union" | "sql",
};

const collectionDataReducer = (state: any, data: any) => {
  return { ...state, ...data };
};

export function Component() {
  const [visible, setVisible] = useState(false);
  const [back, setBack] = useState(false);
  const [collectionData, dispatch] = useReducer(collectionDataReducer, initialState);
  const [nodeData, setNodeData] = useState<any>({}); // 单独拎出来的节点图数据
  const [allFields, setAllFields] = useState<any[]>([]); // 单独拎出来的字段列表数据
  const [sqlVal, setSqlVal] = useState(''); // 单独拎出来的sql
  const [unfold, setUnfold] = useState(true);
  const [rightUnfold, setRightUnfold] = useState(true);
  const { dataSourceList, getDatasourceList, getTableListBySource, tableList } = useDatasource();
  const [datasource, setDatasource] = useState<string | undefined>(undefined);
  const [dataTableKeyword, setDataTableKeyword] = useState('');
  const [connectMode, setConnectMode] = useState([1, 2]); // 一期没用到
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>({});
  const { push } = useRouter();

  const route = useRoute();

  const filterDataSourceList = useMemo(() => {
    if (collectionData.viewType === 'sql') {
      return dataSourceList.filter((item: any) => item.sourceType !== 'Excel');
    }
    return dataSourceList;
  }, [collectionData.viewType, dataSourceList]);

  const filterConfigOptions = useMemo(() => {
    if (datasource !== undefined) {
      const cur = dataSourceList.find((item: any) => item.sourceId === datasource);
      if (cur?.sourceType === 'Excel') {
        return DATA_COLLECTION_CONFIG_TYPE_OPTIONS.filter(item => item.value !== 'sql');
      }
      return DATA_COLLECTION_CONFIG_TYPE_OPTIONS;
    }
    return DATA_COLLECTION_CONFIG_TYPE_OPTIONS;
  }, [datasource, dataSourceList]);

  const isFromDatasource = route.query?.from === 'data-source';
  const { id } = route.params;

  const filterTableList = useMemo(() => {
    return dataTableKeyword
      ? tableList.filter((item: any) => item.tableName.toLowerCase().includes(dataTableKeyword.toLowerCase()))
      : tableList;
  }, [tableList, dataTableKeyword]);

  const getDetail = async () => {
    const res = await getCollectionDetail({
      spaceId: Number(localStorage.getItem('spaceId')),
      viewId: id
    });
    dispatch(res.data);
    setNodeData(res.data?.union?.[0]);
    setAllFields(res.data?.allFields || []);
    const sourceId = res.data?.union?.[0].currentDs?.sourceId;
    setDatasource(sourceId);
    if (res.data?.viewType === 'sql') {
      try {
        const sqlObj = JSON.parse(res.data?.union?.[0].currentDs?.tableInfo);
        setSqlVal(sqlObj?.sql || '');
      } catch (error) {
        console.log(error);
      }
    }
  };

  useEffect(() => {
    if (isFromDatasource) {
      if (id) {
        setDatasource(id);
      }
    } else if (Number(id)) {
      getDetail();
    }
  }, [id, isFromDatasource]);

  useEffect(() => {
    getDatasourceList({ spaceId: Number(localStorage.getItem('spaceId')) });
  }, []);

  useEffect(() => {
    if (!datasource) return;
    const curDatasource = dataSourceList.find((item: any) => item.sourceId === datasource);
    if (curDatasource) {
      getTableListBySource({
        sourceId: datasource,
        sourceType: curDatasource?.sourceType,
        spaceId: Number(localStorage.getItem('spaceId'))
      });
    }
  }, [datasource, dataSourceList]);

  const handleToggleUnfold = () => {
    setUnfold(!unfold);
  };

  const handleToggleRightUnfold = () => {
    setRightUnfold(!rightUnfold);
  };

  const saveNodeData: any = async () => {
    if (!nodeData) {
      message.error('请添加关联关系');
      return;
    }
    const resNodeData = updateNodeDataByAllFields(nodeData, allFields);
    const { viewName, ...elseCollectionData } = collectionData;
    const paramsData = { ...elseCollectionData, allFields, union: [resNodeData], viewName: viewName.trim() };
    let res = null;
    if (Number(id)) {
      res = await saveDataSet(paramsData);
    } else {
      res = await addDataSet(paramsData);
    }
    return res?.response?.data?.code;
  };

  const saveSql: any = async () => {
    const tableInfoObj = {
      sql: sqlVal,
      table: '自定义SQL'
    };
    const tableInfo = JSON.stringify(tableInfoObj);
    const params = {
      dataType: 'sql',
      sourceId: datasource,
      tableInfo,
      tableName: '自定义sql'
    };

    const res = await getFieldsBySql(params);
    const fields = res?.data || [];

    const paramsData = {
      ...collectionData,
      allFields: fields,
      union: [
        {
          childrenDs: [],
          currentDs: {
            dataType: 'sql',
            remark: '自定义sql',
            rtableId: genUniqueId('1'),
            sourceId: datasource,
            tableInfo,
            tableName: '自定义sql'
          },
          currentDsFields: fields,
          unionToParent: {
            unionFields: [],
            unionType: 'left'
          }
        }
      ]
    };

    const saveRes = await saveDataSet(paramsData);
    return saveRes?.response?.data?.code;
  };

  const handleSave = async () => {
    const trimName = collectionData.viewName.trim();
    if (!trimName) {
      message.error('请输入名称');
      return;
    }
    setLoading(true);
    try {
      let resCode = 0;
      if (collectionData.viewType === 'sql') {
        resCode = await saveSql();
      } else {
        resCode = await saveNodeData();
      }
      if (resCode !== 200) return;

      message.success('保存成功');
      if (back) {
        push('/data-preparation/data-collection');
      } else {
        setVisible(false);
        setBack(false);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleClickSave = (isBack?: boolean) => {
    if (collectionData.viewType === 'sql') {
      if (!previewData?.data) {
        message.error('请先运行sql');
        return;
      }
    } else if (!allFields?.length) {
      message.error('未添加数据，无法保存');
      return;
    }

    setVisible(true);
    if (isBack) {
      setBack(true);
    }
  };

  const handleChangeDatasource = (val: string) => {
    if (allFields?.length) {
      Modal.confirm({
        content: '切换数据源后，节点关系图将重置，确定要切换数据源吗？',
        onOk: () => {
          setDatasource(val);
          setAllFields([]);
          setNodeData({});
        },
        title: '再次确认'
      });
    } else {
      setDatasource(val);
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <DataCollectionOperateContext.Provider value={{ allFields, datasource, nodeData, setAllFields, setNodeData }}>
        <ACard className={styles.container}>
          <div className="relative h-full flex">
            {/* 左边 */}
            <div
              className={`relative h-full border-r border-r-#ccc pr-16px ${unfold ? 'block' : 'hidden'}`}
              style={{ width: '220px' }}
            >
              <div className="w-full">
                <div className="py-2">配置方式</div>
                <Select
                  className="w-full"
                  options={filterConfigOptions}
                  placeholder="请选择"
                  value={collectionData.viewType}
                  onChange={val => dispatch({ viewType: val })}
                />
              </div>
              <div className="w-full">
                <div className="py-2">数据源</div>
                <Select
                  allowClear
                  className="w-full"
                  fieldNames={{ label: 'sourceName', value: 'sourceId' }}
                  options={filterDataSourceList}
                  placeholder="请选择"
                  value={datasource}
                  onChange={handleChangeDatasource}
                />
              </div>
              <div className="w-full">
                <div className="py-2">数据表</div>
                <Input
                  className="w-full"
                  placeholder="请输入内容"
                  value={dataTableKeyword}
                  onChange={e => setDataTableKeyword(e.target.value)}
                />
              </div>
              <div className={styles['table-data-container']}>
                {filterTableList?.map((item: any) => (
                  <DragBox
                    key={item.tableName}
                    {...item}
                  />
                ))}
              </div>
              {/* 收缩按钮 */}
              <span
                className={`${styles.unfold}`}
                onClick={handleToggleUnfold}
              >
                <LeftOutlined />
              </span>
            </div>
            {unfold ? null : (
              <span
                className={`${styles.unfold} left-[-24px] !right-auto`}
                onClick={handleToggleUnfold}
              >
                <RightOutlined />
              </span>
            )}

            {/* 右边 */}
            <div style={{ width: `calc(100% - ${unfold ? 220 : 0}px)` }}>
              <div className="border-b bg-#fff p-2 text-right">
                <AButton
                  className="mr-2"
                  size="small"
                  type="primary"
                  onClick={() => handleClickSave(true)}
                >
                  保存并返回
                </AButton>
                {/* <AButton
                  size="small"
                  type="primary"
                  onClick={() => handleClickSave()}
                >
                  保存
                </AButton> */}
              </div>
              <div
                className="relative h-full flex"
                style={{ height: 'calc(100% - 45px)' }}
              >
                <Splitter
                  layout="vertical"
                  style={{ width: rightUnfold ? 'calc(100% - 220px)' : '100%' }}
                >
                  <Splitter.Panel className="relative bg-#f5f6f7">
                    {collectionData.viewType === 'sql' ? (
                      <ACodemirror
                        extensions={[sql()]}
                        height="200px"
                        value={sqlVal}
                        onChange={(val: string) => setSqlVal(val)}
                      />
                    ) : (
                      <TreeNodeContainer />
                    )}
                  </Splitter.Panel>
                  <Splitter.Panel
                    defaultSize="300"
                    max="90%"
                    min="10%"
                  >
                    {collectionData.viewType === 'sql' ? (
                      <BottomSql
                        previewData={previewData}
                        setPreviewData={setPreviewData}
                        sourceId={datasource}
                        sql={sqlVal}
                      />
                    ) : (
                      <BottomTabs />
                    )}
                  </Splitter.Panel>
                </Splitter>
                {rightUnfold ? null : (
                  <span
                    className={`${styles.unfold} !right-[-24px]`}
                    onClick={handleToggleRightUnfold}
                  >
                    <LeftOutlined />
                  </span>
                )}
                <div
                  className={`relative h-full w-230px border-l border-#ccc py-12px pl-16px ${rightUnfold ? 'block' : 'hidden'}`}
                >
                  {/* 收缩按钮 */}
                  <span
                    className={`${styles.rightUnfold}`}
                    onClick={handleToggleRightUnfold}
                  >
                    <RightOutlined />
                  </span>
                  <div className="text-16px">模式配置</div>
                  <div>
                    <div className="py-2">关联模式</div>
                    <Select
                      className="w-full"
                      mode="multiple"
                      placeholder="请选择"
                      value={connectMode}
                      options={[
                        { label: '视图关联', value: 1 },
                        { label: '关联关系', value: 2 }
                      ]}
                      onChange={val => setConnectMode(val)}
                    />
                  </div>
                  {/* <div>
                    <div className="py-2">存储模式</div>
                    <Radio.Group
                      disabled
                      className="w-full"
                      value={collectionData.viewMode}
                      onChange={e => dispatch({ viewMode: e.target.value })}
                    >
                      <Radio
                        className="whitespace-nowrap"
                        value={0}
                      >
                        实时查询
                      </Radio>
                      <Radio
                        className="whitespace-nowrap"
                        value={1}
                      >
                        定期本地
                      </Radio>
                    </Radio.Group>
                  </div> */}
                </div>
              </div>
            </div>
          </div>
        </ACard>

        <AModal
          confirmLoading={loading}
          open={visible}
          title={back ? '保存并返回' : '保存'}
          onOk={() => handleSave()}
          onCancel={() => {
            setVisible(false);
            setBack(false);
          }}
          onClose={() => {
            setVisible(false);
            setBack(false);
          }}
        >
          <AInput
            maxLength={50}
            placeholder="请输入名称"
            value={collectionData.viewName}
            onChange={e => dispatch({ viewName: e.target.value })}
          />
        </AModal>
      </DataCollectionOperateContext.Provider>
    </DndProvider>
  );
}
