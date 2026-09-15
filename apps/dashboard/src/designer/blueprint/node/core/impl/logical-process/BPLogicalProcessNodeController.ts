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

import {AbstractBPNodeController, AnchorPointType, ExecuteInfoType, NodeInfoType} from "../../AbstractBPNodeController";
import ComponentUtil from "../../../../../../utils/ComponentUtil";
import BPNode, {NodeProps} from "../../../BPNode";
import React from "react";
import ObjectUtil from "../../../../../../utils/ObjectUtil";
import {LogicalProcessNodeConfig} from "./LogicalProcessNodeConfig";
import BPExecutor from "../../../../core/BPExecutor";
import {applyDataTransform, DataTransformConfig, RuntimeConfigError} from "../../../../../../security/runtime-config.ts";
import {globalMessage} from "../../../../../../framework/message/GlobalMessage.tsx";

export interface LogicalProcessNodeConfigType extends NodeProps {
    handler?: DataTransformConfig | string;
}

export default class BPLogicalProcessNodeController extends AbstractBPNodeController<LogicalProcessNodeConfigType> {

    async create(container: HTMLElement, config: LogicalProcessNodeConfigType): Promise<void> {
        this.config = config;
        this.container = container;
        this.instance = await ComponentUtil.createAndRender(container, BPNode, config);
    }

    execute(executeInfo: ExecuteInfoType, executor: BPExecutor, params: any): void {
        const {nodeId} = executeInfo;
        if (!this.config?.handler) return;
        const apId = nodeId + ':afterExecute:' + AnchorPointType.OUTPUT;
        try {
            const newParams = applyDataTransform(params, this.config.handler) ?? params;
            executor.execute(apId, executor, newParams);
        } catch (error) {
            globalMessage.messageApi?.error(error instanceof RuntimeConfigError ? error.message : '数据处理配置解析失败');
        }
    }

    getConfig(): LogicalProcessNodeConfigType | null {
        return this.config;
    }

    update(config: LogicalProcessNodeConfigType): void {
        this.config = ObjectUtil.merge(this.config, config);
    }

    getNodeInfo(nodeId: string): NodeInfoType | null {
        return {
            id: nodeId,
            name: "逻辑处理",
            titleBgColor: "#a62469",
            type: "logical-process-node",
            icon: "FunctionOutlined",
            input: [
                {
                    id: nodeId + ':execute:' + AnchorPointType.INPUT,
                    name: "执行",
                    type: AnchorPointType.INPUT
                }
            ],
            output: [
                {
                    id: nodeId + ":afterExecute:" + AnchorPointType.OUTPUT,
                    name: "执行后",
                    type: AnchorPointType.OUTPUT
                }
            ]
        };
    }

    getConfigComponent(): React.ComponentType | null {
        return LogicalProcessNodeConfig;
    }

}
