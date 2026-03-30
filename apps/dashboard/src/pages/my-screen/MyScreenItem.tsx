import {Popover} from 'antd';
import {PreviewOpen, Undo} from '@icon-park/react';
import {IProjectInfo, SaveType} from '../../designer/DesignerType.ts';
import URLUtil from '../../utils/URLUtil.ts';
import defaultSnapshot from '../home/image/default-snapshot.jpg';
import '../home/project-list/ProjectItem.less';

interface MyScreenItemProps {
    item: IProjectInfo;
    onUnpublish: (id: string) => void;
}

export default function MyScreenItem({item, onUnpublish}: MyScreenItemProps) {
    const {id, name, cover} = item;

    const handlePreview = () => {
        window.open(URLUtil.buildAppUrl('/view', {id: id!, saveType: SaveType.SERVER, mode: 'view'}), '_blank');
    };

    return (
        <div className="project-list-item">
            <div className="project-item-cover"
                 style={{backgroundImage: `url(${cover || defaultSnapshot})`}}>
                <div className="operate-icon-list">
                    <div className="operate-icon">
                        <Popover content="查看项目">
                            <PreviewOpen onClick={handlePreview}/>
                        </Popover>
                    </div>
                    <div className="operate-icon">
                        <Popover content="取消发布">
                            <Undo onClick={() => onUnpublish(id!)}/>
                        </Popover>
                    </div>
                </div>
            </div>
            <div className="project-item-content">
                <div className="project-name">
                    <div className="project-name-content">{name}</div>
                </div>
            </div>
        </div>
    );
}
