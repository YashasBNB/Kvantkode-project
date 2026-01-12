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
var UntitledTextEditorService_1;
import { URI } from '../../../../base/common/uri.js';
import { createDecorator, IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { UntitledTextEditorModel } from './untitledTextEditorModel.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { Schemas } from '../../../../base/common/network.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
export const IUntitledTextEditorService = createDecorator('untitledTextEditorService');
let UntitledTextEditorService = class UntitledTextEditorService extends Disposable {
    static { UntitledTextEditorService_1 = this; }
    static { this.UNTITLED_WITHOUT_ASSOCIATED_RESOURCE_REGEX = /Untitled-\d+/; }
    constructor(instantiationService, configurationService) {
        super();
        this.instantiationService = instantiationService;
        this.configurationService = configurationService;
        this._onDidSave = this._register(new Emitter());
        this.onDidSave = this._onDidSave.event;
        this._onDidChangeDirty = this._register(new Emitter());
        this.onDidChangeDirty = this._onDidChangeDirty.event;
        this._onDidChangeEncoding = this._register(new Emitter());
        this.onDidChangeEncoding = this._onDidChangeEncoding.event;
        this._onDidCreate = this._register(new Emitter());
        this.onDidCreate = this._onDidCreate.event;
        this._onWillDispose = this._register(new Emitter());
        this.onWillDispose = this._onWillDispose.event;
        this._onDidChangeLabel = this._register(new Emitter());
        this.onDidChangeLabel = this._onDidChangeLabel.event;
        this.mapResourceToModel = new ResourceMap();
    }
    get(resource) {
        return this.mapResourceToModel.get(resource);
    }
    getValue(resource) {
        return this.get(resource)?.textEditorModel?.getValue();
    }
    async resolve(options) {
        const model = this.doCreateOrGet(options);
        await model.resolve();
        return model;
    }
    create(options) {
        return this.doCreateOrGet(options);
    }
    doCreateOrGet(options = Object.create(null)) {
        const massagedOptions = this.massageOptions(options);
        // Return existing instance if asked for it
        if (massagedOptions.untitledResource &&
            this.mapResourceToModel.has(massagedOptions.untitledResource)) {
            return this.mapResourceToModel.get(massagedOptions.untitledResource);
        }
        // Create new instance otherwise
        return this.doCreate(massagedOptions);
    }
    massageOptions(options) {
        const massagedOptions = Object.create(null);
        // Figure out associated and untitled resource
        if (options.associatedResource) {
            massagedOptions.untitledResource = URI.from({
                scheme: Schemas.untitled,
                authority: options.associatedResource.authority,
                fragment: options.associatedResource.fragment,
                path: options.associatedResource.path,
                query: options.associatedResource.query,
            });
            massagedOptions.associatedResource = options.associatedResource;
        }
        else {
            if (options.untitledResource?.scheme === Schemas.untitled) {
                massagedOptions.untitledResource = options.untitledResource;
            }
        }
        // Language id
        if (options.languageId) {
            massagedOptions.languageId = options.languageId;
        }
        else if (!massagedOptions.associatedResource) {
            const configuration = this.configurationService.getValue();
            if (configuration.files?.defaultLanguage) {
                massagedOptions.languageId = configuration.files.defaultLanguage;
            }
        }
        // Take over encoding and initial value
        massagedOptions.encoding = options.encoding;
        massagedOptions.initialValue = options.initialValue;
        return massagedOptions;
    }
    doCreate(options) {
        // Create a new untitled resource if none is provided
        let untitledResource = options.untitledResource;
        if (!untitledResource) {
            let counter = 1;
            do {
                untitledResource = URI.from({ scheme: Schemas.untitled, path: `Untitled-${counter}` });
                counter++;
            } while (this.mapResourceToModel.has(untitledResource));
        }
        // Create new model with provided options
        const model = this._register(this.instantiationService.createInstance(UntitledTextEditorModel, untitledResource, !!options.associatedResource, options.initialValue, options.languageId, options.encoding));
        this.registerModel(model);
        return model;
    }
    registerModel(model) {
        // Install model listeners
        const modelListeners = new DisposableStore();
        modelListeners.add(model.onDidChangeDirty(() => this._onDidChangeDirty.fire(model)));
        modelListeners.add(model.onDidChangeName(() => this._onDidChangeLabel.fire(model)));
        modelListeners.add(model.onDidChangeEncoding(() => this._onDidChangeEncoding.fire(model)));
        modelListeners.add(model.onWillDispose(() => this._onWillDispose.fire(model)));
        // Remove from cache on dispose
        Event.once(model.onWillDispose)(() => {
            // Registry
            this.mapResourceToModel.delete(model.resource);
            // Listeners
            modelListeners.dispose();
        });
        // Add to cache
        this.mapResourceToModel.set(model.resource, model);
        // Emit as event
        this._onDidCreate.fire(model);
        // If the model is dirty right from the beginning,
        // make sure to emit this as an event
        if (model.isDirty()) {
            this._onDidChangeDirty.fire(model);
        }
    }
    isUntitledWithAssociatedResource(resource) {
        return (resource.scheme === Schemas.untitled &&
            resource.path.length > 1 &&
            !UntitledTextEditorService_1.UNTITLED_WITHOUT_ASSOCIATED_RESOURCE_REGEX.test(resource.path));
    }
    canDispose(model) {
        if (model.isDisposed()) {
            return true; // quick return if model already disposed
        }
        // promise based return in all other cases
        return this.doCanDispose(model);
    }
    async doCanDispose(model) {
        // dirty model: we do not allow to dispose dirty models to prevent
        // data loss cases. dirty models can only be disposed when they are
        // either saved or reverted
        if (model.isDirty()) {
            await Event.toPromise(model.onDidChangeDirty);
            return this.canDispose(model);
        }
        return true;
    }
    notifyDidSave(source, target) {
        this._onDidSave.fire({ source, target });
    }
};
UntitledTextEditorService = UntitledTextEditorService_1 = __decorate([
    __param(0, IInstantiationService),
    __param(1, IConfigurationService)
], UntitledTextEditorService);
export { UntitledTextEditorService };
registerSingleton(IUntitledTextEditorService, UntitledTextEditorService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW50aXRsZWRUZXh0RWRpdG9yU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3VudGl0bGVkL2NvbW1vbi91bnRpdGxlZFRleHRFZGl0b3JTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUNOLGVBQWUsRUFDZixxQkFBcUIsR0FDckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsdUJBQXVCLEVBQTRCLE1BQU0sOEJBQThCLENBQUE7QUFFaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbEYsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBRWhFLE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHLGVBQWUsQ0FDeEQsMkJBQTJCLENBQzNCLENBQUE7QUFpSk0sSUFBTSx5QkFBeUIsR0FBL0IsTUFBTSx5QkFDWixTQUFRLFVBQVU7O2FBS00sK0NBQTBDLEdBQUcsY0FBYyxBQUFqQixDQUFpQjtJQXNCbkYsWUFDd0Isb0JBQTRELEVBQzVELG9CQUE0RDtRQUVuRixLQUFLLEVBQUUsQ0FBQTtRQUhpQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVC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