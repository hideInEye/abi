import { message } from 'antd';

import { fetchJobLogContent, fetchJobLogDetail, killJobLog } from '@/service/api/job';
import { isJobRequestSuccess, resolveJobLogStatus } from '../../utils';
import CommonDrawer from '@/components/stateless/common/CommonDrawer';

type Props = {
  jobLogId: string;
  onClose: () => void;
  onRefresh?: () => void;
};

const PRE_STYLE: React.CSSProperties = {
  background: 'rgba(130,140,200,0.08)',
  borderRadius: 8,
  margin: 0,
  minHeight: 200,
  overflow: 'auto',
  padding: 12,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
};

// 执行日志查看器：日志内容滚动加载 + 运行中终止
const JobLogDetailDrawer: FC<Props> = memo(({ jobLogId, onClose, onRefresh }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<any>();
  const [logText, setLogText] = useState('');
  // 0 表示日志已拉完，不再显示「加载更多」
  const [nextFromLine, setNextFromLine] = useState(0);

  const loadContent = async (fromLineNum: number, append: boolean) => {
    const res: any = await fetchJobLogContent(jobLogId, fromLineNum);
    const content = res?.data;
    const appendText = typeof content === 'string' ? content : (content?.logContent ?? '');
    const isEnd = typeof content === 'string' ? true : (content?.isEnd ?? true);
    setLogText(prev => (append ? prev + appendText : appendText));
    setNextFromLine(isEnd ? 0 : (Number(content?.toLineNum) || 0) + 1);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const res: any = await fetchJobLogDetail(jobLogId);
      setDetail(res?.data);
      setLogText('');
      await loadContent(1, false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (jobLogId) {
      loadAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobLogId]);

  const handleKill = async () => {
    const res: any = await killJobLog(jobLogId);
    if (!isJobRequestSuccess(res)) return;
    message.success('终止成功');
    onRefresh?.();
    await loadAll();
  };

  return (
    <CommonDrawer
      loading={loading}
      open={true}
      title="执行日志"
      width={600}
      footer={
        <AFlex justify="flex-end" gap={8}>
          {resolveJobLogStatus(detail) === 'running' && (
            <AButton danger onClick={handleKill}>终止作业</AButton>
          )}
          {nextFromLine > 0 && (
            <AButton onClick={() => loadContent(nextFromLine, true)}>加载更多</AButton>
          )}
          <AButton onClick={onClose}>{t('common.close')}</AButton>
        </AFlex>
      }
      onClose={onClose}
    >
      <pre style={PRE_STYLE}>{logText || '暂无日志内容'}</pre>
    </CommonDrawer>
  );
});

export default JobLogDetailDrawer;
