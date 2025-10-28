import { JOB_GROUP_OPTIONS } from '@/constants/job';
import { fetchJobLogDetail } from '@/service/api/job';

type Props = {
  jobLogId: string;
  onClose: () => void;
};

const JobLogDetailDrawer: FC<Props> = memo(({ jobLogId, onClose }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<any>();
  // eslint-disable-next-line complexity
  const items = useMemo(() => {
    return [
      {
        children: detail?.jobLogId,
        key: 'jobLogId',
        label: '日志编号',
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
        children: detail?.startTime,
        key: 'startTime',
        label: '执行时间',
        span: 3
      },
      {
        children: detail?.invokeTarget,
        key: 'invokeTarget',
        label: '调用目标字符串',
        span: 3
      },
      {
        children: detail?.jobMessage,
        key: 'jobMessage',
        label: '日志信息',
        span: 3
      },
      {
        children: detail?.invokeTarget,
        key: 'invokeTarget',
        label: '调用目标方法',
        span: 3
      },
      {
        children: detail?.status && detail?.status === '0' ? '成功' : '失败',
        key: 'status',
        label: '执行状态',
        span: 3
      },
      {
        children: detail?.concurrent && detail?.concurrent === '0' ? '允许' : '禁止',
        key: 'concurrent',
        label: '是否并发',
        span: 3
      }
    ];
  }, [detail]);
  // const sourceFileVal = AForm.useWatch('sourceFile', form);
  useEffect(() => {
    const getDetail = async () => {
      setLoading(true);
      try {
        const res = await fetchJobLogDetail(jobLogId);
        setDetail(res.data);
      } finally {
        setLoading(false);
      }
    };
    if (jobLogId) {
      getDetail();
    }
  }, [jobLogId]);

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

export default JobLogDetailDrawer;
