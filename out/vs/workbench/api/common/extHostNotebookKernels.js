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
import { asArray } from '../../../base/common/arrays.js';
import { DeferredPromise, timeout } from '../../../base/common/async.js';
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../base/common/map.js';
import { URI } from '../../../base/common/uri.js';
import { ExtensionIdentifier, } from '../../../platform/extensions/common/extensions.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { MainContext, } from './extHost.protocol.js';
import { ApiCommand, ApiCommandArgument, ApiCommandResult, } from './extHostCommands.js';
import * as extHostTypeConverters from './extHostTypeConverters.js';
import { NotebookCellExecutionState as ExtHostNotebookCellExecutionState, NotebookCellOutput, NotebookControllerAffinity2, NotebookVariablesRequestKind, } from './extHostTypes.js';
import { asWebviewUri } from '../../contrib/webview/common/webview.js';
import { CellExecutionUpdateType } from '../../contrib/notebook/common/notebookExecutionService.js';
import { checkProposedApiEnabled } from '../../services/extensions/common/extensions.js';
import { SerializableObjectWithBuffers } from '../../services/extensions/common/proxyIdentifier.js';
import { variablePageSize } from '../../contrib/notebook/common/notebookKernelService.js';
let ExtHostNotebookKernels = class ExtHostNotebookKernels {
    constructor(mainContext, _initData, _extHostNotebook, _commands, _logService) {
        this._initData = _initData;
        this._extHostNotebook = _extHostNotebook;
        this._commands = _commands;
        this._logService = _logService;
        this._activeExecutions = new ResourceMap();
        this._activeNotebookExecutions = new ResourceMap();
        this._kernelDetectionTask = new Map();
        this._kernelDetectionTaskHandlePool = 0;
        this._kernelSourceActionProviders = new Map();
        this._kernelSourceActionProviderHandlePool = 0;
        this._kernelData = new Map();
        this._handlePool = 0;
        this._onDidChangeCellExecutionState = new Emitter();
        this.onDidChangeNotebookCellExecutionState = this._onDidChangeCellExecutionState.event;
        this.id = 0;
        this.variableStore = {};
        this._proxy = mainContext.getProxy(MainContext.MainThreadNotebookKernels);
        // todo@rebornix @joyceerhl: move to APICommands once stabilized.
        const selectKernelApiCommand = new ApiCommand('notebook.selectKernel', '_notebook.selectKernel', 'Trigger kernel picker for specified notebook editor widget', [
            new ApiCommandArgument('options', 'Select kernel options', (v) => true, (v) => {
                if (v && 'notebookEditor' in v && 'id' in v) {
                    const notebookEditorId = this._extHostNotebook.getIdByEditor(v.notebookEditor);
                    return {
                        id: v.id,
                        extension: v.extension,
                        notebookEditorId,
                    };
                }
                else if (v && 'notebookEditor' in v) {
                    const notebookEditorId = this._extHostNotebook.getIdByEditor(v.notebookEditor);
                    if (notebookEditorId === undefined) {
                        throw new Error(`Cannot invoke 'notebook.selectKernel' for unrecognized notebook editor ${v.notebookEditor.notebook.uri.toString()}`);
                    }
                    return { notebookEditorId };
                }
                return v;
            }),
        ], ApiCommandResult.Void);
        const requestKernelVariablesApiCommand = new ApiCommand('vscode.executeNotebookVariableProvider', '_executeNotebookVariableProvider', 'Execute notebook variable provider', [ApiCommandArgument.Uri], new ApiCommandResult('A promise that resolves to an array of variables', (value, apiArgs) => {
            return value.map((variable) => {
                return {
                    variable: {
                        name: variable.name,
                        value: variable.value,
                        expression: variable.expression,
                        type: variable.type,
                        language: variable.language,
                    },
                    hasNamedChildren: variable.hasNamedChildren,
                    indexedChildrenCount: variable.indexedChildrenCount,
                };
            });
        }));
        this._commands.registerApiCommand(selectKernelApiCommand);
        this._commands.registerApiCommand(requestKernelVariablesApiCommand);
    }
    createNotebookController(extension, id, viewType, label, handler, preloads) {
        for (const data of this._kernelData.values()) {
            if (data.controller.id === id &&
                ExtensionIdentifier.equals(extension.identifier, data.extensionId)) {
                throw new Error(`notebook controller with id '${id}' ALREADY exist`);
            }
        }
        const handle = this._handlePool++;
        const that = this;
        this._logService.trace(`NotebookController[${handle}], CREATED by ${extension.identifier.value}, ${id}`);
        const _defaultExecutHandler = () => console.warn(`NO execute handler from notebook controller '${data.id}' of extension: '${extension.identifier}'`);
        let isDisposed = false;
        const onDidChangeSelection = new Emitter();
        const onDidReceiveMessage = new Emitter();
        const data = {
            id: createKernelId(extension.identifier, id),
            notebookType: viewType,
            extensionId: extension.identifier,
            extensionLocation: extension.extensionLocation,
            label: label || extension.identifier.value,
            preloads: preloads ? preloads.map(extHostTypeConverters.NotebookRendererScript.from) : [],
        };
        //
        let _executeHandler = handler ?? _defaultExecutHandler;
        let _interruptHandler;
        let _variableProvider;
        this._proxy.$addKernel(handle, data).catch((err) => {
            // this can happen when a kernel with that ID is already registered
            console.log(err);
            isDisposed = true;
        });
        // update: all setters write directly into the dto object
        // and trigger an update. the actual update will only happen
        // once per event loop execution
        let tokenPool = 0;
        const _update = () => {
            if (isDisposed) {
                return;
            }
            const myToken = ++tokenPool;
            Promise.resolve().then(() => {
                if (myToken === tokenPool) {
                    this._proxy.$updateKernel(handle, data);
                }
            });
        };
        // notebook documents that are associated to this controller
        const associatedNotebooks = new ResourceMap();
        const controller = {
            get id() {
                return id;
            },
            get notebookType() {
                return data.notebookType;
            },
            onDidChangeSelectedNotebooks: onDidChangeSelection.event,
            get label() {
                return data.label;
            },
            set label(value) {
                data.label = value ?? extension.displayName ?? extension.name;
                _update();
            },
            get detail() {
                return data.detail ?? '';
            },
            set detail(value) {
                data.detail = value;
                _update();
            },
            get description() {
                return data.description ?? '';
            },
            set description(value) {
                data.description = value;
                _update();
            },
            get supportedLanguages() {
                return data.supportedLanguages;
            },
            set supportedLanguages(value) {
                data.supportedLanguages = value;
                _update();
            },
            get supportsExecutionOrder() {
                return data.supportsExecutionOrder ?? false;
            },
            set supportsExecutionOrder(value) {
                data.supportsExecutionOrder = value;
                _update();
            },
            get rendererScripts() {
                return data.preloads
                    ? data.preloads.map(extHostTypeConverters.NotebookRendererScript.to)
                    : [];
            },
            get executeHandler() {
                return _executeHandler;
            },
            set executeHandler(value) {
                _executeHandler = value ?? _defaultExecutHandler;
            },
            get interruptHandler() {
                return _interruptHandler;
            },
            set interruptHandler(value) {
                _interruptHandler = value;
                data.supportsInterrupt = Boolean(value);
                _update();
            },
            set variableProvider(value) {
                checkProposedApiEnabled(extension, 'notebookVariableProvider');
                _variableProvider = value;
                data.hasVariableProvider = !!value;
                value?.onDidChangeVariables((e) => that._proxy.$variablesUpdated(e.uri));
                _update();
            },
            get variableProvider() {
                return _variableProvider;
            },
            createNotebookCellExecution(cell) {
                if (isDisposed) {
                    throw new Error('notebook controller is DISPOSED');
                }
                if (!associatedNotebooks.has(cell.notebook.uri)) {
                    that._logService.trace(`NotebookController[${handle}] NOT associated to notebook, associated to THESE notebooks:`, Array.from(associatedNotebooks.keys()).map((u) => u.toString()));
                    throw new Error(`notebook controller is NOT associated to notebook: ${cell.notebook.uri.toString()}`);
                }
                return that._createNotebookCellExecution(cell, createKernelId(extension.identifier, this.id));
            },
            createNotebookExecution(notebook) {
                checkProposedApiEnabled(extension, 'notebookExecution');
                if (isDisposed) {
                    throw new Error('notebook controller is DISPOSED');
                }
                if (!associatedNotebooks.has(notebook.uri)) {
                    that._logService.trace(`NotebookController[${handle}] NOT associated to notebook, associated to THESE notebooks:`, Array.from(associatedNotebooks.keys()).map((u) => u.toString()));
                    throw new Error(`notebook controller is NOT associated to notebook: ${notebook.uri.toString()}`);
                }
                return that._createNotebookExecution(notebook, createKernelId(extension.identifier, this.id));
            },
            dispose: () => {
                if (!isDisposed) {
                    this._logService.trace(`NotebookController[${handle}], DISPOSED`);
                    isDisposed = true;
                    this._kernelData.delete(handle);
                    onDidChangeSelection.dispose();
                    onDidReceiveMessage.dispose();
                    this._proxy.$removeKernel(handle);
                }
            },
            // --- priority
            updateNotebookAffinity(notebook, priority) {
                if (priority === NotebookControllerAffinity2.Hidden) {
                    // This api only adds an extra enum value, the function is the same, so just gate on the new value being passed
                    // for proposedAPI check.
                    checkProposedApiEnabled(extension, 'notebookControllerAffinityHidden');
                }
                that._proxy.$updateNotebookPriority(handle, notebook.uri, priority);
            },
            // --- ipc
            onDidReceiveMessage: onDidReceiveMessage.event,
            postMessage(message, editor) {
                checkProposedApiEnabled(extension, 'notebookMessaging');
                return that._proxy.$postMessage(handle, editor && that._extHostNotebook.getIdByEditor(editor), message);
            },
            asWebviewUri(uri) {
                checkProposedApiEnabled(extension, 'notebookMessaging');
                return asWebviewUri(uri, that._initData.remote);
            },
        };
        this._kernelData.set(handle, {
            extensionId: extension.identifier,
            controller,
            onDidReceiveMessage,
            onDidChangeSelection,
            associatedNotebooks,
        });
        return controller;
    }
    getIdByController(controller) {
        for (const [_, candidate] of this._kernelData) {
            if (candidate.controller === controller) {
                return createKernelId(candidate.extensionId, controller.id);
            }
        }
        return null;
    }
    createNotebookControllerDetectionTask(extension, viewType) {
        const handle = this._kernelDetectionTaskHandlePool++;
        const that = this;
        this._logService.trace(`NotebookControllerDetectionTask[${handle}], CREATED by ${extension.identifier.value}`);
        this._proxy.$addKernelDetectionTask(handle, viewType);
        const detectionTask = {
            dispose: () => {
                this._kernelDetectionTask.delete(handle);
                that._proxy.$removeKernelDetectionTask(handle);
            },
        };
        this._kernelDetectionTask.set(handle, detectionTask);
        return detectionTask;
    }
    registerKernelSourceActionProvider(extension, viewType, provider) {
        const handle = this._kernelSourceActionProviderHandlePool++;
        const eventHandle = typeof provider.onDidChangeNotebookKernelSourceActions === 'function' ? handle : undefined;
        const that = this;
        this._kernelSourceActionProviders.set(handle, provider);
        this._logService.trace(`NotebookKernelSourceActionProvider[${handle}], CREATED by ${extension.identifier.value}`);
        this._proxy.$addKernelSourceActionProvider(handle, handle, viewType);
        let subscription;
        if (eventHandle !== undefined) {
            subscription = provider.onDidChangeNotebookKernelSourceActions((_) => this._proxy.$emitNotebookKernelSourceActionsChangeEvent(eventHandle));
        }
        return {
            dispose: () => {
                this._kernelSourceActionProviders.delete(handle);
                that._proxy.$removeKernelSourceActionProvider(handle, handle);
                subscription?.dispose();
            },
        };
    }
    async $provideKernelSourceActions(handle, token) {
        const provider = this._kernelSourceActionProviders.get(handle);
        if (provider) {
            const disposables = new DisposableStore();
            const ret = await provider.provideNotebookKernelSourceActions(token);
            return (ret ?? []).map((item) => extHostTypeConverters.NotebookKernelSourceAction.from(item, this._commands.converter, disposables));
        }
        return [];
    }
    $acceptNotebookAssociation(handle, uri, value) {
        const obj = this._kernelData.get(handle);
        if (obj) {
            // update data structure
            const notebook = this._extHostNotebook.getNotebookDocument(URI.revive(uri));
            if (value) {
                obj.associatedNotebooks.set(notebook.uri, true);
            }
            else {
                obj.associatedNotebooks.delete(notebook.uri);
            }
            this._logService.trace(`NotebookController[${handle}] ASSOCIATE notebook`, notebook.uri.toString(), value);
            // send event
            obj.onDidChangeSelection.fire({
                selected: value,
                notebook: notebook.apiNotebook,
            });
        }
    }
    async $executeCells(handle, uri, handles) {
        const obj = this._kernelData.get(handle);
        if (!obj) {
            // extension can dispose kernels in the meantime
            return;
        }
        const document = this._extHostNotebook.getNotebookDocument(URI.revive(uri));
        const cells = [];
        for (const cellHandle of handles) {
            const cell = document.getCell(cellHandle);
            if (cell) {
                cells.push(cell.apiCell);
            }
        }
        try {
            this._logService.trace(`NotebookController[${handle}] EXECUTE cells`, document.uri.toString(), cells.length);
            await obj.controller.executeHandler.call(obj.controller, cells, document.apiNotebook, obj.controller);
        }
        catch (err) {
            //
            this._logService.error(`NotebookController[${handle}] execute cells FAILED`, err);
            console.error(err);
        }
    }
    async $cancelCells(handle, uri, handles) {
        const obj = this._kernelData.get(handle);
        if (!obj) {
            // extension can dispose kernels in the meantime
            return;
        }
        // cancel or interrupt depends on the controller. When an interrupt handler is used we
        // don't trigger the cancelation token of executions.
        const document = this._extHostNotebook.getNotebookDocument(URI.revive(uri));
        if (obj.controller.interruptHandler) {
            await obj.controller.interruptHandler.call(obj.controller, document.apiNotebook);
        }
        else {
            for (const cellHandle of handles) {
                const cell = document.getCell(cellHandle);
                if (cell) {
                    this._activeExecutions.get(cell.uri)?.cancel();
                }
            }
        }
        if (obj.controller.interruptHandler) {
            // If we're interrupting all cells, we also need to cancel the notebook level execution.
            const items = this._activeNotebookExecutions.get(document.uri);
            this._activeNotebookExecutions.delete(document.uri);
            if (handles.length && Array.isArray(items) && items.length) {
                items.forEach((d) => d.dispose());
            }
        }
    }
    async $provideVariables(handle, requestId, notebookUri, parentId, kind, start, token) {
        const obj = this._kernelData.get(handle);
        if (!obj) {
            return;
        }
        const document = this._extHostNotebook.getNotebookDocument(URI.revive(notebookUri));
        const variableProvider = obj.controller.variableProvider;
        if (!variableProvider) {
            return;
        }
        let parent = undefined;
        if (parentId !== undefined) {
            parent = this.variableStore[parentId];
            if (!parent) {
                // request for unknown parent
                return;
            }
        }
        else {
            // root request, clear store
            this.variableStore = {};
        }
        const requestKind = kind === 'named' ? NotebookVariablesRequestKind.Named : NotebookVariablesRequestKind.Indexed;
        const variableResults = variableProvider.provideVariables(document.apiNotebook, parent, requestKind, start, token);
        let resultCount = 0;
        for await (const result of variableResults) {
            if (token.isCancellationRequested) {
                return;
            }
            const variable = {
                id: this.id++,
                name: result.variable.name,
                value: result.variable.value,
                type: result.variable.type,
                interfaces: result.variable.interfaces,
                language: result.variable.language,
                expression: result.variable.expression,
                hasNamedChildren: result.hasNamedChildren,
                indexedChildrenCount: result.indexedChildrenCount,
                extensionId: obj.extensionId.value,
            };
            this.variableStore[variable.id] = result.variable;
            this._proxy.$receiveVariable(requestId, variable);
            if (resultCount++ >= variablePageSize) {
                return;
            }
        }
    }
    $acceptKernelMessageFromRenderer(handle, editorId, message) {
        const obj = this._kernelData.get(handle);
        if (!obj) {
            // extension can dispose kernels in the meantime
            return;
        }
        const editor = this._extHostNotebook.getEditorById(editorId);
        obj.onDidReceiveMessage.fire(Object.freeze({ editor: editor.apiEditor, message }));
    }
    $cellExecutionChanged(uri, cellHandle, state) {
        const document = this._extHostNotebook.getNotebookDocument(URI.revive(uri));
        const cell = document.getCell(cellHandle);
        if (cell) {
            const newState = state
                ? extHostTypeConverters.NotebookCellExecutionState.to(state)
                : ExtHostNotebookCellExecutionState.Idle;
            if (newState !== undefined) {
                this._onDidChangeCellExecutionState.fire({
                    cell: cell.apiCell,
                    state: newState,
                });
            }
        }
    }
    // ---
    _createNotebookCellExecution(cell, controllerId) {
        if (cell.index < 0) {
            throw new Error('CANNOT execute cell that has been REMOVED from notebook');
        }
        const notebook = this._extHostNotebook.getNotebookDocument(cell.notebook.uri);
        const cellObj = notebook.getCellFromApiCell(cell);
        if (!cellObj) {
            throw new Error('invalid cell');
        }
        if (this._activeExecutions.has(cellObj.uri)) {
            throw new Error(`duplicate execution for ${cellObj.uri}`);
        }
        const execution = new NotebookCellExecutionTask(controllerId, cellObj, this._proxy);
        this._activeExecutions.set(cellObj.uri, execution);
        const listener = execution.onDidChangeState(() => {
            if (execution.state === NotebookCellExecutionTaskState.Resolved) {
                execution.dispose();
                listener.dispose();
                this._activeExecutions.delete(cellObj.uri);
            }
        });
        return execution.asApiObject();
    }
    // ---
    _createNotebookExecution(nb, controllerId) {
        const notebook = this._extHostNotebook.getNotebookDocument(nb.uri);
        const runningCell = nb.getCells().find((cell) => {
            const apiCell = notebook.getCellFromApiCell(cell);
            return apiCell && this._activeExecutions.has(apiCell.uri);
        });
        if (runningCell) {
            throw new Error(`duplicate cell execution for ${runningCell.document.uri}`);
        }
        if (this._activeNotebookExecutions.has(notebook.uri)) {
            throw new Error(`duplicate notebook execution for ${notebook.uri}`);
        }
        const execution = new NotebookExecutionTask(controllerId, notebook, this._proxy);
        const listener = execution.onDidChangeState(() => {
            if (execution.state === NotebookExecutionTaskState.Resolved) {
                execution.dispose();
                listener.dispose();
                this._activeNotebookExecutions.delete(notebook.uri);
            }
        });
        this._activeNotebookExecutions.set(notebook.uri, [execution, listener]);
        return execution.asApiObject();
    }
};
ExtHostNotebookKernels = __decorate([
    __param(4, ILogService)
], ExtHostNotebookKernels);
export { ExtHostNotebookKernels };
var NotebookCellExecutionTaskState;
(function (NotebookCellExecutionTaskState) {
    NotebookCellExecutionTaskState[NotebookCellExecutionTaskState["Init"] = 0] = "Init";
    NotebookCellExecutionTaskState[NotebookCellExecutionTaskState["Started"] = 1] = "Started";
    NotebookCellExecutionTaskState[NotebookCellExecutionTaskState["Resolved"] = 2] = "Resolved";
})(NotebookCellExecutionTaskState || (NotebookCellExecutionTaskState = {}));
class NotebookCellExecutionTask extends Disposable {
    static { this.HANDLE = 0; }
    get state() {
        return this._state;
    }
    constructor(controllerId, _cell, _proxy) {
        super();
        this._cell = _cell;
        this._proxy = _proxy;
        this._handle = NotebookCellExecutionTask.HANDLE++;
        this._onDidChangeState = new Emitter();
        this.onDidChangeState = this._onDidChangeState.event;
        this._state = NotebookCellExecutionTaskState.Init;
        this._tokenSource = this._register(new CancellationTokenSource());
        this._collector = new TimeoutBasedCollector(10, (updates) => this.update(updates));
        this._executionOrder = _cell.internalMetadata.executionOrder;
        this._proxy.$createExecution(this._handle, controllerId, this._cell.notebook.uri, this._cell.handle);
    }
    cancel() {
        this._tokenSource.cancel();
    }
    async updateSoon(update) {
        await this._collector.addItem(update);
    }
    async update(update) {
        const updates = Array.isArray(update) ? update : [update];
        return this._proxy.$updateExecution(this._handle, new SerializableObjectWithBuffers(updates));
    }
    verifyStateForOutput() {
        if (this._state === NotebookCellExecutionTaskState.Init) {
            throw new Error('Must call start before modifying cell output');
        }
        if (this._state === NotebookCellExecutionTaskState.Resolved) {
            throw new Error('Cannot modify cell output after calling resolve');
        }
    }
    cellIndexToHandle(cellOrCellIndex) {
        let cell = this._cell;
        if (cellOrCellIndex) {
            cell = this._cell.notebook.getCellFromApiCell(cellOrCellIndex);
        }
        if (!cell) {
            throw new Error('INVALID cell');
        }
        return cell.handle;
    }
    validateAndConvertOutputs(items) {
        return items.map((output) => {
            const newOutput = NotebookCellOutput.ensureUniqueMimeTypes(output.items, true);
            if (newOutput === output.items) {
                return extHostTypeConverters.NotebookCellOutput.from(output);
            }
            return extHostTypeConverters.NotebookCellOutput.from({
                items: newOutput,
                id: output.id,
                metadata: output.metadata,
            });
        });
    }
    async updateOutputs(outputs, cell, append) {
        const handle = this.cellIndexToHandle(cell);
        const outputDtos = this.validateAndConvertOutputs(asArray(outputs));
        return this.updateSoon({
            editType: CellExecutionUpdateType.Output,
            cellHandle: handle,
            append,
            outputs: outputDtos,
        });
    }
    async updateOutputItems(items, output, append) {
        items = NotebookCellOutput.ensureUniqueMimeTypes(asArray(items), true);
        return this.updateSoon({
            editType: CellExecutionUpdateType.OutputItems,
            items: items.map(extHostTypeConverters.NotebookCellOutputItem.from),
            outputId: output.id,
            append,
        });
    }
    asApiObject() {
        const that = this;
        const result = {
            get token() {
                return that._tokenSource.token;
            },
            get cell() {
                return that._cell.apiCell;
            },
            get executionOrder() {
                return that._executionOrder;
            },
            set executionOrder(v) {
                that._executionOrder = v;
                that.update([
                    {
                        editType: CellExecutionUpdateType.ExecutionState,
                        executionOrder: that._executionOrder,
                    },
                ]);
            },
            start(startTime) {
                if (that._state === NotebookCellExecutionTaskState.Resolved ||
                    that._state === NotebookCellExecutionTaskState.Started) {
                    throw new Error('Cannot call start again');
                }
                that._state = NotebookCellExecutionTaskState.Started;
                that._onDidChangeState.fire();
                that.update({
                    editType: CellExecutionUpdateType.ExecutionState,
                    runStartTime: startTime,
                });
            },
            end(success, endTime, executionError) {
                if (that._state === NotebookCellExecutionTaskState.Resolved) {
                    throw new Error('Cannot call resolve twice');
                }
                that._state = NotebookCellExecutionTaskState.Resolved;
                that._onDidChangeState.fire();
                // The last update needs to be ordered correctly and applied immediately,
                // so we use updateSoon and immediately flush.
                that._collector.flush();
                const error = createSerializeableError(executionError);
                that._proxy.$completeExecution(that._handle, new SerializableObjectWithBuffers({
                    runEndTime: endTime,
                    lastRunSuccess: success,
                    error,
                }));
            },
            clearOutput(cell) {
                that.verifyStateForOutput();
                return that.updateOutputs([], cell, false);
            },
            appendOutput(outputs, cell) {
                that.verifyStateForOutput();
                return that.updateOutputs(outputs, cell, true);
            },
            replaceOutput(outputs, cell) {
                that.verifyStateForOutput();
                return that.updateOutputs(outputs, cell, false);
            },
            appendOutputItems(items, output) {
                that.verifyStateForOutput();
                return that.updateOutputItems(items, output, true);
            },
            replaceOutputItems(items, output) {
                that.verifyStateForOutput();
                return that.updateOutputItems(items, output, false);
            },
        };
        return Object.freeze(result);
    }
}
function createSerializeableError(executionError) {
    const convertRange = (range) => range
        ? {
            startLineNumber: range.start.line,
            startColumn: range.start.character,
            endLineNumber: range.end.line,
            endColumn: range.end.character,
        }
        : undefined;
    const convertStackFrame = (frame) => ({
        uri: frame.uri,
        position: frame.position,
        label: frame.label,
    });
    const error = executionError
        ? {
            name: executionError.name,
            message: executionError.message,
            stack: executionError.stack instanceof Array
                ? executionError.stack.map((frame) => convertStackFrame(frame))
                : executionError.stack,
            location: convertRange(executionError.location),
            uri: executionError.uri,
        }
        : undefined;
    return error;
}
var NotebookExecutionTaskState;
(function (NotebookExecutionTaskState) {
    NotebookExecutionTaskState[NotebookExecutionTaskState["Init"] = 0] = "Init";
    NotebookExecutionTaskState[NotebookExecutionTaskState["Started"] = 1] = "Started";
    NotebookExecutionTaskState[NotebookExecutionTaskState["Resolved"] = 2] = "Resolved";
})(NotebookExecutionTaskState || (NotebookExecutionTaskState = {}));
class NotebookExecutionTask extends Disposable {
    static { this.HANDLE = 0; }
    get state() {
        return this._state;
    }
    constructor(controllerId, _notebook, _proxy) {
        super();
        this._notebook = _notebook;
        this._proxy = _proxy;
        this._handle = NotebookExecutionTask.HANDLE++;
        this._onDidChangeState = new Emitter();
        this.onDidChangeState = this._onDidChangeState.event;
        this._state = NotebookExecutionTaskState.Init;
        this._tokenSource = this._register(new CancellationTokenSource());
        this._proxy.$createNotebookExecution(this._handle, controllerId, this._notebook.uri);
    }
    cancel() {
        this._tokenSource.cancel();
    }
    asApiObject() {
        const result = {
            start: () => {
                if (this._state === NotebookExecutionTaskState.Resolved ||
                    this._state === NotebookExecutionTaskState.Started) {
                    throw new Error('Cannot call start again');
                }
                this._state = NotebookExecutionTaskState.Started;
                this._onDidChangeState.fire();
                this._proxy.$beginNotebookExecution(this._handle);
            },
            end: () => {
                if (this._state === NotebookExecutionTaskState.Resolved) {
                    throw new Error('Cannot call resolve twice');
                }
                this._state = NotebookExecutionTaskState.Resolved;
                this._onDidChangeState.fire();
                this._proxy.$completeNotebookExecution(this._handle);
            },
        };
        return Object.freeze(result);
    }
}
class TimeoutBasedCollector {
    constructor(delay, callback) {
        this.delay = delay;
        this.callback = callback;
        this.batch = [];
        this.startedTimer = Date.now();
    }
    addItem(item) {
        this.batch.push(item);
        if (!this.currentDeferred) {
            this.currentDeferred = new DeferredPromise();
            this.startedTimer = Date.now();
            timeout(this.delay).then(() => {
                return this.flush();
            });
        }
        // This can be called by the extension repeatedly for a long time before the timeout is able to run.
        // Force a flush after the delay.
        if (Date.now() - this.startedTimer > this.delay) {
            return this.flush();
        }
        return this.currentDeferred.p;
    }
    flush() {
        if (this.batch.length === 0 || !this.currentDeferred) {
            return Promise.resolve();
        }
        const deferred = this.currentDeferred;
        this.currentDeferred = undefined;
        const batch = this.batch;
        this.batch = [];
        return this.callback(batch).finally(() => deferred.complete());
    }
}
export function createKernelId(extensionIdentifier, id) {
    return `${extensionIdentifier.value}/${id}`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE5vdGVib29rS2VybmVscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3ROb3RlYm9va0tlcm5lbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDeEUsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBQ2hFLE9BQU8sRUFDTixtQkFBbUIsR0FFbkIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakUsT0FBTyxFQUtOLFdBQVcsR0FJWCxNQUFNLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sRUFDTixVQUFVLEVBQ1Ysa0JBQWtCLEVBQ2xCLGdCQUFnQixHQUVoQixNQUFNLHNCQUFzQixDQUFBO0FBSTdCLE9BQU8sS0FBSyxxQkFBcUIsTUFBTSw0QkFBNEIsQ0FBQTtBQUNuRSxPQUFPLEVBQ04sMEJBQTBCLElBQUksaUNBQWlDLEVBQy9ELGtCQUFrQixFQUNsQiwyQkFBMkIsRUFDM0IsNEJBQTRCLEdBQzVCLE1BQU0sbUJBQW1CLENBQUE7QUFDMUIsT0FBTyxFQUFFLFlB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