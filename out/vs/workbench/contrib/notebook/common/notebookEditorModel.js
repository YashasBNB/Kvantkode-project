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
var SimpleNotebookEditorModel_1;
import { streamToBuffer } from '../../../../base/common/buffer.js';
import { CancellationError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { assertType } from '../../../../base/common/types.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { EditorModel } from '../../../common/editor/editorModel.js';
import { NotebookCellsChangeType, NotebookSetting, } from './notebookCommon.js';
import { INotebookLoggingService } from './notebookLoggingService.js';
import { INotebookService, SimpleNotebookProviderInfo, } from './notebookService.js';
import { IFilesConfigurationService } from '../../../services/filesConfiguration/common/filesConfigurationService.js';
//#region --- simple content provider
let SimpleNotebookEditorModel = SimpleNotebookEditorModel_1 = class SimpleNotebookEditorModel extends EditorModel {
    constructor(resource, _hasAssociatedFilePath, viewType, _workingCopyManager, scratchpad, _filesConfigurationService) {
        super();
        this.resource = resource;
        this._hasAssociatedFilePath = _hasAssociatedFilePath;
        this.viewType = viewType;
        this._workingCopyManager = _workingCopyManager;
        this._filesConfigurationService = _filesConfigurationService;
        this._onDidChangeDirty = this._register(new Emitter());
        this._onDidSave = this._register(new Emitter());
        this._onDidChangeOrphaned = this._register(new Emitter());
        this._onDidChangeReadonly = this._register(new Emitter());
        this._onDidRevertUntitled = this._register(new Emitter());
        this.onDidChangeDirty = this._onDidChangeDirty.event;
        this.onDidSave = this._onDidSave.event;
        this.onDidChangeOrphaned = this._onDidChangeOrphaned.event;
        this.onDidChangeReadonly = this._onDidChangeReadonly.event;
        this.onDidRevertUntitled = this._onDidRevertUntitled.event;
        this._workingCopyListeners = this._register(new DisposableStore());
        this.scratchPad = scratchpad;
    }
    dispose() {
        this._workingCopy?.dispose();
        super.dispose();
    }
    get notebook() {
        return this._workingCopy?.model?.notebookModel;
    }
    isResolved() {
        return Boolean(this._workingCopy?.model?.notebookModel);
    }
    async canDispose() {
        if (!this._workingCopy) {
            return true;
        }
        if (SimpleNotebookEditorModel_1._isStoredFileWorkingCopy(this._workingCopy)) {
            return this._workingCopyManager.stored.canDispose(this._workingCopy);
        }
        else {
            return true;
        }
    }
    isDirty() {
        return this._workingCopy?.isDirty() ?? false;
    }
    isModified() {
        return this._workingCopy?.isModified() ?? false;
    }
    isOrphaned() {
        return (SimpleNotebookEditorModel_1._isStoredFileWorkingCopy(this._workingCopy) &&
            this._workingCopy.hasState(4 /* StoredFileWorkingCopyState.ORPHAN */));
    }
    hasAssociatedFilePath() {
        return (!SimpleNotebookEditorModel_1._isStoredFileWorkingCopy(this._workingCopy) &&
            !!this._workingCopy?.hasAssociatedFilePath);
    }
    isReadonly() {
        if (SimpleNotebookEditorModel_1._isStoredFileWorkingCopy(this._workingCopy)) {
            return this._workingCopy?.isReadonly();
        }
        else {
            return this._filesConfigurationService.isReadonly(this.resource);
        }
    }
    get hasErrorState() {
        if (this._workingCopy && 'hasState' in this._workingCopy) {
            return this._workingCopy.hasState(5 /* StoredFileWorkingCopyState.ERROR */);
        }
        return false;
    }
    async revert(options) {
        assertType(this.isResolved());
        return this._workingCopy.revert(options);
    }
    async save(options) {
        assertType(this.isResolved());
        return this._workingCopy.save(options);
    }
    async load(options) {
        if (!this._workingCopy || !this._workingCopy.model) {
            if (this.resource.scheme === Schemas.untitled) {
                if (this._hasAssociatedFilePath) {
                    this._workingCopy = await this._workingCopyManager.resolve({
                        associatedResource: this.resource,
                    });
                }
                else {
                    this._workingCopy = await this._workingCopyManager.resolve({
                        untitledResource: this.resource,
                        isScratchpad: this.scratchPad,
                    });
                }
                this._register(this._workingCopy.onDidRevert(() => this._onDidRevertUntitled.fire()));
            }
            else {
                this._workingCopy = await this._workingCopyManager.resolve(this.resource, {
                    limits: options?.limits,
                    reload: options?.forceReadFromFile ? { async: false, force: true } : undefined,
                });
                this._workingCopyListeners.add(this._workingCopy.onDidSave((e) => this._onDidSave.fire(e)));
                this._workingCopyListeners.add(this._workingCopy.onDidChangeOrphaned(() => this._onDidChangeOrphaned.fire()));
                this._workingCopyListeners.add(this._workingCopy.onDidChangeReadonly(() => this._onDidChangeReadonly.fire()));
            }
            this._workingCopyListeners.add(this._workingCopy.onDidChangeDirty(() => this._onDidChangeDirty.fire(), undefined));
            this._workingCopyListeners.add(this._workingCopy.onWillDispose(() => {
                this._workingCopyListeners.clear();
                this._workingCopy?.model?.dispose();
            }));
        }
        else {
            await this._workingCopyManager.resolve(this.resource, {
                reload: {
                    async: !options?.forceReadFromFile,
                    force: options?.forceReadFromFile,
                },
                limits: options?.limits,
            });
        }
        assertType(this.isResolved());
        return this;
    }
    async saveAs(target) {
        const newWorkingCopy = await this._workingCopyManager.saveAs(this.resource, target);
        if (!newWorkingCopy) {
            return undefined;
        }
        // this is a little hacky because we leave the new working copy alone. BUT
        // the newly created editor input will pick it up and claim ownership of it.
        return { resource: newWorkingCopy.resource };
    }
    static _isStoredFileWorkingCopy(candidate) {
        const isUntitled = candidate && candidate.capabilities & 2 /* WorkingCopyCapabilities.Untitled */;
        return !isUntitled;
    }
};
SimpleNotebookEditorModel = SimpleNotebookEditorModel_1 = __decorate([
    __param(5, IFilesConfigurationService)
], SimpleNotebookEditorModel);
export { SimpleNotebookEditorModel };
export class NotebookFileWorkingCopyModel extends Disposable {
    constructor(_notebookModel, _notebookService, _configurationService, _telemetryService, _notebookLogService) {
        super();
        this._notebookModel = _notebookModel;
        this._notebookService = _notebookService;
        this._configurationService = _configurationService;
        this._telemetryService = _telemetryService;
        this._notebookLogService = _notebookLogService;
        this._onDidChangeContent = this._register(new Emitter());
        this.onDidChangeContent = this._onDidChangeContent.event;
        this.configuration = undefined;
        this.onWillDispose = _notebookModel.onWillDispose.bind(_notebookModel);
        this._register(_notebookModel.onDidChangeContent((e) => {
            for (const rawEvent of e.rawEvents) {
                if (rawEvent.kind === NotebookCellsChangeType.Initialize) {
                    continue;
                }
                if (rawEvent.transient) {
                    continue;
                }
                this._onDidChangeContent.fire({
                    isRedoing: false, //todo@rebornix forward this information from notebook model
                    isUndoing: false,
                    isInitial: false, //_notebookModel.cells.length === 0 // todo@jrieken non transient metadata?
                });
                break;
            }
        }));
        const saveWithReducedCommunication = this._configurationService.getValue(NotebookSetting.remoteSaving);
        if (saveWithReducedCommunication || _notebookModel.uri.scheme === Schemas.vscodeRemote) {
            this.configuration = {
                // Intentionally pick a larger delay for triggering backups to allow auto-save
                // to complete first on the optimized save path
                backupDelay: 10000,
            };
        }
        // Override save behavior to avoid transferring the buffer across the wire 3 times
        if (saveWithReducedCommunication) {
            this.setSaveDelegate().catch(console.error);
        }
    }
    async setSaveDelegate() {
        // make sure we wait for a serializer to resolve before we try to handle saves in the EH
        await this.getNotebookSerializer();
        this.save = async (options, token) => {
            try {
                let serializer = this._notebookService.tryGetDataProviderSync(this.notebookModel.viewType)?.serializer;
                if (!serializer) {
                    this._notebookLogService.info('WorkingCopyModel', 'No serializer found for notebook model, checking if provider still needs to be resolved');
                    serializer = await this.getNotebookSerializer();
                }
                if (token.isCancellationRequested) {
                    throw new CancellationError();
                }
                const stat = await serializer.save(this._notebookModel.uri, this._notebookModel.versionId, options, token);
                return stat;
            }
            catch (error) {
                if (!token.isCancellationRequested) {
                    const isIPynb = this._notebookModel.viewType === 'jupyter-notebook' ||
                        this._notebookModel.viewType === 'interactive';
                    this._telemetryService.publicLogError2('notebook/SaveError', {
                        isRemote: this._notebookModel.uri.scheme === Schemas.vscodeRemote,
                        isIPyNbWorkerSerializer: isIPynb &&
                            this._configurationService.getValue('ipynb.experimental.serialization'),
                        error: error,
                    });
                }
                throw error;
            }
        };
    }
    dispose() {
        this._notebookModel.dispose();
        super.dispose();
    }
    get notebookModel() {
        return this._notebookModel;
    }
    async snapshot(context, token) {
        return this._notebookService.createNotebookTextDocumentSnapshot(this._notebookModel.uri, context, token);
    }
    async update(stream, token) {
        const serializer = await this.getNotebookSerializer();
        const bytes = await streamToBuffer(stream);
        const data = await serializer.dataToNotebook(bytes);
        if (token.isCancellationRequested) {
            throw new CancellationError();
        }
        this._notebookLogService.info('WorkingCopyModel', 'Notebook content updated from file system - ' + this._notebookModel.uri.toString());
        this._notebookModel.reset(data.cells, data.metadata, serializer.options);
    }
    async getNotebookSerializer() {
        const info = await this._notebookService.withNotebookDataProvider(this.notebookModel.viewType);
        if (!(info instanceof SimpleNotebookProviderInfo)) {
            throw new Error('CANNOT open file notebook with this provider');
        }
        return info.serializer;
    }
    get versionId() {
        return this._notebookModel.alternativeVersionId;
    }
    pushStackElement() {
        this._notebookModel.pushStackElement();
    }
}
let NotebookFileWorkingCopyModelFactory = class NotebookFileWorkingCopyModelFactory {
    constructor(_viewType, _notebookService, _configurationService, _telemetryService, _notebookLogService) {
        this._viewType = _viewType;
        this._notebookService = _notebookService;
        this._configurationService = _configurationService;
        this._telemetryService = _telemetryService;
        this._notebookLogService = _notebookLogService;
    }
    async createModel(resource, stream, token) {
        const notebookModel = this._notebookService.getNotebookTextModel(resource) ??
            (await this._notebookService.createNotebookTextModel(this._viewType, resource, stream));
        return new NotebookFileWorkingCopyModel(notebookModel, this._notebookService, this._configurationService, this._telemetryService, this._notebookLogService);
    }
};
NotebookFileWorkingCopyModelFactory = __decorate([
    __param(1, INotebookService),
    __param(2, IConfigurationService),
    __param(3, ITelemetryService),
    __param(4, INotebookLoggingService)
], NotebookFileWorkingCopyModelFactory);
export { NotebookFileWorkingCopyModelFactory };
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFZGl0b3JNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2NvbW1vbi9ub3RlYm9va0VkaXRvck1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQTBCLGNBQWMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTFGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFN0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFLbEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFFdEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRW5FLE9BQU8sRUFJTix1QkFBdUIsRUFDdkIsZUFBZSxHQUNmLE1BQU0scUJBQXFCLENBQUE7QUFDNUIsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDckUsT0FBTyxFQUVOLGdCQUFnQixFQUNoQiwwQkFBMEIsR0FDMUIsTUFBTSxzQkFBc0IsQ0FBQTtBQUM3QixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSwwRUFBMEUsQ0FBQTtBQXNCckgscUNBQXFDO0FBRTlCLElBQU0seUJBQXlCLGlDQUEvQixNQUFNLHlCQUEwQixTQUFRLFdBQVc7SUFt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