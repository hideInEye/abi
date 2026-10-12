import React, {memo, useEffect, useRef, useState} from 'react';
import {Empty, Input, Select} from 'antd';
import {LeftOutlined, RightOutlined} from '@ant-design/icons';
import type {Dayjs} from 'dayjs';
import type {IPage, IProjectInfo} from '../../designer/DesignerType.ts';
import {LazyFeatureFallback, RetryableLazy} from '../../runtime/RetryableLazy.tsx';
import MyScreenItem from './MyScreenItem.tsx';
import {SearchFilterBar} from '../home/project-list/SearchFilterBar.tsx';
import '../home/project-list/ProjectList.less';

const loadBaseApi = () => import('../../api/BaseApi.ts').then(module => module.default);
const loadDateRangeFilter = () => import('./MyScreenDateRangeFilter.tsx');
const loadShareRecordList = () => import('./ShareRecordList.tsx');
const loadUnpublishDialog = () => import('./MyScreenUnpublishDialog.tsx');

type MyScreenTab = 'published' | 'share';

interface MyScreenProps {
    title?: string;
}

const MyScreen = memo(({ title }: MyScreenProps) => {
    const [pageData, setPageData] = React.useState<IPage<IProjectInfo>>({
        records: [],
        total: 0,
        current: 1,
        size: 12,
    });
    const unpublishIdRef = useRef<string>('');
    const [unpublishDialog, setUnpublishDialog] = React.useState(false);
    // 页签：已发布大屏 / 分享记录
    const [activeTab, setActiveTab] = useState<MyScreenTab>('published');

    // v5 pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(12);
    const [jumpValue, setJumpValue] = useState('');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

    const spaceId = Number(localStorage.getItem('spaceId')) || undefined;

    const fetchList = async (current: number, size: number, keywords?: string) => {
        const baseApi = await loadBaseApi();
        return baseApi.getProjectInfoPageList({current, size, keywords, status: '0', spaceId}).then((data: IPage<IProjectInfo>) => {
            setPageData(data);
        });
    };

    const runQuery = async (overrides?: {keyword?: string; range?: [Dayjs | null, Dayjs | null] | null}) => {
        const kw = overrides?.keyword !== undefined ? overrides.keyword : searchKeyword;
        const range = overrides?.range !== undefined ? overrides.range : dateRange;
        const startTime = range?.[0] ? range[0].startOf('day').format('YYYY-MM-DD HH:mm:ss') : undefined;
        const endTime = range?.[1] ? range[1].endOf('day').format('YYYY-MM-DD HH:mm:ss') : undefined;
        const baseApi = await loadBaseApi();
        return baseApi.getProjectInfoPageList({
            current: 1,
            size: pageSize,
            keywords: kw,
            status: '0',
            spaceId,
            startTime,
            endTime,
        }).then((data: IPage<IProjectInfo>) => {
            setPageData({...data, current: 1});
            setCurrentPage(1);
        });
    };

    const handleReset = () => {
        setSearchKeyword('');
        setDateRange(null);
        runQuery({keyword: '', range: null});
    };

    const pageChange = async (page: number, size: number) => {
        const baseApi = await loadBaseApi();
        return baseApi.getProjectInfoPageList({current: page, size, status: '0', spaceId}).then((data: IPage<IProjectInfo>) => {
            setPageData({...data, current: page, size});
            setCurrentPage(page);
            setPageSize(size);
        });
    };

    // v5 custom pagination helpers
    const totalCount = pageData.total || 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

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

    const handleUnpublish = (id: string) => {
        unpublishIdRef.current = id;
        setUnpublishDialog(true);
    };

    const confirmUnpublish = async () => {
        const id = unpublishIdRef.current;
        const baseApi = await loadBaseApi();
        await baseApi.updateProject({id, status: '2'} as IProjectInfo);
        const {globalMessage} = await import('../../framework/message/GlobalMessage.tsx');
        globalMessage.messageApi?.success('已取消发布');
        // 取消发布=历史版本(2)：同步分享记录应用状态（大屏 status '2'→appStatus 2）
        baseApi.syncShareAppStatus(id, 2);
        setUnpublishDialog(false);
        fetchList(currentPage, pageSize, searchKeyword);
    };

    useEffect(() => {
        void fetchList(pageData.current, pageData.size);
    }, []);

    // 主应用顶部切换空间时，大屏微应用会广播该事件；重置筛选并回到第 1 页按新空间重新拉取
    useEffect(() => {
        const handleSpaceChange = () => {
            const nextSpaceId = Number(localStorage.getItem('spaceId')) || undefined;
            setSearchKeyword('');
            setDateRange(null);
            setCurrentPage(1);
            void loadBaseApi().then(baseApi => (
                baseApi.getProjectInfoPageList({
                    current: 1,
                    size: pageSize,
                    status: '0',
                    spaceId: nextSpaceId,
                }).then((data: IPage<IProjectInfo>) => {
                    setPageData({...data, current: 1, size: pageSize});
                })
            ));
        };
        window.addEventListener('abi-dashboard:space-change', handleSpaceChange);
        return () => window.removeEventListener('abi-dashboard:space-change', handleSpaceChange);
    }, [pageSize]);

    return (
        <div className="project-list-container">
            {/* 页签：已发布大屏 / 分享记录 */}
            <div className="my-screen-tabs">
                <button
                    type="button"
                    className={`my-screen-tab${activeTab === 'published' ? ' active' : ''}`}
                    onClick={() => setActiveTab('published')}
                >
                    已发布大屏
                </button>
                <button
                    type="button"
                    className={`my-screen-tab${activeTab === 'share' ? ' active' : ''}`}
                    onClick={() => setActiveTab('share')}
                    onFocus={() => void loadShareRecordList()}
                    onMouseEnter={() => void loadShareRecordList()}
                >
                    分享记录
                </button>
            </div>

            {activeTab === 'share' ? (
                <RetryableLazy
                    loader={loadShareRecordList}
                    componentProps={{}}
                    fallback={<LazyFeatureFallback label="正在加载分享记录…" style={{width: '100%', minHeight: 240}}/>}
                />
            ) : (
            <>
            {/* v5 Searchbar */}
            <section className="abi-searchbar">
                <SearchFilterBar
                    searchPlaceholder="搜索项目名称"
                    searchValue={searchKeyword}
                    onSearchChange={setSearchKeyword}
                    onQuery={() => runQuery()}
                    onReset={handleReset}
                    filters={
                        <RetryableLazy
                            loader={loadDateRangeFilter}
                            componentProps={{onChange: setDateRange, value: dateRange}}
                            fallback={<LazyFeatureFallback label="正在加载日期筛选…" style={{height: 64, minHeight: 64, width: '100%'}}/>}
                        />
                    }
                />
            </section>

            {/* v5 Data Area */}
            <section className="abi-data-area">
                <div className="abi-data-content">
                    {pageData.records.length > 0 ? (
                        <div className="abi-card-grid">
                            <div className="abi-card-grid-inner">
                                {pageData.records.map(item => (
                                    <MyScreenItem key={item.id} item={item} onUnpublish={handleUnpublish}/>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="abi-card-empty">
                            <Empty description="暂无当前启用的大屏" image={Empty.PRESENTED_IMAGE_SIMPLE}/>
                        </div>
                    )}
                </div>

                <div className="data-source-pagination">
                    <span className="total-text">共 {totalCount} 条</span>
                    <div className="pagination-controls">
                        <Select
                            aria-label="每页条数"
                            value={pageSize}
                            onChange={(value: number) => {
                                setPageSize(value);
                                setCurrentPage(1);
                                pageChange(1, value);
                            }}
                            options={[
                                {label: '12条/页', value: 12},
                                {label: '18条/页', value: 18},
                                {label: '24条/页', value: 24},
                                {label: '30条/页', value: 30},
                            ]}
                            className="page-size-select"
                        />
                        <button className="page-btn" disabled={currentPage === 1} onClick={handlePrev}>
                            <LeftOutlined/>
                        </button>
                        {renderPageNumbers()}
                        <button className="page-btn" disabled={currentPage === totalPages} onClick={handleNext}>
                            <RightOutlined/>
                        </button>
                        <span className="quick-jumper">
                            前往
                            <Input
                                aria-label="跳转页码"
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

            {unpublishDialog ? (
                <RetryableLazy
                    loader={loadUnpublishDialog}
                    componentProps={{
                        onCancel: () => setUnpublishDialog(false),
                        onConfirm: confirmUnpublish,
                        open: unpublishDialog,
                    }}
                    fallback={<LazyFeatureFallback label="正在加载确认窗口…" style={{position: 'fixed', inset: 0, zIndex: 1000, minHeight: '100vh'}}/>}
                />
            ) : null}
            </>
            )}
        </div>
    );
});

export default MyScreen;
