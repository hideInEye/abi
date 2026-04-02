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

import React, {useState} from "react";
import "./CardPanel.less";
import {Tooltip} from "antd";
import {Help} from "@icon-park/react";

export interface ItemPanelProps {
    label: string;
    tip?: string;
    children: React.ReactNode;
    contentStyle?: React.CSSProperties;
    collapsible?: boolean;
    defaultCollapsed?: boolean;
    /** 受控折叠状态，传入时忽略 defaultCollapsed */
    collapsed?: boolean;
    onCollapsedChange?: (collapsed: boolean) => void;
}

export const CardPanel: React.FC<ItemPanelProps> = (props) => {
    const {label, tip, contentStyle, children, collapsible, defaultCollapsed, collapsed: collapsedProp, onCollapsedChange} = props;
    const [innerCollapsed, setInnerCollapsed] = useState(!!defaultCollapsed);

    // 受控模式优先
    const isControlled = collapsedProp !== undefined;
    const collapsed = isControlled ? collapsedProp : innerCollapsed;

    const handleToggle = () => {
        if (!collapsible) return;
        const next = !collapsed;
        if (isControlled) {
            onCollapsedChange?.(next);
        } else {
            setInnerCollapsed(next);
        }
    };

    return (
        <div className={"card-panel"}>
            <div
                className={`card-panel-label${collapsible ? ' card-panel-label--collapsible' : ''}`}
                onClick={handleToggle}
            >
                {collapsible && (
                    <span className={`card-panel-arrow${collapsed ? ' card-panel-arrow--collapsed' : ''}`}>▾</span>
                )}
                {label}
                {tip && <Tooltip className={'card-help'} title={tip}>&nbsp;<Help/>&nbsp;</Tooltip>}
            </div>
            {!collapsed && (
                <div style={{...contentStyle}} className={"card-panel-content"}>{children}</div>
            )}
        </div>
    )
}
