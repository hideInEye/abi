import { CloseOutlined } from '@ant-design/icons'
import { Steps, message } from 'antd' // 新增配置列表
import { useForm } from 'antd/es/form/Form'

import { useAppSelector } from '@/hooks/business/useStore'
import { validateFieldsAndScroll } from '@/pages/workbench/ontology-kg/utils/form-scroll'
import { addTerms, editTerms } from '@/service/api/Industry.ts'
import { isFlatRequestSuccess } from '@/service/request/flat-result'
import { getSpaceId } from '@/store/slice/app'

import type { TagGroup } from '../types/index.ts'

import BasicInformation from './BasicInformation.tsx'
import CalculateCom from './CalculateCom.tsx'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'
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
  termAlias: '',
}

const reducer = (state: typeof initState, field: any) => {
  return {
    ...state,
    ...field,
  }
}

interface Props {
  readonly editingGroup: TagGroup | null
  readonly groupId?: number
  readonly onClose: (refresh?: boolean) => boolean | Promise<boolean>
  isEdit?: boolean // 新增
}
const TechnicalJargonOperateDrawer: FC<Props> = memo(({ editingGroup, groupId, onClose, isEdit }) => {
  const spaceId = useAppSelector(getSpaceId) || 0
  const [state, dispatch] = useReducer(reducer, initState)
  const [form] = useForm()
  const [submitting, setSubmitting] = useState(false)
  const submitLockRef = useRef(false)

  useEffect(() => {
    if (editingGroup) {
      dispatch(editingGroup)
    }
  }, [editingGroup])

  async function handleSubmit() {
    if (submitLockRef.current) return
    if (!groupId) {
      message.error('请先创建行业术语组')
      return
    }

    const valid = await validateFieldsAndScroll(form)
    if (!valid) {
      return
    }
    const params = {
      ...state,
      // 英文名称同时写入 techName 与 engName，确保唯一性校验字段一致
      techName: state.techName,
      engName: state.techName,
      groupId,
      spaceId,
      status: 1, // 写死
    }

    submitLockRef.current = true
    setSubmitting(true)
    try {
      let result
      if (editingGroup) {
        delete params.updateTime
        delete params.createTime
        result = await editTerms(params)
      } else {
        result = await addTerms(params)
      }
      if (!isFlatRequestSuccess(result)) return
      const closed = await onClose(true)
      if (closed) message.success('操作成功')
    } finally {
      submitLockRef.current = false
      setSubmitting(false)
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
      title: '基本信息',
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
      title: '计算加工',
    },
  ]

  // const { token } = theme.useToken();
  const [current, setCurrent] = useState(0)

  const next = async () => {
    const valid = await validateFieldsAndScroll(form)
    if (!valid) {
      return
    }
    setCurrent(current + 1)
  }

  const prev = () => {
    setCurrent(current - 1)
  }

  const items = steps.map((item) => ({ key: item.title, title: item.title }))

  return (
    <CommonDrawer
      open={true}
      title={editingGroup ? '编辑行业术语' : '新建行业术语'}
      width={800}
      footer={
        <ASpace className="flex justify-end">
          {current > 0 && (
            <AButton disabled={submitting} style={{ margin: '0 8px' }} onClick={() => prev()}>
              上一步
            </AButton>
          )}
          {current < steps.length - 1 && (
            <AButton type="primary" onClick={() => next()}>
              下一步
            </AButton>
          )}
          {current === steps.length - 1 && (
            <AButton loading={submitting} type="primary" onClick={handleSubmit}>
              确认
            </AButton>
          )}
        </ASpace>
      }
      onClose={() => {
        if (!submitting) onClose()
      }}
    >
      <div className="mb-4 px-[150px]">
        <Steps current={current} items={items} />
      </div>
      <div>{steps[current].content}</div>
    </CommonDrawer>
  )
})

export default TechnicalJargonOperateDrawer
