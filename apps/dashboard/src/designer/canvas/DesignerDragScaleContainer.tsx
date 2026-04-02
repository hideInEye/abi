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

import React, {memo, useEffect} from "react";
import DragScaleProvider from "../../framework/drag-scale/DragScaleProvider";
import eventOperateStore from "../operate-provider/EventOperateStore";
import {observer} from "mobx-react";
import ScaleAction from "../../framework/core/ScaleAction.ts";
import canvasManager from "../header/items/canvas/CanvasManager.ts";

export interface DesignerDragScaleContainerProps {
    children?: React.ReactNode;
    onDoubleClick?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
}

const DesignerDragScaleContainer = memo(observer((props: DesignerDragScaleContainerProps) => {
    const {children, onDoubleClick} = props;
    const containerRef = React.useRef<HTMLDivElement>(null);
    const contentRef = React.useRef<HTMLDivElement>(null);
    const {canvasConfig} = canvasManager!;
    const dragScaleProviderRef = React.useRef<DragScaleProvider | null>(null);

    useEffect(() => {
        const container = containerRef.current;
        const content = contentRef.current;
        if (container && content) {
            const {setDsContentRef} = eventOperateStore;
            setDsContentRef(content)
            // 先以默认 scale=1 创建，确保拖拽/缩放事件立即可用
            const dragScaleProvider = new DragScaleProvider({
                eventContainer: container,
                dsTarget: content,
                scaleCallback: (dsData) => {
                    const {scale, ratio} = dsData;
                    const {setScale, setRatio, rulerRef} = eventOperateStore;
                    setScale(scale);
                    setRatio(ratio);
                    rulerRef?.ruleWheel();
                    ScaleAction.doScale(dsData.scale, dsData.scale);
                },
                dragCallback: () => {
                    const {rulerRef} = eventOperateStore;
                    rulerRef?.ruleDrag();
                },
            });
            dragScaleProviderRef.current = dragScaleProvider;

            // 延迟一帧：确保所有兄弟/父组件 useEffect 都已执行（rulerRef 已注册），布局已稳定
            const rafId = requestAnimationFrame(() => {
                const containerW = container.clientWidth;
                const containerH = container.clientHeight;
                const canvasW = (canvasConfig?.width as number) || 1920;
                const canvasH = (canvasConfig?.height as number) || 1080;
                const initScale = Math.min(containerW / canvasW, containerH / canvasH, 1);
                // 补偿 transform-origin(center) 导致的视觉偏移
                const initX = -(canvasW * (1 - initScale)) / 2;
                const initY = -(canvasH * (1 - initScale)) / 2;

                // 更新 DragScaleProvider 内部状态（scale + position + transform 同步）
                dragScaleProvider.setTransform(initScale, {x: initX, y: initY});

                // 同步缩放状态到 store 并更新标尺
                const {setScale, setRatio, rulerRef} = eventOperateStore;
                setScale(initScale);
                setRatio(initScale);
                ScaleAction.doScale(initScale, initScale);
                rulerRef?.ruleWheel();
            });

            return () => {
                cancelAnimationFrame(rafId);
                dragScaleProvider.destroy();
            }
        }
    }, []);
    return (
        <div className={'designer-ds-container'} ref={containerRef}
             style={{
                 overflow: "hidden",
                 height: window.innerHeight - 110,
                 width: window.innerWidth - 115,
                 backgroundColor: '#434343',
                 position: 'relative'
             }}>
            <div className={'designer-ds-content lc-drag-scale-provider'}
                 id={'designer-ds-content'}
                 ref={contentRef}
                 onDoubleClick={onDoubleClick}
                 style={{
                     width: canvasConfig?.width,
                     height: canvasConfig?.height,
                     background: '#1e1e2f',
                     position: 'absolute',
                 }}>
                {children}
            </div>
        </div>
    )
}))

export default DesignerDragScaleContainer;
