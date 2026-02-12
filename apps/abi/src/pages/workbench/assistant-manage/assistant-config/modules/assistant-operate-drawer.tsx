import { CloseOutlined } from '@ant-design/icons';
import { Steps, message } from 'antd'; // 新增配置列表

import { getAgentDetailById, postAgentConfig, putAgentConfig } from '@/service/api/assistant-manage';
import { fetchModelList } from '@/service/api/system-manage';

import BasicInformation from './operate/basic-information';
import ConfigurationTableSemantics from './operate/configuration-table-semantics';
import SelectModel from './operate/select-model';
import { useSchemaFields } from './operate/useSchemaFields';
// import { fetchAssistantConfigList, getAgentConfig } from '@/service/api/assistant-manage';

enum LoopType {
  'primaryKeys',
  'dates',
  'dimensions',
  'metrics',
  'identifiers'
}

const initState = {
  bizName: undefined,
  groupId: undefined, // 组id
  llms: [],
  remark: undefined,
  tableSemantics: [],
  // 表语义选中项 { techId: 'xx', paramType: 'primarykeys' }
  techName: undefined
  // modelConfig: {
  //   modelConfigs: [
  //     {
  //       llms: [1,2,3], // 模型
  //   以下四个都是配置表语义中的
  //       primarykeys: [1,2,3], // 主键外键标识，对应
  //       dates: [], // 日期格式
  //       dimensions: [], // 维度
  //       metrics: [], // 度量
  //     }
  //   ]
  // }
};

const reducer = (state: typeof initState, field: any) => {
  return {
    ...state,
    ...field
  };
};

// 验证模型选择的公共函数
async function validateModelSelection(selectedLlmIds: string[]) {
  if (!selectedLlmIds?.length) {
    message.error('请选择模型');
    return false;
  }

  try {
    const modelRes = await fetchModelList({ pageNum: 1, pageSize: 1000 });
    const allModels = modelRes.data?.data?.filter((item: any) => item?.status === '1') || [];
    
    const selectedModels = allModels.filter((item: any) => 
      selectedLlmIds.includes(`${item.llmId}`)
    );
    
    const llmModels = selectedModels.filter((item: any) => item.modelType === 'llm');
    const embeddingModels = selectedModels.filter((item: any) => item.modelType === 'embedding');
    
    // 验证1：LLM和Embedding两者缺一不可
    if (llmModels.length === 0) {
      message.error('未选择大模型');
      return false;
    }
    
    if (embeddingModels.length === 0) {
      message.error('未选择嵌入模型');
      return false;
    }
    
    // 验证2：每种类型只能选择一个
    if (llmModels.length > 1) {
      message.error('仅支持1个大模型选中');
      return false;
    }
    
    if (embeddingModels.length > 1) {
      message.error('仅支持1个嵌入模型选中');
      return false;
    }

    return true;
  } catch (error) {
    console.error('验证模型选择失败:', error);
    message.error('验证模型选择失败，请重试');
    return false;
  }
}

function formatData(data: any, fieldsDataSource: any) {
  const { modelConfig, ...elseData } = data;
  let modelConfigObj: any = {};
  try {
    if (modelConfig) {
      modelConfigObj = JSON.parse(modelConfig)?.modelConfigs?.[0];
    }
  } catch (error) {
    console.log(error);
  }
  //     primarykeys: [1,2,3], // 主键外键标识，对应
  //     dates: [], // 日期格式
  //     dimensions: [], // 维度
  //     metrics: [], // 度量
  // const { dates = [], dimensions = [], llms = [], metrics = [], primarykeys = [] } = modelConfigObj;
  const { llms = [] } = modelConfigObj;
  const _tableSemantics: any = []; // [...(primarykeys.map), ...dates, ...dimensions, ...metrics];
  for (const key in modelConfigObj) {
    if (key in LoopType) {
      modelConfigObj[key].forEach((techId: string) => {
        _tableSemantics.push({ paramType: key, techId });
      });
    }
  }
  const tableSemantics = fieldsDataSource.filter((item: any) => {
    return _tableSemantics.find((tItem: any) => tItem.techId === item.techId);
  });
  return { ...elseData, llms, modelConfig, tableSemantics };
}
interface Props {
  agentId?: number;
  onClose: (refresh?: boolean) => void;
  syncKnowledgeBase: (info: any) => void;
}
const DatasourceOperateDrawer: FC<Props> = memo(({ agentId, onClose, syncKnowledgeBase }) => {
  const [state, dispatch] = useReducer(reducer, initState);
  const [originDetail, setOriginDetail] = useState<any>();
  const [submitLoading, setSubmitLoading] = useState(false);
  const { fieldsDataSource, sourceId: schemaSourceId } = useSchemaFields({
    groupId: state?.groupId,
    schemaId: state?.schemaId
  });

  const getDetail = async () => {
    if (agentId) {
      const res = await getAgentDetailById(agentId);
      if (res?.data) {
        setOriginDetail(res.data);
      }
    }
  };

  useEffect(() => {
    getDetail();
  }, [agentId]);

  useEffect(() => {
    if (originDetail && fieldsDataSource) {
      const resData: any = formatData(originDetail, fieldsDataSource);
      dispatch(resData);
    }
  }, [originDetail, fieldsDataSource]);

  const validateAsync = () => {
    if(!agentId)return
    try  {
      const { groupId="",schemaId="",tableSemantics} = state
      const { modelConfig ="", groupId:orgGroupId="",schemaId:orgSchemaId } = originDetail
      const {modelConfigs = [] } = JSON.parse(modelConfig)
      const {dimensions=[]} = modelConfigs[0]
      const tableSemanticsSet = new Set(tableSemantics.map(item=>item.techId))
      let flag = false;
      dimensions.map((item:string)=>{
        if(!tableSemanticsSet.has(item)){
          flag = true
        }
      })
      if(schemaId!=orgSchemaId || groupId!=orgGroupId || flag) {
        return true
      }
    }catch (error){
      console.error(error,'error');
    }
  }

  async function handleSubmit() {
    if (!state.tableSemantics?.length) {
      message.error('配置未完成，无法保存！');
      return;
    }
    setSubmitLoading(true)
    // 验证模型选择
    const isValid = await validateModelSelection(state.llms);
    if (!isValid) {
      setSubmitLoading(false)
      return;
    }
    const { llms, modelConfig, tableSemantics, ...elseState } = state;
    const elseModelConfigObj: any = {
      dates: [],
      dimensions: [],
      metrics: [],
      primaryKeys: []
    };
    tableSemantics.forEach((item: any) => {
      elseModelConfigObj[item.paramType].push(item.techId);
    });
    const modelConfigObj = {
      llms,
      ...elseModelConfigObj,
      ...(schemaSourceId ? { sources: schemaSourceId } : {})
    };

    // 合并原有配置，避免覆盖“助手设置”中已保存的内容（标签、术语、推荐问题、插件、记忆等）
    let originModelConfigObj: any = {};
    try {
      const origin = originDetail?.modelConfig || modelConfig;
      if (origin) {
        const parsed = JSON.parse(origin);
        originModelConfigObj = parsed?.modelConfigs?.[0] || {};
      }
    } catch (e) {
      console.error('解析原始模型配置失败:', e);
    }

    const params = {
      ...elseState,
      modelConfig: JSON.stringify({
        // 保留原有字段，同时用最新的语义与模型选择覆盖对应字段
        modelConfigs: [{
          ...originModelConfigObj,
          ...modelConfigObj
        }]
      }),
      spaceId: Number(localStorage.getItem('spaceId')),
      status: 1 // 写死
    };
    // 修改是否同步向量数据库逻辑
    const isAsync = validateAsync() || !agentId
    let res;
    if (agentId) {
      res = await putAgentConfig(params);
    } else {
      res = await postAgentConfig(params);
    }
    if (res.response.data.code === 200) {
   
        if(isAsync){
          AModal.confirm({
            cancelText: '取消',
            // icon: <ExclamationCircleOutlined />,
            content: '检测到知识库数据有更新，是否需要同步到本地？',
            okText: '确认',
            onCancel: () => {
              onClose(true);
            },
            onOk: async () => {
              const detailRes = await getAgentDetailById(agentId || res.data);
              await syncKnowledgeBase(detailRes.data);
              onClose(true);
            },
            title: '同步知识库'
          });
        }else {
          message.success('操作成功');
          onClose(true);
        }
      }
    setSubmitLoading(false)
  }
  const steps = [
    {
      content: (
        <BasicInformation
          dispatch={dispatch}
          state={state}
        />
      ),
      title: '基本信息'
    },
    {
      content: (
        <SelectModel
          dispatch={dispatch}
          state={state}
        />
      ),
      title: '选择模型'
    },
    {
      content: (
        <ConfigurationTableSemantics
          dispatch={dispatch}
          state={state}
        />
      ),
      title: '配置表语义'
    }
  ];

  // const { token } = theme.useToken();
  const [current, setCurrent] = useState(0);

  const next = async () => {
    if (current === 0) {
      if (!state.bizName || !state.techName) {
        message.error('请将信息补充完整');
        return;
      }
      if (`${state.bizName}`.length > 20) {
        message.error('名称不能超过20个字符');
        return;
      }
      if (`${state.techName}`.length > 50) {
        message.error('英文名称不能超过50个字符');
        return;
      }
    }
    if (current === 1) {
      // 验证模型选择
      const isValid = await validateModelSelection(state.llms);
      if (!isValid) {
        return;
      }
    }
    setCurrent(current + 1);
  };

  const prev = () => {
    setCurrent(current - 1);
  };

  const items = steps.map(item => ({ key: item.title, title: item.title }));

  // const contentStyle: React.CSSProperties = {
  //   lineHeight: '260px',
  //   marginTop: 16,
  //   textAlign: 'center'
  // };
  return (
    <ADrawer
      closeIcon={null}
      open={true}
      size="large"
      title={agentId ? '编辑助手' : '新建助手'}
      extra={
        <AButton
          icon={<CloseOutlined />}
          type="text"
          onClick={() => onClose()}
        />
      }
      footer={
        <ASpace className="flex justify-end">
          {current > 0 && (
            <AButton
              style={{ margin: '0 8px' }}
              onClick={() => prev()}
            >
              上一步
            </AButton>
          )}
          {current < steps.length - 1 && (
            <AButton
              type="primary"
              onClick={() => next()}
            >
              下一步
            </AButton>
          )}
          {current === steps.length - 1 && (
            <AButton
              type="primary"
              onClick={handleSubmit}
              disabled={submitLoading}
            >
              完成
            </AButton>
          )}
        </ASpace>
      }
      onClose={() => onClose()}
    >
      <div className="mb-4 px-[150px]">
        <Steps
          current={current}
          items={items}
        />
      </div>
      <div>{steps[current].content}</div>
    </ADrawer>
  );
});

export default DatasourceOperateDrawer;
