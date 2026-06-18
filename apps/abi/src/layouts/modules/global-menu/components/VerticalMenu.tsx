import type { RouteRecordNormalized } from '@sa/simple-router';
import type { MenuProps } from 'antd';
import type { MenuInfo } from 'rc-menu/lib/interface';

import { getSiderCollapse } from '@/store/slice/app';
import { getThemeSettings } from '@/store/slice/theme';
import leftOnlineIcon from '@/assets/svg-icon/left_online.svg';
import rightOnlineIcon from '@/assets/svg-icon/right_online.svg';
import './index.scss';
import '../../../base-layout/manage-menu.scss';
interface LevelKeysProps {
  children?: LevelKeysProps[];
  key?: string;
}

const getLevelKeys = (items1: LevelKeysProps[]) => {
  const key: Record<string, number> = {};
  const func = (items2: LevelKeysProps[], level = 1) => {
    items2.forEach(item => {
      if (item.key) {
        key[item.key] = level;
      }
      if (item.children) {
        func(item.children, level + 1);
      }
    });
  };
  func(items1);
  return key;
};

const getSelectedMenuKeyPath = (matches: RouteRecordNormalized[]) => {
  if (!matches || !Array.isArray(matches)) {
    return [];
  }
  const result = matches.reduce((acc: string[], match, index) => {
    if (index < matches.length - 1 && match.name) {
      acc.push(match.name);
    }
    return acc;
  }, []);

  return result;
};

const MENU_LABELS: Record<string, string> = {
  workbench: '工作台导航',
  component: '组件导航',
  manage: '门户管理导航',
  space: '空间管理导航',
};

const VerticalMenu = memo(() => {
  const { allMenus, route, selectKey } = useMixMenuContext();
  const [collapsed, setCollapsed] = useState(false);

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  const menuKey = useMemo(() => {
    const path = route?.path || '';
    return path.split('/')[1] || '';
  }, [route?.path]);

  // Filter menus based on current path segment
  const filteredMenus = useMemo(() => {
    if (!Array.isArray(allMenus) || allMenus.length === 0) return [];
    const current = allMenus.find((item) => item?.key === menuKey);
    const children = (current as any)?.children;
    if (Array.isArray(children)) {
      const result = [...children];
      // Add divider between 3rd and 4th items for workbench
      if (menuKey === 'workbench' && result.length > 3) {
        result.splice(3, 0, {
          key: 'menu-divider',
          disabled: true,
          label: '',
          className: 'abi-menu-custom-divider'
        } as any);
      }
      return result;
    }
    return allMenus.filter(item => item.key !== 'manage');
  }, [allMenus, menuKey]);

  const levelKeys = useMemo(() => {
    if (!filteredMenus || filteredMenus.length === 0) {
      return {};
    }
    return getLevelKeys(filteredMenus);
  }, [filteredMenus]);

  const themeSettings = useAppSelector(getThemeSettings);
  const router = useRouterPush();
  const isMix = themeSettings.layout.mode.includes('mix');
  const isVerticalMix = themeSettings.layout.mode === 'vertical-mix';
  const inlineCollapsed = useAppSelector(getSiderCollapse);

  const [stateOpenKeys, setStateOpenKeys] = useState<string[]>(
    inlineCollapsed ? [] : getSelectedMenuKeyPath(route.matched)
  );

  function handleClickMenu(menuInfo: MenuInfo) {
    router.routerPushByKeyWithMetaQuery(menuInfo.key);
  }

  const onOpenChange: MenuProps['onOpenChange'] = keys => {
    if (keys.includes('rc-menu-more')) {
      setStateOpenKeys(keys);
      return;
    }

    const currentOpenKey = keys.find(key => !stateOpenKeys.includes(key));

    if (currentOpenKey && themeSettings.isOnlyExpandCurrentParentMenu) {
      const repeatIndex = keys
        .filter(key => key !== currentOpenKey)
        .findIndex(key => levelKeys[key] === levelKeys[currentOpenKey]);

      setStateOpenKeys(
        keys
          .filter((_, index) => index !== repeatIndex)
          .filter(key => levelKeys[key] <= levelKeys[currentOpenKey])
      );
    } else {
      setStateOpenKeys(keys);
    }
  };

  useEffect(() => {
    if (inlineCollapsed || isVerticalMix) return;
    setStateOpenKeys(getSelectedMenuKeyPath(route.matched));
  }, [route.name, inlineCollapsed, isVerticalMix]);

  useUpdateEffect(() => {
    if (inlineCollapsed || isVerticalMix) return;

    const names = route.matched
      .slice(isMix ? 1 : 0, -1)
      .map(item => item.name)
      .filter(Boolean) as string[];

    setStateOpenKeys(names || []);
  }, [isMix, inlineCollapsed]);

  const menuLabel = MENU_LABELS[menuKey];

  return (
    <div className={['manage', 'space'].includes(menuKey) ? 'manage-menu-wrapper' : ''} style={{ position: 'relative', height: '100%' }}>
      <div className={`abi-menu-panel ${collapsed ? 'abi-menu-panel--collapsed' : ''}`}>
        {/* Section label — fades out when collapsed */}
        {menuLabel && (
          <div className={`abi-menu-label ${collapsed ? 'abi-menu-label--hidden' : ''}`}>{menuLabel}</div>
        )}

        {/* AntD Menu */}
        <AMenu
          className={`transition-300 border-0! menu-container !bg-transparent h-[calc(100vh-5rem)] ${!collapsed ? 'w-full' : ''}`}
          items={filteredMenus}
          mode="inline"
          openKeys={stateOpenKeys}
          selectedKeys={selectKey}
          onOpenChange={onOpenChange}
          onSelect={handleClickMenu}
          inlineCollapsed={collapsed}
        />
      </div>

      {/* Collapse toggle — placed outside abi-menu-panel to avoid overflow clipping */}
      <div onClick={toggleCollapsed} className="abi-menu-toggle">
        <img src={collapsed ? rightOnlineIcon : leftOnlineIcon} width={28} height={28} />
      </div>
    </div>
  );
});

export default VerticalMenu;
