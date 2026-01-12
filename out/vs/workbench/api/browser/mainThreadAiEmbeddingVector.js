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
import { Disposable, DisposableMap } from '../../../base/common/lifecycle.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { IAiEmbeddingVectorService, } from '../../services/aiEmbeddingVector/common/aiEmbeddingVectorService.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
let MainThreadAiEmbeddingVector = class MainThreadAiEmbeddingVector extends Disposable {
    constructor(context, _AiEmbeddingVectorService) {
        super();
        this._AiEmbeddingVectorService = _AiEmbeddingVectorService;
        this._registrations = this._register(new DisposableMap());
        this._proxy = context.getProxy(ExtHostContext.ExtHostAiEmbeddingVector);
    }
    $registerAiEmbeddingVectorProvider(model, handle) {
        const provider = {
            provideAiEmbeddingVector: (strings, token) => {
                return this._proxy.$provideAiEmbeddingVector(handle, strings, token);
            },
        };
        this._registrations.set(handle, this._AiEmbeddingVectorService.registerAiEmbeddingVectorProvider(model, provider));
    }
    $unregisterAiEmbeddingVectorProvider(handle) {
        this._registrations.deleteAndDispose(handle);
    }
};
MainThreadAiEmbeddingVector = __decorate([
    extHostNamedCustomer(MainContext.MainThreadAiEmbeddingVector),
    __param(1, IAiEmbeddingVectorService)
], MainThreadAiEmbeddingVector);
export { MainThreadAiEmbeddingVector };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEFpRW1iZWRkaW5nVmVjdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZEFpRW1iZWRkaW5nVmVjdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0UsT0FBTyxFQUVOLGNBQWMsRUFDZCxXQUFXLEdBRVgsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBRU4seUJBQXlCLEdBQ3pCLE1BQU0scUVBQXFFLENBQUE7QUFDNUUsT0FBTyxFQUVOLG9CQUFvQixHQUNwQixNQUFNLHNEQUFzRCxDQUFBO0FBR3RELElBQU0sMkJBQTJCLEdBQWpDLE1BQU0sMkJBQ1osU0FBUSxVQUFVO0lBTWxCLFlBQ0MsT0FBd0IsRUFFeEIseUJBQXFFO1FBRXJFLEtBQUssRUFBRSxDQUFBO1FBRlUsOEJBQXlCLEdBQXpCLHlCQUF5QixDQUEyQjtRQUxyRCxtQkFBYyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxhQUFhLEVBQVUsQ0FBQyxDQUFBO1FBUTVFLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtJQUN4RSxDQUFDO0lBRUQsa0NBQWtDLENBQUMsS0FBYSxFQUFFLE1BQWM7UUFDL0QsTUFBTSxRQUFRLEdBQStCO1lBQzVDLHdCQUF3QixFQUFFLENBQUMsT0FBaUIsRUFBRSxLQUF3QixFQUFFLEVBQUU7Z0JBQ3pFLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3JFLENBQUM7U0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQ3RCLE1BQU0sRUFDTixJQUFJLENBQUMseUJBQXlCLENBQUMsaUNBQWlDLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUNqRixDQUFBO0lBQ0YsQ0FBQztJQUVELG9DQUFvQyxDQUFDLE1BQWM7UUFDbEQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0NBQ0QsQ0FBQTtBQS9CWSwyQkFBMkI7SUFEdkMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLDJCQUEyQixDQUFDO0lBVTNELFdBQUEseUJBQXlCLENBQUE7R0FUZiwyQkFBMkIsQ0ErQnZDIn0=