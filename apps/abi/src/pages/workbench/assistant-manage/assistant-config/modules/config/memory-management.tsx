import { DeleteOutlined, DeploymentUnitOutlined, DislikeOutlined, LikeOutlined, UserOutlined } from '@ant-design/icons';
import { Popconfirm, message } from 'antd';
import dayjs from 'dayjs';
import React, { Suspense } from 'react';

import { EVAL_LLM_OPTIONS, MEMORY_CHAT_MODE_OPTIONS, MEMORY_STATUS_OPTIONS } from '@/constants/assistant-config';
import { fetchModelList } from '@/service/api';
import {
  fetchDeleteMemory,
  fetchEditMemory,
  fetchMemoryList,
  fetchModelEval,
  fetchVectorStorage,
  fetchVectorsDelete,
  getAgentDetailById,
  syncKnowledgeBase,
  fetchTerms
} from '@/service/api/assistant-manage';

import TableEmpty from '@/components/stateless/common/TableEmpty';
import KeySearch from './key-search';
import MemoryOperateDrawer from './memory-operate-drawer';
import { useAppSelector } from '@/hooks/business/useStore';
import { getSpaceId } from '@/store/slice/app';

interface DataType {
  address: string;
  age: number;
  key: string;
  name: string;
  tags: string[];
}

const demoData = [
  {
    accept: 1,
    address: 'New York No. 1 Lake Park',
    age: 32,
    createdTime: '2024-12-01 12:00:22',
    key: '1',
    name: '你谁啊',
    tags: ['nice', 'developer'],
    user: '张三'
  },
  {
    accept: 1,
    address: 'London No. 1 Lake Park',
    age: 42,
    createdTime: '2024-12-01 12:00:22',
    key: '2',
    name: 'Jim Green',
    tags: ['loser'],
    user: '张三'
  },
  {
    accept: 0,
    address: 'Sydney No. 1 Lake Park',
    age: 32,
    createdTime: '2024-12-01 12:00:22',
    key: '3',
    name: 'Joe Black',
    tags: ['cool', 'teacher'],
    user: '张三'
  }
];

interface PropsType {
  readonly agentId?: number;
  readonly dispatch: (obj: object) => void;
  readonly state: any;
}

const MemoryManagement: React.FC<PropsType> = ({ agentId, dispatch, state }) => {
  const spaceId = useAppSelector(getSpaceId);
  const [dataSource, setDataSource] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<{
    record: any;
    type: string;
  }>({
    record: null,
    type: ''
  });
  const [modelEvalLoading, setModelEvalLoading] = useState<boolean>(false);
  const isWenShuScene = (chatMode: string) => chatMode === 'chat_with_db_execute';
  const { scrollConfig, tableWrapperRef } = useTableScroll(2000);
  const handleFeedback = (record: any, type: string) => {
    setFeedback({
      record,
      type
    });
  };
  const handleModelEval = async (record: any) => {
    try {
      const modelListRes = await fetchModelList({ pageNum: 1, pageSize: 1000 });
      const modelList = modelListRes?.data?.data || [];
      const modelInfo = modelList.find((item: any) => `${item?.llmId}` === state.llms?.[0]);
      if (!modelInfo) {
        message.error('未找到模型相关信息');
        return;
      }
      setModelEvalLoading(true);
      const modelConfig = modelInfo?.modelConfig ? JSON.parse(modelInfo.modelConfig) : {};
      const contextObj = {
        agent_id: `${record.agent_id}`,
        app_code: '',
        chat_id: `${record.chat_id}`,
        chat_mode: record.chat_mode,
        conv_uid: record.conv_uid,
        extra: {
          fb_id: record.fb_id
        },
        space_id: `${record.space_id}`,
        sys_code: '1',
        user_name: '1'
      };
      const params = {
        context: contextObj,
        enable_vis: false,
        incremental: false,
        max_new_tokens: modelConfig.max_token,
        messages: '',
        model: modelInfo?.modelName,
        stream: false,
        temperature: modelConfig.temperature
      };
      const res = await fetchModelEval(params);
      if (res.response?.data?.success) {
        message.success('模型评估成功');
        run();
      }else {
        message.error(res.response?.data?.err_msg);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setModelEvalLoading(false);
    }
  };

  // 这个函数已经被useTableOperate的handleSubmit替代，不再需要
  // const handleEvaluate = async (record: any, evalExpert: string) => {
  //   const res = await fetchLikeOrDislike({
  //     agent_id: record.agent_id,
  //     chat_id: record.chat_id,
  //     conv_uid: record.conv_uid,
  //     create_by: record.create_by,
  //     eval_user: evalExpert,
  //     round_index: record.round_index,
  //     space_id: record.space_id
  //   });
  //   console.log(res);
  //   // if (res?.response?.data?.success) {
  //   //   message.success('操作成功');
  //   //   run(); // 刷新表格数据
  //   // }
  // };
  const { columnChecks, data, run, searchProps, setColumnChecks, tableProps } = useTable({
    apiFn: fetchMemoryList as any,
    apiParams: {
      agent_id: agentId,
      page: 1,
      page_size: 10,
      space_id: spaceId // 空间id
    } as any,
    columns: () => [
      {
        align: 'left',
        dataIndex: 'question',
        ellipsis: true,
        key: 'question',
        title: '问题',
        width: 200
      },
      {
        align: 'left',
        dataIndex: 'chat_mode',
        key: 'chat_mode',
        render: (chatMode: string) =>
          MEMORY_CHAT_MODE_OPTIONS.find((item: any) => item.value === chatMode)?.label || '未知',
        title: '场景类型',
        width: 80
      },
      {
        align: 'left',
        dataIndex: 'ai_response',
        ellipsis: true,
        key: 'ai_response',
        title: 'ai信息',
        width: 200
      },
      {
        align: 'left',
        dataIndex: 'view_response',
        ellipsis: true,
        key: 'view_response',
        title: 'view信息',
        width: 200
      },
      {
        align: 'center',
        dataIndex: 'create_by',
        key: 'create_by',
        title: '提交人',
        width: 120
      },
      {
        align: 'center',
        dataIndex: 'eval_user',
        key: 'eval_user',
        render: (evalExpert: string) => (
          <div>
            {evalExpert === '0' && <LikeOutlined />}
            {evalExpert === '1' && <DislikeOutlined />}
          </div>
        ),
        title: '提交意见',
        width: 120
      },
      {
        align: 'left',
        dataIndex: 'status',
        key: 'status',
        render: (status: number) => MEMORY_STATUS_OPTIONS.find((item: any) => item.value === status)?.label || '未审核',
        title: '审核状态',
        width: 120
      },
      {
        align: 'center',
        dataIndex: 'eval_by',
        key: 'eval_by',
        title: '评估人',
        width: 120
      },
      {
        align: 'left',
        dataIndex: 'expert_opinion',
        ellipsis: true,
        key: 'expert_opinion',
        title: '评估意见',
        width: 200
      },
      {
        align: 'center',
        dataIndex: 'eval_llm',
        key: 'eval_llm',
        render: (evalLlm: string) => EVAL_LLM_OPTIONS.find((item: any) => item.value === evalLlm)?.label,
        title: '模型评估结果',
        width: 120
      },
      {
        align: 'left',
        dataIndex: 'llm_opinion',
        ellipsis: true,
        key: 'llm_opinion',
        title: '模型评估意见',
        width: 200
      },
      {
        align: 'center',
        dataIndex: 'eval_time',
        key: 'eval_time',
        render: (time: string) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-'),
        title: '审核时间',
        width: 200
      },
      {
        align: 'center',
        dataIndex: 'create_time',
        key: 'create_time',
        render: (time: string) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-'),
        title: '提交时间',
        width: 200
      },
      {
        align: 'center',
        dataIndex: 'operation',
        fixed: 'right',
        key: 'operation',
        render: (_: unknown, record: any) => (
          <div>
            <ATooltip
              placement="top"
              title="人工评估"
            >
              <AButton
                color="primary"
                // disabled={modelEvalLoading || MEMORY_STATUS_OPTIONS.find((item: any) => item.value === record.status)}
                icon={<UserOutlined />}
                size="small"
                variant="link"
                onClick={() => handleEdit(record)}
              />
            </ATooltip>
            <Popconfirm
              title="确定进行模型评估吗？"
              onConfirm={() => handleModelEval(record)}
            >
              <ATooltip
                placement="top"
                title="模型评估"
              >
                <AButton
                  color="primary"
                  disabled={
                    modelEvalLoading ||
                    ['0', '1'].includes(record.status) ||
                    !isWenShuScene(record.chat_mode)
                  }
                  icon={<DeploymentUnitOutlined />}
                  size="small"
                  variant="link"
                />
              </ATooltip>
            </Popconfirm>
            <Popconfirm
              title="删除后不可恢复，确定删除吗？"
              onConfirm={() => handleDelete(record)}
            >
              <ATooltip title="删除">
                <AButton
                  color="danger"
                  icon={<DeleteOutlined />}
                  size="small"
                  variant="link"
                />
              </ATooltip>
            </Popconfirm>
          </div>
        ),
        title: '操作',
        width: 100
      }
    ]
  });
  const { checkedRowKeys, editingData, generalPopupOperation, handleAdd, handleEdit, onDeleted } = useTableOperate(
    data as any,
    run,
    async (res: any, type) => {
      // const { sourceName, sourceType, ...elseProps } = res as any;
      if (type === 'add') {
        // add request 调用新增的接口
        // const addRes: any = await addDataSource(commonData);
        // if (addRes?.response?.data?.code !== 200) return false;
      } else {
        // edit request 调用编辑的接口
        const currentUserObj = JSON.parse(localStorage.getItem('SOY-REACT_userInfo') || '{}');
        // 先更新记忆
        const updateRes: any = await fetchEditMemory({
          ...res,
          eval_by: currentUserObj.userName,
          fb_id: editingData?.fb_id,
          status: res.status
        });
        if (!updateRes?.response?.data?.success) return false;

        // 如果采纳状态=采纳，则同步数据库后再同步向量知识库，无须提示直接同步
        if (res.eval_user === '0') {
          // 同步数据库
          const evaluateRes = await fetchVectorStorage({
            fb_id: editingData?.fb_id
          });
          if (!evaluateRes?.response?.data?.success) return false;

          // 同步向量知识库
          try {
          const detailRes = await getAgentDetailById(agentId!);
          const data = detailRes.data;
          const modelConfig = data.modelConfig ? JSON.parse(data.modelConfig) : {};
          const cfg = modelConfig?.modelConfigs?.[0] || {};
          let dslObj = modelConfig?.mdlConfigs || {};
          try {
            if (cfg?.termGroupId) {
              const termRes = await fetchTerms({ groupId: cfg.termGroupId, spaceId, termName: '' });
              const termMap: Record<string, string> = {};
              (termRes?.data || []).forEach((it: any) => {
                if (it?.techName) termMap[it.techName] = it.bizName;
                if (it?.engName) termMap[it.engName] = it.bizName;
              });
              const rewrite = (node: any) => {
                if (!node || typeof node !== 'object') return;
                if (typeof node.displayName === 'string') {
                  const v = termMap[node.displayName];
                  if (v) node.displayName = v;
                }
                Object.keys(node).forEach(k => rewrite(node[k]));
              };
              rewrite(dslObj);
            }
          } catch {}
          // console.log('KB sync DSL:', dslObj);
          await syncKnowledgeBase({
            agent_id: `${agentId}`,
            dsl: JSON.stringify(dslObj || {}),
            space_id: `${spaceId}`
          });
          } catch (error) {
            console.log('同步向量知识库失败:', error);
          }
        }
      }
    }
  );
  async function handleDelete(record: any) {
    try {
      // 1. 先调用删除数据库的接口
      const res = await fetchDeleteMemory(record.fb_id);
      
      if (res?.response?.data?.success) {
        // 2. 如果有pk_id（进行过模型评估），则调用删除向量数据库的接口
        if (record.pk_id) {
          try {
            await fetchVectorsDelete(record.fb_id);
          } catch (error) {
            console.log('删除向量数据库失败:', error);
            // 向量数据库删除失败不影响整体删除流程
          }
        }
        onDeleted();
      }
    } catch (error) {
      console.log('删除失败:', error);
    }
  }
  useEffect(() => {
    setDataSource(
      demoData.map(item => ({
        ...item,
        // eslint-disable-next-line no-nested-ternary
        attitude: state.memory?.like?.includes(item.key)
          ? 'like'
          : state.memory?.unlike?.includes(item.key)
            ? 'unlike'
            : ''
      }))
    );
  }, [state]);

  const handleOk = () => {
    if (feedback.type === 'accept') {
      // 处理采纳逻辑
      // handleEvaluate(feedback.record, 'like');
    } else if (feedback.type === 'reject') {
      // 处理拒绝逻辑
      // handleEvaluate(feedback.record, 'unlike');
    }
    setFeedback({ record: null, type: '' });
    run(); // 刷新表格数据
  };
  const handleReset = () => {
    searchProps.form.resetFields();
    run(); // 重置后立即刷新数据
  };
  const showEmpty = !tableProps.loading && (!tableProps.dataSource || tableProps.dataSource.length === 0);

  return (
    <div>
      <KeySearch {...searchProps} reset={handleReset} />
      {showEmpty ? (
        <TableEmpty bordered />
      ) : (
      <ATable
        // rowKey="agentId"
        // scroll={{ ...scrollConfig, y: 'calc(100vh - 300px)' }}
        scroll={{ ...scrollConfig, y: false }}
        size="small"
        {...(tableProps as any)}
        rowClassName="h-[7px] leading-[7px]"
      />
      )}

      <Suspense>
        <MemoryOperateDrawer {...generalPopupOperation} />
      </Suspense>

      {/* {feedback.record && (
        <AModal
          open={true}
          title={feedback.type === 'accept' ? '采纳问题' : '拒绝问题'}
          onOk={handleOk}
          onCancel={() => {
            setFeedback({ record: null, type: '' });
          }}
        >
          <AInput.TextArea
            value={opinion}
            onChange={e => setOpinion(e.target.value)}
          />
        </AModal>
      )} */}
    </div>
  );
};

export default MemoryManagement;
