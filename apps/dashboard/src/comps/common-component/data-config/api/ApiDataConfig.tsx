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

import AbstractDesignerController from "../../../../framework/core/AbstractDesignerController.ts";
import {APIConfig} from "../../../../designer/DesignerType.ts";
import {useRef, useState} from "react";
import ObjectUtil from "../../../../utils/ObjectUtil.ts";
import {Control} from "../../../../json-schema/SchemaTypes.ts";
import {globalMessage} from "../../../../framework/message/GlobalMessage.tsx";
import {FieldChangeData, LCGUI} from "../../../../json-schema/LCGUI.tsx";
import FetchUtil from "../../../../utils/FetchUtil.ts";
import {applyDataTransform, EMPTY_DATA_TRANSFORM, parseDataTransformConfig, RuntimeConfigError} from "../../../../security/runtime-config.ts";
import {runDataRequestFlow} from "../requestFlow.ts";

export interface ApiDataConfigProps {
    controller: AbstractDesignerController;
    data: APIConfig;
}

export function ApiDataConfig(props: ApiDataConfigProps) {
    const {data, controller} = props;
    const dataRef = useRef<APIConfig>(ObjectUtil.merge({
        url: '',
        method: 'get',
        header: {},
        params: {},
        autoFlush: false,
        frequency: 5,
        filter: undefined,
    }, data));
    const apiTestResRef = useRef<string>("")
    const [count, setCount] = useState(0);

    const schema: Control = {
        type: 'grid',
        config: {gridGap: '10px'},
        children: [
            {
                key: 'url',
                type: 'input',
                label: '接口地址',
                value: dataRef.current?.url || '',
            },
            {
                key: 'method',
                label: '请求方式',
                type: 'select',
                value: dataRef.current?.method,
                config: {
                    options: [
                        {value: 'get', label: 'GET'},
                        {value: 'post', label: 'POST'},
                    ]
                }
            },
            {
                type: 'grid',
                label: '自动更新',
                config: {columns: 8},
                children: [
                    {
                        key: 'autoFlush',
                        type: 'checkbox',
                        value: !!dataRef.current?.autoFlush,
                    },
                    {
                        key: 'frequency',
                        type: 'number-input',
                        config: {
                            min: 5,
                            containerStyle: {
                                gridColumn: '2/9',
                            }
                        },
                        value: dataRef.current?.frequency || 5,
                    },
                ]
            },
            {

                type: 'card-panel',
                label: '请求头',
                tip: '请求头信息，json格式',
                config: {
                    contentStyle: {padding: 0}
                },
                children: [
                    {
                        id: 'header',
                        key: 'header',
                        type: 'code-editor',
                        config: {
                            height: 100,
                        },
                        value: JSON.stringify(dataRef.current?.header, null, 2) || '',
                    }
                ]
            },
            {
                type: 'card-panel',
                tip: '请求参数，json格式',
                label: '请求参数',
                config: {
                    contentStyle: {padding: 0}
                },
                children: [
                    {
                        id: 'params',
                        key: 'params',
                        type: 'code-editor',
                        config: {
                            height: 100,
                        },
                        value: JSON.stringify(dataRef.current?.params, null, 2) || '',
                    }
                ]
            },
            {
                type: 'card-panel',
                label: '过滤器',
                config: {
                    contentStyle: {padding: 0}
                },
                children: [
                    {
                        key: 'filter',
                        type: 'code-editor',
                        config: {
                            height: 200,
                            language: 'json'
                        },
                        value: typeof dataRef.current?.filter === 'string'
                            ? dataRef.current.filter
                            : JSON.stringify(dataRef.current?.filter || EMPTY_DATA_TRANSFORM, null, 2),
                    }
                ]
            },
            {
                type: 'card-panel',
                label: '响应结果',
                config: {
                    contentStyle: {padding: 0}
                },
                children: [
                    {
                        id: 'apiTestRes',
                        type: 'code-editor',
                        config: {
                            readonly: true,
                            height: 160,
                        },
                        reRender: true,
                        value: apiTestResRef.current,
                    }
                ]
            },
            {
                type: 'grid',
                children: [
                    {
                        id: 'testAndSave',
                        type: 'button',
                        config: {
                            children: '测试接口并保存',
                        }
                    }
                ]
            },
        ]

    }


    // 不能用ObjectUtil.stringToJsObj：它会先删除所有空白字符，破坏字符串值内的空格（如SQL语句、Bearer令牌）
    const parseJsonText = (text: string) => {
        try {
            return JSON.parse(text);
        } catch {
            return null;
        }
    }

    const validate = () => {
        if (!dataRef.current?.url) {
            globalMessage.messageApi?.error('接口地址不能为空');
            return false;
        }
        if (!dataRef.current?.method) {
            globalMessage.messageApi?.error('请求方式不能为空');
            return false;
        }
        if (typeof dataRef.current.header === 'string') {
            const header = parseJsonText(dataRef.current.header)
            if (!header) {
                globalMessage.messageApi?.error('请求头不符合json格式');
                return false;
            } else
                dataRef.current.header = header;
        }
        if (typeof dataRef.current.params === 'string') {
            const param = parseJsonText(dataRef.current.params)
            if (!param) {
                globalMessage.messageApi?.error('请求参数不符合json格式');
                return false;
            } else
                dataRef.current.params = param;
        }
        try {
            dataRef.current.filter = parseDataTransformConfig(dataRef.current.filter);
        } catch (error) {
            globalMessage.messageApi?.error(error instanceof RuntimeConfigError ? error.message : '过滤器配置无效');
            return false;
        }
        return true;
    }

    const testAndSave = async () => {
        if (!validate())
            return;
        const {params, header, url, method, filter} = dataRef.current!;
        const result = await runDataRequestFlow({
            request: () => FetchUtil.doRequestNativeResult(url!, method!, header, params),
            isSuccess: response => response !== null,
            selectData: response => response,
            transform: response => filter ? applyDataTransform(response, filter) : response,
            onSuccess: transformedResult => {
                controller.update({data: {apiData: dataRef.current, staticData: transformedResult as any}}, {reRender: false});
                controller.changeData(transformedResult as object);
            },
        });
        apiTestResRef.current = JSON.stringify(result.success ? result.data : {msg: result.message}, null, 2);
        if (!result.success) globalMessage.messageApi?.error(result.message);
        setCount(current => current + 1);
    }

    const onFieldChange = (fieldChangeData: FieldChangeData) => {
        const {reRender, id, dataFragment} = fieldChangeData;
        if (id === 'testAndSave')
            void testAndSave();
        else if (id === 'apiTestRes')
            return
        else {
            dataRef.current = ObjectUtil.merge(dataRef.current, dataFragment)
        }
        if (reRender)
            setCount(count + 1)
    }

    return (
        <LCGUI schema={schema} onFieldChange={onFieldChange}/>
    );
}
