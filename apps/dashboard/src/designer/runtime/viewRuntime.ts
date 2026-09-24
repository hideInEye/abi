import bluePrintManager from '../blueprint/manager/BluePrintManager';
import canvasManager from '../header/items/canvas/CanvasManager';
import themeManager from '../header/items/theme/ThemeManager';
import type {ProjectDataType} from '../DesignerType';
import {DesignerMode} from '../DesignerType';
import FilterManager from '../manager/FilterManager';
import layerManager from '../manager/LayerManager';

export function destroyViewRuntime(): void {
    layerManager.destroy();
    bluePrintManager.destroy();
    canvasManager.destroy();
    themeManager.destroy();
    FilterManager.destroy();
    if (typeof window !== 'undefined' && window.LC_ENV) {
        window.LC_ENV.controllers = {};
        window.LC_ENV.createdController = 0;
        window.LC_ENV.totalController = 0;
    }
}

export function initializeViewRuntime(data: ProjectDataType): void {
    destroyViewRuntime();
    if (data.canvasManager) canvasManager.init(data.canvasManager);
    if (data.themeManager) themeManager.init(data.themeManager);
    if (data.layerManager) layerManager.init(data.layerManager);
    if (data.bluePrintManager) bluePrintManager.init(data.bluePrintManager, DesignerMode.VIEW);
    if (data.filterManager) FilterManager.init(data.filterManager);
}
