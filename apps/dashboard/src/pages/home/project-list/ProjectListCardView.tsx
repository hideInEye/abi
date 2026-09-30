import {useEffect, useState} from 'react';

import type {IProjectInfo} from '../../../designer/DesignerType.ts';

interface ProjectListCardViewProps {
    onOperate: (id: string, type: string) => void;
    onRename: (id: string, currentName: string) => void;
    records: IProjectInfo[];
    visibleKeys: string[];
}

export default function ProjectListCardView({onOperate, onRename, records, visibleKeys}: ProjectListCardViewProps) {
    const [openCardMenuId, setOpenCardMenuId] = useState<string | null>(null);
    const visibleKeySet = new Set(visibleKeys);

    useEffect(() => {
        if (!openCardMenuId) return undefined;
        const handleClick = (event: MouseEvent) => {
            if (!(event.target as Element | null)?.closest('.abi-card-menu-wrap')) setOpenCardMenuId(null);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [openCardMenuId]);

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
                                <span aria-hidden="true">✎</span> 编辑
                            </button>
                            <button className="abi-card-act" onClick={() => onOperate(item.id!, 'show')}>
                                <span aria-hidden="true">◉</span> 预览
                            </button>
                            <div className="abi-card-menu-wrap">
                                <button
                                    aria-expanded={openCardMenuId === String(item.id)}
                                    className="abi-card-more"
                                    onClick={event => {
                                        event.stopPropagation();
                                        setOpenCardMenuId(current => current === String(item.id) ? null : String(item.id));
                                    }}
                                    type="button"
                                >
                                    <span aria-hidden="true">⋯</span>
                                </button>
                                {openCardMenuId === String(item.id) ? (
                                    <div className="abi-card-menu">
                                        <button type="button" onClick={() => { setOpenCardMenuId(null); onRename(item.id!, item.name!); }}>重命名</button>
                                        <button type="button" onClick={() => { setOpenCardMenuId(null); onOperate(item.id!, 'clone'); }}>复制</button>
                                        <button className="danger" type="button" onClick={() => { setOpenCardMenuId(null); onOperate(item.id!, 'del'); }}>删除</button>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
