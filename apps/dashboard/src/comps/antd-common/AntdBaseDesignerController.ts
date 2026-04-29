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

import AbstractDesignerController from "../../framework/core/AbstractDesignerController";
import {UpdateOptions} from "../../framework/core/AbstractController";
import {ComponentBaseProps} from "../common-component/CommonTypes.ts";
import {Options, Plot} from "@antv/g2plot";
import ObjectUtil from "../../utils/ObjectUtil";
import BPExecutor from "../../designer/blueprint/core/BPExecutor";

export abstract class AntdBaseDesignerController<I extends Plot<any> = Plot<Options>,
    C extends ComponentBaseProps = ComponentBaseProps> extends AbstractDesignerController<I, C> {

    protected interval: NodeJS.Timeout | null = null;
    //上一次数据连接状态 true：成功 false：失败
    protected lastReqState: boolean = true;
    private ClazzTemplate: (new (...args: any[]) => I) | undefined;

    changeData(data: any, extra?: {
        mapping?: { 'x字段'?: string; 'y字段'?: string; '分组字段'?: string };
        name?: { x_name?: string; y_name?: string; title?: string };
    }) {
        this.instance?.changeData(data);
        if (this.config?.style?.data) this.config!.style!.data = data;
        this.config!['data']!['staticData'] = data;
        if (extra?.mapping) {
            const {['x字段']: xField, ['y字段']: yField, ['分组字段']: seriesField} = extra.mapping;
            if (xField) this.config!.style!.xField = xField;
            if (yField) this.config!.style!.yField = yField;
            if (seriesField) this.config!.style!.seriesField = seriesField;
            this.instance?.update({...(xField&&{xField}), ...(yField&&{yField}), ...(seriesField&&{seriesField})});
        }
        if (extra?.name) {
            const {x_name, y_name, title} = extra.name;
            const parentEl = this.container?.parentElement;
            if (parentEl) {
                let el = parentEl.querySelector<HTMLElement>(':scope > .lc-chart-title');
                if (title) {
                    if (!el) {
                        el = Object.assign(document.createElement('div'), {className: 'lc-chart-title'});
                        el.style.cssText = 'font-size:13px;font-weight:600;color:#1c1c1c;text-align:center;line-height:24px;height:24px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;';
                        parentEl.insertBefore(el, parentEl.firstChild);
                        if (this.container) this.container.style.height = 'calc(100% - 24px)';
                    }
                    el.textContent = title;
                    this.config!.style!.title = title;
                } else if (el) {
                    el.remove();
                    if (this.container) this.container.style.height = '100%';
                }
            }
            const axisCfg = (t: string) => ({text: t, offset: 0, position: 'center', style: {fill: '#1c1c1c', fontSize: 12}});
            if (x_name) { const c = axisCfg(x_name); if (this.config!.style!.xAxis) this.config!.style!.xAxis.title = c; this.instance?.update({xAxis: {...(this.config!.style!.xAxis??{}), title: c}} as any); }
            if (y_name) { const c = axisCfg(y_name); if (this.config!.style!.yAxis) this.config!.style!.yAxis.title = c; this.instance?.update({yAxis: {...(this.config!.style!.yAxis??{}), title: c}} as any); }
        }
    }


    registerEvent(): void {
        const nodeId = this.config?.base?.id ?? "";
        this.instance?.on('plot:click', () => {
            BPExecutor.triggerComponentEvent(nodeId!, "globalClick", this.config)
        });
        this.instance?.on('element:click', () => {
            BPExecutor.triggerComponentEvent(nodeId!, "elementClick", this.config)
        });
        // 图例添加点击事件
        this.instance?.on('legend-item:click', () => {
            BPExecutor.triggerComponentEvent(nodeId!, "legendClick", this.config)
        });
        // 图例名称添加点击事件
        this.instance?.on('legend-item-name:click', () => {
            BPExecutor.triggerComponentEvent(nodeId!, "elementNameClick", this.config)
        });
        // axis-label 添加点击事件
        this.instance?.on('axis-label:click', () => {
            BPExecutor.triggerComponentEvent(nodeId!, "axisLabelClick", this.config)
        });
    }

    public commonCreate(container: HTMLElement, Clazz: new (...args: any[]) => I, config: C): void {
        this.config = config;
        this.container = container;
        this.instance = new Clazz(container, this.config?.style ?? {} as C);
        this.instance?.render();
        this.ClazzTemplate = Clazz;
        this.registerEvent();
        // 如果 config 里保存了标题（之前采纳过），恢复标题 DOM
        const savedTitle = (this.config as any)?.style?.title;
        if (savedTitle) this.restoreChartTitle(savedTitle);
    }
  
    private restoreChartTitle(title: string) {
        const parentEl = this.container?.parentElement;
        if (!parentEl || parentEl.querySelector(':scope > .lc-chart-title')) return;
        const el = Object.assign(document.createElement('div'), {className: 'lc-chart-title', textContent: title});
        el.style.cssText = 'font-size:13px;font-weight:600;color:#1c1c1c;text-align:center;line-height:24px;height:24px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;';
        parentEl.insertBefore(el, parentEl.firstChild);
        if (this.container) this.container.style.height = 'calc(100% - 24px)';
    }

    public commonUpdate(config: C, Clazz: new (...args: any[]) => I, upOp?: UpdateOptions,): void {
        this.config = ObjectUtil.merge(this.config, config);
        upOp = upOp || {reRender: true};
        if (upOp.reRender)
            this.instance?.update(this.config?.style ?? {});
    }

    setVisible(visible: boolean) {
        if (visible) {
            //显示
            if (!this.ClazzTemplate || this.instance)
                return;
            this.instance = new this.ClazzTemplate(this.container, this.config?.style ?? {} as C);
            this.instance?.render();
        } else {
            //隐藏
            this.instance?.destroy();
            this.instance = null;
            //移除container下的所有子dom
            while (this.container?.firstChild) {
                this.container?.removeChild(this.container?.firstChild);
            }
        }

    }
}