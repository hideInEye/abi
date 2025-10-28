import { CloseOutlined } from '@ant-design/icons';
import { Steps, message } from 'antd'; // 新增配置列表

import { getAgentDetailById, postAgentConfig, putAgentConfig } from '@/service/api/assistant-manage';

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
  const [hasChange, setHasChange] = useState(false);
  const [state, dispatch] = useReducer(reducer, initState);
  const [originDetail, setOriginDetail] = useState<any>();
  const { fieldsDataSource } = useSchemaFields({
    groupId: originDetail?.groupId,
    schemaId: originDetail?.schemaId
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

  async function handleSubmit() {
    if (!state.tableSemantics?.length) {
      message.error('配置未完成，无法保存！');
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
      ...elseModelConfigObj
    };
    // const originModelConfig = modelConfig ? JSON.parse(modelConfig) : {};
    // const originModelConfigObj = originModelConfig?.modelConfigs?.[0];
    const params = {
      ...elseState,
      modelConfig: JSON.stringify({
        modelConfigs: [{ ...modelConfigObj }]
      }),
      spaceId: Number(localStorage.getItem('spaceId')),
      status: 1 // 写死
    };
    console.log(params);
    let res;
    if (agentId) {
      res = await putAgentConfig(params);
    } else {
      res = await postAgentConfig(params);
    }
    if (res.response.data.code === 200) {
      if (!hasChange) {
        message.success('操作成功');
        onClose(true);
      } else {
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
      }
    }
  }
  const steps = [
    {
      content: (
        <BasicInformation
          dispatch={dispatch}
          setHasChange={setHasChange}
          state={state}
        />
      ),
      title: '基本信息'
    },
    {
      content: (
        <SelectModel
          dispatch={dispatch}
          setHasChange={setHasChange}
          state={state}
        />
      ),
      title: '选择模型'
    },
    {
      content: (
        <ConfigurationTableSemantics
          dispatch={dispatch}
          setHasChange={setHasChange}
          state={state}
        />
      ),
      title: '配置表语义'
    }
  ];

  // const { token } = theme.useToken();
  const [current, setCurrent] = useState(0);

  const next = () => {
    if (current === 0) {
      if (!state.bizName || !state.techName) {
        message.error('请将信息补充完整');
        return;
      }
    }
    if (current === 1) {
      if (!state.llms?.length) {
        message.error('请选择模型');
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
