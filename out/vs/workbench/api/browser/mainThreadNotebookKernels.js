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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZE5vdGVib29rS2VybmVscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkTm90ZWJvb2tLZXJuZWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUNOLGFBQWEsRUFDYixlQUFlLEVBRWYsWUFBWSxHQUNaLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUUvRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDeEQsT0FBTyxFQUNOLG9CQUFvQixHQUVwQixNQUFNLHNEQUFzRCxDQUFBO0FBRTdELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3pHLE9BQU8sRUFHTiw4QkFBOEIsRUFDOUIscUJBQXFCLEdBQ3JCLE1BQU0sZ0VBQWdFLENBQUE7QUFDdkUsT0FBTyxFQUtOLHNCQUFzQixHQUV0QixNQUFNLHdEQUF3RCxDQUFBO0FBRS9ELE9BQU8sRUFDTixjQUFjLEVBS2QsV0FBVyxHQUVYLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbkYsT0FB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