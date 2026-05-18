import { MoreOutlined } from '@ant-design/icons';
import { App, Dropdown, Empty, Spin, Switch, Tabs } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import PageTitle from '@/components/stateless/common/PageTitle';
import { deleteSkillApi, querySkillListApi } from '@/service/api/skill';

import SkillDetailDrawer from './modules/skill-detail-drawer';
import SkillPublishDrawer from './modules/skill-publish-drawer';

import './skill.css';

type SkillItem = {
  id: number | string;
  bizName?: string;
  spaceId?: number | string;
  spaceName?: string;
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
  const { message, modal } = App.useApp();

  const [filter, setFilter] = useState<'ALL' | '1' | '0'>('ALL');
  const [list, setList] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeSkill, setActiveSkill] = useState<SkillItem | null>(null);
  // 更新文件弹窗
  const [updateOpen, setUpdateOpen] = useState(false);
  const [updatingSkill, setUpdatingSkill] = useState<SkillItem | null>(null);

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

  function openUpdate(item: SkillItem) {
    setUpdatingSkill(item);
    setUpdateOpen(true);
  }

  function confirmDelete(item: SkillItem) {
    modal.confirm({
      title: '确认删除该技能？',
      content: `将删除${item.bizName}，删除后不可恢复。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          await deleteSkillApi({ skillId: item.id });
          message.success('删除成功');
          fetchList();
        } catch (err: any) {
          message.error(err?.message || '删除失败');
        }
      }
    });
  }

  // 切换启用/隐藏：后端修改接口待提供，暂先乐观更新本地列表并提示
  function toggleSkillStatus(item: SkillItem, checked: boolean) {
    const nextStatus = checked ? '1' : '0';
    setList(prev => prev.map(it => (it.id === item.id ? { ...it, status: nextStatus } : it)));
    message.info(checked ? '已启用（待后端修改接口对接）' : '已隐藏（待后端修改接口对接）');
    // TODO: 后端提供状态修改接口后，在这里调用并根据响应 fetchList()
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
                  <div className="skill-card__actions" onClick={e => e.stopPropagation()}>
                    <Switch
                      checked={String(item.status) === '1'}
                      onChange={checked => toggleSkillStatus(item, checked)}
                    />
                    <Dropdown
                      trigger={['click']}
                      placement="bottomRight"
                      menu={{
                        items: [
                          { key: 'update', label: '更新技能' },
                          { type: 'divider' },
                          { key: 'delete', label: <span style={{ color: '#ff4d4f' }}>删除</span> }
                        ],
                        onClick: ({ domEvent, key }) => {
                          domEvent?.stopPropagation?.();
                          if (key === 'update') openUpdate(item);
                          else if (key === 'delete') confirmDelete(item);
                        }
                      }}
                    >
                      <button
                        type="button"
                        className="skill-card__more"
                        aria-label="more"
                        onClick={e => e.stopPropagation()}
                      >
                        <MoreOutlined />
                      </button>
                    </Dropdown>
                  </div>

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

      <SkillPublishDrawer
        mode="update"
        open={updateOpen}
        skill={updatingSkill}
        onClose={() => setUpdateOpen(false)}
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
