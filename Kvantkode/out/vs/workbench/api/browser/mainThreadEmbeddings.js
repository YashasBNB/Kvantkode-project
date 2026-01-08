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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEVtYmVkZGluZ3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkRW1iZWRkaW5ncy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMvRixPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3pGLE9BQU8sRUFDTixjQUFjLEVBRWQsV0FBVyxHQUVYLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUNOLG9CQUFvQixHQUVwQixNQUFNLHNEQUFzRCxDQUFBO0FBTTdELE1BQU0sa0JBQWtCLEdBQUcsZUFBZSxDQUFxQixtQkFBbUIsQ0FBQyxDQUFBO0FBa0JuRixNQUFNLGlCQUFpQjtJQVF0QjtRQUhpQixpQkFBWSxHQUFHLElBQUksT0FBTyxFQUFRLENBQUE7UUFDMUMsZ0JBQVcsR0FBZ0IsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUE7UUFHMUQsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBK0IsQ0FBQTtJQUN4RCxDQUFDO0lBRUQsSUFBSSxZQUFZO1FBQ2YsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFBO0lBQzdCLENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxFQUFVLEVBQUUsUUFBNkI7UUFDekQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ2hDLElBQUks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