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

import {APIConfig, IDatabase, IFilterConfigType, ThemeItemType, DesignerMode} from "../../designer/DesignerType";
import AbstractController from "./AbstractController";
import {ComponentBaseProps} from "../../comps/common-component/CommonTypes.ts";
import FetchUtil from "../../utils/FetchUtil.ts";
import {applyDataTransform, RuntimeConfigError} from "../../security/runtime-config.ts";

/**
 * AbstractDesignerController继承自AbstractController，在泛型的定义和约束上和AbstractController完全保持一致。
 * 此外，AbstractDesignerController扩展了一些自定义组件所需的特有方法，如：修改组件数据、注册蓝图事件等
 */
abstract class AbstractDesignerController<I = any, C = any> extends AbstractController<I, C> {
    //轮询请求定时器
    protected interval: NodeJS.Timeout | null = null;
    //上一次数据连接状态 true：成功 false：失败
    protected lastReqState: boolean = true;
    //异常提示信息dom元素
    private errMsgDom: HTMLElement | null = null;

    /**
     * 更新组件数据,且必须触发组件的重新渲染
     * @param data
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public changeData(data: any, extra?: Record<string, any>): void {
    }

    /**
     * 用于注册组件事件，在组件接入蓝图事件系统时使用
     */
    public registerEvent(): void {
    }


    private setRequestFailed(message = "数据加载失败...") {
        this.lastReqState = false;
        if (!this.errMsgDom && this.container) {
            this.errMsgDom = document.createElement("div");
            this.errMsgDom.classList.add("view-error-message");
            this.errMsgDom.innerText = message;
            this.container.appendChild(this.errMsgDom);
        }
    }

    private setRequestSucceeded() {
        if (!this.lastReqState) {
            this.lastReqState = true;
            this.errMsgDom?.remove();
            this.errMsgDom = null;
        }
    }

    private doApi = (config: APIConfig) => {
        const {url, method, params, header, frequency = 5, filter, autoFlush} = config;
        const request = () => {
            FetchUtil.doRequestNativeResult(url!, method!, header, params).then((res) => {
                if (!res) return this.setRequestFailed();
                try {
                    const data = filter ? applyDataTransform(res, filter) : res;
                    this.setRequestSucceeded();
                    this.changeData(data);
                } catch (error) {
                    this.setRequestFailed(error instanceof RuntimeConfigError ? error.message : undefined);
                }
            });
        }
        request();
        if (autoFlush)
            this.interval = setInterval(() => request(), frequency * 1000);
    }

    private doDatabase = (config: IDatabase) => {
        const {sql, targetDb, filter, frequency, autoFlush} = config;
        const request = () => {
            if (!sql || sql === '')
                return;
            FetchUtil.post(`/dashboard/api/v1/db/executor/execute`, {
                id: targetDb,
                sql: sql,
                projectId: window.LC_ENV?.projectId,
                spaceId: localStorage.getItem('spaceId'),
                remark: '',
                saveFlag: false
            }).then(res => {
                let data = res.data?.data ?? res.data;
                if (res.code === 200) {
                    try {
                        data = filter ? applyDataTransform(data, filter) : data;
                        this.setRequestSucceeded();
                        this.changeData(data);
                    } catch (error) {
                        this.setRequestFailed(error instanceof RuntimeConfigError ? error.message : undefined);
                    }
                } else {
                    this.setRequestFailed();
                }
            });
        }
        request();
        if (autoFlush)
            this.interval = setInterval(() => request(), (frequency || 5) * 1000);
    }

    /**
     * 加载组件数据，用于在预览（展示）模式下渲染完组件后根据当前组件的数据配置自动加载并更新组件数组。
     * 注：若自定义组件有自己的数据加载方式，则需要覆写此方法
     */
    public loadComponentData(): void {
        //预览模式
        const {data} = this.config! as ComponentBaseProps;
        if (!data) return;
        const {sourceType} = data!;
        switch (sourceType) {
            case "static":
                //静态数据不做处理，组件首次渲染时默认读取静态数据
                break;
            case "api":
                this.doApi(data?.apiData ?? {});
                break;
            case 'database':
                // 预览模式（预览页/分享页）下不调用远程接口，数据已存储在 dataJson 中
                if (window.LC_ENV?.mode === DesignerMode.VIEW)
                    break;
                this.doDatabase(data?.database ?? {});
                break;
        }
    }

    /**
     * 更新本组件的主题样式方法，用于在全局切换主题时使用
     * @param newTheme 新主题
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public updateTheme(newTheme: ThemeItemType): void {
    }

    public updateFilter(filter: IFilterConfigType): void {
        if (this.config && (this.config as ComponentBaseProps).filter)
            (this.config as ComponentBaseProps)!.filter = filter;
        if (!this.container)
            return;
        if (filter?.enable) {
            this.container.style.filter = `blur(${filter.blur}px) brightness(${filter.brightness}) contrast(${filter.contrast}) opacity(${filter.opacity}) saturate(${filter.saturate}) hue-rotate(${filter.hueRotate}deg)`
        } else {
            this.container.style.filter = 'none';
        }
    }

    /**
     * 设置组件的显示状态，默认直接使用css属性控制组件显示。
     * 接入组件的过程中，建议自行实现该方法以达到更好的性能表现。建议的做法是显示时重新渲染组件. 隐藏时卸载整个组件即dom元素。可以节省内存开销
     * @param visible
     */
    public setVisible(visible: boolean): void {
        if (this.container) {
            if (visible)
                this.container.style.visibility = "visible";
            else
                this.container.style.visibility = "hidden";
        }
    }

    private clearRuntimeResources(): void {
        if (this.interval) clearInterval(this.interval);
        this.interval = null;
        this.errMsgDom?.remove();
        this.errMsgDom = null;
    }

    public destroy(): void {
        this.clearRuntimeResources();
        super.destroy();
    }

    public dispose(): void {
        try {
            this.destroy();
        } finally {
            this.clearRuntimeResources();
            super.destroy();
        }
    }

}

export default AbstractDesignerController;
