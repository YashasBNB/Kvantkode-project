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
import { isNonEmptyArray } from '../../../base/common/arrays.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { onUnexpectedError } from '../../../base/common/errors.js';
import { Emitter } from '../../../base/common/event.js';
import { DisposableMap, DisposableStore, toDisposable, } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { ILanguageService } from '../../../editor/common/languages/language.js';
import { NotebookDto } from './mainThreadNotebookDto.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { INotebookEditorService } from '../../contrib/notebook/browser/services/notebookEditorService.js';
import { INotebookExecutionStateService, NotebookExecutionType, } from '../../contrib/notebook/common/notebookExecutionStateService.js';
import { INotebookKernelService, } from '../../contrib/notebook/common/notebookKernelService.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { INotebookService } from '../../contrib/notebook/common/notebookService.js';
import { AsyncIterableSource } from '../../../base/common/async.js';
class MainThreadKernel {
    get preloadUris() {
        return this.preloads.map((p) => p.uri);
    }
    get preloadProvides() {
        return this.preloads.flatMap((p) => p.provides);
    }
    constructor(data, _languageService) {
        this._languageService = _languageService;
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this.id = data.id;
        this.viewType = data.notebookType;
        this.extension = data.extensionId;
        this.implementsInterrupt = data.supportsInterrupt ?? false;
        this.label = data.label;
        this.description = data.description;
        this.detail = data.detail;
        this.supportedLanguages = isNonEmptyArray(data.supportedLanguages)
            ? data.supportedLanguages
            : _languageService.getRegisteredLanguageIds();
        this.implementsExecutionOrder = data.supportsExecutionOrder ?? false;
        this.hasVariableProvider = data.hasVariableProvider ?? false;
        this.localResourceRoot = URI.revive(data.extensionLocation);
        this.preloads =
            data.preloads?.map((u) => ({ uri: URI.revive(u.uri), provides: u.provides })) ?? [];
    }
    update(data) {
        const event = Object.create(null);
        if (data.label !== undefined) {
            this.label = data.label;
            event.label = true;
        }
        if (data.description !== undefined) {
            this.description = data.description;
            event.description = true;
        }
        if (data.detail !== undefined) {
            this.detail = data.detail;
            event.detail = true;
        }
        if (data.supportedLanguages !== undefined) {
            this.supportedLanguages = isNonEmptyArray(data.supportedLanguages)
                ? data.supportedLanguages
                : this._languageService.getRegisteredLanguageIds();
            event.supportedLanguages = true;
        }
        if (data.supportsExecutionOrder !== undefined) {
            this.implementsExecutionOrder = data.supportsExecutionOrder;
            event.hasExecutionOrder = true;
        }
        if (data.supportsInterrupt !== undefined) {
            this.implementsInterrupt = data.supportsInterrupt;
            event.hasInterruptHandler = true;
        }
        if (data.hasVariableProvider !== undefined) {
            this.hasVariableProvider = data.hasVariableProvider;
            event.hasVariableProvider = true;
        }
        this._onDidChange.fire(event);
    }
}
class MainThreadKernelDetectionTask {
    constructor(notebookType) {
        this.notebookType = notebookType;
    }
}
let MainThreadNotebookKernels = class MainThreadNotebookKernels {
    constructor(extHostContext, _languageService, _notebookKernelService, _notebookExecutionStateService, _notebookService, notebookEditorService) {
        this._languageService = _languageService;
        this._notebookKernelService = _notebookKernelService;
        this._notebookExecutionStateService = _notebookExecutionStateService;
        this._notebookService = _notebookService;
        this._editors = new DisposableMap();
        this._disposables = new DisposableStore();
        this._kernels = new Map();
        this._kernelDetectionTasks = new Map();
        this._kernelSourceActionProviders = new Map();
        this._kernelSourceActionProvidersEventRegistrations = new Map();
        this._executions = new Map();
        this._notebookExecutions = new Map();
        this.variableRequestIndex = 0;
        this.variableRequestMap = new Map();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostNotebookKernels);
        notebookEditorService.listNotebookEditors().forEach(this._onEditorAdd, this);
        notebookEditorService.onDidAddNotebookEditor(this._onEditorAdd, this, this._disposables);
        notebookEditorService.onDidRemoveNotebookEditor(this._onEditorRemove, this, this._disposables);
        this._disposables.add(toDisposable(() => {
            // EH shut down, complete all executions started by this EH
            this._executions.forEach((e) => {
                e.complete({});
            });
            this._notebookExecutions.forEach((e) => e.complete());
        }));
        this._disposables.add(this._notebookExecutionStateService.onDidChangeExecution((e) => {
            if (e.type === NotebookExecutionType.cell) {
                this._proxy.$cellExecutionChanged(e.notebook, e.cellHandle, e.changed?.state);
            }
        }));
        this._disposables.add(this._notebookKernelService.onDidChangeSelectedNotebooks((e) => {
            for (const [handle, [kernel]] of this._kernels) {
                if (e.oldKernel === kernel.id) {
                    this._proxy.$acceptNotebookAssociation(handle, e.notebook, false);
                }
                else if (e.newKernel === kernel.id) {
                    this._proxy.$acceptNotebookAssociation(handle, e.notebook, true);
                }
            }
        }));
    }
    dispose() {
        this._disposables.dispose();
        for (const [, registration] of this._kernels.values()) {
            registration.dispose();
        }
        for (const [, registration] of this._kernelDetectionTasks.values()) {
            registration.dispose();
        }
        for (const [, registration] of this._kernelSourceActionProviders.values()) {
            registration.dispose();
        }
        this._editors.dispose();
    }
    // --- kernel ipc
    _onEditorAdd(editor) {
        const ipcListener = editor.onDidReceiveMessage((e) => {
            if (!editor.hasModel()) {
                return;
            }
            const { selected } = this._notebookKernelService.getMatchingKernel(editor.textModel);
            if (!selected) {
                return;
            }
            for (const [handle, candidate] of this._kernels) {
                if (candidate[0] === selected) {
                    this._proxy.$acceptKernelMessageFromRenderer(handle, editor.getId(), e.message);
                    break;
                }
            }
        });
        this._editors.set(editor, ipcListener);
    }
    _onEditorRemove(editor) {
        this._editors.deleteAndDispose(editor);
    }
    async $postMessage(handle, editorId, message) {
        const tuple = this._kernels.get(handle);
        if (!tuple) {
            throw new Error('kernel already disposed');
        }
        const [kernel] = tuple;
        let didSend = false;
        for (const [editor] of this._editors) {
            if (!editor.hasModel()) {
                continue;
            }
            if (this._notebookKernelService.getMatchingKernel(editor.textModel).selected !== kernel) {
                // different kernel
                continue;
            }
            if (editorId === undefined) {
                // all editors
                editor.postMessage(message);
                didSend = true;
            }
            else if (editor.getId() === editorId) {
                // selected editors
                editor.postMessage(message);
                didSend = true;
                break;
            }
        }
        return didSend;
    }
    $receiveVariable(requestId, variable) {
        const source = this.variableRequestMap.get(requestId);
        if (source) {
            source.emitOne(variable);
        }
    }
    // --- kernel adding/updating/removal
    async $addKernel(handle, data) {
        const that = this;
        const kernel = new (class extends MainThreadKernel {
            async executeNotebookCellsRequest(uri, handles) {
                await that._proxy.$executeCells(handle, uri, handles);
            }
            async cancelNotebookCellExecution(uri, handles) {
                await that._proxy.$cancelCells(handle, uri, handles);
            }
            provideVariables(notebookUri, parentId, kind, start, token) {
                const requestId = `${handle}variables${that.variableRequestIndex++}`;
                if (that.variableRequestMap.has(requestId)) {
                    return that.variableRequestMap.get(requestId).asyncIterable;
                }
                const source = new AsyncIterableSource();
                that.variableRequestMap.set(requestId, source);
                that._proxy
                    .$provideVariables(handle, requestId, notebookUri, parentId, kind, start, token)
                    .then(() => {
                    source.resolve();
                    that.variableRequestMap.delete(requestId);
                })
                    .catch((err) => {
                    source.reject(err);
                    that.variableRequestMap.delete(requestId);
                });
                return source.asyncIterable;
            }
        })(data, this._languageService);
        const disposables = this._disposables.add(new DisposableStore());
        // Ensure _kernels is up to date before we register a kernel.
        this._kernels.set(handle, [kernel, disposables]);
        disposables.add(this._notebookKernelService.registerKernel(kernel));
    }
    $updateKernel(handle, data) {
        const tuple = this._kernels.get(handle);
        if (tuple) {
            tuple[0].update(data);
        }
    }
    $removeKernel(handle) {
        const tuple = this._kernels.get(handle);
        if (tuple) {
            tuple[1].dispose();
            this._kernels.delete(handle);
        }
    }
    $updateNotebookPriority(handle, notebook, value) {
        const tuple = this._kernels.get(handle);
        if (tuple) {
            this._notebookKernelService.updateKernelNotebookAffinity(tuple[0], URI.revive(notebook), value);
        }
    }
    // --- Cell execution
    $createExecution(handle, controllerId, rawUri, cellHandle) {
        const uri = URI.revive(rawUri);
        const notebook = this._notebookService.getNotebookTextModel(uri);
        if (!notebook) {
            throw new Error(`Notebook not found: ${uri.toString()}`);
        }
        const kernel = this._notebookKernelService.getMatchingKernel(notebook);
        if (!kernel.selected || kernel.selected.id !== controllerId) {
            throw new Error(`Kernel is not selected: ${kernel.selected?.id} !== ${controllerId}`);
        }
        const execution = this._notebookExecutionStateService.createCellExecution(uri, cellHandle);
        execution.confirm();
        this._executions.set(handle, execution);
    }
    $updateExecution(handle, data) {
        const updates = data.value;
        try {
            const execution = this._executions.get(handle);
            execution?.update(updates.map(NotebookDto.fromCellExecuteUpdateDto));
        }
        catch (e) {
            onUnexpectedError(e);
        }
    }
    $completeExecution(handle, data) {
        try {
            const execution = this._executions.get(handle);
            execution?.complete(NotebookDto.fromCellExecuteCompleteDto(data.value));
        }
        catch (e) {
            onUnexpectedError(e);
        }
        finally {
            this._executions.delete(handle);
        }
    }
    // --- Notebook execution
    $createNotebookExecution(handle, controllerId, rawUri) {
        const uri = URI.revive(rawUri);
        const notebook = this._notebookService.getNotebookTextModel(uri);
        if (!notebook) {
            throw new Error(`Notebook not found: ${uri.toString()}`);
        }
        const kernel = this._notebookKernelService.getMatchingKernel(notebook);
        if (!kernel.selected || kernel.selected.id !== controllerId) {
            throw new Error(`Kernel is not selected: ${kernel.selected?.id} !== ${controllerId}`);
        }
        const execution = this._notebookExecutionStateService.createExecution(uri);
        execution.confirm();
        this._notebookExecutions.set(handle, execution);
    }
    $beginNotebookExecution(handle) {
        try {
            const execution = this._notebookExecutions.get(handle);
            execution?.begin();
        }
        catch (e) {
            onUnexpectedError(e);
        }
    }
    $completeNotebookExecution(handle) {
        try {
            const execution = this._notebookExecutions.get(handle);
            execution?.complete();
        }
        catch (e) {
            onUnexpectedError(e);
        }
        finally {
            this._notebookExecutions.delete(handle);
        }
    }
    // --- notebook kernel detection task
    async $addKernelDetectionTask(handle, notebookType) {
        const kernelDetectionTask = new MainThreadKernelDetectionTask(notebookType);
        const registration = this._notebookKernelService.registerNotebookKernelDetectionTask(kernelDetectionTask);
        this._kernelDetectionTasks.set(handle, [kernelDetectionTask, registration]);
    }
    $removeKernelDetectionTask(handle) {
        const tuple = this._kernelDetectionTasks.get(handle);
        if (tuple) {
            tuple[1].dispose();
            this._kernelDetectionTasks.delete(handle);
        }
    }
    // --- notebook kernel source action provider
    async $addKernelSourceActionProvider(handle, eventHandle, notebookType) {
        const kernelSourceActionProvider = {
            viewType: notebookType,
            provideKernelSourceActions: async () => {
                const actions = await this._proxy.$provideKernelSourceActions(handle, CancellationToken.None);
                return actions.map((action) => {
                    let documentation = action.documentation;
                    if (action.documentation && typeof action.documentation !== 'string') {
                        documentation = URI.revive(action.documentation);
                    }
                    return {
                        label: action.label,
                        command: action.command,
                        description: action.description,
                        detail: action.detail,
                        documentation,
                    };
                });
            },
        };
        if (typeof eventHandle === 'number') {
            const emitter = new Emitter();
            this._kernelSourceActionProvidersEventRegistrations.set(eventHandle, emitter);
            kernelSourceActionProvider.onDidChangeSourceActions = emitter.event;
        }
        const registration = this._notebookKernelService.registerKernelSourceActionProvider(notebookType, kernelSourceActionProvider);
        this._kernelSourceActionProviders.set(handle, [kernelSourceActionProvider, registration]);
    }
    $removeKernelSourceActionProvider(handle, eventHandle) {
        const tuple = this._kernelSourceActionProviders.get(handle);
        if (tuple) {
            tuple[1].dispose();
            this._kernelSourceActionProviders.delete(handle);
        }
        if (typeof eventHandle === 'number') {
            this._kernelSourceActionProvidersEventRegistrations.delete(eventHandle);
        }
    }
    $emitNotebookKernelSourceActionsChangeEvent(eventHandle) {
        const emitter = this._kernelSourceActionProvidersEventRegistrations.get(eventHandle);
        if (emitter instanceof Emitter) {
            emitter.fire(undefined);
        }
    }
    $variablesUpdated(notebookUri) {
        this._notebookKernelService.notifyVariablesChange(URI.revive(notebookUri));
    }
};
MainThreadNotebookKernels = __decorate([
    extHostNamedCustomer(MainContext.MainThreadNotebookKernels),
    __param(1, ILanguageService),
    __param(2, INotebookKernelService),
    __param(3, INotebookExecutionStateService),
    __param(4, INotebookService),
    __param(5, INotebookEditorService)
], MainThreadNotebookKernels);
export { MainThreadNotebookKernels };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZE5vdGVib29rS2VybmVscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWROb3RlYm9va0tlcm5lbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQ04sYUFBYSxFQUNiLGVBQWUsRUFFZixZQUFZLEdBQ1osTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBRS9FLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUN4RCxPQUFPLEVBQ04sb0JBQW9CLEdBRXBCLE1BQU0sc0RBQXNELENBQUE7QUFFN0QsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDekcsT0FBTyxFQUdOLDhCQUE4QixFQUM5QixxQkFBcUIsR0FDckIsTUFBTSxnRUFBZ0UsQ0FBQTtBQUN2RSxPQUFPLEVBS04sc0JBQXNCLEdBRXRCLE1BQU0sd0RBQXdELENBQUE7QUFFL0QsT0FBTyxFQUNOLGNBQWMsRUFLZCxXQUFXLEdBRVgsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFB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