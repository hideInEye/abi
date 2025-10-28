import { CloseOutlined } from '@ant-design/icons';
import { Button, Drawer, Form, Input, Steps, Switch, message } from 'antd';
import React, { useReducer, useState } from 'react';

import { CHECKED_MAP, SPACE_ID } from '@/constants/chat';

import AgentList from './agent-list';

/**
 * 创建新对话模态框组件
 * 使用步骤器引导用户完成对话创建流程
 * 包括：基本信息 -> 选择数据助手 -> 记忆管理配置
 */

// API 请求参数结构说明
// {
//   "status": "0", // 先不传，状态，关闭状态列表不显示
//   "create_by": "kangxz",
//   "update_by": "kangxz",
//   "remark": "备注信息说明",
//   "chat_mode": "chat_with_db_execute", // 写死
//   "chat_id": 1739624020040, // 后台生成
//   "agent_id": 1739624020150, // 助手
//   "space_id": 1739624020345,
//   "biz_name": "智能对话-对话1",
//   "group_id": 1739624020345, // 不传
//   "chat_config": "{\"if_multiturn\":\"0\",\"if_interpreter\":\"0\"}", // 记忆管理（改名叫助手配置）
//   "last_question": "按照部门维度统计销售金额。" // 不传
// }

const initState = {
  agent_id: '',
  biz_name: '',
  chat_mode: 'chat_with_db_execute',
  if_interpreter: CHECKED_MAP.no,
  if_multiturn: CHECKED_MAP.no,
  remark: '',
  space_id: SPACE_ID,
  status: CHECKED_MAP.no
};

const reducer = (state: typeof initState, field: any) => {
  return {
    ...state,
    ...field
  };
};

const CreateModal: React.FC<{ onClose: (val?: typeof initState) => void }> = memo(({ onClose }) => {
  const [current, setCurrent] = useState(0);
  const [state, dispatch] = useReducer(reducer, initState);

  const steps = [
    {
      content: (
        <Form>
          <Form.Item label="名称">
            <Input
              placeholder="对话名称"
              value={state.biz_name}
              onChange={e => dispatch({ biz_name: e.target.value })}
            />
          </Form.Item>
          <Form.Item label="描述">
            <Input.TextArea
              placeholder="对话描述"
              value={state.remark}
              onChange={e => dispatch({ remark: e.target.value })}
            />
          </Form.Item>
        </Form>
      ),
      key: 0,
      title: '基本信息'
    },
    {
      content: <AgentList setAgentId={(id: number) => dispatch({ agent_id: id })} />,
      key: 1,
      title: '选择数据助手'
    },
    {
      content: (
        <Form>
          <Form.Item label="记忆管理">
            <Switch
              checked={state.if_interpreter === CHECKED_MAP.yse}
              onChange={checked => dispatch({ if_interpreter: checked ? CHECKED_MAP.yse : CHECKED_MAP.no })}
            />
          </Form.Item>
          <Form.Item label="多轮对话">
            <Switch
              checked={state.if_multiturn === CHECKED_MAP.yse}
              onChange={checked => dispatch({ if_multiturn: checked ? CHECKED_MAP.yse : CHECKED_MAP.no })}
            />
          </Form.Item>
        </Form>
      ),
      key: 2,
      title: '记忆管理'
    }
  ];

  const items = steps.map(item => ({ key: item.key, title: item.title }));

  const next = () => {
    if (current === 0) {
      if (!state.biz_name) {
        message.error('请输入名称');
        return;
      }
    }

    if (current === 1) {
      if (!state.agent_id) {
        message.error('请选择数据模型');
        return;
      }
    }
    setCurrent(current + 1);
  };

  const prev = () => {
    setCurrent(current - 1);
  };

  const handleFinish = async () => {
    const { if_interpreter, if_multiturn, ...elseState } = state;
    const resState = {
      ...elseState,
      chat_config: JSON.stringify({
        if_interpreter: state.if_interpreter,
        if_multiturn: state.if_multiturn
      })
    };
    await onClose(resState);
    message.success('创建成功');
  };

  return (
    <Drawer
      closeIcon={false}
      open={true}
      size="large"
      title="新建对话"
      extra={
        <Button
          icon={<CloseOutlined />}
          type="text"
          onClick={() => onClose()}
        />
      }
      footer={
        <ASpace className="flex justify-end">
          {current < steps.length - 1 && (
            <Button
              type="primary"
              onClick={() => next()}
            >
              下一步
            </Button>
          )}
          {current === steps.length - 1 && (
            <Button
              type="primary"
              onClick={handleFinish}
            >
              完成
            </Button>
          )}
          {current > 0 && (
            <Button
              style={{ margin: '0 8px' }}
              onClick={() => prev()}
            >
              上一步
            </Button>
          )}
        </ASpace>
      }
      onClose={() => onClose()}
    >
      <div className="px-6">
        <Steps
          className="mb-2"
          current={current}
          items={items}
        />
      </div>
      {steps[current].content}
    </Drawer>
  );
});

export default CreateModal;
