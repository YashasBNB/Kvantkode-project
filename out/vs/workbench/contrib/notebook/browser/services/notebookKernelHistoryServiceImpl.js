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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tLZXJuZWxIaXN0b3J5U2VydmljZUltcGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvc2VydmljZXMvbm90ZWJvb2tLZXJuZWxIaXN0b3J5U2VydmljZUltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsU0FBUyxFQUFTLE1BQU0sbUNBQW1DLENBQUE7QUFDcEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUM1RixPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRTVGLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBRU4sNkJBQTZCLEVBQzdCLHNCQUFzQixHQUV0QixNQUFNLHVDQUF1QyxDQUFBO0FBQzlDLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBVWhGLE1BQU0sc0JBQXNCLEdBQUcsQ0FBQyxDQUFBO0FBRXpCLElBQU0sNEJBQTRCLEdBQWxDLE1BQU0sNEJBQ1osU0FBUSxVQUFVOzthQUtILGdCQUFXLEdBQUcsd0JBQXdCLEFBQTNCLENBQTJCO0lBR3JELFlBQ2tCLGVBQWlELEVBQzFDLHNCQUErRCxFQUM5RCx1QkFBaUU7UUFFMUYsS0FBSyxFQUFFLENBQUE7UUFKMkIsb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBQ3pCLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBd0I7UUFD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