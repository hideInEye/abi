import type { RouteRecordNormalized } from '@sa/simple-router';
import type { MenuProps } from 'antd';
import type { MenuInfo } from 'rc-menu/lib/interface';

import { getSiderCollapse } from '@/store/slice/app';
import { getThemeSettings } from '@/store/slice/theme';
import leftOnlineIcon from '@/assets/svg-icon/left_online.svg';
import rightOnlineIcon from '@/assets/svg-icon/right_online.svg';
import './index.scss';
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

  // 二级菜单：根据当前 path 的一级 segment 过滤，避免在菜单切换时深拷贝（ReactNode 深拷贝会导致内存/CPU 飙升）
  const filteredMenus = useMemo(() => {
    if (!Array.isArray(allMenus) || allMenus.length === 0) return [];
    const current = allMenus.find((item) => item?.key === menuKey);
    const children = (current as any)?.children;
    if (Array.isArray(children)) return children;
    return allMenus.filter(item => item.key !== 'manage');
  }, [allMenus, menuKey]);

  // 计算levelKeys - 添加空数组处理
  const levelKeys = useMemo(() => {
    // 确保filteredMenus是有效数组
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

    // open
    if (currentOpenKey && themeSettings.isOnlyExpandCurrentParentMenu) {
      const repeatIndex = keys
        .filter(key => key !== currentOpenKey)
        .findIndex(key => levelKeys[key] === levelKeys[currentOpenKey]);

      setStateOpenKeys(
        keys
          // remove repeat key
          .filter((_, index) => index !== repeatIndex)
          // remove current level all child
          .filter(key => levelKeys[key] <= levelKeys[currentOpenKey])
      );
    } else {
      // // close
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
  
  return (
    <div className='relative bg-white ml-[2px] h-screen' style={{boxShadow: '0px 3px 6px 0px rgba(0,0,0,0.05)' }}>
      <div className='absolute right-[14px] top-0 h-full w-[1px] bg-[#E2E2E2]' />
      <div onClick={toggleCollapsed} className='absolute right-0 top-1/2 -translate-y-1/2 cursor-pointer' >
        <img src={collapsed ? rightOnlineIcon : leftOnlineIcon} />
      </div>
      <AMenu
        className={`transition-300 border-0! menu-container h-[calc(100vh-5rem)] ${!collapsed?'w-[12.5rem]':''}`}
        style={{ paddingRight: '1rem' }}
        inlineIndent={18}
        items={filteredMenus}
        mode="inline"
        openKeys={stateOpenKeys}
        selectedKeys={selectKey}
        onOpenChange={onOpenChange}
        onSelect={handleClickMenu}
        inlineCollapsed={collapsed}
      />
    </div>
  );
});

export default VerticalMenu;
