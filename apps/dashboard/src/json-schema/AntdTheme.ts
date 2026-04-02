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
import {MappingAlgorithm, theme} from "antd";

export const studioDarkAlgorithm: MappingAlgorithm = (seedToken, mapToken) => {
    const baseToken = theme.darkAlgorithm(seedToken, mapToken);
    return {
        ...baseToken,
        // 核心色彩系统保持不变
        colorPrimary: '#4FB8FF',
        colorSuccess: '#3CED92',
        colorWarning: '#FFC53D',
        colorError: '#FF6E6E',
        colorInfo: '#4FB8FF',
        colorBgBase: '#1E1E2F',
        colorBgLayout: '#1E1E2F',
        colorBgContainer: '#2C2C3E',
        colorBgElevated: '#3A3A4E',
        colorText: '#FFFFFF',
        colorTextSecondary: '#A0A0B2',
        colorTextTertiary: '#6A6A7A',
        colorBorder: '#3A3A4E',
        colorBorderSecondary: '#2C2C3E',

        // 尺寸系统调整为小号
        borderRadius: 3,  // 从4调整为3
        borderRadiusSM: 1,  // 从2调整为1
        borderRadiusLG: 6,  // 从8调整为6
        borderRadiusXS: 1,  // 从2调整为1

        // 字体系统保持不变
        fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
        fontSize: 14,
        fontSizeSM: 12,
        fontSizeLG: 16,
        fontSizeXL: 18,
        fontSizeHeading1: 24,
        fontSizeHeading2: 20,
        fontSizeHeading3: 18,
        fontSizeHeading4: 16,
        fontSizeHeading5: 14,

        // 间距系统调整为小号
        padding: 12,  // 从16调整为12
        paddingSM: 8,  // 从12调整为8
        paddingXS: 6,  // 从8调整为6
        paddingXXS: 2,  // 从4调整为2
        margin: 12,  // 从16调整为12
        marginSM: 8,  // 从12调整为8
        marginXS: 6,  // 从8调整为6
        marginXXS: 2,  // 从4调整为2
        controlHeight: 28,  // 从32调整为28
        controlHeightSM: 20, // 从24调整为20
        controlHeightLG: 36, // 从40调整为36
    };
};

export const antdComponentTheme = {
    // 全局覆盖配置保持不变
    common: {
        motionDurationMid: '0.2s',
        motionDurationFast: '0.1s',
        motionEaseInOut: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
        motionEaseOut: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
        motionEaseIn: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
    },

    // 菜单组件调整为小号
    Menu: {
        itemColor: '#555',
        itemHoverColor: '#1677ff',
        itemSelectedColor: '#1677ff',
        itemSelectedBg: 'rgba(22, 119, 255, 0.1)',
        itemBg: 'transparent',
        itemBorderRadius: 3,
        itemMarginBlock: 2,
        itemMarginInline: 6,
        activeBarWidth: 2,
        itemPaddingInline: 10,
        horizontalItemHoverBg: 'transparent',
        horizontalItemSelectedBg: 'transparent',
    },

    // 表格组件调整为小号
    Table: {
        headerBg: '#f2f3f5',
        headerColor: '#333',
        headerBorderRadius: 3,
        colorBgContainer: '#fff',
        cellPaddingBlock: 8,
        cellPaddingInline: 12,
        borderColor: 'rgba(5, 5, 5, 0.06)',
        rowHoverBg: '#e6f4ff',
        rowSelectedBg: 'rgba(22, 119, 255, 0.08)',
        rowSelectedHoverBg: 'rgba(22, 119, 255, 0.12)',
        footerBg: '#f2f3f5',
        footerColor: '#555',
        headerSplitColor: 'transparent',
        fixedHeaderSortActiveBg: '#e6f4ff',
    },

    // 输入框组件调整为小号
    Input: {
        colorBgContainer: '#fff',
        colorBorder: '#d9d9d9',
        colorText: '#333',
        colorTextPlaceholder: '#bfbfbf',
        borderRadius: 3,
        hoverBorderColor: '#1677ff',
        activeBorderColor: '#1677ff',
        activeShadow: '0 0 0 2px rgba(22, 119, 255, 0.2)',
        paddingInline: 10,
        paddingInlineSM: 6,
        paddingBlock: 6,
        paddingBlockSM: 2,
        addonBg: '#f2f3f5',
    },

    // 按钮组件调整为小号
    Button: {
        borderRadius: 3,
        colorPrimary: '#1677ff',
        colorPrimaryHover: '#4096ff',
        colorPrimaryActive: '#0958d9',
        colorText: '#333',
        colorTextDisabled: '#bfbfbf',
        colorBgContainerDisabled: '#f5f5f5',
        controlHeight: 28,
        controlHeightSM: 20,
        controlHeightLG: 36,
        paddingContentHorizontal: 12,
        paddingContentHorizontalSM: 8,
        paddingContentHorizontalLG: 16,
        defaultBorderColor: '#d9d9d9',
        defaultBg: '#fff',
        defaultColor: '#333',
        textHoverBg: 'rgba(0, 0, 0, 0.04)',
        onlyIconSize: 14,
        onlyIconSizeSM: 12,
        onlyIconSizeLG: 16,
        groupBorderColor: '#1677ff',
    },

    // 选择器组件调整为小号
    Select: {
        colorBgContainer: '#fff',
        colorBorder: '#d9d9d9',
        colorText: '#333',
        colorTextPlaceholder: '#bfbfbf',
        borderRadius: 3,
        optionSelectedBg: '#e6f4ff',
        optionSelectedColor: '#1677ff',
        optionActiveBg: '#f5f5f5',
        optionPadding: '6px 10px',
        selectorBg: '#fff',
        singleItemHeightLG: 36,
        multipleItemBg: '#f2f3f5',
        multipleItemBorderColor: 'transparent',
        multipleItemColor: '#333',
    },

    // 模态框组件调整为小号
    Modal: {
        borderRadiusLG: 6,
        headerBg: '#f2f3f5',
        colorBgElevated: '#fff',
        colorTextHeading: '#333',
        paddingContentHorizontal: 20,
        paddingContentVertical: 16,
        paddingMD: 12,
        titleFontSize: 16,
        footerPaddingVertical: 12,
        footerPaddingHorizontal: 20,
        headerPadding: '12px 20px',
        contentPadding: 16,
        footerBg: 'transparent',
        footerBorderTop: '1px solid rgba(5, 5, 5, 0.06)',
        closeBtnHoverBg: 'rgba(0, 0, 0, 0.04)',
    },

    // 滑动输入条调整为小号
    Slider: {
        trackBg: '#1677ff',
        trackHoverBg: '#4096ff',
        handleColor: '#1677ff',
        railBg: '#f0f0f0',
        railSize: 3,
        handleSize: 12,
        handleSizeHover: 14,
        handleLineWidth: 2,
        handleLineWidthHover: 2,
        dotSize: 6,
        dotBorderColor: '#d9d9d9',
        dotActiveBorderColor: '#1677ff',
        handleActiveColor: '#0958d9',
    },

    // 折叠面板调整为小号
    Collapse: {
        borderRadiusLG: 3,
        colorBorder: 'rgba(5, 5, 5, 0.06)',
        headerBg: '#f2f3f5',
        contentBg: '#fff',
        headerPadding: '8px 12px',
        contentPadding: '12px',
        headerArrowColor: '#999',
        headerArrowHoverColor: '#1677ff',
    },

    // 卡片组件调整为小号
    Card: {
        colorBgContainer: '#fff',
        borderRadiusLG: 6,
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
        colorBorderSecondary: 'rgba(5, 5, 5, 0.06)',
        padding: 16,
        paddingSM: 12,
        paddingLG: 20,
        headerBg: 'transparent',
        headerBorderBottom: '1px solid rgba(5, 5, 5, 0.06)',
        actionsBg: '#f2f3f5',
        actionsLiMargin: '6px 0',
        extraColor: '#999',
    },

    // 标签页组件调整为小号
    Tabs: {
        cardBg: '#f2f3f5',
        itemColor: '#555',
        itemSelectedColor: '#1677ff',
        inkBarColor: '#1677ff',
        horizontalItemGutter: 24,
        horizontalItemPadding: '8px 0',
        horizontalMargin: '0 0 12px 0',
        cardPadding: '6px 12px',
        cardGutter: 3,
        cardHeight: 36,
        titleFontSize: 14,
        titleFontSizeLG: 16,
        itemHoverColor: '#1677ff',
        itemActiveColor: '#1677ff',
        cardHeadBackground: '#f2f3f5',
    },

    // 分页组件调整为小号
    Pagination: {
        colorBgContainer: '#fff',
        colorBgTextHover: 'rgba(0, 0, 0, 0.04)',
        colorBgTextActive: 'rgba(22, 119, 255, 0.1)',
        colorPrimary: '#1677ff',
        colorPrimaryHover: '#4096ff',
        colorText: '#555',
        colorTextDisabled: '#bfbfbf',
        itemBg: '#fff',
        itemLinkBg: '#fff',
        itemActiveBg: 'transparent',
        itemActiveColorDisabled: '#bfbfbf',
        itemSize: 28,
        itemSizeSM: 20,
        itemBgActive: 'rgba(22, 119, 255, 0.1)',
    },

    // 表单组件调整为小号
    Form: {
        labelColor: '#555',
        labelFontSize: 14,
        labelHeight: 28,
        labelRequiredMarkColor: '#ff4d4f',
        itemMarginBottom: 20,
        verticalLabelPadding: '0 0 6px',
    },

    // 警告提示调整为小号
    Alert: {
        colorSuccessBg: '#f6ffed',
        colorSuccessBorder: '#b7eb8f',
        colorWarningBg: '#fffbe6',
        colorWarningBorder: '#ffe58f',
        colorErrorBg: '#fff2f0',
        colorErrorBorder: '#ffccc7',
        colorInfoBg: '#e6f4ff',
        colorInfoBorder: '#91caff',
        padding: 12,
        paddingContentHorizontal: 10,
        borderRadiusLG: 3,
        fontSizeIcon: 14,
        actionMarginInlineStart: 10,
    },

    // 消息通知调整为小号
    Notification: {
        colorBgElevated: '#fff',
        colorText: '#333',
        colorTextHeading: '#333',
        colorIcon: '#1677ff',
        colorIconHover: '#4096ff',
        fontSizeLG: 16,
        padding: 12,
        paddingContentHorizontal: 12,
        marginBottom: 12,
        borderRadiusLG: 6,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    },

    // 工具提示调整为小号
    Tooltip: {
        colorBgSpotlight: '#333',
        colorTextLightSolid: '#fff',
        borderRadius: 3,
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        paddingSM: 6,
        paddingXS: 2,
        fontSize: 14,
    },

    // 进度条调整为小号
    Progress: {
        defaultColor: '#1677ff',
        colorText: '#555',
        remainingColor: '#f0f0f0',
        lineBorderRadius: 3,
        circleTextColor: '#333',
        circleTextFontSize: '1em',
    },

    // 开关组件调整为小号
    Switch: {
        trackHeight: 18,
        trackMinWidth: 36,
        trackPadding: 1,
        colorPrimary: '#1677ff',
        colorPrimaryHover: '#4096ff',
        colorBgContainer: 'rgba(0, 0, 0, 0.25)',
        handleSize: 14,
        handleShadow: '0 2px 4px 0 rgba(0, 35, 11, 0.2)',
        handleBg: '#fff',
    },

    // 上传组件调整为小号
    Upload: {
        colorBorder: '#d9d9d9',
        colorText: '#555',
        colorTextDisabled: '#bfbfbf',
        borderRadiusLG: 6,
        actionsColor: '#1677ff',
    },

    // 树组件调整为小号
    Tree: {
        colorBgContainer: '#fff',
        colorBorder: 'rgba(5, 5, 5, 0.06)',
        directoryNodeSelectedBg: '#e6f4ff',
        directoryNodeSelectedColor: '#1677ff',
        nodeHoverBg: 'rgba(0, 0, 0, 0.04)',
        nodeSelectedBg: '#e6f4ff',
        titleHeight: 28,
        nodePadding: 2,
    },

    // 徽标组件调整为小号
    Badge: {
        colorBgContainer: '#fff',
        colorBorderBg: '#fff',
        colorError: '#ff4d4f',
        colorInfo: '#1677ff',
        colorSuccess: '#52c41a',
        colorWarning: '#faad14',
        textColor: '#fff',
        fontSize: 12,
        fontSizeSM: 10,
        dotSize: 6,
        statusSize: 6,
    },

    // 分割线调整为小号
    Divider: {
        colorSplit: 'rgba(5, 5, 5, 0.06)',
        margin: 12,
        marginLG: 20,
        marginXS: 6,
        textPadding: '0 6px',
        orientationMargin: 0.05,
    },

    // 空状态调整为小号
    Empty: {
        colorTextDisabled: '#bfbfbf',
        fontSize: 14,
        margin: 20,
        marginLG: 28,
        marginSM: 12,
        imageHeight: 100,
        imageHeightSM: 60,
        imageHeightLG: 140,
    },
};