// src/utils/icon-converter.ts
import * as antdIcons from '@ant-design/icons';
import React from 'react';

// 创建安全的图标映射
const safeIcons = new Map<string, React.FC<any>>();

// 将 Ant Design 图标添加到安全映射
Object.entries(antdIcons).forEach(([name, iconComponent]) => {
    if (typeof iconComponent === 'function' && name.endsWith('Outlined')) {
        safeIcons.set(name, iconComponent);
    }
});

// 添加默认图标
const DefaultIcon = antdIcons.QuestionCircleOutlined;

/**
 * 图标转换器
 */
export const safeConvertToIcon = (
    iconName?: string,
    props?: React.ComponentProps<typeof DefaultIcon>
): React.ReactElement | null => {
    if (!iconName) return null;

    const IconComponent = safeIcons.get(iconName);
    if (IconComponent) {
        return React.createElement(IconComponent, props);
    }

    return React.createElement(DefaultIcon, props);
};

// 路由配置中的 icon 字段转换器
export const routeIconConverter = (iconName?: string) => {
    return safeConvertToIcon(iconName, { className: 'anticon' });
};

export function convertRuoYiToSoybean(ruoYiRoutes: any[]): any[] {
    const resultRoutes: any[] = [];

    // 辅助函数：保留原始名称格式（仅转为小写）
    const normalizeName = (name: string) => name.toLowerCase();

    // 辅助函数：处理组件路径格式
    const normalizeComponent = (component: string) => {
        if (!component) return '';
        // 移除开头的斜杠（如果有）
        return component.startsWith('/') ? component.substring(1) : component;
    };

    // 处理单层路由
    const createSingleRoute = (route: any) => {
        const name = normalizeName(route.name);
        const comp = normalizeComponent(route.component);

        return {
            name,
            path: route.path,
            component: `layout.base$view.${comp}`,
            meta: {
                hideInMenu: route.hidden,
                i18nKey: `route.${name}`,
                // icon: (route.meta?.icon && route.meta?.icon !== '#') ? routeIconConverter((route.meta.icon + 'Outlined')) : '',
                icon: route.meta?.icon || '',
                title: route.meta?.title || name,
                noCache: route.meta?.noCache || false
            }
        };
    };

    // 处理嵌套路由
    const createNestedRoute = (route: any) => {
        const name = normalizeName(route.name);

        const newRoute = {
            name,
            path: route.path,
            component: 'layout.base',
            meta: {
                hideInMenu: route.hidden,
                i18nKey: `route.${name}`,
                icon: route.meta?.icon || '',
                title: route.meta?.title || name,
                noCache: route.meta?.noCache || false
            },
            children: [] as any[]
        };

        // 处理子路由
        if (route.children && route.children.length > 0) {
            route.children.forEach((child: any) => {
                const childName = normalizeName(child.name);
                const childComp = normalizeComponent(child.component);

                // 完全按照规则创建子路由
                newRoute.children.push({
                    name: childName,
                    path: child.query
                        ? `${child.path.replace(/^\//, '')}/:${child.query}`
                        : child.path.replace(/^\//, ''),
                    component: `view.${childComp}`,
                    meta: {
                        hideInMenu: child.hidden,
                        i18nKey: `route.${childName}`,
                        icon: child.meta?.icon || '',
                        title: child.meta?.title || childName,
                        noCache: child.meta?.noCache || false
                    }
                });
            });
        }

        return newRoute;
    };

    // 主处理逻辑
    ruoYiRoutes.forEach(route => {
        // 处理Layout包装的路由
        if (route.path === '/' && route.component === 'Layout' && route.children) {
            route.children.forEach((child: any) => {
                if (child.children && child.children.length > 0) {
                    resultRoutes.push(createNestedRoute(child));
                } else {
                    resultRoutes.push(createSingleRoute(child));
                }
            });
        }
        // 处理直接定义的嵌套路由
        else if (route.children && route.children.length > 0) {
            resultRoutes.push(createNestedRoute(route));
        }
    });

    return resultRoutes;
}




/**
 * 筛选出数组a中存在的所有数组b项，并用数组a的内容重组成数组c
 * @param a 主路由数组
 * @param b 需要筛选的路由数组
 * @returns 重组后的路由数组c
 */
export function filterAndReconstructRoutes(a: any[], b: any[]) {
    // 1. 创建路由名称到路由对象的映射（包含所有层级）
    const aRouteMap = new Map();

    // 递归遍历函数，构建路由映射
    const traverseAndMap = (routes: any[]) => {
        for (const route of routes) {
            // 将当前路由添加到映射
            aRouteMap.set(route.key, route);

            // 递归处理子路由
            if (route.children && route.children.length > 0) {
                traverseAndMap(route.children);
            }
        }
    };

    // 遍历数组a构建映射
    traverseAndMap(a);

    // 2. 筛选并重组路由
    const reconstructRoutes = (routes: any[]) => {
        return routes.filter(route => aRouteMap.has(route.name)) // 只保留在a中存在的路由
            .map(route => {
                // 获取a中对应的路由对象
                const matchedRoute = aRouteMap.get(route.name)!;

                // 创建新的路由对象（使用a的内容）
                const newRoute: any = {
                    ...matchedRoute
                };

                // 递归处理子路由
                if (route.children && route.children.length > 0) {
                    newRoute.children = reconstructRoutes(route.children);
                }

                return newRoute;
            });
    };

    // 3. 返回重组后的路由数组
    return reconstructRoutes(b);
}