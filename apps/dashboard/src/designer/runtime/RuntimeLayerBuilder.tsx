import {createElement, type ReactElement} from 'react';
import cloneDeep from 'lodash/cloneDeep';

import GroupLayer from '../../comps/group-layer/GroupLayer';
import ComponentContainer from '../../framework/core/ComponentContainer';
import type {ILayerItem} from '../DesignerType';
import layerManager from '../manager/LayerManager';

function parseLayers(layerMap: Record<string, ILayerItem>): ILayerItem[] {
    const clonedLayers = cloneDeep(layerMap);
    const orderedLayers: ILayerItem[] = [];

    const appendLayer = (currentLayer: ILayerItem | undefined) => {
        if (!currentLayer) return;
        orderedLayers.push(currentLayer);
        if (currentLayer.childHeader) appendLayer(clonedLayers[currentLayer.childHeader]);

        let next = currentLayer.next;
        while (next) {
            const nextLayer = clonedLayers[next];
            if (nextLayer?.childHeader) appendLayer(clonedLayers[nextLayer.childHeader]);
            if (nextLayer) orderedLayers.push(nextLayer);
            next = nextLayer?.next;
        }
    };

    appendLayer(clonedLayers[layerManager.layerHeader!]);

    const roots: ILayerItem[] = [];
    orderedLayers.reverse().forEach(layer => {
        if (!layer.pid) {
            roots.push(layer);
            return;
        }
        const parent = clonedLayers[layer.pid];
        if (parent) {
            parent.children = parent.children || [];
            parent.children.push(layer);
        }
    });

    return roots;
}

function buildComponent(layer: ILayerItem): ReactElement {
    if (layer.type === 'group') {
        const children = layer.children?.map(buildComponent) ?? [];
        return createElement(GroupLayer, {layer, key: layer.id}, ...children);
    }
    return createElement(ComponentContainer, {layer, key: layer.id});
}

export function buildRuntimeCanvasComponents(layerMap: Record<string, ILayerItem>): ReactElement[] {
    return parseLayers(layerMap).map(buildComponent);
}
