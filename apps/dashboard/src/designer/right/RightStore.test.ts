import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

// 隔离设计器加载器：仅保留测试所需的组件菜单定义
vi.mock('../loader/DesignerLoader.ts', () => ({
    DesignerLoader: {
        definitionMap: {
            // 含AI菜单的普通图表组件
            AntdArea: {
                getMenuList: () => [
                    {icon: () => null, name: 'AI', key: 'ai'},
                    {icon: () => null, name: '基础', key: 'base'},
                    {icon: () => null, name: '样式', key: 'style'},
                    {icon: () => null, name: '数据', key: 'data'},
                ],
            },
            // 含AI菜单但无数据菜单的组件
            AntdRing: {
                getMenuList: () => [
                    {icon: () => null, name: 'AI', key: 'ai'},
                    {icon: () => null, name: '基础', key: 'base'},
                    {icon: () => null, name: '样式', key: 'style'},
                ],
            },
            // 无AI菜单的组件
            AntdPie: {
                getMenuList: () => [
                    {icon: () => null, name: '基础', key: 'base'},
                    {icon: () => null, name: '样式', key: 'style'},
                ],
            },
            // 分组图层
            group: {
                getMenuList: () => [{icon: () => null, name: '基础', key: 'base'}],
            },
        },
    },
}));

import rightStore from './RightStore';

describe('designer rightStore activeConfig', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllTimers();
        // 重置为默认状态（空白点击收回面板）
        rightStore.activeConfig(null, null);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('无效激活收回面板并清空菜单', () => {
        rightStore.activeConfig('c1', 'AntdArea');
        expect(rightStore.visible).toBe(true);
        rightStore.activeConfig(null, null);
        expect(rightStore.visible).toBe(false);
        expect(rightStore.menus).toEqual([]);
        expect(rightStore.activeMenu).toBe('');
    });

    it('首次激活含AI菜单的组件默认进入AI页签', () => {
        rightStore.activeConfig('c1', 'AntdArea');
        expect(rightStore.visible).toBe(true);
        expect(rightStore.activeMenu).toBe('ai');
    });

    it('分组图层仍默认基础页签', () => {
        rightStore.activeConfig('g1', 'group');
        expect(rightStore.activeMenu).toBe('base');
    });

    it('无AI菜单的组件回退样式页签', () => {
        rightStore.activeConfig('c2', 'AntdPie');
        expect(rightStore.activeMenu).toBe('style');
    });

    it('面板可见时切换组件保留仍存在的页签', () => {
        rightStore.activeConfig('c1', 'AntdArea');
        rightStore.setActiveMenu('style');
        rightStore.activeConfig('c3', 'AntdArea');
        expect(rightStore.activeMenu).toBe('style');
    });

    it('当前页签不在新组件菜单中时默认进入AI页签', () => {
        rightStore.activeConfig('c1', 'AntdArea');
        rightStore.setActiveMenu('data');
        rightStore.activeConfig('c4', 'AntdRing');
        expect(rightStore.activeMenu).toBe('ai');
    });

    it('面板可见时重复激活同一组件保留页签且不重挂载', () => {
        rightStore.activeConfig('c1', 'AntdArea');
        rightStore.setActiveMenu('style');
        rightStore.activeConfig('c1', 'AntdArea');
        // 未触发 visible false->true 的重挂载流程
        expect(rightStore.visible).toBe(true);
        expect(rightStore.activeMenu).toBe('style');
    });
});
