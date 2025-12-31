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
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { URI } from '../../../../base/common/uri.js';
import { CellUri, NotebookSetting, NotebookWorkingCopyTypeIdentifier, } from './notebookCommon.js';
import { NotebookFileWorkingCopyModelFactory, SimpleNotebookEditorModel, } from './notebookEditorModel.js';
import { combinedDisposable, DisposableStore, dispose, ReferenceCollection, toDisposable, } from '../../../../base/common/lifecycle.js';
import { INotebookService } from './notebookService.js';
import { AsyncEmitter, Emitter } from '../../../../base/common/event.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { FileWorkingCopyManager, } from '../../../services/workingCopy/common/fileWorkingCopyManager.js';
import { Schemas } from '../../../../base/common/network.js';
import { NotebookProviderInfo } from './notebookProvider.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { INotebookLoggingService } from './notebookLoggingService.js';
let NotebookModelReferenceCollection = class NotebookModelReferenceCollection extends ReferenceCollection {
    constructor(_instantiationService, _notebookService, _configurationService, _telemetryService, _notebookLoggingService) {
        super();
        this._instantiationService = _instantiationService;
        this._notebookService = _notebookService;
        this._configurationService = _configurationService;
        this._telemetryService = _telemetryService;
        this._notebookLoggingService = _notebookLoggingService;
        this._disposables = new DisposableStore();
        this._workingCopyManagers = new Map();
        this._modelListener = new Map();
        this._onDidSaveNotebook = new Emitter();
        this.onDidSaveNotebook = this._onDidSaveNotebook.event;
        this._onDidChangeDirty = new Emitter();
        this.onDidChangeDirty = this._onDidChangeDirty.event;
        this._dirtyStates = new ResourceMap();
        this.modelsToDispose = new Set();
    }
    dispose() {
        this._disposables.dispose();
        this._onDidSaveNotebook.dispose();
        this._onDidChangeDirty.dispose();
        dispose(this._modelListener.values());
        dispose(this._workingCopyManagers.values());
    }
    isDirty(resource) {
        return this._dirtyStates.get(resource) ?? false;
    }
    isListeningToModel(uri) {
        for (const key of this._modelListener.keys()) {
            if (key.resource.toString() === uri.toString()) {
                return true;
            }
        }
        return false;
    }
    async createReferencedObject(key, notebookType, hasAssociatedFilePath, limits, isScratchpad, viewType) {
        // Untrack as being disposed
        this.modelsToDispose.delete(key);
        const uri = URI.parse(key);
        const workingCopyTypeId = NotebookWorkingCopyTypeIdentifier.create(notebookType, viewType);
        let workingCopyManager = this._workingCopyManagers.get(workingCopyTypeId);
        if (!workingCopyManager) {
            const factory = new NotebookFileWorkingCopyModelFactory(notebookType, this._notebookService, this._configurationService, this._telemetryService, this._notebookLoggingService);
            workingCopyManager = this._instantiationService.createInstance((FileWorkingCopyManager), workingCopyTypeId, factory, factory);
            this._workingCopyManagers.set(workingCopyTypeId, workingCopyManager);
        }
        const isScratchpadView = isScratchpad ||
            (notebookType === 'interactive' &&
                this._configurationService.getValue(NotebookSetting.InteractiveWindowPromptToSave) !== true);
        const model = this._instantiationService.createInstance(SimpleNotebookEditorModel, uri, hasAssociatedFilePath, notebookType, workingCopyManager, isScratchpadView);
        const result = await model.load({ limits });
        // Whenever a notebook model is dirty we automatically reference it so that
        // we can ensure that at least one reference exists. That guarantees that
        // a model with unsaved changes is never disposed.
        let onDirtyAutoReference;
        this._modelListener.set(result, combinedDisposable(result.onDidSave(() => this._onDidSaveNotebook.fire(result.resource)), result.onDidChangeDirty(() => {
            const isDirty = result.isDirty();
            this._dirtyStates.set(result.resource, isDirty);
            // isDirty -> add reference
            // !isDirty -> free reference
            if (isDirty && !onDirtyAutoReference) {
                onDirtyAutoReference = this.acquire(key, notebookType);
            }
            else if (onDirtyAutoReference) {
                onDirtyAutoReference.dispose();
                onDirtyAutoReference = undefined;
            }
            this._onDidChangeDirty.fire(result);
        }), toDisposable(() => onDirtyAutoReference?.dispose())));
        return result;
    }
    destroyReferencedObject(key, object) {
        this.modelsToDispose.add(key);
        (async () => {
            try {
                const model = await object;
                if (!this.modelsToDispose.has(key)) {
                    // return if model has been acquired again meanwhile
                    return;
                }
                if (model instanceof SimpleNotebookEditorModel) {
                    await model.canDispose();
                }
                if (!this.modelsToDispose.has(key)) {
                    // return if model has been acquired again meanwhile
                    return;
                }
                // Finally we can dispose the model
                this._modelListener.get(model)?.dispose();
                this._modelListener.delete(model);
                model.dispose();
            }
            catch (err) {
                this._notebookLoggingService.error('NotebookModelCollection', 'FAILED to destory notebook - ' + err);
            }
            finally {
                this.modelsToDispose.delete(key); // Untrack as being disposed
            }
        })();
    }
};
NotebookModelReferenceCollection = __decorate([
    __param(0, IInstantiationService),
    __param(1, INotebookService),
    __param(2, IConfigurationService),
    __param(3, ITelemetryService),
    __param(4, INotebookLoggingService)
], NotebookModelReferenceCollection);
let NotebookModelResolverServiceImpl = class NotebookModelResolverServiceImpl {
    constructor(instantiationService, _notebookService, _extensionService, _uriIdentService) {
        this._notebookService = _notebookService;
        this._extensionService = _extensionService;
        this._uriIdentService = _uriIdentService;
        this._onWillFailWithConflict = new AsyncEmitter();
        this.onWillFailWithConflict = this._onWillFailWithConflict.event;
        this._data = instantiationService.createInstance(NotebookModelReferenceCollection);
        this.onDidSaveNotebook = this._data.onDidSaveNotebook;
        this.onDidChangeDirty = this._data.onDidChangeDirty;
    }
    dispose() {
        this._data.dispose();
    }
    isDirty(resource) {
        return this._data.isDirty(resource);
    }
    createUntitledUri(notebookType) {
        const info = this._notebookService.getContributedNotebookType(assertIsDefined(notebookType));
        if (!info) {
            throw new Error('UNKNOWN notebook type: ' + notebookType);
        }
        const suffix = NotebookProviderInfo.possibleFileEnding(info.selectors) ?? '';
        for (let counter = 1;; counter++) {
            const candidate = URI.from({
                scheme: Schemas.untitled,
                path: `Untitled-${counter}${suffix}`,
                query: notebookType,
            });
            if (!this._notebookService.getNotebookTextModel(candidate) &&
                !this._data.isListeningToModel(candidate)) {
                return candidate;
            }
        }
    }
    async validateResourceViewType(uri, viewType) {
        if (!uri && !viewType) {
            throw new Error('Must provide at least one of resource or viewType');
        }
        if (uri?.scheme === CellUri.scheme) {
            throw new Error(`CANNOT open a cell-uri as notebook. Tried with ${uri.toString()}`);
        }
        const resource = this._uriIdentService.asCanonicalUri(uri ?? this.createUntitledUri(viewType));
        const existingNotebook = this._notebookService.getNotebookTextModel(resource);
        if (!viewType) {
            if (existingNotebook) {
                viewType = existingNotebook.viewType;
            }
            else {
                await this._extensionService.whenInstalledExtensionsRegistered();
                const providers = this._notebookService.getContributedNotebookTypes(resource);
                viewType =
                    providers.find((provider) => provider.priority === 'exclusive')?.id ??
                        providers.find((provider) => provider.priority === 'default')?.id ??
                        providers[0]?.id;
            }
        }
        if (!viewType) {
            throw new Error(`Missing viewType for '${resource}'`);
        }
        if (existingNotebook && existingNotebook.viewType !== viewType) {
            await this._onWillFailWithConflict.fireAsync({ resource: resource, viewType }, CancellationToken.None);
            // check again, listener should have done cleanup
            const existingViewType2 = this._notebookService.getNotebookTextModel(resource)?.viewType;
            if (existingViewType2 && existingViewType2 !== viewType) {
                throw new Error(`A notebook with view type '${existingViewType2}' already exists for '${resource}', CANNOT create another notebook with view type ${viewType}`);
            }
        }
        return { resource, viewType };
    }
    async createUntitledNotebookTextModel(viewType) {
        const resource = this._uriIdentService.asCanonicalUri(this.createUntitledUri(viewType));
        return await this._notebookService.createNotebookTextModel(viewType, resource);
    }
    async resolve(arg0, viewType, options) {
        let resource;
        let hasAssociatedFilePath;
        if (URI.isUri(arg0)) {
            resource = arg0;
        }
        else if (arg0.untitledResource) {
            if (arg0.untitledResource.scheme === Schemas.untitled) {
                resource = arg0.untitledResource;
            }
            else {
                resource = arg0.untitledResource.with({ scheme: Schemas.untitled });
                hasAssociatedFilePath = true;
            }
        }
        const validated = await this.validateResourceViewType(resource, viewType);
        const reference = this._data.acquire(validated.resource.toString(), validated.viewType, hasAssociatedFilePath, options?.limits, options?.scratchpad, options?.viewType);
        try {
            const model = await reference.object;
            return {
                object: model,
                dispose() {
                    reference.dispose();
                },
            };
        }
        catch (err) {
            reference.dispose();
            throw err;
        }
    }
};
NotebookModelResolverServiceImpl = __decorate([
    __param(0, IInstantiationService),
    __param(1, INotebookService),
    __param(2, IExtensionService),
    __param(3, IUriIdentityService)
], NotebookModelResolverServiceImpl);
export { NotebookModelResolverServiceImpl };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFZGl0b3JNb2RlbFJlc29sdmVyU2VydmljZUltcGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9jb21tb24vbm90ZWJvb2tFZGl0b3JNb2RlbFJlc29sdmVyU2VydmljZUltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFDTixPQUFPLEVBR1AsZUFBZSxFQUNmLGlDQUFpQyxHQUNqQyxNQUFNLHFCQUFxQixDQUFBO0FBQzVCLE9BQU8sRUFFTixtQ0FBbUMsRUFDbkMseUJBQXlCLEdBQ3pCLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUNOLGtCQUFrQixFQUNsQixlQUFlLEVBQ2YsT0FBTyxFQUdQLG1CQUFtQixFQUNuQixZQUFZLEdBQ1osTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBTTVGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM1RCxPQUFPLEVBQ04sc0JBQXNCLEdBRXRCLE1BQU0sZ0VBQWdFLENBQUE7QUFDdkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFB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