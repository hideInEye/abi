import { App, Empty, Spin, Tabs } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import PageTitle from '@/components/stateless/common/PageTitle';
import { querySkillListApi } from '@/service/api/skill';

import SkillDetailDrawer from './modules/skill-detail-drawer';
import SkillPublishDrawer from './modules/skill-publish-drawer';

import './skill.css';

type SkillItem = {
  id: number | string;
  bizName?: string;
  spaceId?: number | string;
  summary?: string;
  status?: string;
  visibility?: string;
  latestVersionId?: number | string;
  createdBy?: string;
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
          安装技能
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
              const title = item.bizName || '-';
              const namespace = item.spaceId;
              const summary = item.summary;
              return (
                <div
                  className="skill-card"
                  key={item.id}
                  onClick={() => goDetail(item)}
                >
                  <div className="skill-card__title">{title}</div>

                  {summary && <div className="skill-card__summary">{summary}</div>}

                  <div className="skill-card__meta">
                    <span className={`status-pill status-pill--${statusKey}`}>
                      {t(`page.manage.skill.status.${statusKey}` as any)}
                    </span>
                    {namespace != null && <span className="handle-tag">@{namespace}</span>}
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
        onDeleted={() => {
          setDetailOpen(false);
          fetchList();
        }}
      />
    </div>
  );
}
