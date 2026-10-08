import {Button, Dropdown, Empty, Popconfirm, Table} from 'antd';
import {CopyOutlined, DeleteOutlined, DownOutlined, EditOutlined, EyeOutlined} from '@ant-design/icons';
import type {Key} from 'react';

import type {IProjectInfo} from '../../../designer/DesignerType.ts';

interface ProjectListTableViewProps {
    loading: boolean;
    onOperate: (id: string, type: string) => void;
    onRename: (id: string, currentName: string) => void;
    onSelectionChange: (keys: Key[]) => void;
    records: IProjectInfo[];
    selectedRowKeys: Key[];
    visibleKeys: string[];
}

export default function ProjectListTableView({
    loading,
    onOperate,
    onRename,
    onSelectionChange,
    records,
    selectedRowKeys,
    visibleKeys,
}: ProjectListTableViewProps) {
    const visibleKeySet = new Set(visibleKeys);
    const columns = [
        {
            align: 'left' as const,
            className: 'col-project-name col-first-data',
            dataIndex: 'name',
            key: 'name',
            minWidth: 180,
            onHeaderCell: () => ({className: 'col-project-name col-first-data'}),
            render: (text: string) => <span style={{color: '#1a2744', fontWeight: 600}}>{text}</span>,
            title: '项目名称',
        },
        {
            align: 'center' as const,
            dataIndex: 'status',
            key: 'status',
            minWidth: 100,
            render: (status: string) => {
                const statusMap: Record<string, {cls: string; text: string}> = {
                    '0': {cls: 'status-published', text: '当前启用'},
                    '1': {cls: 'status-draft', text: '编辑中'},
                    '2': {cls: 'status-sealed', text: '历史版本'},
                };
                const state = statusMap[status] || {cls: '', text: '-'};
                return <span className={`abi-status-tag ${state.cls}`}>{state.text}</span>;
            },
            title: '状态',
        },
        {align: 'center' as const, dataIndex: 'createTime', key: 'createTime', minWidth: 160, title: '创建时间'},
        {align: 'center' as const, dataIndex: 'updateTime', key: 'updateTime', minWidth: 160, title: '更新时间'},
        {
            align: 'center' as const,
            fixed: 'right' as const,
            key: 'action',
            minWidth: 200,
            render: (_: unknown, record: IProjectInfo) => (
                <div className="ds-action-group">
                    <Button className="abi-action-link" size="small" type="link" onClick={() => onOperate(record.id!, 'edit')}>
                        <EditOutlined style={{fontSize: 12, marginRight: 3}}/>编辑
                    </Button>
                    <Button className="abi-action-link" size="small" type="link" onClick={() => onOperate(record.id!, 'show')}>
                        <EyeOutlined style={{fontSize: 12, marginRight: 3}}/>预览
                    </Button>
                    <Dropdown
                        menu={{
                            items: [
                                {
                                    key: 'rename',
                                    label: <span><EditOutlined style={{marginRight: 4}}/>重命名</span>,
                                    onClick: () => onRename(record.id!, record.name!),
                                },
                                {
                                    key: 'clone',
                                    label: <span><CopyOutlined style={{marginRight: 4}}/>复制</span>,
                                    onClick: () => onOperate(record.id!, 'clone'),
                                },
                                {type: 'divider'},
                                {
                                    key: 'delete',
                                    danger: true,
                                    label: (
                                        <Popconfirm title="确定要删除该项目吗？" onConfirm={() => onOperate(record.id!, 'del')}>
                                            <span><DeleteOutlined style={{marginRight: 4}}/>删除</span>
                                        </Popconfirm>
                                    ),
                                },
                            ],
                        }}
                    >
                        <Button className="abi-action-link" size="small" type="link">
                            更多 <DownOutlined style={{fontSize: '0.625rem'}}/>
                        </Button>
                    </Dropdown>
                </div>
            ),
            title: '操作',
        },
    ].filter(column => column.key === 'action' || visibleKeySet.has(column.key));

    return (
        <div style={{border: '1px solid rgba(130,140,200,0.18)', borderRadius: 12, flex: 1, minHeight: 0, overflow: 'hidden'}}>
            <div className="abi-table-scroll" style={{maxHeight: '100%', overflow: 'auto'}}>
                <Table
                    className="project-table abi-std-table"
                    columns={columns as any}
                    dataSource={records}
                    loading={loading}
                    locale={{
                        emptyText: (
                            <div style={{alignItems: 'center', display: 'flex', height: '100%', justifyContent: 'center', width: '100%'}}>
                                <Empty description="暂无大屏" image={Empty.PRESENTED_IMAGE_SIMPLE}/>
                            </div>
                        ),
                    }}
                    pagination={false}
                    rowKey="id"
                    rowSelection={{fixed: true, onChange: onSelectionChange, selectedRowKeys}}
                    scroll={records.length > 0 ? {x: 'max-content'} : undefined}
                    size="middle"
                />
            </div>
        </div>
    );
}
