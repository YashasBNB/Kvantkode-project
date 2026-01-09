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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tLZXJuZWxTZXJ2aWNlSW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9zZXJ2aWNlcy9ub3RlYm9va0tlcm5lbFNlcnZpY2VJbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFVBQVUsRUFBZSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQWEvRixPQUFPLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3pFLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDbEUsT0FBTyxFQUFTLFlBQVksRUFBRSxNQUFNLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUc1RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRXZGLE1BQU0sVUFBVTthQUNBLGdCQUFXLEdBQUcsQ0FBQyxBQUFKLENBQUk7SUFROUIsWUFBWSxNQUF1QjtRQUYxQix1QkFBa0IsR0FBRyxJQUFJLFdBQVcsRUFBVSxDQUFBO1FBR3RELElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFBO1FBQ3BCLElBQUksQ0FB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