import type * as G2PlotNamespace from '@antv/g2plot';
import type {Plot} from '@antv/g2plot';
import {RuntimeConfigError} from './runtime-config';

export type PlotRendererType = 'area' | 'bar' | 'bidirectional-bar' | 'column' | 'line' | 'pie';

export interface PlotRendererConfig {
    version: 1;
    type: PlotRendererType;
    options: Record<string, unknown>;
}

export interface MapRendererConfig {
    version: 1;
    type: 'standard';
    options: {
        center?: [number, number];
        mapStyle?: string;
        pitch?: number;
        rotation?: number;
        showLabel?: boolean;
        viewMode?: '2D' | '3D';
        zoom?: number;
    };
}

export const DEFAULT_PLOT_RENDERER: PlotRendererConfig = {
    version: 1,
    type: 'bidirectional-bar',
    options: {
        layout: 'vertical',
        xField: 'country',
        yField: ['2016年耕地总面积', '2016年转基因种植面积'],
        legend: false,
        appendPadding: [20, 0],
    },
};

export const DEFAULT_MAP_RENDERER: MapRendererConfig = {
    version: 1,
    type: 'standard',
    options: {
        zoom: 11.43,
        center: [120.2446746826172, 30.199146446037616],
        pitch: 55,
        rotation: 20,
        showLabel: true,
        viewMode: '3D',
        mapStyle: 'amap://styles/dark',
    },
};

const PLOT_CONSTRUCTORS: Record<PlotRendererType, string> = {
    area: 'Area',
    bar: 'Bar',
    'bidirectional-bar': 'BidirectionalBar',
    column: 'Column',
    line: 'Line',
    pie: 'Pie',
};
const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSafeJson(value: unknown): boolean {
    if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return true;
    if (Array.isArray(value)) return value.every(isSafeJson);
    return isRecord(value) && Object.entries(value).every(([key, child]) => !FORBIDDEN_KEYS.has(key) && isSafeJson(child));
}

function parseConfig(value: unknown): unknown {
    if (typeof value !== 'string') return value;
    try {
        return JSON.parse(value);
    } catch {
        throw new RuntimeConfigError('渲染配置必须是有效 JSON；旧版自定义脚本需要手动迁移');
    }
}

export function parsePlotRendererConfig(value: unknown): PlotRendererConfig {
    const parsed = parseConfig(value);
    if (!isRecord(parsed) || parsed.version !== 1 || !Object.prototype.hasOwnProperty.call(PLOT_CONSTRUCTORS, String(parsed.type)) || !isRecord(parsed.options) || !isSafeJson(parsed.options)) {
        throw new RuntimeConfigError('图表渲染器配置无效');
    }
    return {version: 1, type: parsed.type as PlotRendererType, options: parsed.options};
}

export function createRegisteredPlot(
    container: HTMLElement,
    library: typeof G2PlotNamespace,
    data: unknown,
    value: unknown,
): Plot<any> {
    const config = parsePlotRendererConfig(value);
    const constructorName = PLOT_CONSTRUCTORS[config.type];
    const PlotConstructor = (library as unknown as Record<string, new (target: HTMLElement, options: Record<string, unknown>) => Plot<any>>)[constructorName];
    if (!PlotConstructor) throw new RuntimeConfigError(`图表渲染器未注册: ${config.type}`);
    const plot = new PlotConstructor(container, {...config.options, data});
    plot.render();
    return plot;
}

export function parseMapRendererConfig(value: unknown): MapRendererConfig {
    const parsed = parseConfig(value);
    if (!isRecord(parsed) || parsed.version !== 1 || parsed.type !== 'standard' || !isRecord(parsed.options) || !isSafeJson(parsed.options)) {
        throw new RuntimeConfigError('地图渲染器配置无效');
    }
    const options = parsed.options as MapRendererConfig['options'];
    if (options.center && (!Array.isArray(options.center) || options.center.length !== 2 || !options.center.every(Number.isFinite))) {
        throw new RuntimeConfigError('地图中心点必须是两个数字');
    }
    if (options.mapStyle !== undefined && typeof options.mapStyle !== 'string') throw new RuntimeConfigError('地图样式必须是字符串');
    if (options.showLabel !== undefined && typeof options.showLabel !== 'boolean') throw new RuntimeConfigError('地图标签开关必须是布尔值');
    if (options.viewMode !== undefined && !['2D', '3D'].includes(options.viewMode)) throw new RuntimeConfigError('地图视图模式无效');
    for (const field of ['pitch', 'rotation', 'zoom'] as const) {
        if (options[field] !== undefined && !Number.isFinite(options[field])) throw new RuntimeConfigError(`地图 ${field} 必须是数字`);
    }
    return {version: 1, type: 'standard', options};
}
