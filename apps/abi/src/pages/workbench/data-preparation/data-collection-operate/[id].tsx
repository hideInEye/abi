import { Checkbox, Form, Input, Modal, Select, Splitter, message } from 'antd';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { DATA_COLLECTION_CONFIG_TYPE_OPTIONS } from '@/constants/data-preparation';
import { addDataSet, getCollectionDetail, getFieldsBySql, saveDataSet } from '@/service/api';
import { formatNodeData, genUniqueId, getTableArr, updateNodeDataByAllFields } from '@/utils/data-collection-operate';
import { useRoute, useRouter } from '~/packages/simple-router/src';

import { DataCollectionOperateContext } from './context';
import styles from './index.module.css';
import BottomSql, { type BottomSqlHandle } from './modules/BottomSql';
import DesignerRightPanel from './modules/DesignerRightPanel';
import SqlModeEditor from './modules/SqlModeEditor';
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
  const [leftPanelSize, setLeftPanelSize] = useState<number | string>(220);
  const [saveForm] = Form.useForm();
  const { dataSourceList, getDatasourceList, getTableListBySource, tableList } = useDatasource();
  const [datasource, setDatasource] = useState<string | undefined>(undefined);
  const [curDatasource, setCurDatasource] = useState<any>(undefined);
  const [dataTableKeyword, setDataTableKeyword] = useState('');
  const [connectMode, setConnectMode] = useState([1, 2]); // 一期没用到
  const [loading, setLoading] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>({});
  const bottomSqlRef = useRef<BottomSqlHandle>(null);
  const { back: routerBack, push } = useRouter();

  const route = useRoute();

  const filterDataSourceList = useMemo(() => {
    if (collectionData.viewType === 'sql') {
      return dataSourceList.filter((item: any) => item.sourceType !== 'Excel');
    }
    return dataSourceList;
  }, [collectionData.viewType, dataSourceList]);

  const curDatasourceType = useMemo(() => {
    const curDatasource = filterDataSourceList.find((item: any) => item.sourceId === datasource);
    return curDatasource?.sourceType;
  }, [filterDataSourceList, datasource]);

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
  const isFromGuide = route.query?.from === 'guide'
  const { id } = route.params;

  const selectedTableNames = useMemo(() => {
    return new Set(getTableArr(nodeData || {}));
  }, [nodeData]);

  const filterTableList = useMemo(() => {
    let resData = tableList;
    if (dataTableKeyword) {
      resData = resData.filter((item: any) => item.tableName.toLowerCase().includes(dataTableKeyword.toLowerCase()));
    }
    return resData;
  }, [tableList, dataTableKeyword]);

  /** 右侧面板的字段列表（SQL模式取预览结果，非SQL模式取 allFields） */
  const panelFields = useMemo(() => {
    if (collectionData.viewType === 'sql') {
      return previewData?.data?.fields || [];
    }
    return allFields || [];
  }, [collectionData.viewType, previewData, allFields]);

  const getDetail = async () => {
    const res = await getCollectionDetail({
      spaceId: Number(localStorage.getItem('spaceId')),
      viewId: id
    });
    dispatch(res.data);
    saveForm.setFieldsValue({ viewName: res.data?.viewName });
    const formatData = formatNodeData(res.data?.union?.[0]);
    setNodeData(formatData);
    setAllFields(res.data?.allFields || []);
    const sourceId = formatData.currentDs?.sourceId;
    setDatasource(sourceId);
    if (res.data?.viewType === 'sql') {
      try {
        const sqlObj = JSON.parse(formatData.currentDs?.tableInfo);
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
    setCurDatasource(curDatasource);
    if (curDatasource) {
      getTableListBySource({
        sourceId: datasource,
        sourceType: curDatasource?.sourceType,
        spaceId: Number(localStorage.getItem('spaceId'))
      });
    }
  }, [datasource, dataSourceList]);

  const handleCloseModal = () => {
    setVisible(false);
    setBack(false);
    saveForm.resetFields();
  };

  const saveNodeData: any = async () => {
    if (!nodeData) {
      message.error('请添加关联关系');
      return;
    }
    const resNodeData = updateNodeDataByAllFields(nodeData, allFields);
    const {  ...elseCollectionData } = collectionData;
    const viewName = saveForm.getFieldValue('viewName');
    const paramsData = { ...elseCollectionData, allFields, union: [resNodeData], viewName: viewName.trim() };
    paramsData.spaceId = Number(localStorage.getItem('spaceId'));
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
    let fields = res?.data || [];
    const rtableId = genUniqueId('1');
    fields = fields.map((item: any) => ({ ...item, rtableId }));
    const unionData = [
        {
          childrenDs: [],
          currentDs: {
            dataType: 'sql',
            remark: '自定义sql',
            rtableId,
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
    ];
    const paramsData = {
      ...collectionData,
      viewName: saveForm.getFieldValue('viewName'),
      allFields: fields,
      spaceId: Number(localStorage.getItem('spaceId')),
      unionSql: JSON.stringify(unionData),
      union: unionData
    };

    const saveRes = await saveDataSet(paramsData);
    return saveRes?.response?.data?.code;
  };

  const handleSave = async () => {
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
      setVisible(false);
      if (isFromGuide) {
        push('/guide');
      } else {
        push('/workbench/data-preparation/data-collection');
      }
      setBack(false);
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

  const handleClickBack = () => {
    if (typeof routerBack === 'function') {
      routerBack();
      return;
    }
    if (isFromGuide) {
      push('/guide');
      return;
    }
    push('/workbench/data-preparation/data-collection');
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
      const curDataSource = filterDataSourceList.find((item: any) => item.sourceId === val);
      setCurDatasource(curDataSource);
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <DataCollectionOperateContext.Provider
        value={{ allFields, curDatasourceType, datasource, nodeData, setAllFields, setNodeData }}
      >
        <ACard className={styles.container}>
          <div className="relative h-full flex">
            <Splitter
              style={{ flex: 1, minHeight: 0, height: '100%' }}
              onResize={(sizes) => {
                if (sizes && sizes[0]) {
                  setLeftPanelSize(sizes[0]);
                }
              }}
            >
                {/* 左边 - 使用 Splitter.Panel */}
                <Splitter.Panel
                  defaultSize="220"
                >
                  <div className="relative h-full pr-16px overflow-hidden" style={{
                    background: 'rgba(255, 255, 255, 0.4)',
                    backdropFilter: 'blur(8px)',
                    borderRight: '1px solid rgba(130, 140, 200, 0.1)'
                  }}>
                    <div className="w-full">
                      <div className="py-2" style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#3e5068',
                        letterSpacing: '0.02em'
                      }}>配置方式</div>
                      <Select
                        className="w-full"
                        options={filterConfigOptions}
                        placeholder="请选择"
                        value={collectionData.viewType}
                        onChange={val => dispatch({ viewType: val })}
                        style={{
                          borderRadius: '8px',
                          border: '1px solid rgba(130, 140, 200, 0.2)'
                        }}
                      />
                    </div>
                    <div className="w-full">
                      <div className="py-2" style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#3e5068',
                        letterSpacing: '0.02em'
                      }}>数据源</div>
                      <Select
                        allowClear
                        className="w-full"
                        fieldNames={{ label: 'sourceName', value: 'sourceId' }}
                        options={filterDataSourceList}
                        placeholder="请选择"
                        value={datasource}
                        onChange={handleChangeDatasource}
                        style={{
                          borderRadius: '8px',
                          border: '1px solid rgba(130, 140, 200, 0.2)'
                        }}
                      />
                    </div>
                    <div className="w-full">
                      <div className="py-2" style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#3e5068',
                        letterSpacing: '0.02em'
                      }}>数据表</div>
                      <Input
                        className="w-full"
                        placeholder="请输入内容"
                        value={dataTableKeyword}
                        onChange={e => setDataTableKeyword(e.target.value)}
                        style={{
                          borderRadius: '8px',
                          border: '1px solid rgba(130, 140, 200, 0.2)'
                        }}
                      />
                    </div>
                    <div className={styles['table-data-container']}>
                      {filterTableList?.map((item: any) => {
                        const disabled = selectedTableNames.has(item.tableName);
                        return (
                          <DragBox
                            key={item.tableName}
                            {...item}
                            disabled={disabled}
                          />
                        );
                      })}
                    </div>
                  </div>
                </Splitter.Panel>

                {/* 中间主编辑区 */}
                <Splitter.Panel>
                  <div className="h-full flex flex-col">
                    <div className="flex-1">
                      <Splitter
                        layout="vertical"
                        style={{ width: '100%', height: '100%' }}
                      >
                        <Splitter.Panel className="relative bg-#F9FAFF">
                          {collectionData.viewType === 'sql' ? (
                            <SqlModeEditor
                              sourceId={datasource}
                              sourceType={curDatasourceType}
                              dataSourceList={filterDataSourceList}
                              onDatasourceChange={handleChangeDatasource}
                              tableList={tableList}
                              value={sqlVal}
                              onChange={(val: string) => setSqlVal(val)}
                              runLoading={runLoading}
                              onRun={() => bottomSqlRef.current?.run()}
                              onSave={() => handleClickSave()}
                            />
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'flex-end',
                                  gap: 12,
                                  padding: '10px 16px',
                                  background: 'linear-gradient(180deg, rgba(246, 247, 255, 0.8), rgba(246, 247, 255, 0.6))',
                                  backdropFilter: 'blur(8px)',
                                  borderBottom: '1px solid rgba(130, 140, 200, 0.1)',
                                  flexShrink: 0,
                                }}
                              >
                                <AButton
                                  size="small"
                                  type="primary"
                                  style={{ 
                                    background: 'linear-gradient(135deg, #5b7cf7, #7091fa)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 12px rgba(91, 124, 247, 0.3)',
                                    fontWeight: 600,
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                  }}
                                  onClick={() => handleClickSave()}
                                >
                                  保存
                                </AButton>
                              </div>
                              <div style={{ flex: 1, minHeight: 0 }}>
                                <TreeNodeContainer />
                              </div>
                            </div>
                          )}
                        </Splitter.Panel>
                        <Splitter.Panel
                          defaultSize="300"
                          max="90%"
                          min="10%"
                        >
                          {collectionData.viewType === 'sql' ? (
                            <BottomSql
                              ref={bottomSqlRef}
                              setPreviewData={setPreviewData}
                              sourceId={datasource}
                              sql={sqlVal}
                              onLoadingChange={setRunLoading}
                            />
                          ) : (
                            <BottomTabs curDatasource={curDatasource}/>
                          )}
                        </Splitter.Panel>
                      </Splitter>
                    </div>
                  </div>
                </Splitter.Panel>

              </Splitter>

              {/* 右侧垂直导航栏 + 维度/指标配置面板 */}
              <DesignerRightPanel fields={panelFields} nodeData={nodeData} />
          </div>
        </ACard>

        <AModal
          confirmLoading={loading}
          open={visible}
          title={'保存并返回'}
          onOk={() => saveForm.submit()}
          onCancel={handleCloseModal}
          // onClose={handleCloseModal}
        >
          <AForm form={saveForm} onFinish={handleSave}>
            <AForm.Item
              label="名称"
              name="viewName"
              rules={[
                { message: '请输入名称', required: true },
                { max: 50, message: '名称最多50个字符' }
              ]}
            >
              <AInput
                placeholder="请输入名称"
              />
            </AForm.Item>
          </AForm>
        </AModal>
      </DataCollectionOperateContext.Provider>
    </DndProvider>
  );
}
