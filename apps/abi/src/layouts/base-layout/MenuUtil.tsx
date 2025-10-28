import * as antdIcons from '@ant-design/icons';
import type { ElegantConstRoute } from '@elegant-router/types';

import { $t } from '@/locales';

// 创建图标渲染函数
const renderIcon = (iconName: string, localIcon: any) => {
  const IconComponent = (antdIcons as any)[iconName];

  if (IconComponent) {
    return <IconComponent style={{ fontSize: 20 }} />;
  }
  return (
    <SvgIcon
      icon={iconName}
      localIcon={localIcon}
      style={{ fontSize: '20px' }}
    />
  );
};

/**
 * Get global menus by auth routes
 *
 * @param routes Auth routes
 */
export function getGlobalMenusByAuthRoutes(routes: ElegantConstRoute[]) {
  const menus: App.Global.Menu[] = [];

  routes.forEach(route => {
    if (!route.meta?.hideInMenu) {
      const menu = getGlobalMenuByBaseRoute(route);

      if (route.children?.some(child => !child.meta?.hideInMenu)) {
        menu.children = getGlobalMenusByAuthRoutes(route.children) || [];
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
 */
export function getGlobalMenuByBaseRoute(route: ElegantConstRoute): App.Global.Menu {
  const { name } = route;

  const { i18nKey, icon = import.meta.env.VITE_MENU_ICON, localIcon, title } = route.meta ?? {};

  const label = i18nKey ? $t(i18nKey) : title;

  const menu: App.Global.Menu = {
    // icon: (
    //   <SvgIcon
    //     icon={icon}
    //     localIcon={localIcon}
    //     style={{ fontSize: '20px' }}
    //   />
    // ),
    icon: renderIcon(icon, localIcon),
    key: name,
    label: <BeyondHiding title={label} />,
    title: label
  };

  return menu;
}
