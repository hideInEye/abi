import * as antdIcons from '@ant-design/icons';
import type { ElegantConstRoute } from '@elegant-router/types';

import { $t } from '@/locales';
import { getLocalIcons } from '@/utils/icon';

// 预加载本地 SVG 图标名称列表
const localIconNames = getLocalIcons();

// 图标灰底容器（仅二级菜单使用）
const iconWrap = (iconEl: React.ReactNode) => (
  <span style={{
    width: 30,
    height: 30,
    borderRadius: 6,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(130,140,200,0.08)',
    flexShrink: 0
  }}>
    {iconEl}
  </span>
);

// 创建图标渲染函数：支持 antd 图标和本地 SVG 图标
// depth: 菜单层级（0=一级/导航栏, 1=二级菜单, 2+=三级菜单）
const renderIcon = (iconName: string, localIcon: any, depth: number) => {
  // 三级菜单及以上：不显示图标
  if (depth >= 2) return undefined;

  // 构建图标元素
  let iconEl: React.ReactNode = null;

  // 优先使用 localIcon（本地 SVG）
  if (localIcon && localIconNames.includes(localIcon)) {
    iconEl = <SvgIcon localIcon={localIcon} style={{ fontSize: '16px' }} />;
  }
  // 如果 iconName 是本地 SVG 名称（非 Outlined 结尾），走 SvgIcon
  else if (iconName && !iconName.endsWith('Outlined') && localIconNames.includes(iconName)) {
    iconEl = <SvgIcon localIcon={iconName} style={{ fontSize: '16px' }} />;
  }
  // antd 图标
  else {
    const IconComponent = (antdIcons as any)[iconName];
    if (IconComponent) {
      iconEl = <IconComponent style={{ fontSize: 16 }} />;
    } else {
      // 兜底
      iconEl = <SvgIcon icon={iconName} localIcon={localIcon} style={{ fontSize: '16px' }} />;
    }
  }

  // 二级菜单：图标加灰底容器
  if (depth === 1) {
    return iconWrap(iconEl);
  }

  // 一级（导航栏）：图标不加背景
  return iconEl;
};

/**
 * Get global menus by auth routes
 *
 * @param routes Auth routes
 * @param depth 菜单层级深度（0=一级, 1=二级, 2=三级...）
 */
export function getGlobalMenusByAuthRoutes(routes: ElegantConstRoute[], depth = 0) {
  const menus: App.Global.Menu[] = [];

  routes.forEach(route => {
    if (!route.meta?.hideInMenu) {
      const menu = getGlobalMenuByBaseRoute(route, depth);

      if (route.children?.some(child => !child.meta?.hideInMenu)) {
        menu.children = getGlobalMenusByAuthRoutes(route.children, depth + 1) || [];
      }

      menus.push(menu);
    }
  });

  return menus;
}

/**
 * Get global menu by route
 *
 * @param route
 * @param depth 菜单层级深度
 */
export function getGlobalMenuByBaseRoute(route: ElegantConstRoute, depth = 0): App.Global.Menu {
  const { name } = route;

  const { i18nKey, icon = import.meta.env.VITE_MENU_ICON, localIcon, title } = route.meta ?? {};

  const label = i18nKey ? $t(i18nKey) : title;

  const menu: App.Global.Menu = {
    icon: renderIcon(icon, localIcon, depth),
    key: name,
    label: <BeyondHiding title={label} />,
    title: label
  };

  return menu;
}
