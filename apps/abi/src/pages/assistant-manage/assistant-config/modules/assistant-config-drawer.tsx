import {
  AuditOutlined,
  BarcodeOutlined,
  BookOutlined,
  CloseOutlined,
  EditOutlined,
  PlayCircleOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import { Drawer, Space, Tabs, message } from 'antd';

import { getAgentDetailById, putAgentConfig, syncKnowledgeBase } from '@/service/api/assistant-manage';
import { useRouter } from '~/packages/simple-router/src';

import Dictionaries from './config/dictionaries';
import IndustryTerminology from './config/industry-terminology';
import LabelSemantics from './config/label-semantics';
import MemoryManagement from './config/memory-management';
import RecommendedQuestions from './config/recommended-questions';
import ThreePartyPlugin from './config/three-party-plugin';

interface Props {
  agentId?: number;
  onClose: (ok?: boolean) => void;
}

const initState = {
  dictgroups: [],
  example: [],
  labels: [],
  llms: [],
  memory: [],
  plugin: [],
  term: []
  // modelConfigs: [
  //   {
  //     labels: [1,2,3], // 标签语义 TODO
  //     dictgroups: [], // 数据字典
  //     term: [1,2,3], // 行业术语
  //     example: [1,2,3], // 推荐问题
  //     plugin: [1,2,3], // 第三方插件
  //     memory: [1,2,3], // 记忆管理 TODO
  //     llms: [], // 模型列表（只有一个）
  //   }
  // ]
};

const reducer = (state: typeof initState, field: any) => {
  return {
    ...state,
    ...field
  };
};

function formatData(data: any) {
  const { modelConfig, ...elseData } = data;
  let modelConfigObj: any = {};
  try {
    if (modelConfig) {
      modelConfigObj = JSON.parse(modelConfig)?.modelConfigs?.[0];
    }
  } catch (error) {
    console.log(error);
  }
  //     labels: [1,2,3], // 标签语义 TODO
  //     dictgroups: [], // 数据字典
  //     term: [1,2,3], // 行业术语
  //     example: [1,2,3], // 推荐问题
  //     plugin: [1,2,3], // 第三方插件
  //     llms: [1], // 模型列表（只有一个）
  //     memory: [1,2,3], // 记忆管理 TODO
  // const { dates = [], dimensions = [], llms = [], metrics = [], primarykeys = [] } = modelConfigObj;
  const {
    dictgroups = [],
    dictionariesGroupId,
    example = [],
    exampleGroupId,
    labels = [],
    labelsGroupId,
    llms = [],
    memory = [],
    plugin = [],
    term = [],
    termGroupId
  } = modelConfigObj;

  return {
    ...elseData,
    dictgroups,
    dictionariesGroupId,
    example,
    exampleGroupId,
    labels,
    labelsGroupId,
    llms,
    memory,
    modelConfig,
    plugin,
    term,
    termGroupId
  };
}

const DatasourceConfigDrawer: FC<Props> = memo(({ agentId, onClose }) => {
  const [state, dispatch] = useReducer(reducer, initState);
  const [initialState, setInitialState] = useState();
  const router = useRouter();

  const getHasChange = useCallback(() => {
    if (!initialState) return false;
    let hasChange = false;
    // 比较当前状态和初始状态是否有变化
    Object.keys(state).forEach(key => {
      if (state[key] !== initialState[key]) {
        hasChange = true;
      }
    });
    return hasChange;
  }, [state, initialState]);

  const getDetail = async () => {
    if (agentId) {
      const res = await getAgentDetailById(agentId);
      if (res?.data) {
        const resData: any = formatData(res.data);
        setInitialState(resData);
        dispatch(resData);
      }
    }
  };

  useEffect(() => {
    getDetail();
  }, [agentId]);

  const items = useMemo(() => {
    return [
      {
        children: (
          <LabelSemantics
            dispatch={dispatch}
            schemaId={initialState?.schemaId}
            state={state}
          />
        ),
        key: '1',
        label: '标签语义'
      },
      {
        children: (
          <IndustryTerminology
            dispatch={dispatch}
            schemaId={initialState?.schemaId}
            state={state}
          />
        ),
        key: '2',
        label: '行业术语'
      },
      {
        children: (
          <RecommendedQuestions
            dispatch={dispatch}
            state={state}
          />
        ),
        key: '3',
        label: '推荐问题'
      },
      {
        children: (
          <ThreePartyPlugin
            dispatch={dispatch}
            state={state}
          />
        ),
        key: '4',
        label: '三方插件'
      },
      {
        children: (
          <MemoryManagement
            agentId={agentId}
            dispatch={dispatch}
            state={state}
          />
        ),
        key: '5',
        label: '记忆管理'
      },
      {
        children: (
          <Dictionaries
            dispatch={dispatch}
            state={state}
          />
        ),
        key: '6',
        label: '数据字典'
      }
    ];
  }, [state]);

  async function handleSubmit() {
    const {
      dictgroups,
      dictionariesGroupId,
      example,
      exampleGroupId,
      labels,
      labelsGroupId,
      memory,
      plugin,
      term,
      termGroupId,
      ...elseState
    } = state;

    const originModelConfig = state.modelConfig ? JSON.parse(state.modelConfig) : {};
    const originModelConfigObj = originModelConfig?.modelConfigs?.[0];
    const params = {
      spaceId: Number(localStorage.getItem('spaceId')),
      status: 1, // 写死
      ...elseState,
      modelConfig: JSON.stringify({
        modelConfigs: [
          {
            ...originModelConfigObj,
            dictgroups,
            dictionariesGroupId,
            example,
            exampleGroupId,
            labels,
            labelsGroupId,
            memory,
            plugin,
            term,
            termGroupId
          }
        ]
      })
    };
    console.log(params);
    await putAgentConfig(params);
    
    // 弹窗询问是否同步知识库，将标签、术语等同步
    AModal.confirm({
      cancelText: '取消',
      content: '是否需要同步知识库？将同步标签、术语等配置到本地。',
      okText: '确认',
      onCancel: () => {
        message.success('操作成功');
        onClose(true);
      },
      onOk: async () => {
        try {
          const detailRes = await getAgentDetailById(agentId!);
          const data = detailRes.data;
          const modelConfig = JSON.parse(data.modelConfig);
          await syncKnowledgeBase({
            agent_id: `${data?.agentId}`,
            dsl: modelConfig.mdlConfigs ? JSON.stringify(modelConfig.mdlConfigs) : '',
            space_id: `${data.spaceId}`
          });
          message.success('同步知识库成功');
          onClose(true);
        } catch (error) {
          message.error('同步知识库失败');
          console.log('同步知识库失败:', error);
        }
      },
      title: '同步知识库'
    });
  }

  const handleStartChat = () => {
    // 弹窗询问是否同步知识库，将标签、术语等同步
    AModal.confirm({
      cancelText: '取消',
      content: '是否需要同步知识库？将同步标签、术语等配置到本地。',
      okText: '确认',
      onCancel: () => {
        router.push(`/ai-assistant/conversational-analysis`);
      },
      onOk: async () => {
        try {
          const detailRes = await getAgentDetailById(agentId!);
          const data = detailRes.data;
          const modelConfig = JSON.parse(data.modelConfig);
          await syncKnowledgeBase({
            agent_id: `${data?.agentId}`,
            dsl: modelConfig.mdlConfigs ? JSON.stringify(modelConfig.mdlConfigs) : '',
            space_id: `${data.spaceId}`
          });
          message.success('同步知识库成功');
          router.push(`/ai-assistant/conversational-analysis`);
        } catch (error) {
          message.error('同步知识库失败');
          console.log('同步知识库失败:', error);
          router.push(`/ai-assistant/conversational-analysis`);
        }
      },
      title: '同步知识库'
    });
  };

  return (
    <Drawer
      closeIcon={false}
      open={true}
      size="large"
      title="助手配置"
      width="60%"
      extra={
        <AButton
          icon={<CloseOutlined />}
          type="text"
          onClick={() => onClose()}
        />
      }
      footer={
        <AFlex justify="flex-end">
          <Space>
            <AButton onClick={() => onClose()}>取消</AButton>
            <AButton
              type="primary"
              onClick={handleSubmit}
            >
              确定
            </AButton>
            <AButton
              type="primary"
              onClick={handleStartChat}
            >
              开始对话
            </AButton>
          </Space>
        </AFlex>
      }
      onClose={() => onClose()}
    >
      <Tabs
        defaultActiveKey="1"
        items={items}
      />
    </Drawer>
  );
});
export default DatasourceConfigDrawer;
