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
var NotebookKernelService_1;
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { LRUCache, ResourceMap } from '../../../../../base/common/map.js';
import { IStorageService, } from '../../../../../platform/storage/common/storage.js';
import { URI } from '../../../../../base/common/uri.js';
import { INotebookService } from '../../common/notebookService.js';
import { IMenuService, MenuId } from '../../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { Schemas } from '../../../../../base/common/network.js';
import { getActiveWindow, runWhenWindowIdle } from '../../../../../base/browser/dom.js';
class KernelInfo {
    static { this._logicClock = 0; }
    constructor(kernel) {
        this.notebookPriorities = new ResourceMap();
        this.kernel = kernel;
        this.score = -1;
        this.time = KernelInfo._logicClock++;
    }
}
class NotebookTextModelLikeId {
    static str(k) {
        return `${k.notebookType}/${k.uri.toString()}`;
    }
    static obj(s) {
        const idx = s.indexOf('/');
        return {
            notebookType: s.substring(0, idx),
            uri: URI.parse(s.substring(idx + 1)),
        };
    }
}
class SourceAction extends Disposable {
    constructor(action, model, isPrimary) {
        super();
        this.action = action;
        this.model = model;
        this.isPrimary = isPrimary;
        this._onDidChangeState = this._register(new Emitter());
        this.onDidChangeState = this._onDidChangeState.event;
    }
    async runAction() {
        if (this.execution) {
            return this.execution;
        }
        this.execution = this._runAction();
        this._onDidChangeState.fire();
        await this.execution;
        this.execution = undefined;
        this._onDidChangeState.fire();
    }
    async _runAction() {
        try {
            await this.action.run({
                uri: this.model.uri,
                $mid: 14 /* MarshalledId.NotebookActionContext */,
            });
        }
        catch (error) {
            console.warn(`Kernel source command failed: ${error}`);
        }
    }
}
let NotebookKernelService = class NotebookKernelService extends Disposable {
    static { NotebookKernelService_1 = this; }
    static { this._storageNotebookBinding = 'notebook.controller2NotebookBindings'; }
    constructor(_notebookService, _storageService, _menuService, _contextKeyService) {
        super();
        this._notebookService = _notebookService;
        this._storageService = _storageService;
        this._menuService = _menuService;
        this._contextKeyService = _contextKeyService;
        this._kernels = new Map();
        this._notebookBindings = new LRUCache(1000, 0.7);
        this._onDidChangeNotebookKernelBinding = this._register(new Emitter());
        this._onDidAddKernel = this._register(new Emitter());
        this._onDidRemoveKernel = this._register(new Emitter());
        this._onDidChangeNotebookAffinity = this._register(new Emitter());
        this._onDidChangeSourceActions = this._register(new Emitter());
        this._onDidNotebookVariablesChange = this._register(new Emitter());
        this._kernelSources = new Map();
        this._kernelSourceActionsUpdates = new Map();
        this._kernelDetectionTasks = new Map();
        this._onDidChangeKernelDetectionTasks = this._register(new Emitter());
        this._kernelSourceActionProviders = new Map();
        this.onDidChangeSelectedNotebooks = this._onDidChangeNotebookKernelBinding.event;
        this.onDidAddKernel = this._onDidAddKernel.event;
        this.onDidRemoveKernel = this._onDidRemoveKernel.event;
        this.onDidChangeNotebookAffinity = this._onDidChangeNotebookAffinity.event;
        this.onDidChangeSourceActions = this._onDidChangeSourceActions.event;
        this.onDidChangeKernelDetectionTasks = this._onDidChangeKernelDetectionTasks.event;
        this.onDidNotebookVariablesUpdate = this._onDidNotebookVariablesChange.event;
        // auto associate kernels to new notebook documents, also emit event when
        // a notebook has been closed (but don't update the memento)
        this._register(_notebookService.onDidAddNotebookDocument(this._tryAutoBindNotebook, this));
        this._register(_notebookService.onWillRemoveNotebookDocument((notebook) => {
            const id = NotebookTextModelLikeId.str(notebook);
            const kernelId = this._notebookBindings.get(id);
            if (kernelId && notebook.uri.scheme === Schemas.untitled) {
                this.selectKernelForNotebook(undefined, notebook);
            }
            this._kernelSourceActionsUpdates.get(id)?.dispose();
            this._kernelSourceActionsUpdates.delete(id);
        }));
        // restore from storage
        try {
            const data = JSON.parse(this._storageService.get(NotebookKernelService_1._storageNotebookBinding, 1 /* StorageScope.WORKSPACE */, '[]'));
            this._notebookBindings.fromJSON(data);
        }
        catch {
            // ignore
        }
    }
    dispose() {
        this._kernels.clear();
        this._kernelSources.forEach((v) => {
            v.menu.dispose();
            v.actions.forEach((a) => a[1].dispose());
        });
        this._kernelSourceActionsUpdates.forEach((v) => {
            v.dispose();
        });
        this._kernelSourceActionsUpdates.clear();
        super.dispose();
    }
    _persistMementos() {
        this._persistSoonHandle?.dispose();
        this._persistSoonHandle = runWhenWindowIdle(getActiveWindow(), () => {
            this._storageService.store(NotebookKernelService_1._storageNotebookBinding, JSON.stringify(this._notebookBindings), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }, 100);
    }
    static _score(kernel, notebook) {
        if (kernel.viewType === '*') {
            return 5;
        }
        else if (kernel.viewType === notebook.notebookType) {
            return 10;
        }
        else {
            return 0;
        }
    }
    _tryAutoBindNotebook(notebook, onlyThisKernel) {
        const id = this._notebookBindings.get(NotebookTextModelLikeId.str(notebook));
        if (!id) {
            // no kernel associated
            return;
        }
        const existingKernel = this._kernels.get(id);
        if (!existingKernel || !NotebookKernelService_1._score(existingKernel.kernel, notebook)) {
            // associated kernel not known, not matching
            return;
        }
        if (!onlyThisKernel || existingKernel.kernel === onlyThisKernel) {
            this._onDidChangeNotebookKernelBinding.fire({
                notebook: notebook.uri,
                oldKernel: undefined,
                newKernel: existingKernel.kernel.id,
            });
        }
    }
    notifyVariablesChange(notebookUri) {
        this._onDidNotebookVariablesChange.fire(notebookUri);
    }
    registerKernel(kernel) {
        if (this._kernels.has(kernel.id)) {
            throw new Error(`NOTEBOOK CONTROLLER with id '${kernel.id}' already exists`);
        }
        this._kernels.set(kernel.id, new KernelInfo(kernel));
        this._onDidAddKernel.fire(kernel);
        // auto associate the new kernel to existing notebooks it was
        // associated to in the past.
        for (const notebook of this._notebookService.getNotebookTextModels()) {
            this._tryAutoBindNotebook(notebook, kernel);
        }
        return toDisposable(() => {
            if (this._kernels.delete(kernel.id)) {
                this._onDidRemoveKernel.fire(kernel);
            }
            for (const [key, candidate] of Array.from(this._notebookBindings)) {
                if (candidate === kernel.id) {
                    this._onDidChangeNotebookKernelBinding.fire({
                        notebook: NotebookTextModelLikeId.obj(key).uri,
                        oldKernel: kernel.id,
                        newKernel: undefined,
                    });
                }
            }
        });
    }
    getMatchingKernel(notebook) {
        // all applicable kernels
        const kernels = [];
        for (const info of this._kernels.values()) {
            const score = NotebookKernelService_1._score(info.kernel, notebook);
            if (score) {
                kernels.push({
                    score,
                    kernel: info.kernel,
                    instanceAffinity: info.notebookPriorities.get(notebook.uri) ??
                        1 /* vscode.NotebookControllerPriority.Default */,
                });
            }
        }
        kernels.sort((a, b) => b.instanceAffinity - a.instanceAffinity ||
            a.score - b.score ||
            a.kernel.label.localeCompare(b.kernel.label));
        const all = kernels.map((obj) => obj.kernel);
        // bound kernel
        const selectedId = this._notebookBindings.get(NotebookTextModelLikeId.str(notebook));
        const selected = selectedId ? this._kernels.get(selectedId)?.kernel : undefined;
        const suggestions = kernels
            .filter((item) => item.instanceAffinity > 1)
            .map((item) => item.kernel);
        const hidden = kernels.filter((item) => item.instanceAffinity < 0).map((item) => item.kernel);
        return { all, selected, suggestions, hidden };
    }
    getSelectedOrSuggestedKernel(notebook) {
        const info = this.getMatchingKernel(notebook);
        if (info.selected) {
            return info.selected;
        }
        const preferred = info.all.filter((kernel) => this._kernels.get(kernel.id)?.notebookPriorities.get(notebook.uri) ===
            2 /* vscode.NotebookControllerPriority.Preferred */);
        if (preferred.length === 1) {
            return preferred[0];
        }
        return info.all.length === 1 ? info.all[0] : undefined;
    }
    // a notebook has one kernel, a kernel has N notebooks
    // notebook <-1----N-> kernel
    selectKernelForNotebook(kernel, notebook) {
        const key = NotebookTextModelLikeId.str(notebook);
        const oldKernel = this._notebookBindings.get(key);
        if (oldKernel !== kernel?.id) {
            if (kernel) {
                this._notebookBindings.set(key, kernel.id);
            }
            else {
                this._notebookBindings.delete(key);
            }
            this._onDidChangeNotebookKernelBinding.fire({
                notebook: notebook.uri,
                oldKernel,
                newKernel: kernel?.id,
            });
            this._persistMementos();
        }
    }
    preselectKernelForNotebook(kernel, notebook) {
        const key = NotebookTextModelLikeId.str(notebook);
        const oldKernel = this._notebookBindings.get(key);
        if (oldKernel !== kernel?.id) {
            this._notebookBindings.set(key, kernel.id);
            this._persistMementos();
        }
    }
    updateKernelNotebookAffinity(kernel, notebook, preference) {
        const info = this._kernels.get(kernel.id);
        if (!info) {
            throw new Error(`UNKNOWN kernel '${kernel.id}'`);
        }
        if (preference === undefined) {
            info.notebookPriorities.delete(notebook);
        }
        else {
            info.notebookPriorities.set(notebook, preference);
        }
        this._onDidChangeNotebookAffinity.fire();
    }
    getRunningSourceActions(notebook) {
        const id = NotebookTextModelLikeId.str(notebook);
        const existingInfo = this._kernelSources.get(id);
        if (existingInfo) {
            return existingInfo.actions.filter((action) => action[0].execution).map((action) => action[0]);
        }
        return [];
    }
    getSourceActions(notebook, contextKeyService) {
        contextKeyService = contextKeyService ?? this._contextKeyService;
        const id = NotebookTextModelLikeId.str(notebook);
        const existingInfo = this._kernelSources.get(id);
        if (existingInfo) {
            return existingInfo.actions.map((a) => a[0]);
        }
        const sourceMenu = this._register(this._menuService.createMenu(MenuId.NotebookKernelSource, contextKeyService));
        const info = { menu: sourceMenu, actions: [] };
        const loadActionsFromMenu = (menu, document) => {
            const groups = menu.getActions({ shouldForwardArgs: true });
            const sourceActions = [];
            groups.forEach((group) => {
                const isPrimary = /^primary/.test(group[0]);
                group[1].forEach((action) => {
                    const sourceAction = new SourceAction(action, document, isPrimary);
                    const stateChangeListener = sourceAction.onDidChangeState(() => {
                        this._onDidChangeSourceActions.fire({
                            notebook: document.uri,
                            viewType: document.notebookType,
                        });
                    });
                    sourceActions.push([sourceAction, stateChangeListener]);
                });
            });
            info.actions = sourceActions;
            this._kernelSources.set(id, info);
            this._onDidChangeSourceActions.fire({
                notebook: document.uri,
                viewType: document.notebookType,
            });
        };
        this._kernelSourceActionsUpdates.get(id)?.dispose();
        this._kernelSourceActionsUpdates.set(id, sourceMenu.onDidChange(() => {
            loadActionsFromMenu(sourceMenu, notebook);
        }));
        loadActionsFromMenu(sourceMenu, notebook);
        return info.actions.map((a) => a[0]);
    }
    registerNotebookKernelDetectionTask(task) {
        const notebookType = task.notebookType;
        const all = this._kernelDetectionTasks.get(notebookType) ?? [];
        all.push(task);
        this._kernelDetectionTasks.set(notebookType, all);
        this._onDidChangeKernelDetectionTasks.fire(notebookType);
        return toDisposable(() => {
            const all = this._kernelDetectionTasks.get(notebookType) ?? [];
            const idx = all.indexOf(task);
            if (idx >= 0) {
                all.splice(idx, 1);
                this._kernelDetectionTasks.set(notebookType, all);
                this._onDidChangeKernelDetectionTasks.fire(notebookType);
            }
        });
    }
    getKernelDetectionTasks(notebook) {
        return this._kernelDetectionTasks.get(notebook.notebookType) ?? [];
    }
    registerKernelSourceActionProvider(viewType, provider) {
        const providers = this._kernelSourceActionProviders.get(viewType) ?? [];
        providers.push(provider);
        this._kernelSourceActionProviders.set(viewType, providers);
        this._onDidChangeSourceActions.fire({ viewType: viewType });
        const eventEmitterDisposable = provider.onDidChangeSourceActions?.(() => {
            this._onDidChangeSourceActions.fire({ viewType: viewType });
        });
        return toDisposable(() => {
            const providers = this._kernelSourceActionProviders.get(viewType) ?? [];
            const idx = providers.indexOf(provider);
            if (idx >= 0) {
                providers.splice(idx, 1);
                this._kernelSourceActionProviders.set(viewType, providers);
            }
            eventEmitterDisposable?.dispose();
        });
    }
    /**
     * Get kernel source actions from providers
     */
    getKernelSourceActions2(notebook) {
        const viewType = notebook.notebookType;
        const providers = this._kernelSourceActionProviders.get(viewType) ?? [];
        const promises = providers.map((provider) => provider.provideKernelSourceActions());
        return Promise.all(promises).then((actions) => {
            return actions.reduce((a, b) => a.concat(b), []);
        });
    }
};
NotebookKernelService = NotebookKernelService_1 = __decorate([
    __param(0, INotebookService),
    __param(1, IStorageService),
    __param(2, IMenuService),
    __param(3, IContextKeyService)
], NotebookKernelService);
export { NotebookKernelService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tLZXJuZWxTZXJ2aWNlSW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvc2VydmljZXMvbm90ZWJvb2tLZXJuZWxTZXJ2aWNlSW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFTLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxVQUFVLEVBQWUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFhL0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN6RSxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ2xFLE9BQU8sRUFBUyxZQUFZLEVBQUUsTUFBTSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDL0YsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFHNUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUV2RixNQUFNLFVBQVU7YUFDQSxnQkFBVyxHQUFHLENBQUMsQUFBSixDQUFJO0lBUTlCLFlBQVksTUFBdUI7UUFGMUIsdUJBQWtCLEdBQUcsSUFBSSxXQUFXLEVBQVUsQ0FBQTtRQUd0RCxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQTtRQUNwQixJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxD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