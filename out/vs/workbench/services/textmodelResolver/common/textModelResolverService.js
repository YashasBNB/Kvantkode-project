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
import { URI } from '../../../../base/common/uri.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { toDisposable, ReferenceCollection, Disposable, AsyncReferenceCollection, } from '../../../../base/common/lifecycle.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { TextResourceEditorModel } from '../../../common/editor/textResourceEditorModel.js';
import { ITextFileService } from '../../textfile/common/textfiles.js';
import { Schemas } from '../../../../base/common/network.js';
import { ITextModelService, isResolvedTextEditorModel, } from '../../../../editor/common/services/resolverService.js';
import { TextFileEditorModel } from '../../textfile/common/textFileEditorModel.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IUndoRedoService } from '../../../../platform/undoRedo/common/undoRedo.js';
import { ModelUndoRedoParticipant } from '../../../../editor/common/services/modelUndoRedoParticipant.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { UntitledTextEditorModel } from '../../untitled/common/untitledTextEditorModel.js';
let ResourceModelCollection = class ResourceModelCollection extends ReferenceCollection {
    constructor(instantiationService, textFileService, fileService, modelService) {
        super();
        this.instantiationService = instantiationService;
        this.textFileService = textFileService;
        this.fileService = fileService;
        this.modelService = modelService;
        this.providers = new Map();
        this.modelsToDispose = new Set();
    }
    createReferencedObject(key) {
        return this.doCreateReferencedObject(key);
    }
    async doCreateReferencedObject(key, skipActivateProvider) {
        // Untrack as being disposed
        this.modelsToDispose.delete(key);
        // inMemory Schema: go through model service cache
        const resource = URI.parse(key);
        if (resource.scheme === Schemas.inMemory) {
            const cachedModel = this.modelService.getModel(resource);
            if (!cachedModel) {
                throw new Error(`Unable to resolve inMemory resource ${key}`);
            }
            const model = this.instantiationService.createInstance(TextResourceEditorModel, resource);
            if (this.ensureResolvedModel(model, key)) {
                return model;
            }
        }
        // Untitled Schema: go through untitled text service
        if (resource.scheme === Schemas.untitled) {
            const model = await this.textFileService.untitled.resolve({ untitledResource: resource });
            if (this.ensureResolvedModel(model, key)) {
                return model;
            }
        }
        // File or remote file: go through text file service
        if (this.fileService.hasProvider(resource)) {
            const model = await this.textFileService.files.resolve(resource, {
                reason: 2 /* TextFileResolveReason.REFERENCE */,
            });
            if (this.ensureResolvedModel(model, key)) {
                return model;
            }
        }
        // Virtual documents
        if (this.providers.has(resource.scheme)) {
            await this.resolveTextModelContent(key);
            const model = this.instantiationService.createInstance(TextResourceEditorModel, resource);
            if (this.ensureResolvedModel(model, key)) {
                return model;
            }
        }
        // Either unknown schema, or not yet registered, try to activate
        if (!skipActivateProvider) {
            await this.fileService.activateProvider(resource.scheme);
            return this.doCreateReferencedObject(key, true);
        }
        throw new Error(`Unable to resolve resource ${key}`);
    }
    ensureResolvedModel(model, key) {
        if (isResolvedTextEditorModel(model)) {
            return true;
        }
        throw new Error(`Unable to resolve resource ${key}`);
    }
    destroyReferencedObject(key, modelPromise) {
        // inMemory is bound to a different lifecycle
        const resource = URI.parse(key);
        if (resource.scheme === Schemas.inMemory) {
            return;
        }
        // Track as being disposed before waiting for model to load
        // to handle the case that the reference is acquired again
        this.modelsToDispose.add(key);
        (async () => {
            try {
                const model = await modelPromise;
                if (!this.modelsToDispose.has(key)) {
                    // return if model has been acquired again meanwhile
                    return;
                }
                if (model instanceof TextFileEditorModel) {
                    // text file models have conditions that prevent them
                    // from dispose, so we have to wait until we can dispose
                    await this.textFileService.files.canDispose(model);
                }
                else if (model instanceof UntitledTextEditorModel) {
                    // untitled file models have conditions that prevent them
                    // from dispose, so we have to wait until we can dispose
                    await this.textFileService.untitled.canDispose(model);
                }
                if (!this.modelsToDispose.has(key)) {
                    // return if model has been acquired again meanwhile
                    return;
                }
                // Finally we can dispose the model
                model.dispose();
            }
            catch (error) {
                // ignore
            }
            finally {
                this.modelsToDispose.delete(key); // Untrack as being disposed
            }
        })();
    }
    registerTextModelContentProvider(scheme, provider) {
        let providers = this.providers.get(scheme);
        if (!providers) {
            providers = [];
            this.providers.set(scheme, providers);
        }
        providers.unshift(provider);
        return toDisposable(() => {
            const providersForScheme = this.providers.get(scheme);
            if (!providersForScheme) {
                return;
            }
            const index = providersForScheme.indexOf(provider);
            if (index === -1) {
                return;
            }
            providersForScheme.splice(index, 1);
            if (providersForScheme.length === 0) {
                this.providers.delete(scheme);
            }
        });
    }
    hasTextModelContentProvider(scheme) {
        return this.providers.get(scheme) !== undefined;
    }
    async resolveTextModelContent(key) {
        const resource = URI.parse(key);
        const providersForScheme = this.providers.get(resource.scheme) || [];
        for (const provider of providersForScheme) {
            const value = await provider.provideTextContent(resource);
            if (value) {
                return value;
            }
        }
        throw new Error(`Unable to resolve text model content for resource ${key}`);
    }
};
ResourceModelCollection = __decorate([
    __param(0, IInstantiationService),
    __param(1, ITextFileService),
    __param(2, IFileService),
    __param(3, IModelService)
], ResourceModelCollection);
let TextModelResolverService = class TextModelResolverService extends Disposable {
    get resourceModelCollection() {
        if (!this._resourceModelCollection) {
            this._resourceModelCollection =
                this.instantiationService.createInstance(ResourceModelCollection);
        }
        return this._resourceModelCollection;
    }
    get asyncModelCollection() {
        if (!this._asyncModelCollection) {
            this._asyncModelCollection = new AsyncReferenceCollection(this.resourceModelCollection);
        }
        return this._asyncModelCollection;
    }
    constructor(instantiationService, fileService, undoRedoService, modelService, uriIdentityService) {
        super();
        this.instantiationService = instantiationService;
        this.fileService = fileService;
        this.undoRedoService = undoRedoService;
        this.modelService = modelService;
        this.uriIdentityService = uriIdentityService;
        this._resourceModelCollection = undefined;
        this._asyncModelCollection = undefined;
        this._register(new ModelUndoRedoParticipant(this.modelService, this, this.undoRedoService));
    }
    async createModelReference(resource) {
        // From this moment on, only operate on the canonical resource
        // to ensure we reduce the chance of resolving the same resource
        // with different resource forms (e.g. path casing on Windows)
        resource = this.uriIdentityService.asCanonicalUri(resource);
        return await this.asyncModelCollection.acquire(resource.toString());
    }
    registerTextModelContentProvider(scheme, provider) {
        return this.resourceModelCollection.registerTextModelContentProvider(scheme, provider);
    }
    canHandleResource(resource) {
        if (this.fileService.hasProvider(resource) ||
            resource.scheme === Schemas.untitled ||
            resource.scheme === Schemas.inMemory) {
            return true; // we handle file://, untitled:// and inMemory:// automatically
        }
        return this.resourceModelCollection.hasTextModelContentProvider(resource.scheme);
    }
};
TextModelResolverService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IFileService),
    __param(2, IUndoRedoService),
    __param(3, IModelService),
    __param(4, IUriIdentityService)
], TextModelResolverService);
export { TextModelResolverService };
registerSingleton(ITextModelService, TextModelResolverService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsUmVzb2x2ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RleHRtb2RlbFJlc29sdmVyL2NvbW1vbi90ZXh0TW9kZWxSZXNvbHZlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRWxHLE9BQU8sRUFFTixZQUFZLEVBRVosbUJBQW1CLEVBQ25CLFVBQVUsRUFDVix3QkFBd0IsR0FDeEIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDM0YsT0FBTyxFQUFFLGdCQUFnQixFQUF5QixNQUFNLG9DQUFvQyxDQUFBO0FBQzVGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQ04saUJBQWlCLEVBSWpCLHlCQUF5QixHQUN6QixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbkYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDekcsT0FBTyxFQUFFLG1CQUFtQixFQUFF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