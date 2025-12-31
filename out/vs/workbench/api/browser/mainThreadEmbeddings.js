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
import { Emitter } from '../../../base/common/event.js';
import { DisposableMap, DisposableStore } from '../../../base/common/lifecycle.js';
import { registerSingleton, } from '../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
const IEmbeddingsService = createDecorator('embeddingsService');
class EmbeddingsService {
    constructor() {
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this.providers = new Map();
    }
    get allProviders() {
        return this.providers.keys();
    }
    registerProvider(id, provider) {
        this.providers.set(id, provider);
        this._onDidChange.fire();
        return {
            dispose: () => {
                this.providers.delete(id);
                this._onDidChange.fire();
            },
        };
    }
    computeEmbeddings(id, input, token) {
        const provider = this.providers.get(id);
        if (provider) {
            return provider.provideEmbeddings(input, token);
        }
        else {
            return Promise.reject(new Error(`No embeddings provider registered with id: ${id}`));
        }
    }
}
registerSingleton(IEmbeddingsService, EmbeddingsService, 1 /* InstantiationType.Delayed */);
let MainThreadEmbeddings = class MainThreadEmbeddings {
    constructor(context, embeddingsService) {
        this.embeddingsService = embeddingsService;
        this._store = new DisposableStore();
        this._providers = this._store.add(new DisposableMap());
        this._proxy = context.getProxy(ExtHostContext.ExtHostEmbeddings);
        this._store.add(embeddingsService.onDidChange(() => {
            this._proxy.$acceptEmbeddingModels(Array.from(embeddingsService.allProviders));
        }));
    }
    dispose() {
        this._store.dispose();
    }
    $registerEmbeddingProvider(handle, identifier) {
        const registration = this.embeddingsService.registerProvider(identifier, {
            provideEmbeddings: (input, token) => {
                return this._proxy.$provideEmbeddings(handle, input, token);
            },
        });
        this._providers.set(handle, registration);
    }
    $unregisterEmbeddingProvider(handle) {
        this._providers.deleteAndDispose(handle);
    }
    $computeEmbeddings(embeddingsModel, input, token) {
        return this.embeddingsService.computeEmbeddings(embeddingsModel, input, token);
    }
};
MainThreadEmbeddings = __decorate([
    extHostNamedCustomer(MainContext.MainThreadEmbeddings),
    __param(1, IEmbeddingsService)
], MainThreadEmbeddings);
export { MainThreadEmbeddings };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEVtYmVkZGluZ3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZEVtYmVkZGluZ3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFlLE1BQU0sbUNBQW1DLENBQUE7QUFDL0YsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN6RixPQUFPLEVBQ04sY0FBYyxFQUVkLFdBQVcsR0FFWCxNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFDTixvQkFBb0IsR0FFcEIsTUFBTSxzREFBc0QsQ0FBQTtBQU03RCxNQUFNLGtCQUFrQixHQUFHLGVBQWUsQ0FBcUIsbUJBQW1CLENBQUMsQ0FBQTtBQWtCbkYsTUFBTSxpQkFBaUI7SUFRdEI7UUFIaUIsaUJBQVksR0FBRyxJQUFJLE9BQU8sRUFBUSxDQUFBO1FBQzFDLGdCQUFXLEdBQWdCLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFBO1FBRzFELElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxHQUFHLEVBQStCLENBQUE7SUFDeEQsQ0FBQztJQUVELElBQUksWUFBWTtRQUNmLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUM3QixDQUFDO0lBRUQsZ0JBQWdCLENBQUMsRUFBVSxFQUFFLFFBQTZCO1FBQ3pELElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUNoQyxJQUFJLENBQUMs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