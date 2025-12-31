/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var NotebookKernelHistoryService_1;
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { LinkedMap } from '../../../../../base/common/map.js';
import { localize2 } from '../../../../../nls.js';
import { Categories } from '../../../../../platform/action/common/actionCommonCategories.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IStorageService, } from '../../../../../platform/storage/common/storage.js';
import { INotebookKernelHistoryService, INotebookKernelService, } from '../../common/notebookKernelService.js';
import { INotebookLoggingService } from '../../common/notebookLoggingService.js';
const MAX_KERNELS_IN_HISTORY = 5;
let NotebookKernelHistoryService = class NotebookKernelHistoryService extends Disposable {
    static { NotebookKernelHistoryService_1 = this; }
    static { this.STORAGE_KEY = 'notebook.kernelHistory'; }
    constructor(_storageService, _notebookKernelService, _notebookLoggingService) {
        super();
        this._storageService = _storageService;
        this._notebookKernelService = _notebookKernelService;
        this._notebookLoggingService = _notebookLoggingService;
        this._mostRecentKernelsMap = {};
        this._loadState();
        this._register(this._storageService.onWillSaveState(() => this._saveState()));
        this._register(this._storageService.onDidChangeValue(1 /* StorageScope.WORKSPACE */, NotebookKernelHistoryService_1.STORAGE_KEY, this._store)(() => {
            this._loadState();
        }));
    }
    getKernels(notebook) {
        const allAvailableKernels = this._notebookKernelService.getMatchingKernel(notebook);
        const allKernels = allAvailableKernels.all;
        const selectedKernel = allAvailableKernels.selected;
        // We will suggest the only kernel
        const suggested = allAvailableKernels.all.length === 1 ? allAvailableKernels.all[0] : undefined;
        this._notebookLoggingService.debug('History', `getMatchingKernels: ${allAvailableKernels.all.length} kernels available for ${notebook.uri.path}. Selected: ${allAvailableKernels.selected?.label}. Suggested: ${suggested?.label}`);
        const mostRecentKernelIds = this._mostRecentKernelsMap[notebook.notebookType]
            ? [...this._mostRecentKernelsMap[notebook.notebookType].values()]
            : [];
        const all = mostRecentKernelIds
            .map((kernelId) => allKernels.find((kernel) => kernel.id === kernelId))
            .filter((kernel) => !!kernel);
        this._notebookLoggingService.debug('History', `mru: ${mostRecentKernelIds.length} kernels in history, ${all.length} registered already.`);
        return {
            selected: selectedKernel ?? suggested,
            all,
        };
    }
    addMostRecentKernel(kernel) {
        const key = kernel.id;
        const viewType = kernel.viewType;
        const recentKeynels = this._mostRecentKernelsMap[viewType] ?? new LinkedMap();
        recentKeynels.set(key, key, 1 /* Touch.AsOld */);
        if (recentKeynels.size > MAX_KERNELS_IN_HISTORY) {
            const reserved = [...recentKeynels.entries()].slice(0, MAX_KERNELS_IN_HISTORY);
            recentKeynels.fromJSON(reserved);
        }
        this._mostRecentKernelsMap[viewType] = recentKeynels;
    }
    _saveState() {
        let notEmpty = false;
        for (const [_, kernels] of Object.entries(this._mostRecentKernelsMap)) {
            notEmpty = notEmpty || kernels.size > 0;
        }
        if (notEmpty) {
            const serialized = this._serialize();
            this._storageService.store(NotebookKernelHistoryService_1.STORAGE_KEY, JSON.stringify(serialized), 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
        }
        else {
            this._storageService.remove(NotebookKernelHistoryService_1.STORAGE_KEY, 1 /* StorageScope.WORKSPACE */);
        }
    }
    _loadState() {
        const serialized = this._storageService.get(NotebookKernelHistoryService_1.STORAGE_KEY, 1 /* StorageScope.WORKSPACE */);
        if (serialized) {
            try {
                this._deserialize(JSON.parse(serialized));
            }
            catch (e) {
                this._mostRecentKernelsMap = {};
            }
        }
        else {
            this._mostRecentKernelsMap = {};
        }
    }
    _serialize() {
        const result = Object.create(null);
        for (const [viewType, kernels] of Object.entries(this._mostRecentKernelsMap)) {
            result[viewType] = {
                entries: [...kernels.values()],
            };
        }
        return result;
    }
    _deserialize(serialized) {
        this._mostRecentKernelsMap = {};
        for (const [viewType, kernels] of Object.entries(serialized)) {
            const linkedMap = new LinkedMap();
            const mapValues = [];
            for (const entry of kernels.entries) {
                mapValues.push([entry, entry]);
            }
            linkedMap.fromJSON(mapValues);
            this._mostRecentKernelsMap[viewType] = linkedMap;
        }
    }
    _clear() {
        this._mostRecentKernelsMap = {};
        this._saveState();
    }
};
NotebookKernelHistoryService = NotebookKernelHistoryService_1 = __decorate([
    __param(0, IStorageService),
    __param(1, INotebookKernelService),
    __param(2, INotebookLoggingService)
], NotebookKernelHistoryService);
export { NotebookKernelHistoryService };
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.clearNotebookKernelsMRUCache',
            title: localize2('workbench.notebook.clearNotebookKernelsMRUCache', 'Clear Notebook Kernels MRU Cache'),
            category: Categories.Developer,
            f1: true,
        });
    }
    async run(accessor) {
        const historyService = accessor.get(INotebookKernelHistoryService);
        historyService._clear();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tLZXJuZWxIaXN0b3J5U2VydmljZUltcGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3NlcnZpY2VzL25vdGVib29rS2VybmVsSGlzdG9yeVNlcnZpY2VJbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFNBQVMsRUFBUyxNQUFNLG1DQUFtQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDNUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUU1RixPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUVOLDZCQUE2QixFQUM3QixzQkFBc0IsR0FFdEIsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQVVoRixNQUFNLHNCQUFzQixHQUFHLENBQUMsQ0FBQTtBQUV6QixJQUFNLDRCQUE0QixHQUFsQyxNQUFNLDRCQUNaLFNBQVEsVUFBVTs7YUFLSCxnQkFBVyxHQUFHLHdCQUF3QixBQUEzQixDQUEyQjtJQUdyRCxZQUNrQixlQUFpRCxFQUMxQyxzQkFBK0QsRUFDOUQsdUJBQWlFO1FBRTFGLEtBQUssRUFBRSxDQUFBO1FBSjJCLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUN6QiwyQkFBc0IsR0FBdEIsc0JBQXNCLENBQXdCO1FBQzdDLDRCQUF1QixHQUF2Qix1QkFBdUIs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