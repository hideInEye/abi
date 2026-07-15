import * as antdIcons from '@ant-design/icons';
import { Empty, theme } from 'antd';
import React, { forwardRef, useMemo, useState } from 'react';

import { getLocalIcons } from '@/utils/icon';

import type { IconSelectorProps } from './types';

const { CloseOutlined, PlusOutlined, QuestionCircleOutlined, SearchOutlined } = antdIcons;

// 提取所有 Ant Design 图标
const allAntdIcons = Object.entries(antdIcons).filter(([name]) => name.endsWith('Outlined')).map(([name, IconComponent]: [string, any]) => ({
    name,
    label: name.replace('Outlined', ''),
    component: <IconComponent />,
    value: name,
    type: 'antd' as const
}));

// 提取所有本地 SVG 图标
const localSvgNames = getLocalIcons();
const allLocalIcons = localSvgNames.map(name => ({
    name,
    label: name,
    component: <SvgIcon localIcon={name} style={{ fontSize: 24 }} />,
    value: name,
    type: 'local' as const
}));

// 合并所有图标：本地 SVG 在前，antd 在后
const allIcons = [...allLocalIcons, ...allAntdIcons];

const IconSelector = forwardRef<HTMLDivElement, IconSelectorProps>(({
    value = undefined,
    onChange,
    placeholder = '请选择图标',
    allowClear = true,
    showTooltip = false,
    tooltipText = '为菜单项选择一个图标',
    className = '',
    style = {},
}, ref) => {
    const { token } = theme.useToken();
    const [open, setOpen] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const { t } = useTranslation();

    const selectedIcon = useMemo(() => {
        return value ? allIcons.find(icon => icon.value === value) : null;
    }, [value]);

    const filteredIcons = useMemo(() => {
        if (!searchValue) return allIcons;
        return allIcons.filter(
            icon =>
                icon.label.toLowerCase().includes(searchValue.toLowerCase()) ||
                icon.value.toLowerCase().includes(searchValue.toLowerCase())
        );
    }, [searchValue]);

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(undefined);
        setSearchValue('');
    };

    const handleSelect = (iconName: string) => {
        onChange(iconName);
        setOpen(false);
        setSearchValue('');
    };

    const renderIconList = () => (
        <div style={{ width: 360 }}>
            {/* 搜索栏 */}
            <div style={{ marginBottom: 16, position: 'relative' }}>
                <AInput
                    size="middle"
                    placeholder={t('page.manage.menu.form.searchIcon')}
                    prefix={<SearchOutlined style={{ color: token.colorTextPlaceholder }} />}
                    allowClear
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    suffix={searchValue && (
                        <span style={{ color: token.colorTextQuaternary, fontSize: 12 }}>
                            {filteredIcons.length}{t('page.manage.menu.form.results')}
                        </span>
                    )}
                    style={{ borderRadius: 6 }}
                />
            </div>

            {/* 图标列表 */}
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {filteredIcons.length > 0 ? (
                    <ARow gutter={[12, 16]}>
                        {filteredIcons.map(icon => (
                            <ACol span={6} key={icon.value}>
                                <div
                                    onClick={() => handleSelect(icon.value)}
                                    style={{
                                        height: 80,
                                        padding: 8,
                                        borderRadius: 6,
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        border: `1px solid ${value === icon.value ? token.colorPrimary : token.colorBorder}`,
                                        background: value === icon.value ? token.colorPrimaryBg : token.colorBgContainer,
                                        ':hover': {
                                            borderColor: token.colorPrimary,
                                            boxShadow: token.boxShadowSecondary
                                        }
                                    }}
                                >
                                    <div style={{ fontSize: 24, marginBottom: 8, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                        {icon.component}
                                    </div>
                                    <div style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {icon.label}
                                    </div>
                                </div>
                            </ACol>
                        ))}
                    </ARow>
                ) : (
                    <AEmpty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('page.manage.menu.form.noMatchIcon')} />
                )}
            </div>
        </div>
    );

    return (
        <ATooltip
            title={showTooltip ? tooltipText : null}
            placement="bottom"
            overlayStyle={{ maxWidth: 300 }}
            open={showTooltip && !open ? undefined : false}
        >
            <APopover
                open={open}
                onOpenChange={setOpen}
                trigger="click"
                placement="bottomLeft"
                content={renderIconList}
                overlayInnerStyle={{
                    padding: 16,
                    borderRadius: 8,
                    boxShadow: token.boxShadowSecondary
                }}
                overlayClassName="icon-selector-popover"
            >
                <div
                    ref={ref}
                    className={`icon-selector-trigger ${className}`}
                    style={{
                        position: 'relative',
                        minHeight: 36,
                        padding: '6px 12px',
                        background: token.colorBgContainer,
                        border: `1px solid ${token.colorBorder}`,
                        borderRadius: 6,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        ...style,
                        ':hover': {
                            borderColor: token.colorPrimaryHover,
                        }
                    }}
                >
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                        {value ? (
                            <>
                                <span style={{
                                    width: 24,
                                    height: 24,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 4,
                                    background: token.colorPrimaryBg,
                                    color: token.colorPrimary,
                                    marginRight: 10
                                }}>
                                    {selectedIcon?.component || <QuestionCircleOutlined />}
                                </span>
                                <span style={{
                                    fontSize: 14,
                                    fontWeight: token.fontWeightStrong,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {selectedIcon?.label || value}
                                </span>
                            </>
                        ) : (
                            <span style={{
                                color: token.colorTextPlaceholder,
                                fontSize: 14,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}>
                                {placeholder}
                            </span>
                        )}
                    </div>

                    <ASpace style={{ width: 68, justifyContent: 'flex-end' }}>
                        {value && allowClear && (
                            <ATooltip title={t('page.manage.menu.form.clear')} placement="top" mouseEnterDelay={0.5}>
                                <CloseOutlined
                                    style={{
                                        fontSize: 12,
                                        color: token.colorTextQuaternary,
                                        padding: 4,
                                        borderRadius: '50%',
                                        ':hover': {
                                            color: token.colorText,
                                            background: token.colorFillTertiary
                                        }
                                    }}
                                    onClick={handleClear}
                                />
                            </ATooltip>
                        )}
                        <PlusOutlined
                            style={{
                                fontSize: 12,
                                transform: open ? 'rotate(45deg)' : 'none',
                                transition: 'transform 0.2s',
                                color: token.colorTextQuaternary,
                                padding: 4,
                                borderRadius: '50%',
                                ':hover': {
                                    color: token.colorText,
                                    background: token.colorFillTertiary
                                }
                            }}
                        />
                    </ASpace>
                </div>
            </APopover>
        </ATooltip>
    );
});

IconSelector.displayName = 'IconSelector';

export default IconSelector;
