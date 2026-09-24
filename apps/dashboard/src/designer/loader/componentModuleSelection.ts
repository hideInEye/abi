import type {ProjectDataType} from '../DesignerType.ts';

const DEFINITION_NAME_ALIASES: Readonly<Record<string, string | null>> = {
    LcBaseTable: 'BaseTable',
    carousel: 'Carousel',
    group: null,
};

export function getRuntimeDefinitionNames(data: ProjectDataType): string[] {
    const componentTypes = Object.values(data.layerManager?.layerConfigs ?? {})
        .map(layer => layer?.type)
        .filter((type): type is string => Boolean(type));

    return [...new Set(componentTypes)]
        .map(type => Object.prototype.hasOwnProperty.call(DEFINITION_NAME_ALIASES, type)
            ? DEFINITION_NAME_ALIASES[type]
            : type)
        .filter((name): name is string => Boolean(name))
        .sort();
}

export function getRuntimeConvertNames(data: ProjectDataType): string[] {
    return getRuntimeDefinitionNames(data).includes('BaseImage') ? ['BaseImage'] : [];
}
