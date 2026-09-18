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

import {action, makeObservable, observable} from "mobx";
import AbstractManager from "../../../manager/core/AbstractManager.ts";
import {ThemeItemType} from "../../../DesignerType.ts";

const DEFAULT_THEME_CONFIG: Array<ThemeItemType> = [
    {
        id: "0",
        name: "标准风格(默认主题)",
        colors: {
            main: "#1677ff",
            mainText: "#333333",
            subText: "#555555",
            background: "rgba(22,119,255,0.08)",
            supplementFirst: "#13c2c2",
            supplementSecond: "#52c41a",
        },
    },
];
const createDefaultThemeConfig = () => DEFAULT_THEME_CONFIG.map(item => ({...item, colors: {...item.colors}}));

class ThemeManager extends AbstractManager<Array<ThemeItemType>> {
    constructor() {
        super();
        makeObservable(this, {
            themeVisible: observable,
            setThemeVisible: action,
            themeConfig: observable,
            updateThemeConfig: action,
            destroy: action,
        })
    }

    themeVisible: boolean = false;

    setThemeVisible = (visible: boolean) => this.themeVisible = visible;

    /**
     * 主题
     */
    themeConfig: Array<ThemeItemType> | null = createDefaultThemeConfig();

    updateThemeConfig = (data: Array<ThemeItemType>) => this.themeConfig = data;

    destroy(): void {
        this.themeConfig = createDefaultThemeConfig();
        this.themeVisible = false;
    }

    getData(): Array<ThemeItemType> {
        return this.themeConfig!;
    }

    init(data: Array<ThemeItemType>): void {
        this.themeConfig = data || this.themeConfig;
    }

}

const themeHdStore = new ThemeManager();
export default themeHdStore;
