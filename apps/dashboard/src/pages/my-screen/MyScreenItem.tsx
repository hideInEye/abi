import {useState} from 'react';
import {PreviewOpen, Share, Undo} from '@icon-park/react';
import {IProjectInfo, SaveType} from '../../designer/DesignerType.ts';
import {LazyFeatureFallback, RetryableLazy} from '../../runtime/RetryableLazy.tsx';
import URLUtil from '../../utils/URLUtil.ts';
import defaultSnapshot from '../home/image/default-snapshot.jpg';
import '../home/project-list/ProjectItem.less';

const loadShareDialog = () => import('./MyScreenShareDialog.tsx');

interface MyScreenItemProps {
    item: IProjectInfo;
    onUnpublish: (id: string) => void;
}

export default function MyScreenItem({item, onUnpublish}: MyScreenItemProps) {
    const {id, name, cover} = item;
    const [shareModalVisible, setShareModalVisible] = useState(false);

    const handlePreview = () => {
        window.open(URLUtil.buildAppUrl('/view', {id: id!, saveType: SaveType.SERVER, mode: 'view'}), '_blank');
    };

    return (
        <div className="project-list-item">
            <div className="project-item-cover"
                 style={{backgroundImage: `url(${cover || defaultSnapshot})`, aspectRatio: 'unset', height: '105px'}}>
                <div className="operate-icon-list">
                    <button type="button" className="operate-icon" title="查看项目" onClick={handlePreview}>
                        <PreviewOpen/>
                    </button>
                    <button type="button" className="operate-icon" title="取消发布" onClick={() => onUnpublish(id!)}>
                        <Undo/>
                    </button>
                    <button
                        type="button"
                        className="operate-icon"
                        title="分享项目"
                        onClick={() => setShareModalVisible(true)}
                        onFocus={() => void loadShareDialog()}
                        onMouseEnter={() => void loadShareDialog()}
                    >
                        <Share/>
                    </button>
                </div>
            </div>
            <div className="project-item-content">
                <div className="project-name">
                    <div className="project-name-content">{name}</div>
                </div>
            </div>
            {shareModalVisible ? (
                <RetryableLazy
                    loader={loadShareDialog}
                    componentProps={{
                        onClose: () => setShareModalVisible(false),
                        open: shareModalVisible,
                        projectId: String(id ?? ''),
                    }}
                    fallback={<LazyFeatureFallback label="正在加载分享设置…" style={{position: 'fixed', inset: 0, zIndex: 1000, minHeight: '100vh'}}/>}
                />
            ) : null}
        </div>
    );
}
