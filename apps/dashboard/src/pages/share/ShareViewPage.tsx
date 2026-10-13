/*
 * Copyright © 2023-2025 puyinzhen
 * All rights reserved.
 *
 * The copyright of this work (or idea/project/document) is owned by puyinzhen. Without explicit written permission, no part of this work may be reproduced, distributed, or modified in any form for commercial purposes.
 *
 * This copyright statement applies to, but is not limited to: concept descriptions, design documents, source code, images, presentation files, and any related content.
 *
 * For permission to use this work or any part of it, please contact 1182810784@qq.com to obtain written authorization.
 */

import {useEffect, useState, useRef, lazy, Suspense} from 'react';
import {useParams} from 'react-router-dom';
import {Spin} from 'antd';
import baseApi from '../../api/BaseApi.ts';
import {globalMessage} from '../../framework/message/GlobalMessage.tsx';
import {ShareDesignerLoader} from '../../designer/loader/ShareDesignerLoader.ts';
import {DesignerMode, SaveType} from '../../designer/DesignerType.ts';
import layerManager from '../../designer/manager/LayerManager.ts';
import {observer} from 'mobx-react';
import Loading from '../../json-schema/ui/loading/Loading';
import {buildRuntimeCanvasComponents} from '../../designer/runtime/RuntimeLayerBuilder';
import canvasManager from '../../designer/header/items/canvas/CanvasManager.ts';
import ScaleAction from '../../framework/core/ScaleAction.ts';
import {destroyViewRuntime} from '../../designer/runtime/viewRuntime.ts';
import {registerAppCleanup} from '../../runtime/appCleanup.ts';

const ScreenFit = lazy(() => import('../../framework/screen-fit/ScreenFit.tsx'));

const ShareViewPage = observer(() => {
    const {shareCode = ''} = useParams<{shareCode: string}>();
    const [loading, setLoading] = useState(true);
    const [loaded, setLoaded] = useState(false);
    const loaderRef = useRef<ShareDesignerLoader | null>(new ShareDesignerLoader(DesignerMode.VIEW));

    // 进入页面，按 shareCode 免登录查询项目信息（getProjectInfo/dashboard），换出 projectId 后加载大屏
    useEffect(() => {
        if (!shareCode) return;
        const init = async () => {
            try {
                const detail = await baseApi.getShareProjectInfo('dashboard', shareCode);
                const projectId = String(detail?.projectId ?? detail?.appId ?? detail?.id ?? '');
                if (!projectId) {
                    globalMessage.messageApi?.error('获取分享信息失败');
                    setLoading(false);
                    return;
                }
                await loadProjectData(projectId);
            } catch {
                globalMessage.messageApi?.error('获取分享信息失败');
                setLoading(false);
            }
        };
        init();
    }, [shareCode]);

    useEffect(() => {
        const cleanupRuntime = registerAppCleanup(destroyViewRuntime);
        return () => {
            loaderRef.current?.cancelLoad();
            cleanupRuntime();
        };
    }, []);

    // 加载大屏数据
    const loadProjectData = async (projectId: string) => {
        try {
            const succeeded = await loaderRef.current?.load(projectId, SaveType.SERVER);
            if (!succeeded) return;
            setLoaded(true);
        } catch {
            globalMessage.messageApi?.error('加载大屏数据失败');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{
                width: '100vw',
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#fff'
            }}>
                <Spin size="large" tip="加载中..."/>
            </div>
        );
    }

    return (
        <div style={{width: '100vw', height: '100vh', background: '#fff'}}>
            {/* 大屏展示区域 */}
            {loaded && (
                <Suspense fallback={<Loading/>}>
                    <CanvasRenderer/>
                </Suspense>
            )}
        </div>
    );
});

// 大屏渲染组件
const CanvasRenderer = observer(() => {
    const {layerConfigs} = layerManager!;
    const {canvasConfig: {width, height, adaptationType}} = canvasManager;

    const canvasDom = (
        <div style={{width, height, background: '#f2f3f5', overflow: 'hidden', position: "relative"}}>
            {buildRuntimeCanvasComponents(layerConfigs)}
        </div>
    );

    return (
        <div style={{width: '100%', height: '100%'}}>
            {adaptationType && adaptationType === 'none' ? canvasDom : (
                <ScreenFit
                    width={width!}
                    height={height!}
                    mode={adaptationType}
                    scaleChange={(xScale, yScale) => {
                        ScaleAction.doScale(xScale, yScale);
                    }}
                >
                    {canvasDom}
                </ScreenFit>
            )}
        </div>
    );
});

export default ShareViewPage;
