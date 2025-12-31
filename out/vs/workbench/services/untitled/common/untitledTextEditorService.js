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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW50aXRsZWRUZXh0RWRpdG9yU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy91bnRpdGxlZC9jb21tb24vdW50aXRsZWRUZXh0RWRpdG9yU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFDTixlQUFlLEVBQ2YscUJBQXFCLEdBQ3JCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLHVCQUF1QixFQUE0QixNQUFNLDhCQUE4QixDQUFBO0FBRWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xGLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUVoRSxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxlQUFlLENBQ3hELDJCQUEyQixDQUMzQixDQUFBO0FBaUpNLElBQU0seUJBQXlCLEdBQS9CLE1BQU0seUJBQ1osU0FBUSxVQUFVOzthQUtNLCtDQUEwQyxHQUFHLGNBQWMsQUFBakIsQ0FBaUI7SUFzQm5GLFlBQ3dCLG9CQUE0RCxFQUM1RCxvQkFBNEQ7UUFFbkYsS0FBSyxFQUFFLENBQUE7UUFIaUMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUMz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