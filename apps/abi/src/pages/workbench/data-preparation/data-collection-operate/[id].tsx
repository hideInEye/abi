import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { sql } from '@codemirror/lang-sql';
import { Checkbox, Form, Input, Modal, Select, Splitter, message } from 'antd';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { DATA_COLLECTION_CONFIG_TYPE_OPTIONS } from '@/constants/data-preparation';
import { addDataSet, getCollectionDetail, getFieldsBySql, saveDataSet } from '@/service/api';
import { formatNodeData, genUniqueId, getTableArr, updateNodeDataByAllFields } from '@/utils/data-collection-operate';
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
  const [leftPanelSize, setLeftPanelSize] = useState<number | string>(220);
  const [saveForm] = Form.useForm();
  const { dataSourceList, getDatasourceList, getTableListBySource, tableList } = useDatasource();
  const [datasource, setDatasource] = useState<string | undefined>(undefined);
  const [curDatasource, setCurDatasource] = useState<any>(undefined);
  const [dataTableKeyword, setDataTableKeyword] = useState('');
  const [connectMode, setConnectMode] = useState([1, 2]); // 一期没用到
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>({});
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

  const handleToggleUnfold = () => {
    setUnfold(!unfold);
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
    const paramsData = {
      ...collectionData,
      viewName: saveForm.getFieldValue('viewName'),
      allFields: fields,
      spaceId: Number(localStorage.getItem('spaceId')),
      union: [
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
      ]
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
      if (back) {
        if (isFromGuide) {
          push('/guide');
        } else {
          push('/workbench/data-preparation/data-collection');
        }
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
            {unfold ? null : (
              <span
                className={`${styles.unfold} left-[-24px] !right-auto`}
                onClick={handleToggleUnfold}
              >
                <RightOutlined />
              </span>
            )}

              <Splitter
                style={{ width: '100%', height: '100%' }}
                onResize={(sizes) => {
                  if (sizes && sizes[0]) {
                    setLeftPanelSize(sizes[0]);
                  }
                }}
              >
                {/* 左边 - 使用 Splitter.Panel */}
                <Splitter.Panel
                  collapsible
                  defaultSize="220"
                >
                  <div className="relative h-full pr-16px overflow-hidden">
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
                    {/* 收缩按钮 */}
                    {/* <span
                      className={`${styles.unfold}`}
                      onClick={handleToggleUnfold}
                    >
                      <LeftOutlined />
                    </span> */}
                  </div>
                </Splitter.Panel>

                {/* 中间主编辑区 */}
                <Splitter.Panel>
                  <div className="h-full flex flex-col">
                    <div className={styles.editorHeader}>
                      <div className="flex items-center min-w-0">
                        <span
                          className="mr-8px inline-flex h-28px w-28px cursor-pointer items-center justify-center rounded hover:bg-#f5f6f7"
                          onClick={handleClickBack}
                        >
                          <LeftOutlined />
                        </span>
                        <div
                          style={{
                              fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                          }}
                          title={collectionData.viewName}
                        >
                          {collectionData.viewName}
                        </div>
                      </div>
                      <div className="flex items-center">
                        <AButton
                          type="primary"
                          onClick={() => handleClickSave(true)}
                        >
                          保存
                        </AButton>
                      </div>
                    </div>
                    <div className="flex-1">
                      <Splitter
                        layout="vertical"
                        style={{ width: '100%', height: '100%' }}
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
                            <BottomTabs curDatasource={curDatasource}/>
                          )}
                        </Splitter.Panel>
                      </Splitter>
                    </div>
                  </div>
                </Splitter.Panel>

                {/* 右侧属性配置面板 */}
                {/* <Splitter.Panel
                  collapsible
                  defaultSize="280"
                  max="400"
                  min="200"
                >
                  <div className="h-full border-l border-#e5e7eb bg-#fff px-16px py-12px">
                    <div className="mb-16px text-16px font-500">模式配置</div>
                    <div className="mb-16px">
                      <div className="mb-8px text-14px">关联模式</div>
                      <Select
                        className="w-full"
                        mode="multiple"
                        placeholder="请选择"
                        value={connectMode}
                        options={[
                          { label: '视图关联', value: 1 },
                          { label: '关联关系', value: 2 },
                          { label: '快速创建', value: 3 }
                        ]}
                        dropdownRender={(menu) => (
                          <div>
                            <div className="p-8px">
                              <Checkbox.Group
                                className="w-full"
                                value={connectMode}
                                onChange={(checkedValues) => setConnectMode(checkedValues as number[])}
                              >
                                <div className="grid grid-cols-2 gap-12px">
                                  <Checkbox value={1}>视图关联</Checkbox>
                                  <Checkbox value={2}>关联关系</Checkbox>
                                  <Checkbox value={3}>快速创建</Checkbox>
                                </div>
                              </Checkbox.Group>
                            </div>
                            <div className="border-t border-#e5e7eb p-8px flex justify-between items-center">
                              <span className="text-12px text-#666">
                                选中 {connectMode.length}/3
                              </span>
                              <div>
                                <AButton
                                  size="small"
                                  className="mr-8px"
                                  onClick={() => setConnectMode([])}
                                >
                                  仅看选中
                                </AButton>
                                <AButton
                                  type="primary"
                                  size="small"
                                  onClick={() => {
                                    // 关闭下拉框的逻辑由Select自动处理
                                  }}
                                >
                                  高级筛选
                                </AButton>
                              </div>
                            </div>
                          </div>
                        )}
                        onChange={val => setConnectMode(val)}
                      />
                    </div>
                  </div>
                </Splitter.Panel> */}
              </Splitter>
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
