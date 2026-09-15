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

import {useRef} from 'react';
import {FieldChangeData, LCGUI} from "../../../json-schema/LCGUI";
import {Control} from "../../../json-schema/SchemaTypes";
import {ConfigType} from "../../../designer/right/ConfigContent";
import G2PlotCustomController from "./G2PlotCustomController.ts";
import {DEFAULT_PLOT_RENDERER, parsePlotRendererConfig} from "../../../security/renderer-registry.ts";
import {globalMessage} from "../../../framework/message/GlobalMessage.tsx";


export default function G2PlotCustomConfig(props: ConfigType<G2PlotCustomController>) {
    const {controller} = props;
    const config = controller.getConfig()?.style;

    const rendererRef = useRef<string>(typeof config?.renderer === 'string'
        ? config.renderer
        : JSON.stringify(config?.renderer || DEFAULT_PLOT_RENDERER, null, 2));

    const onFieldChange = (fieldChangeData: FieldChangeData) => {
        const {id, data, dataFragment} = fieldChangeData;
        if (id === 'renderer') {
            rendererRef.current = data as string;
            return;
        }
        if (id === 'refreshChart') {
            try {
                controller.update({style: {renderer: parsePlotRendererConfig(rendererRef.current)}});
            } catch (error) {
                globalMessage.messageApi?.error(error instanceof Error ? error.message : '图表渲染配置无效');
            }
        }
        else
            controller.update(dataFragment);
    }

    const schema: Control = {
        key: 'style',
        type: 'grid',
        children: [
            {
                type: 'card-panel',
                label: 'G2Plot渲染配置',
                tip: '仅支持已注册图表类型和 JSON 参数，不执行 JavaScript',
                config: {
                    contentStyle: {
                        padding: 0
                    }
                },
                children: [
                    {
                        id: 'renderer',
                        type: 'code-editor',
                        value: rendererRef.current,
                        config: {
                            language: 'json',
                            height: 600
                        }
                    }
                ]
            },
            {
                type: 'button',
                id: 'refreshChart',
                config: {
                    children: '刷新图表',
                }
            }
        ]
    }


    return (
        <div style={{padding: 10}}><LCGUI schema={schema} onFieldChange={onFieldChange}/></div>
    )
}
