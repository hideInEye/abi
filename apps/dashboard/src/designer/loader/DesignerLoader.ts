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

import {AbstractDefinition} from "../../framework/core/AbstractDefinition";
import AbstractConvert from "../../framework/convert/AbstractConvert";
import {componentCategorize} from "../left/compoent-lib/ComponentCategorize";
import {DesignerMode, ProjectDataType, SaveType} from "../DesignerType.ts";
import {globalMessage} from "../../framework/message/GlobalMessage.tsx";
import {action, makeObservable, observable} from "mobx";
import {runProjectLoadFlow} from './projectLoadFlow.ts';

export class DesignerLoader {

    constructor(mode: DesignerMode) {
        this.mode = mode;
        makeObservable(this, {
            loaded: observable,
            setLoaded: action,
        });
    }

    //设计器是否已加载完成
    public loaded: boolean = false;
    //设计器所处模式：编辑、预览、发布
    public mode: DesignerMode = DesignerMode.EDIT;
    //自定义组件信息映射
    public static definitionMap: Record<string, AbstractDefinition> = {};
    //数据转换器
    public convertMap: { [key: string]: AbstractConvert } = {};
    private loadGeneration = 0;

    public setLoaded = (loaded: boolean) => this.loaded = loaded;

    public cancelLoad = () => {
        this.loadGeneration += 1;
        this.setLoaded(false);
    };

    protected getProjectData(id: string, type: SaveType): Promise<ProjectDataType | null> {
        throw new Error(`Method not implemented. ${id} - ${type}`);
    }

    protected getProjectDataAfter(id: string, type: SaveType, data: ProjectDataType): void {
        throw new Error(`Method not implemented. ${id} - ${type} - ${data}`);
    }


    /**
     * 加载设计器
     */
    public async load(id: string, type: SaveType): Promise<boolean> {
        const generation = ++this.loadGeneration;
        //扫描组件
        this.scanComponents();
        return runProjectLoadFlow({
            isCurrent: () => generation === this.loadGeneration,
            load: () => this.getProjectData(id, type),
            onSuccess: data => this.getProjectDataAfter(id, type, data),
            onLoaded: this.setLoaded,
            onError: message => globalMessage?.messageApi?.error(message),
        });
    }

    /**
     * 扫描设计器组件
     */
    protected scanComponents(): void {
        const glob = import.meta.glob('../../comps/**/*.ts', {eager: true}) as Record<string, any>;
        for (const key of Object.keys(glob)) {
            const Clazz = glob[key]?.default;
            if (Clazz && Object.prototype.isPrototypeOf.call(AbstractDefinition, Clazz)) {
                const definition: AbstractDefinition = new Clazz();
                //获取组件的基础信息
                if (typeof definition.getBaseInfo === "function") {
                    const compKey = definition.getBaseInfo().compKey;
                    if (compKey)
                        DesignerLoader.definitionMap[compKey] = definition;
                }
                //获取自定义分类
                if (typeof definition.getCategorize === "function") {
                    const categorize = definition.getCategorize();
                    if (categorize) {
                        if (!categorize.icon) {
                            console.error("自定义组件的分类必须指定icon");
                            continue;
                        } else
                            componentCategorize.push(categorize);
                    }
                }
                //获取自定义子类型
                if (typeof definition.getSubCategorize === "function") {
                    const subCategorize = definition.getSubCategorize();
                    if (subCategorize) {
                        if (!subCategorize.parentKey) {
                            console.error("自定义组件的子类型必须指定parentKey");
                        } else
                            componentCategorize.push(subCategorize);
                    }
                }
            } else if (Clazz && Object.prototype.isPrototypeOf.call(AbstractConvert, Clazz)) {
                const convert: AbstractConvert = new Clazz();
                const convertKey = convert.getKey();
                this.convertMap[convertKey] = convert;
            }
        }
    }

}
