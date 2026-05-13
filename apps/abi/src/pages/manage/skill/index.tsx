import { DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { App, Empty, Spin, Tabs } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import PageTitle from '@/components/stateless/common/PageTitle';
import { deleteSkillApi, querySkillListApi } from '@/service/api/skill';

import SkillDetailDrawer from './modules/skill-detail-drawer';
import SkillPublishDrawer from './modules/skill-publish-drawer';

import './skill.css';

type SkillItem = {
  skillId: number | string;
  name?: string;
  skillName?: string;
  title?: string;
  namespace?: string;
  namespaceSlug?: string;
  spaceId?: number | string;
  spaceName?: string;
  summary?: string;
  description?: string;
  changelog?: string;
  version?: string;
  latestVersion?: string;
  status?: string;
  downloadCount?: number;
  downloads?: number;
  createTime?: string;
  updateTime?: string;
};

type StatusKey = 'published' | 'hidden' | 'archived' | 'review' | 'rejected' | 'scanning';

function resolveStatusKey(status?: string): StatusKey {
  // 后端：0 禁用 / 1 启用
  if (status === '1' || status === 'PUBLISHED') return 'published';
  if (status === '0' || status === 'HIDDEN') return 'hidden';
  if (status === 'ARCHIVED') return 'archived';
  if (status === 'PENDING_REVIEW') return 'review';
  if (status === 'REJECTED') return 'rejected';
  if (status === 'SCANNING' || status === 'UPLOADED') return 'scanning';
  return 'published';
}

export function Component() {
  const { t } = useTranslation();
  const { modal, message } = App.useApp();

  const [filter, setFilter] = useState<'ALL' | '1' | '0'>('ALL');
  const [list, setList] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeSkill, setActiveSkill] = useState<SkillItem | null>(null);

  async function fetchList() {
    setLoading(true);
    try {
      const params: { status?: string } = {};
      if (filter !== 'ALL') params.status = filter;
      const res: any = await querySkillListApi(params);
      const rows = res?.response?.data?.data?.rows || res?.response?.data?.rows || res?.data?.rows || res?.data?.data || res?.data || [];
      setList(Array.isArray(rows) ? rows : []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  function goPublish() {
    setPublishOpen(true);
  }

  function goDetail(item: SkillItem) {
    setActiveSkill(item);
    setDetailOpen(true);
  }

  function handleDelete(item: SkillItem) {
    modal.confirm({
      title: t('page.manage.skill.deleteConfirmTitle'),
      content: t('page.manage.skill.deleteConfirmContent', { name: item.skillName || item.name || item.title || '' }),
      okType: 'danger',
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        const res: any = await deleteSkillApi({ skillId: item.skillId });
        if (res?.response?.data?.code === 200 || res?.data) {
          message.success(t('common.deleteSuccess'));
          fetchList();
        }
      }
    });
  }

  const filterItems = useMemo(
    () => [
      { key: 'ALL', label: t('page.manage.skill.filter.all') },
      { key: '1', label: t('page.manage.skill.filter.published') },
      { key: '0', label: t('page.manage.skill.filter.hidden') }
    ],
    [t]
  );

  return (
    <div className="skill-hub-scope h-full overflow-auto p-24px">
      <div className="mb-16px flex items-center justify-between">
        <PageTitle />
        <AButton
          type="primary"
          onClick={goPublish}
        >
          新增
        </AButton>
      </div>

      <Tabs
        activeKey={filter}
        className="skill-filter-tabs"
        items={filterItems}
        onChange={k => setFilter(k as any)}
      />

      <Spin spinning={loading}>
        {list.length === 0 && !loading ? (
          <div className="py-80px">
            <Empty description={t('page.manage.skill.empty')} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-16px md:grid-cols-2 xl:grid-cols-3">
            {list.map(item => {
              const statusKey = resolveStatusKey(item.status);
              const title = item.skillName || item.name || item.title || '-';
              const namespace = item.namespaceSlug || item.namespace || item.spaceName;
              const version = item.latestVersion || item.version;
              const downloads = item.downloadCount ?? item.downloads ?? 0;
              const summary = item.summary || item.description || item.changelog;
              return (
                <div
                  className="skill-card"
                  key={item.skillId}
                  onClick={() => goDetail(item)}
                >
                  <div className="skill-card__title">{title}</div>

                  {summary && <div className="skill-card__summary">{summary}</div>}

                  <div className="skill-card__meta">
                    {namespace && <span className="handle-tag">@{String(namespace).replace(/^@/, '')}</span>}
                    {version && <span>v{version}</span>}
                    <span>
                      {t('page.manage.skill.downloads')}：{downloads}
                    </span>
                  </div>

                  <div className="skill-card__footer">
                    <span className={`status-pill status-pill--${statusKey}`}>
                      {t(`page.manage.skill.status.${statusKey}` as any)}
                    </span>
                    <div
                      className="flex items-center gap-4px"
                      onClick={e => e.stopPropagation()}
                    >
                      <AButton
                        icon={<EyeOutlined />}
                        size="small"
                        type="text"
                        onClick={() => goDetail(item)}
                      >
                        {t('page.manage.skill.view')}
                      </AButton>
                      <AButton
                        danger
                        icon={<DeleteOutlined />}
                        size="small"
                        type="text"
                        onClick={() => handleDelete(item)}
                      >
                        {t('common.delete')}
                      </AButton>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Spin>

      <SkillPublishDrawer
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        onSuccess={fetchList}
      />

      <SkillDetailDrawer
        open={detailOpen}
        skill={activeSkill}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}
