import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Empty, Popover, Select, Spin, message } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';

import { AssistantIconBlock } from '@/components/AssistantIcon';
import { useAppSelector } from '@/hooks/business/useStore';
import { fetchProjectShareDetailApi, fetchProjectShareListApi } from '@/service/api/share';
import { getSpaceId } from '@/store/slice/app';

/** 分享记录行数据（字段做兼容映射，后端字段缺失时兜底展示） */
interface ShareRecordItem {
  id: string;
  shareCode: string;
  name: string;
  shareUrl: string;
  shareTime: string;
  expiration: string;
  statusLabel: string;
  /** 状态标签颜色修饰类：''=绿 当前启用 / draft=橙 编辑中 / off=灰 历史版本·已删除·已过期 */
  statusCls: string;
  icon?: string;
  apiKeys?: string[];
}

/** apiKeys 字段兼容：数组或逗号分隔串 */
function parseApiKeys(value: any): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return value.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

/** 时间格式化：去掉 T 分隔符 */
function fmtTime(t?: string | null): string {
  return t ? String(t).replace('T', ' ') : '-';
}

/** 分享状态标签：过期时间优先，其次应用状态 appStatus 四态，兜底后端 status 字段（与助手卡片状态口径一致） */
function getShareStatus(item: any): { label: string; cls: string } {
  if (item.expirationDate) {
    const t = new Date(String(item.expirationDate).replace('T', ' ')).getTime();
    if (!Number.isNaN(t) && t < Date.now()) return { label: '已过期', cls: 'off' };
  }
  // 应用状态（应用侧按钮操作后由后端同步写入）：0-已删除 1-启用中 2-已离线(历史版本) 3-编辑中
  const app = item.appStatus ?? item.app_status;
  if (app != null && app !== '') {
    const s = String(app);
    if (s === '0') return { label: '已删除', cls: 'off' };
    if (s === '2') return { label: '历史版本', cls: 'off' };
    if (s === '3') return { label: '编辑中', cls: 'draft' };
    return { label: '当前启用', cls: '' };
  }
  // appStatus 缺失兜底：大屏域 status '0'=已发布启用、'2'=取消发布；助手域 '1'=启用。仅显式停用才置灰，'0'/'1' 均视为当前启用
  const s = item.status ?? item.shareStatus;
  if (s === '2' || s === 2 || s === false || s === 'off' || s === 'disabled') return { label: '已停用', cls: 'off' };
  return { label: '当前启用', cls: '' };
}

/** 将后端分享记录映射为展示结构 */
function mapShareRecord(item: any): ShareRecordItem {
  const status = getShareStatus(item);
  return {
    id: String(item.id ?? item.shareCode ?? item.projectId ?? ''),
    // 列表接口不含密码，shareCode 用于复制时单查详情；列表缺 shareCode 时从分享链接尾段兜底
    shareCode: item.shareCode || String(item.shareUrl || '').split('/').pop() || '',
    name: item.projectName || item.appName || item.name || '-',
    shareUrl: item.shareUrl || '',
    shareTime: fmtTime(item.createTime || item.shareTime),
    expiration: item.expirationDate ? fmtTime(item.expirationDate) : '永久',
    statusLabel: status.label,
    statusCls: status.cls,
    icon: item.icon,
    apiKeys: parseApiKeys(item.apiKeys ?? item.accessKeys),
  };
}

/** 从接口响应中提取分页结构（兼容 {records}/{rows}/{list}/直接数组） */
function extractPage(data: any): { rows: any[]; total: number } {
  const page = data ?? {};
  const rows = Array.isArray(page) ? page : (page.records ?? page.rows ?? page.list ?? []);
  return { rows: Array.isArray(rows) ? rows : [], total: Number(page.total ?? (Array.isArray(rows) ? rows.length : 0)) || 0 };
}

interface ShareRecordListProps {
  /** 外部刷新信号（数值变化时回到第一页重拉，如分享成功后） */
  refreshToken?: number;
}

/**
 * 分享记录 tab（对接统一分享查询接口 /api/dashboard/api/v1/project/share/list，服务端分页）
 * type 由使用方指定：abi 我的助手=workflow
 */
const ShareRecordList: React.FC<ShareRecordListProps> = ({ refreshToken = 0 }) => {
  const spaceId = useAppSelector(getSpaceId);
  const [records, setRecords] = useState<ShareRecordItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [jumpValue, setJumpValue] = useState('');
  const [akRecord, setAkRecord] = useState<ShareRecordItem | null>(null);
  const [akList, setAkList] = useState<string[]>([]);
  const [akLoading, setAkLoading] = useState(false);

  /** 拉取分享记录（服务端分页） */
  const fetchList = useCallback(async (page: number, size: number) => {
    setLoading(true);
    try {
      const { data, error } = await fetchProjectShareListApi({
        type: 'workflow',
        spaceId: spaceId || undefined,
        current: page,
        size,
      });
      if (error) {
        setRecords([]);
        setTotal(0);
        return;
      }
      const { rows, total: t } = extractPage(data);
      setRecords(rows.map(mapShareRecord));
      setTotal(t);
    } catch (e) {
      console.error('拉取分享记录失败', e);
      setRecords([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    setCurrentPage(1);
    fetchList(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId, fetchList, refreshToken]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
      fetchList(page, pageSize);
    }
  };
  const handlePrev = () => handlePageChange(currentPage - 1);
  const handleNext = () => handlePageChange(currentPage + 1);

  const handleJump = () => {
    const page = parseInt(jumpValue, 10);
    if (!isNaN(page)) handlePageChange(page);
    setJumpValue('');
  };

  const renderPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      for (let i = 1; i <= 4; i++) pages.push(i);
      pages.push('...', totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, '...');
      for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1, '...');
      pages.push(currentPage - 1, currentPage, currentPage + 1);
      pages.push('...', totalPages);
    }
    return pages.map((page, idx) => {
      if (page === '...') return <span key={`ellipsis-${idx}`} className="page-item page-ellipsis">...</span>;
      const isActive = page === currentPage;
      return (
        <span key={page} className={`page-item ${isActive ? 'page-active' : ''}`} onClick={() => handlePageChange(page as number)}>
          {page}
        </span>
      );
    });
  };

  /** 复制分享链接 */
  const handleCopy = (r: ShareRecordItem) => {
    if (!r.shareUrl) {
      message.error('该记录暂无分享链接');
      return;
    }
    navigator.clipboard.writeText(r.shareUrl).then(() => {
      message.success('分享链接已复制到剪贴板');
    });
  };

  /** API Key 查看：优先读列表行字段，缺失时按 shareCode 单查详情 */
  const openAkList = async (r: ShareRecordItem) => {
    setAkRecord(r);
    if (r.apiKeys?.length) {
      setAkList(r.apiKeys);
      return;
    }
    setAkList([]);
    setAkLoading(true);
    try {
      const { data, error } = await fetchProjectShareDetailApi(r.shareCode);
      setAkList(!error && data ? parseApiKeys((data as any).apiKeys ?? (data as any).accessKeys) : []);
    } catch {
      setAkList([]);
    } finally {
      setAkLoading(false);
    }
  };

  const renderCardGrid = () => {
    if (records.length === 0) {
      return (
        <div className="abi-card-empty">
          <Empty description="暂无分享记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      );
    }

    return (
      <div className="abi-card-grid">
        <div className="abi-card-grid-inner">
          {records.map(r => (
            <div key={r.id || r.shareUrl} className="abi-assistant-card">
              {/* 头部：图标 + 名称/分享时间 */}
              <div className="ac-head">
                <AssistantIconBlock iconKey={r.icon} radius={12} size={42} />
                <div className="ac-main">
                  <div className="ac-title" title={r.name}>{r.name}</div>
                  <div className="ac-desc">分享时间：{r.shareTime}　过期时间：{r.expiration}</div>
                </div>
              </div>
              {/* 底部：分享状态标签 + 复制链接和密码 */}
              <div className="ac-footer">
                <span className={`ac-tag${r.statusCls ? ` ${r.statusCls}` : ''}`}>{r.statusLabel}</span>
                <div className="ac-actions">
                  {/* API Key 列表浮层：锚定按钮在卡片右侧展开，无遮罩，点击外部自动关闭 */}
                  <Popover
                    title="API Key列表"
                    trigger="click"
                    placement="right"
                    open={akRecord?.id === r.id}
                    onOpenChange={(visible) => { if (visible) openAkList(r); else setAkRecord(null); }}
                    content={
                      <Spin spinning={akLoading}>
                        {akList.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflow: 'auto', width: 300 }}>
                            {akList.map(key => (
                              <div key={key} style={{ padding: '8px 12px', background: '#f7f8fa', borderRadius: 8, color: '#262626' }}>{key}</div>
                            ))}
                          </div>
                        ) : (
                          !akLoading && <Empty description="暂无 API Key" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ width: 300, margin: '4px 0' }} />
                        )}
                      </Spin>
                    }
                  >
                    <button className="ac-btn">API Key查看</button>
                  </Popover>
                  <button className="ac-btn" onClick={() => handleCopy(r)}>复制链接</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* v5 Data Area */}
      <section className="abi-data-area">
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <Spin spinning={loading}>
            {renderCardGrid()}
          </Spin>
        </div>
        <div className="data-source-pagination">
          <span className="total-text">共 {total} 条</span>
          <div className="pagination-controls">
            <Select
              value={pageSize}
              onChange={(val: number) => { setPageSize(val); setCurrentPage(1); fetchList(1, val); }}
              options={[
                { label: '12条/页', value: 12 },
                { label: '18条/页', value: 18 },
                { label: '24条/页', value: 24 },
                { label: '30条/页', value: 30 },
              ]}
              className="page-size-select"
            />
            <button className="page-btn" disabled={currentPage === 1} onClick={handlePrev}>
              <LeftOutlined />
            </button>
            {renderPageNumbers()}
            <button className="page-btn" disabled={currentPage >= totalPages} onClick={handleNext}>
              <RightOutlined />
            </button>
            <span className="quick-jumper">
              前往
              <AInput
                className="jump-input"
                style={{ width: 48, textAlign: 'center' }}
                value={jumpValue}
                onChange={(e: any) => setJumpValue(e.target.value)}
                onPressEnter={handleJump}
              />
              页
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ShareRecordList;
