import {memo, useCallback, useEffect, useState} from 'react';
import {Empty, Input, Select} from 'antd';
import {LeftOutlined, RightOutlined} from '@ant-design/icons';
import {Monitor} from '@icon-park/react';
import baseApi from '../../api/BaseApi.ts';
import {globalMessage} from '../../framework/message/GlobalMessage.tsx';
import {normalizeShareUrl} from '../../utils/ShareViewUtil.ts';
import '../home/project-list/ProjectList.less';

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
}

/** 时间格式化：去掉 T 分隔符 */
function fmtTime(t?: string | null): string {
    return t ? String(t).replace('T', ' ') : '-';
}

/** 分享状态标签：过期时间优先，其次应用状态 appStatus 四态，兜底后端 status 字段（与助手卡片状态口径一致） */
function getShareStatus(item: any): { label: string; cls: string } {
    if (item.expirationDate) {
        const t = new Date(String(item.expirationDate).replace('T', ' ')).getTime();
        if (!Number.isNaN(t) && t < Date.now()) return {label: '已过期', cls: 'off'};
    }
    // 应用状态（应用侧按钮操作后由后端同步写入）：0-已删除 1-启用中 2-已离线(历史版本) 3-编辑中
    const app = item.appStatus ?? item.app_status;
    if (app != null && app !== '') {
        const s = String(app);
        if (s === '0') return {label: '已删除', cls: 'off'};
        if (s === '2') return {label: '历史版本', cls: 'off'};
        if (s === '3') return {label: '编辑中', cls: 'draft'};
        return {label: '当前启用', cls: ''};
    }
    // appStatus 缺失兜底：大屏域 status '0'=已发布启用、'2'=取消发布；助手域 '1'=启用。仅显式停用才置灰，'0'/'1' 均视为当前启用
    const s = item.status ?? item.shareStatus;
    if (s === '2' || s === 2 || s === false || s === 'off' || s === 'disabled') return {label: '已停用', cls: 'off'};
    return {label: '当前启用', cls: ''};
}

/** 将后端分享记录映射为展示结构 */
function mapShareRecord(item: any): ShareRecordItem {
    const status = getShareStatus(item);
    return {
        id: String(item.id ?? item.shareCode ?? item.projectId ?? ''),
        // 列表接口不含密码，shareCode 用于复制时单查详情；列表缺 shareCode 时从分享链接尾段兜底
        shareCode: item.shareCode || String(item.shareUrl || '').split('/').pop() || '',
        name: item.projectName || item.appName || item.name || '-',
        // 后端旧路径 dashboard_share_page 过渡期直接替换为新路径 share_url
        shareUrl: normalizeShareUrl(item.shareUrl),
        shareTime: fmtTime(item.createTime || item.shareTime),
        expiration: item.expirationDate ? fmtTime(item.expirationDate) : '永久',
        statusLabel: status.label,
        statusCls: status.cls,
    };
}

/**
 * 我的大屏 - 分享记录 tab
 * 对接统一分享查询接口 /dashboard/api/v1/project/share/list（type=dashboard），服务端分页。
 */
const ShareRecordList = memo(() => {
    const [records, setRecords] = useState<ShareRecordItem[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(12);
    const [jumpValue, setJumpValue] = useState('');

    const fetchList = useCallback((current: number, size: number) => {
        const spaceId = Number(localStorage.getItem('spaceId')) || undefined;
        setLoading(true);
        baseApi.getShareProjectList({type: 'dashboard', spaceId, current, size})
            .then(({records: rows, total: t}) => {
                setRecords(rows.map(mapShareRecord));
                setTotal(t);
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchList(1, pageSize);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 主应用切换空间时广播事件，回到第 1 页重新拉取
    useEffect(() => {
        const handleSpaceChange = () => {
            setCurrentPage(1);
            fetchList(1, pageSize);
        };
        window.addEventListener('abi-dashboard:space-change', handleSpaceChange);
        return () => window.removeEventListener('abi-dashboard:space-change', handleSpaceChange);
    }, [fetchList, pageSize]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const pageChange = (page: number, size: number) => {
        setCurrentPage(page);
        setPageSize(size);
        fetchList(page, size);
    };

    const handlePrev = () => {
        if (currentPage > 1) pageChange(currentPage - 1, pageSize);
    };
    const handleNext = () => {
        if (currentPage < totalPages) pageChange(currentPage + 1, pageSize);
    };
    const handleJump = () => {
        const p = parseInt(jumpValue, 10);
        if (p >= 1 && p <= totalPages) pageChange(p, pageSize);
        setJumpValue('');
    };

    const renderPageNumbers = () => {
        const pages: number[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push(-1);
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            if (currentPage < totalPages - 2) pages.push(-2);
            pages.push(totalPages);
        }
        return pages.map(p => {
            if (p < 0) return <span key={p} className="page-item page-ellipsis">...</span>;
            return (
                <span
                    key={p}
                    className={`page-item${p === currentPage ? ' page-active' : ''}`}
                    onClick={() => pageChange(p, pageSize)}
                >
                    {p}
                </span>
            );
        });
    };

    /** 复制链接和密码（列表接口无密码字段，点击时按 shareCode 单查分享详情取密码；链接格式对齐大屏分享弹窗的转换规则） */
    const handleCopy = async (r: ShareRecordItem) => {
        if (!r.shareUrl) {
            globalMessage.messageApi?.error('该记录暂无分享链接');
            return;
        }
        const shareUrl = normalizeShareUrl(r.shareUrl.replace('/#/', '/').replace('/dr/', '/share_url/'));
        let password = '';
        if (r.shareCode) {
            const pwd = await baseApi.getSharePassword(r.shareCode);
            if (pwd === null) {
                navigator.clipboard.writeText(shareUrl).then(() => {
                    globalMessage.messageApi?.warning('获取分享密码失败，已仅复制分享链接');
                });
                return;
            }
            password = pwd;
        }
        const text = password ? `分享链接：${shareUrl}\n访问密码：${password}` : shareUrl;
        navigator.clipboard.writeText(text).then(() => {
            globalMessage.messageApi?.success(password ? '分享链接和密码已复制到剪贴板' : '分享链接已复制到剪贴板');
        });
    };

    return (
        <section className="abi-data-area">
            <div className="abi-data-content">
                {records.length > 0 ? (
                    <div className="abi-card-grid">
                        <div className="abi-card-grid-inner">
                            {records.map(r => (
                                <div key={r.id || r.shareUrl} className="abi-assistant-card">
                                    {/* 头部：渐变图标 + 名称/分享时间/过期时间（卡片结构与助手端分享记录保持一致） */}
                                    <div className="ac-head">
                                        <div
                                            style={{
                                                alignItems: 'center',
                                                background: 'linear-gradient(135deg,#6366f1,#818cf8)',
                                                borderRadius: 12,
                                                boxShadow: '0 3px 10px rgba(99,102,241,0.35)',
                                                display: 'flex',
                                                flexShrink: 0,
                                                height: 42,
                                                justifyContent: 'center',
                                                width: 42,
                                            }}
                                        >
                                            <Monitor theme="outline" size={20} fill="#fff"/>
                                        </div>
                                        <div className="ac-main">
                                            <div className="ac-title" title={r.name}>{r.name}</div>
                                            <div className="ac-desc">分享时间：{r.shareTime}　过期时间：{r.expiration}</div>
                                        </div>
                                    </div>
                                    {/* 底部：分享状态标签 + 复制链接和密码（含密码时一并复制） */}
                                    <div className="ac-footer">
                                        <span className={`ac-tag${r.statusCls ? ` ${r.statusCls}` : ''}`}>{r.statusLabel}</span>
                                        <div className="ac-actions">
                                            {/* 密码在点击时单查详情获取，列表行无法预判有无密码，文案固定（复制内容与提示随实际密码切换） */}
                                            <button className="ac-btn" onClick={() => handleCopy(r)}>复制链接和密码</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="abi-card-empty">
                        {!loading && <Empty description="暂无分享记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                    </div>
                )}
            </div>

            <div className="data-source-pagination">
                <span className="total-text">共 {total} 条</span>
                <div className="pagination-controls">
                    <Select
                        value={pageSize}
                        onChange={(val: number) => pageChange(1, val)}
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
                    <button className="page-btn" disabled={currentPage === totalPages} onClick={handleNext}>
                        <RightOutlined />
                    </button>
                    <span className="quick-jumper">
                        前往
                        <Input
                            className="jump-input"
                            style={{width: 48, textAlign: 'center'}}
                            value={jumpValue}
                            onChange={(e: any) => setJumpValue(e.target.value)}
                            onPressEnter={handleJump}
                        />
                        页
                    </span>
                </div>
            </div>
        </section>
    );
});

export default ShareRecordList;
