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
import {FieldChangeData, LCGUI} from "../../../../json-schema/LCGUI.tsx";
import {Control} from "../../../../json-schema/SchemaTypes.ts";
import {useEffect, useRef, useState} from "react";
import {globalMessage} from "../../../../framework/message/GlobalMessage.tsx";
import {ISelectOption} from "../../../../json-schema/ui/select/Select.tsx";
import ObjectUtil from "../../../../utils/ObjectUtil.ts";
import {IDatabase} from "../../../../designer/DesignerType.ts";
import FetchUtil from "../../../../utils/FetchUtil.ts";
import baseApi from "../../../../api/BaseApi.ts";
import {saveProjectNow} from "../../../../designer/operate-provider/hot-key/HotKeyImpl.ts";
import {applyDataTransform, EMPTY_DATA_TRANSFORM, parseDataTransformConfig, RuntimeConfigError} from "../../../../security/runtime-config.ts";
import {runDataRequestFlow} from "../requestFlow.ts";

export interface DatabaseDataConfigProps {
    controller: AbstractDesignerController;
    data: IDatabase;
}

export function DatabaseDataConfig(props: DatabaseDataConfigProps) {
    const {data, controller} = props;
    const dataRef = useRef(data);
    const [dataSourceList, setDataSourceList] = useState<ISelectOption[]>([]);
    const [testRes, setTestRes] = useState<string | null>(null);
    const [count, setCount] = useState(0);
    const [resCollapsed, setResCollapsed] = useState(true);

    useEffect(() => {
        const spaceId = localStorage.getItem('spaceId');
        FetchUtil.post(`/dashboard/api/v1/commonDatabase/list`, {spaceId}).then(res => {
            if (res.code === 200) {
                const list = res.data?.data?.list ?? [];
                const options = list.map((item: any) => {
                    return {label: item.sourceName, value: item.sourceId}
                })
                setDataSourceList(options as ISelectOption[]);
            } else
                globalMessage.messageApi?.error(res.msg);
        })

        const projectId = window.LC_ENV?.projectId;
        const chartId = controller.config?.base?.id;
        if (projectId && chartId) {
            baseApi.getProjectInfo(projectId).then(project => {
                if (!project?.dataJson) return;
                try {
                    const dataJson = typeof project.dataJson === 'string' ? JSON.parse(project.dataJson) : project.dataJson;
                    const dbConfig = dataJson?.layerManager?.elemConfigs?.[chartId]?.data?.database;
                    if (dbConfig?.sql) {
                        dataRef.current = ObjectUtil.merge(dataRef.current, dbConfig);
                        setCount(c => c + 1);
                    }
                } catch (_) { /* ignore */ }
            });
        }
    }, []);

    const validate = () => {
        const {targetDb, sql} = dataRef.current;
        if (!targetDb) {
            globalMessage.messageApi?.error('请选择数据库');
            return false;
        }
        if (!sql) {
            globalMessage.messageApi?.error('请输入SQL语句');
            return false;
        }
        if (!sql.trim().toLowerCase().startsWith('select')) {
            globalMessage.messageApi?.error('SQL语句必须以select开头');
            return false;
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

        const {targetDb, sql, filter} = dataRef.current;
        if (!sql || sql === '')
            return;
        const result = await runDataRequestFlow({
            request: () => FetchUtil.post(`/dashboard/api/v1/db/executor/execute`, {
                id: targetDb,
                sql: sql,
                projectId: window.LC_ENV?.projectId,
                spaceId: localStorage.getItem('spaceId'),
                remark: '',
                saveFlag: true
            }),
            isSuccess: response => response.code === 200,
            getErrorMessage: response => response.msg,
            selectData: response => response.data?.data ?? response.data,
            transform: responseData => filter ? applyDataTransform(responseData, filter) : responseData,
            onSuccess: async data => {
                controller.update({data: {database: dataRef.current, staticData: data}})
                controller.changeData(data);
                const saved = await saveProjectNow();
                if (!saved) throw new Error('项目保存失败');
            }
        });
        setTestRes(JSON.stringify(result.success ? result.data : {msg: result.message}, null, 2));
        setResCollapsed(false);
        if (!result.success) globalMessage.messageApi?.error(result.message);
    }

    const onFieldChange = (fieldChangeData: FieldChangeData) => {
        const {reRender, id, dataFragment} = fieldChangeData;
        if (id === 'testAndSave')
            void testAndSave();
        else
            dataRef.current = ObjectUtil.merge(dataRef.current, dataFragment);
        if (reRender)
            setCount(count + 1);
    }

    const schema: Control = {
        type: 'grid',
        config: {gridGap: '10px'},
        children: [
            {
                key: 'targetDb',
                label: '数据库',
                type: 'select',
                value: dataRef.current?.targetDb,
                reRender: true,
                config: {
                    options: dataSourceList
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
            type: 'grid',
            config: {
                gridGap: '0',
                containerStyle: {
                    overflow: 'hidden',
                }
            },
            children: [
            {
                type: 'card-panel',
                label: 'SQL语句',
                config: {
                    contentStyle: {padding: 0},
                    collapsible: true,
                    defaultCollapsed: false,
                },
                children: [
                    {
                        key: 'sql',
                        type: 'code-editor',
                        config: {
                            height: 160,
                            language: 'sql'
                        },
                        value: dataRef.current?.sql,
                    }
                ]
            },
            {
                type: 'card-panel',
                label: '过滤器',
                config: {
                    contentStyle: {padding: 0},
                    collapsible: true,
                    defaultCollapsed: true,
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
                id: 'databaseTestRes',
                type: 'card-panel',
                label: '响应结果',
                config: {
                    contentStyle: {padding: 0},
                    collapsible: true,
                    collapsed: resCollapsed,
                    onCollapsedChange: setResCollapsed,
                },
                children: [
                    {
                        id: 'databaseTestRes',
                        type: 'code-editor',
                        config: {
                            height: 200,
                            language: 'json'
                        },
                        reRender: true,
                        value: testRes,
                    }
                    ]
            },
                ]
            },
            {
                type: 'grid',
                children: [
                    {
                        id: 'testAndSave',
                        type: 'button',
                        config: {
                            children: '测试SQL并保存',
                        }
                    }
                ]
            },
        ]
    }

    return (
        <LCGUI schema={schema} onFieldChange={onFieldChange}/>
    );
}
