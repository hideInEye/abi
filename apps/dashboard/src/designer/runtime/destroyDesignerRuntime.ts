import designerManager from '../manager/DesignerManager';
import eventOperateStore from '../operate-provider/EventOperateStore';
import {historyOperator} from '../operate-provider/undo-redo/HistoryOperator';
import runtimeConfigStore from '../store/RuntimeStore';

export function destroyDesignerRuntime(): void {
    designerManager.destroy();
    historyOperator.reset();
    eventOperateStore.reset();
    runtimeConfigStore.reset();
    if (typeof window !== 'undefined' && window.LC_ENV) {
        window.LC_ENV.controllers = {};
        window.LC_ENV.createdController = 0;
        window.LC_ENV.totalController = 0;
    }
}
