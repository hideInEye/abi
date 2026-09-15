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

import React, {ForwardedRef, useEffect, useImperativeHandle, useRef, useState} from 'react';
import {ComponentInfoType} from "../common-component/CommonTypes.ts";
import "@amap/amap-jsapi-types";
import "./AMapComponent.less";
import AMapScaleObserver from "./AMapScaleObserver.ts";
import {globalMessage} from "../../framework/message/GlobalMessage.tsx";
import mapLoader from "./MapLoader.ts";
import {IFilterConfigType} from "../../designer/DesignerType.ts";
import {DEFAULT_MAP_RENDERER, MapRendererConfig, parseMapRendererConfig} from "../../security/renderer-registry.ts";

export interface AMapComponentStyle {
    key?: string;
    securityJsCode?: string;
    customCode?: string;
    renderer?: MapRendererConfig | string;
}

export interface AMapComponentProps {
    base?: ComponentInfoType;
    style?: AMapComponentStyle;
    filter?: IFilterConfigType;
}

type MapEventHandler = (event: unknown) => void;

export interface AMapComponentRef {
    updateConfig: (newConfig: AMapComponentProps) => void;
    setEventHandler: (eventMap: Record<string, MapEventHandler>) => void;
}

const AMapComponent = React.forwardRef((props: AMapComponentProps, ref: ForwardedRef<AMapComponentRef>) => {
    const [config, setConfig] = useState<AMapComponentProps>({...props});
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<AMap.Map>();
    const eventHandlerMap = useRef<Record<string, MapEventHandler>>({});

    useImperativeHandle(ref, () => ({
        updateConfig: (newConfig) => setConfig({...newConfig}),
        setEventHandler: (eventMap) => eventHandlerMap.current = eventMap,
        map: mapRef
    }));

    useEffect(() => {
        const observer = new AMapScaleObserver(mapContainerRef.current!);
        return () => observer.destroy();
    }, []);

    useEffect(() => {
        let active = true;
        const {key, securityJsCode} = config.style!;
        mapLoader.load(key!, securityJsCode!).then((AMap) => {
            if (!active || !AMap) return;
            if (config.style?.customCode && !config.style.renderer) {
                globalMessage.messageApi?.error('旧版地图脚本已停用，请手动迁移为 JSON 渲染配置');
                return;
            }
            try {
                const renderer = parseMapRendererConfig(config.style?.renderer || DEFAULT_MAP_RENDERER);
                mapRef.current?.destroy();
                mapRef.current = new AMap.Map(mapContainerRef.current!, renderer.options);
                mapRef.current.on('click', event => eventHandlerMap.current.click?.(event));
            } catch (error) {
                globalMessage.messageApi?.error(error instanceof Error ? error.message : '地图渲染配置无效');
            }
        })
        return () => {
            active = false;
            mapRef.current?.destroy();
            mapRef.current = undefined;
        };
    }, [config]);

    return (
        <div className={'a-map'} ref={mapContainerRef}>
            {(config.style?.key && config.style?.securityJsCode) ? undefined :
                <div className={'no-key-message'} style={{display: 'flex', alignItems: 'center' ,fontSize: '1.2rem'}}>请配置Key和密钥</div>}
        </div>
    );
});

export default AMapComponent;
