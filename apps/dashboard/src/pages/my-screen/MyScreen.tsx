import React, {memo, useEffect, useRef} from 'react';
import {Empty, Input, Modal, Pagination} from 'antd';
import {IPage, IProjectInfo} from '../../designer/DesignerType.ts';
import baseApi from '../../api/BaseApi.ts';
import {globalMessage} from '../../framework/message/GlobalMessage.tsx';
import MyScreenItem from './MyScreenItem.tsx';
import '../home/project-list/ProjectList.less';

const {Search} = Input;

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

    const fetchList = (current: number, size: number, keywords?: string) => {
        baseApi.getProjectInfoPageList({current, size, keywords, status: '0'}).then((data: IPage<IProjectInfo>) => {
            setPageData(data);
        });
    };

    const doSearch = (value: string) => {
        baseApi.getProjectInfoPageList({
            current: pageData.current,
            size: pageData.size,
            keywords: value,
            status: '0',
        }).then((data: IPage<IProjectInfo>) => {
            setPageData(data);
        });
    };

    const pageChange = (page: number, size: number) => {
        baseApi.getProjectInfoPageList({current: page, size, status: '0'}).then((data: IPage<IProjectInfo>) => {
            setPageData(data);
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
        fetchList(pageData.current, pageData.size);
    };

    useEffect(() => {
        fetchList(pageData.current, pageData.size);
    }, []);

    return (
        <div className="project-list-container">
            <h1 className="project-list-title">{title || '我的大屏'}</h1>
            <div className="project-list-header">
                <Search
                    placeholder="搜索项目"
                    className="project-list-search"
                    onSearch={doSearch}
                    style={{width: '12.5rem'}}
                />
            </div>
            <div className="project-list">
                {pageData.records.length > 0 ? (
                    pageData.records.map(item => (
                        <MyScreenItem key={item.id} item={item} onUnpublish={handleUnpublish}/>
                    ))
                ) : (
                    <div style={{
                        width: '100%',
                        flex: '0 0 100%',
                        maxWidth: '100%',
                        aspectRatio: 'unset',
                        border: '1px solid #e8e8e8',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '200px',
                        overflow: 'hidden',
                    }}>
                        <Empty description="暂无数据"/>
                    </div>
                )}
            </div>
            {pageData.records.length > 0 && (
                <Pagination
                    rootClassName="project-list-page"
                    defaultCurrent={pageData.current}
                    pageSize={pageData.size}
                    total={pageData.total}
                    onChange={pageChange}
                />
            )}
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
