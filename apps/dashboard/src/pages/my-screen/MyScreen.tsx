import React, {memo, useEffect, useRef, useState} from 'react';
import {Empty, Input, Modal, Select, Button} from 'antd';
import { LeftOutlined, RightOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import {IPage, IProjectInfo} from '../../designer/DesignerType.ts';
import baseApi from '../../api/BaseApi.ts';
import {globalMessage} from '../../framework/message/GlobalMessage.tsx';
import MyScreenItem from './MyScreenItem.tsx';
import '../home/project-list/ProjectList.less';

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

    // v5 pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(12);
    const [jumpValue, setJumpValue] = useState('');
    const [searchKeyword, setSearchKeyword] = useState('');

    const spaceId = Number(localStorage.getItem('spaceId')) || undefined;

    const fetchList = (current: number, size: number, keywords?: string) => {
        baseApi.getProjectInfoPageList({current, size, keywords, status: '0', spaceId}).then((data: IPage<IProjectInfo>) => {
            setPageData(data);
        });
    };

    const doSearch = (value: string) => {
        setSearchKeyword(value);
        baseApi.getProjectInfoPageList({
            current: 1,
            size: pageSize,
            keywords: value,
            status: '0',
            spaceId,
        }).then((data: IPage<IProjectInfo>) => {
            setPageData({...data, current: 1});
            setCurrentPage(1);
        });
    };

    const handleReset = () => {
        setSearchKeyword('');
        doSearch('');
    };

    const pageChange = (page: number, size: number) => {
        baseApi.getProjectInfoPageList({current: page, size, status: '0', spaceId}).then((data: IPage<IProjectInfo>) => {
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
        await baseApi.updateProject({id, status: '1'} as IProjectInfo);
        globalMessage.messageApi?.success('已取消发布');
        setUnpublishDialog(false);
        fetchList(currentPage, pageSize, searchKeyword);
    };

    useEffect(() => {
        fetchList(pageData.current, pageData.size);
    }, []);

    return (
        <div className="project-list-container">
            {/* v5 Searchbar */}
            <section className="abi-searchbar">
                <div className="abi-search-row">
                    <Input 
                        placeholder="搜索项目名称"
                        prefix={<SearchOutlined style={{color: '#a3b3c8'}} />}
                        allowClear
                        className="abi-field-input"
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        onPressEnter={(e) => doSearch((e.target as any).value)}
                        style={{width: '220px'}}
                    />
                    <Button type="primary" className="btn-accent-gradient" onClick={() => doSearch(searchKeyword)}>
                        <SearchOutlined /> 查询
                    </Button>
                    <Button className="btn-ghost-v5" onClick={handleReset}>
                        <ReloadOutlined /> 重置
                    </Button>
                </div>
            </section>

            {/* v5 Data Area */}
            <section className="abi-data-area">
                <div className="abi-data-content">
                    {pageData.records.length > 0 ? (
                        <div className="project-list">
                            {pageData.records.map(item => (
                                <MyScreenItem key={item.id} item={item} onUnpublish={handleUnpublish}/>
                            ))}
                        </div>
                    ) : (
                        <div className="project-list-empty">
                            <Empty description="暂无已发布的大屏"/>
                        </div>
                    )}
                </div>

                <div className="data-source-pagination">
                    <span className="total-text">共 {totalCount} 条</span>
                    <div className="pagination-controls">
                        <Select
                            value={pageSize}
                            onChange={(val: number) => { setPageSize(val); setCurrentPage(1); pageChange(1, val); }}
                            options={[
                                { label: '12条/页', value: 12 },
                                { label: '20条/页', value: 20 },
                                { label: '30条/页', value: 30 },
                                { label: '50条/页', value: 50 },
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

            <Modal
                title="确认"
                open={unpublishDialog}
                onOk={confirmUnpublish}
                onCancel={() => setUnpublishDialog(false)}
                okText="确认"
                cancelText="取消"
            >
                <div style={{color: '#aeaeae', padding: 10}}>确认要取消发布吗？</div>
            </Modal>
        </div>
    );
});

export default MyScreen;
