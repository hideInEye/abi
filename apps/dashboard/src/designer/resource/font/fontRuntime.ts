import dingTalkLocalUrl from './DingTalk JinBuTi.ttf?url';
import douyinLocalUrl from './DouyinSansBold.ttf?url';
import yousheLocalUrl from './优设标题黑.ttf?url';
import pangmenLocalUrl from './庞门正道标题体免费版.ttf?url';

import type {ProjectDataType} from '../../DesignerType.ts';

interface DashboardFontDefinition {
    readonly family: string;
    readonly localUrl: string;
}

const DASHBOARD_FONTS: readonly DashboardFontDefinition[] = [
    {family: 'DingTalk JinBuTi', localUrl: dingTalkLocalUrl},
    {family: 'DouyinSansBold', localUrl: douyinLocalUrl},
    {family: '优设标题黑', localUrl: yousheLocalUrl},
    {family: '庞门正道标题体免费版', localUrl: pangmenLocalUrl},
];

const registeredFontSources = new Map<string, string>();

function projectUsesFont(data: ProjectDataType, family: string): boolean {
    try {
        return JSON.stringify(data).includes(family);
    } catch {
        return false;
    }
}

export function registerDashboardFonts(
    data: ProjectDataType,
    {includeCatalog = false}: {includeCatalog?: boolean} = {},
): void {
    if (typeof document === 'undefined' || typeof FontFace === 'undefined' || !document.fonts) return;

    for (const definition of DASHBOARD_FONTS) {
        if (!includeCatalog && !projectUsesFont(data, definition.family)) continue;

        const source = definition.localUrl;
        if (!source || registeredFontSources.get(definition.family) === source) continue;

        const face = new FontFace(definition.family, `url(${JSON.stringify(source)})`, {
            display: 'swap',
            style: 'normal',
            weight: '400',
        });
        document.fonts.add(face);
        registeredFontSources.set(definition.family, source);
    }
}

export function getRegisteredDashboardFontSources(): ReadonlyMap<string, string> {
    return registeredFontSources;
}
