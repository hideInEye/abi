import {Dropdown} from 'antd';
import {EditOutlined, EyeOutlined, MoreOutlined} from '@ant-design/icons';

import type {IProjectInfo} from '../../../designer/DesignerType.ts';

interface ProjectListCardViewProps {
    onOperate: (id: string, type: string) => void;
    onRename: (id: string, currentName: string) => void;
    records: IProjectInfo[];
    visibleKeys: string[];
}

export default function ProjectListCardView({onOperate, onRename, records, visibleKeys}: ProjectListCardViewProps) {
    const visibleKeySet = new Set(visibleKeys);

    return (
        <div className="abi-card-grid">
            <div className="abi-card-grid-inner">
                {records.map(item => (
                    <div key={item.id} className="abi-data-card">
                        <div className="abi-data-card-head">
                            <div className="abi-data-card-title">
                                <span className="abi-data-card-name" title={item.name!}>{item.name}</span>
                            </div>
                            <span className={`abi-status-tag ${String(item.status) === '0' ? 'status-published' : String(item.status) === '2' ? 'status-sealed' : 'status-draft'}`}>
                                {String(item.status) === '0' ? '当前启用' : String(item.status) === '2' ? '历史版本' : '编辑中'}
                            </span>
                        </div>

                        <div className="abi-data-card-body">
                            {visibleKeySet.has('status') && (
                                <div className="row"><span className="lbl">状态</span><span className="val">
                                    <span className={`abi-status-tag ${String(item.status) === '0' ? 'status-published' : String(item.status) === '2' ? 'status-sealed' : 'status-draft'}`}>
                                        {String(item.status) === '0' ? '当前启用' : String(item.status) === '2' ? '历史版本' : '编辑中'}
                                    </span>
                                </span></div>
                            )}
                            {visibleKeySet.has('createTime') && (
                                <div className="row"><span className="lbl">创建时间</span><span className="val">{item.createTime || '-'}</span></div>
                            )}
                            {visibleKeySet.has('updateTime') && (
                                <div className="row"><span className="lbl">更新时间</span><span className="val">{item.updateTime || '-'}</span></div>
                            )}
                        </div>

                        <div className="abi-data-card-footer">
                            <button className="abi-card-act" onClick={() => onOperate(item.id!, 'edit')}>
                                <EditOutlined style={{marginRight: 3}}/>编辑
                            </button>
                            <button className="abi-card-act" onClick={() => onOperate(item.id!, 'show')}>
                                <EyeOutlined style={{marginRight: 3}}/>预览
                            </button>
                            <Dropdown
                                menu={{
                                    items: [
                                        {key: 'rename', label: '重命名', onClick: () => onRename(item.id!, item.name!)},
                                        {key: 'clone', label: '复制', onClick: () => onOperate(item.id!, 'clone')},
                                        {type: 'divider'},
                                        {key: 'delete', danger: true, label: '删除', onClick: () => onOperate(item.id!, 'del')},
                                    ],
                                }}
                                trigger={['click']}
                            >
                                <button
                                    className="abi-card-more"
                                    aria-label="更多操作"
                                    onClick={event => event.stopPropagation()}
                                    type="button"
                                >
                                    <MoreOutlined/>
                                </button>
                            </Dropdown>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
