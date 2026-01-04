import { Button, Drawer, Form, Input, message, Space, Steps, Switch } from "antd";
import React, { useReducer, useState, useRef, useEffect } from "react";
import { CHECKED_MAP } from "../../constant";
import AgentList, { AgentListHandle } from "./AgentList";
import { CloseOutlined } from "@ant-design/icons";
import RecommendQuestions, { RecommendQuestionsHandle } from "./RecommendQuestions";
import { getSpaceId } from "../../utils";
import { checkAppNameExists, createApp } from "../../service/api/app";
const userInfoString = localStorage.getItem('SOY-REACT_userInfo');
const initState = {
  status: CHECKED_MAP.yes,
  create_by: userInfoString ? JSON.parse(userInfoString).userName : '',
  biz_name: '',
  remark: '',
  chat_mode: 'chat_with_db_execute',
  agent_id: '',
  sql_generate: CHECKED_MAP.no,
  sql_explain: CHECKED_MAP.no,
  thought_process: CHECKED_MAP.no,
  data_summary: CHECKED_MAP.no,
  process_analysis: CHECKED_MAP.no,
  chart_generate: CHECKED_MAP.no,
  prompt_guide: CHECKED_MAP.no,
  recommend_questions: CHECKED_MAP.no,
  recommend_dimensions: CHECKED_MAP.no,
  recommend_metrics: CHECKED_MAP.no,
  intent_recognition: CHECKED_MAP.no,
  cause_analysis: CHECKED_MAP.no,
  prediction_analysis: CHECKED_MAP.no,
  excel_chat: CHECKED_MAP.no,
  prompt_content: ''
}

const reducer = (state: typeof initState, field: any) => {
  return {
    ...state,
    ...field
  }
}

interface CreateModalProps {
  visible: boolean;
  onClose: (val: typeof initState, isEdit: boolean) => void;
  isEdit?: boolean;
  initialValues?: any;
}

const CreateModal: React.FC<CreateModalProps> = React.memo(({
  visible,
  onClose,
  isEdit = false,
  initialValues
}) => {
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [state, dispatch] = useReducer(reducer, initState);
  const agentListRef = useRef<AgentListHandle>(null);
  const recommendQuestionsRef = useRef<RecommendQuestionsHandle>(null);
  const [recommendQuestionsInitialValues, setRecommendQuestionsInitialValues] = useState({});

  // 当弹窗关闭时重置步骤
  useEffect(() => {
    if (!visible) {
      setCurrent(0);
      dispatch(initState);
      if (agentListRef.current) {
        agentListRef.current.resetState();
      }
      if (recommendQuestionsRef.current) {
        recommendQuestionsRef.current.resetState();
      }
    }
  }, [visible]);

  // 当编辑模式下，设置初始值
  useEffect(() => {
    if (isEdit && initialValues && visible) {
      try {
        const configs = JSON.parse(initialValues?.chat_config || '{}')
        const configData = configs.prompts || []
        dispatch({
          ...initialValues,
        });
        setRecommendQuestionsInitialValues(configData);
        // 重置推荐问题的状态并设置初始值
        if (recommendQuestionsRef.current) {
          recommendQuestionsRef.current.resetState();
          recommendQuestionsRef.current.setInitialValues(configData);
        }
      } catch (error) {
        console.error('解析初始值失败:', error);
      }
    }
  }, [isEdit, initialValues, visible]);

  const steps = [
    {
      content: (
        <Form labelCol={{ span: 2 }}>
          <Form.Item 
            label="名称" 
            required
            validateStatus={state.biz_name.length > 20 ? 'error' : ''}
            help={state.biz_name.length > 20 ? '名称不能超过20个字符' : ''}
          >
            <Input
              placeholder="对话名称"
              value={state.biz_name}
              status={state.biz_name.length > 20 ? 'error' : ''}
              onChange={e => dispatch({ biz_name: e.target.value })}
            />
          </Form.Item>
          <Form.Item 
            label="描述" 
            key="remark"
            validateStatus={state.remark.length > 50 ? 'error' : ''}
            help={state.remark.length > 50 ? '描述不能超过50个字符' : ''}
          >
            <Input.TextArea
              placeholder="对话描述"
              value={state.remark}
              status={state.remark.length > 50 ? 'error' : ''}
              onChange={e => dispatch({ remark: e.target.value })}
            />
          </Form.Item>
        </Form>
      ),
      key: 0,
      title: '基本信息'
    },
    {
      content: <AgentList ref={agentListRef} agentId={initialValues?.agent_id} setAgentId={(id: number) => dispatch({ agent_id: id })} />,
      key: 1,
      title: '选择数据助手'
    },
    {
      content: <RecommendQuestions ref={recommendQuestionsRef} chatId={initialValues?.chat_id} isEdit={isEdit} />,
      key: 2,
      title: '属性配置'
    }
  ];

  const items = steps.map(item => ({ key: item.key, title: item.title }));

  const next =async () => {
    if (current === 0) {
      if (!state.biz_name) {
        message.error('请输入名称');
        return;
      }
      if (state.biz_name.length > 20) {
        message.error('名称不能超过20个字符');
        return;
      }
      if (state.remark && state.remark.length > 50) {
        message.error('描述不能超过50个字符');
        return;
      }
      const res = await checkAppNameExists({biz_name: state.biz_name, space_id: getSpaceId(),});
      if(!res){
        message.error('对话名称已存在，请更换后重试');
        return;
      }
    }

    if (current === 1) {
      if (!state.agent_id) {
        message.error('请选择数据助手');
        return;
      }
    }

    if (current === 2) {
      if (!recommendQuestionsRef.current?.getSwitchStates()) {
        message.error('请选择属性配置');
        return;
      }
    }
    setCurrent(current + 1);
  };

  const prev = () => {
    setCurrent(current - 1);
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const { if_interpreter, if_multiturn, ...elseState } = state;
      const data = recommendQuestionsRef.current?.getData() || [];
      const switchs: any = recommendQuestionsRef.current?.getSwitchStates();

      const filteredItems = [...data].map((item: any) => ({
        ...item,
        status: switchs[item.sub_chat_scene] === true ? '1' : '0',
      }));

      const resState = {
        ...elseState,
        space_id: getSpaceId(),
        chat_config: JSON.stringify({
          prompts: filteredItems || [],
        }),
      };
      await onClose(resState, isEdit);
      message.success(isEdit ? '更新成功' : '创建成功');

      // 重置所有状态
      setCurrent(0);
      dispatch(initState);
      // 重置 AgentList 组件
      if (agentListRef.current) {
        agentListRef.current.resetState();
      }
      // 重置 RecommendQuestions 组件
      if (recommendQuestionsRef.current) {
        recommendQuestionsRef.current.resetState();
      }
    } catch (error) {
      // message.error('操作失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      closeIcon={false}
      open={visible}
      size="large"
      title={isEdit ? "编辑对话" : "新建对话"}
      extra={
        <Button
          icon={<CloseOutlined />}
          type="text"
          onClick={() => onClose()}
        />
      }
      onClose={() => onClose()}
      footer={
        <Space className="flex justify-end">
          {current > 0 && (
            <Button onClick={prev}>上一步</Button>
          )}
          {current < steps.length - 1 && (
            <Button type="primary" onClick={next}>下一步</Button>
          )}
          {current === steps.length - 1 && (
            <Button type="primary" onClick={handleFinish} loading={loading}>
              {isEdit ? '更新' : '确认'}
            </Button>
          )}
        </Space>
      }
    >
      <Steps current={current} items={items} />
      <div className="mt-8">{steps[current].content}</div>
    </Drawer>
  );
});

export default CreateModal