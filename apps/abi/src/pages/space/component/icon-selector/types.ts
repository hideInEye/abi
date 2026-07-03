import type { ReactNode } from 'react';

export interface IconSelectorProps {
    /**
     * 当前选中的图标值
     */
    value?: string;

    /**
     * 选择图标时的回调函数
     * @param value - 选中的图标名称
     */
    onChange: (value: string | undefined) => void;

    /**
     * 未选择时的提示文字
     * @default '请选择图标'
     */
    placeholder?: string;

    /**
     * 是否允许清空选择
     * @default true
     */
    allowClear?: boolean;

    /**
     * 是否显示提示工具
     * @default false
     */
    showTooltip?: boolean;

    /**
     * 提示文字内容
     * @default '为菜单项选择一个图标'
     */
    tooltipText?: string | ReactNode;

    /**
     * 自定义类名
     */
    className?: string;

    /**
     * 自定义样式
     */
    style?: React.CSSProperties;
}
