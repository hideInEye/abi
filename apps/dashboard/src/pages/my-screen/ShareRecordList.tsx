import {memo, useCallback, useEffect, useState} from 'react';
import {Empty, Input, Select} from 'antd';
import {LeftOutlined, RightOutlined} from '@ant-design/icons';
import baseApi from '../../api/BaseApi.ts';
import {globalMessage} from '../../framework/message/GlobalMessage.tsx';
import '../home/project-list/ProjectList.less';

/** 分享记录行数据（字段做兼容映射，后端字段缺失时兜底展示） */
interface ShareRecordItem {
    id: string;
    name: string;
    shareUrl: string;
    sharePassword: string;
    shareTime: string;
    expiration: string;
}

/** 时间格式化：去掉 T 分隔符 */
function fmtTime(t?: string | null): string {
    return t ? String(t).replace('T', ' ') : '-';
}

/** 将后端分享记录映射为展示结构 */
function mapShareRecord(item: any): ShareRecordItem {
    return {
        id: String(item.id ?? item.shareCode ?? item.projectId ?? ''),
        name: item.projectName || item.appName || item.name || '-',
        shareUrl: item.shareUrl || '',
        sharePassword: item.sharePassword ?? '',
        shareTime: fmtTime(item.createTime || item.shareTime),
        expiration: item.expirationDate ? fmtTime(item.expirationDate) : '永久',
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

    /** 复制链接（含密码时一并复制；链接格式对齐大屏分享弹窗的转换规则） */
    const handleCopy = (r: ShareRecordItem) => {
        if (!r.shareUrl) {
            globalMessage.messageApi?.error('该记录暂无分享链接');
            return;
        }
        const shareUrl = r.shareUrl.replace('/#/', '/').replace('/dr/', '/dashboard-share-page/');
        const text = r.sharePassword ? `分享链接：${shareUrl}\n访问密码：${r.sharePassword}` : shareUrl;
        navigator.clipboard.writeText(text).then(() => {
            globalMessage.messageApi?.success(r.sharePassword ? '分享链接和密码已复制到剪贴板' : '分享链接已复制到剪贴板');
        });
    };

    return (
        <section className="abi-data-area">
            <div className="abi-data-content">
                {records.length > 0 ? (
                    <div className="abi-card-grid">
                        <div className="abi-card-grid-inner">
                            {records.map(r => (
                                <div key={r.id || r.shareUrl} className="abi-data-card">
                                    <div className="abi-data-card-head">
                                        <div className="abi-data-card-title">
                                            <span className="abi-data-card-name" title={r.name}>{r.name}</span>
                                        </div>
                                    </div>
                                    <div className="abi-data-card-body">
                                        <div className="row"><span className="lbl">分享时间</span><span className="val">{r.shareTime}</span></div>
                                        <div className="row"><span className="lbl">过期时间</span><span className="val">{r.expiration}</span></div>
                                        <div className="row"><span className="lbl">访问密码</span><span className="val">{r.sharePassword || '无'}</span></div>
                                    </div>
                                    <div className="abi-data-card-footer">
                                        <button className="abi-card-act" onClick={() => handleCopy(r)}>复制链接</button>
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
                            {label: '12条/页', value: 12},
                            {label: '20条/页', value: 20},
                            {label: '30条/页', value: 30},
                            {label: '50条/页', value: 50},
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
