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

import {Control, ControlValueType} from "./SchemaTypes";
import React, {ReactNode} from "react";
import LCGUIUtil from "./LCGUIUtil";
import UIMap from "./ui";
import {ConfigProvider, theme} from "antd";
import {antdComponentTheme} from "./AntdTheme.ts";
import {evaluateVisibilityRule} from "../security/runtime-config.ts";

export interface FieldChangeData {
    id?: string;
    data: ControlValueType;
    reRender?: boolean;
    schemaKeyPath: SchemaPathNode[];
    dataKeyPath: string[];
    dataFragment: object;
}

export interface LCGUIProps {
    schema: Control | Control[];
    onFieldChange?: (fieldChangeData: FieldChangeData) => void;
}

export class SchemaPathNode {
    constructor(key: string, index?: number) {
        this.key = key;
        this.index = index;
    }

    key: string = '';
    index?: number = 0;
}

/**
 * 特殊场景的操作全交给使用方，向外提供Util方法更新schema结构
 */
export class LCGUI extends React.Component<LCGUIProps> {

    onControlChange = (data: ControlValueType, schemaKeyPath: SchemaPathNode[], dataKeyPath: string[], reRender?: boolean, id?: string) => {
        const {onFieldChange} = this.props;
        const dataFragment = LCGUIUtil.createObjectFromArray(dataKeyPath, data)
        onFieldChange && onFieldChange({
            id, data, reRender, schemaKeyPath: [...schemaKeyPath], dataKeyPath, dataFragment
        });
    }

    /**
     * 解析rules规则，判断是否满足
     * @param rules
     * @param control
     */
    analyzeRules = (rules: string, control: Control): boolean => {
        const values: Record<string, unknown> = {};
        let current: Control | undefined = control;
        while (current) {
            current.children?.forEach(child => {
                if (child.key) values[child.key] = child.value;
            });
            if (current.key) values[current.key] = current.value;
            current = current.parent;
        }
        return evaluateVisibilityRule(rules, values);
    }

    buildConfigUI = (control: Control, schemaKeyPath: SchemaPathNode[], dataKeyPath: string[], childIndex: number): ReactNode[] => {
        const nodes: ReactNode[] = [];
        if (!control) return nodes;
        if ("children" in control) {
            //有子节点，递归解析
            const tempNodes: ReactNode[] = [];
            const {children} = control;
            const childLevel = new SchemaPathNode("children");
            const {type, rules} = control;
            //判断是否满足rules规则，不满足则不继续递归渲染
            if (rules && !this.analyzeRules(rules, control))
                return nodes;

            schemaKeyPath.push(childLevel);
            control.key && dataKeyPath.push(control.key);
            children && children.forEach((child: Control, index: number) => {
                childLevel.index = index;
                child.parent = control;
                tempNodes.push(this.buildConfigUI(child, JSON.parse(JSON.stringify(schemaKeyPath)), [...dataKeyPath], index));
            })
            //构建本级schema路径下的ReactNode
            if (!type) {
                //本层没有控件，直接返回子节点
                nodes.push([...tempNodes]);
            } else {
                const {type, config, value, id, reRender, label, tip} = control;
                const Component = UIMap.get(type);
                schemaKeyPath.pop();
                schemaKeyPath.push({key: "value"});
                //非叶子节点不解析label
                const controlVal = reRender ? {value} : {defaultValue: value};
                const _props = {
                    ...config, ...controlVal, label, tip,
                    onChange: (data: any) => this.onControlChange(data, schemaKeyPath, dataKeyPath, reRender, id)
                };
                nodes.push(<Component key={childIndex} {..._props}>{tempNodes}</Component>);
            }
        } else {
            //解析叶子节点
            const {label, type, tip, config, value, rules, id, reRender} = control;
            if (!type) return [];
            if (rules && !this.analyzeRules(rules, control))
                return nodes;

            //设置schemaKeyPath和dataKeyPath
            schemaKeyPath.push({key: "value"});
            dataKeyPath.push(control.key!);
            const controlVal = reRender ? {value} : {defaultValue: value};
            const _props = {
                ...config, ...controlVal, label, tip,
                onChange: (data: any) => this.onControlChange(data, schemaKeyPath, dataKeyPath, reRender, id)
            };
            const Component = UIMap.get(type);
            if (!Component) return [];
            nodes.push(<Component key={childIndex} {..._props} />);
        }
        return nodes;
    }

    init = (): ReactNode[] => {
        const nodes: ReactNode[] = [];
        let {schema} = this.props;
        schema = Array.isArray(schema) ? schema : [schema];
        schema.forEach((control: Control) => {
            nodes.push(this.buildConfigUI(control, [], [], 0));
        })
        return nodes;
    }

    render() {
        return (
            <ConfigProvider theme={{
                algorithm: theme.defaultAlgorithm,
                components: antdComponentTheme
            }}>
                {this.init()}
            </ConfigProvider>
        );
    }
}
