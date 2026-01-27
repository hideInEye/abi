import { CloseOutlined } from '@ant-design/icons';
import { Steps, message } from 'antd'; // 新增配置列表
import { useForm } from 'antd/es/form/Form';

import { addTerms, editTerms } from '@/service/api/Industry.ts';

import type { TagGroup } from '../types/index.ts';

import BasicInformation from './BasicInformation.tsx';
import CalculateCom from './CalculateCom.tsx';
// import { fetchAssistantConfigList, getAgentConfig } from '@/service/api/assistant-manage';

const initState = {
  bizName: '',
  dataType: undefined,
  engName: '',
  expr: '',
  measurementUnit: '',
  relItemId: '',
  relViewid: undefined,
  remark: '',
  techName: '',
  termAlias: ''
};

const reducer = (state: typeof initState, field: any) => {
  return {
    ...state,
    ...field
  };
};

interface Props {
  readonly editingGroup: TagGroup | null;
  readonly groupId?: number;
  readonly onClose: (refresh?: boolean) => void;
  isEdit?: boolean; // 新增
}
const TechnicalJargonOperateDrawer: FC<Props> = memo(({ editingGroup, groupId, onClose, isEdit }) => {
  const [state, dispatch] = useReducer(reducer, initState);
  const [form] = useForm();

  useEffect(() => {
    if (editingGroup) {
      dispatch(editingGroup);
    }
  }, [editingGroup]);

  const handleCb = async (res:any) => {
   if(res.response.data.code>200){
    message.error(res.response.data.msg)
    return
   }
    
    message.success('操作成功');
    onClose(true);
  };

  async function handleSubmit() {
    if (!groupId) {
      message.error('请先创建行业术语组');
      return;
    }

    await form.validateFields();
    const params = {
      ...state,
      // 英文名称同时写入 techName 与 engName，确保唯一性校验字段一致
      techName: state.techName,
      engName: state.techName,
      groupId,
      spaceId: Number(localStorage.getItem('spaceId')),
      status: 1 // 写死
    };

    if (editingGroup) {
      delete params.updateTime;
      delete params.createTime;
      editTerms(params).then(handleCb);
    } else {
      addTerms(params).then(handleCb);
    }
  }
  const steps = [
    {
      content: (
        <BasicInformation
          dispatch={dispatch}
          form={form}
          state={state}
          // 不传 isEdit，保持可编辑
        />
      ),
      title: '基本信息'
    },
    {
      content: (
        <CalculateCom
          dispatch={dispatch}
          form={form}
          state={state}
          isEdit={isEdit} // 只这里传递
        />
      ),
      title: '计算加工'
    }
  ];

  // const { token } = theme.useToken();
  const [current, setCurrent] = useState(0);

  const next = async () => {
    await form.validateFields();
    setCurrent(current + 1);
  };

  const prev = () => {
    setCurrent(current - 1);
  };

  const items = steps.map(item => ({ key: item.title, title: item.title }));

  return (
    <ADrawer
      closeIcon={null}
      open={true}
      title={editingGroup ? '编辑行业术语' : '新建行业术语'}
      width={800}
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
              确认
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

export default TechnicalJargonOperateDrawer;
