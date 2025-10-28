import { JOB_GROUP_OPTIONS, STRATEGY_TYPE_OPTIONS } from '@/constants/job';
import { fetchJobDetail } from '@/service/api/job';

type Props = {
  jobId: string;
  onClose: () => void;
};

const JobDetailDrawer: FC<Props> = memo(({ jobId, onClose }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<any>();
  // eslint-disable-next-line complexity
  const items = useMemo(() => {
    return [
      {
        children: detail?.jobId,
        key: 'jobId',
        label: '任务编号',
        span: 3
      },
      {
        children: detail?.jobGroup && JOB_GROUP_OPTIONS.find(item => item.value === detail?.jobGroup)?.label,
        key: 'jobGroup',
        label: '任务组名',
        span: 3
      },
      {
        children: detail?.jobName,
        key: 'jobName',
        label: '任务名称',
        span: 3
      },
      {
        children: detail?.createTime,
        key: 'createTime',
        label: '创建时间',
        span: 3
      },
      {
        children: detail?.cronExpression,
        key: 'cronExpression',
        label: 'cron表达式',
        span: 3
      },
      {
        children: detail?.nextValidTime,
        key: 'nextValidTime',
        label: '下次执行时间',
        span: 3
      },
      {
        children: detail?.invokeTarget,
        key: 'invokeTarget',
        label: '调用目标方法',
        span: 3
      },
      {
        children: detail?.status && detail?.status === '0' ? '正常' : '暂停',
        key: 'status',
        label: '任务状态',
        span: 3
      },
      {
        children: detail?.concurrent && detail?.concurrent === '0' ? '允许' : '禁止',
        key: 'concurrent',
        label: '是否并发',
        span: 3
      },
      {
        children:
          detail?.misfirePolicy && STRATEGY_TYPE_OPTIONS.find(item => item.value === detail.misfirePolicy)?.label,
        key: 'misfirePolicy',
        label: '执行策略',
        span: 3
      }
    ];
  }, [detail]);
  // const sourceFileVal = AForm.useWatch('sourceFile', form);
  useEffect(() => {
    const getDetail = async () => {
      setLoading(true);
      try {
        const res = await fetchJobDetail(jobId);
        setDetail(res.data);
      } finally {
        setLoading(false);
      }
    };
    if (jobId) {
      getDetail();
    }
  }, [jobId]);

  return (
    <ADrawer
      loading={loading}
      open={true}
      title="任务详情"
      width={500}
      footer={
        <AFlex justify="flex-end">
          <AButton onClick={onClose}>{t('common.close')}</AButton>
        </AFlex>
      }
      onClose={onClose}
    >
      <ADescriptions items={items} />
    </ADrawer>
  );
});

export default JobDetailDrawer;
