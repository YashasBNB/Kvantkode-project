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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEFpRW1iZWRkaW5nVmVjdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRBaUVtYmVkZGluZ1ZlY3Rvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdFLE9BQU8sRUFFTixjQUFjLEVBQ2QsV0FBVyxHQUVYLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUVOLHlCQUF5QixHQUN6QixNQUFNLHFFQUFxRSxDQUFBO0FBQzVFLE9BQU8sRUFFTixvQkFBb0IsR0FDcEIsTUFBTSxzREFBc0QsQ0FBQTtBQUd0RCxJQUFNLDJCQUEyQixHQUFqQyxNQUFNLDJCQUNaLFNBQVEsVUFBVTtJQU1sQixZQUNDLE9BQXdCLEVBRXhCLHlCQUFxRTtRQUVyRSxLQUFLLEVBQUUsQ0FBQTtRQUZVLDhCQUF5QixHQUF6Qix5QkFBeUIsQ0FBMkI7UUFMckQsbUJBQWMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksYUFBYSxFQUFVLENBQUMsQ0FBQTtRQVE1RSxJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLHdCQUF3QixDQUFDLENBQUE7SUFDeEUsQ0FBQztJQUVELGtDQUFrQyxDQUFDLEtBQWEsRUFBRSxNQUFjO1FBQy9ELE1BQU0sUUFBUSxHQUErQjtZQUM1Qyx3QkFBd0IsRUFBRSxDQUFDLE9BQWlCLEVBQUUsS0FBd0IsRUFBRSxFQUFFO2dCQUN6RSxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMseUJBQXlCLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUNyRSxDQUFDO1NBQ0QsQ0FBQTtRQUNELElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUN0QixNQUFNLEVBQ04sSUFBSSxDQUFDLHlCQUF5QixDQUFDLGlDQUFpQyxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FDakYsQ0FBQTtJQUNGLENBQUM7SUFFRCxvQ0FBb0MsQ0FBQyxNQUFjO1FBQ2xELElBQUksQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDN0MsQ0FBQztDQUNELENBQUE7QUEvQlksMkJBQTJCO0lBRHZDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQywyQkFBMkIsQ0FBQztJQVUzRCxXQUFBLHlCQUF5QixDQUFBO0dBVGYsMkJBQTJCLENBK0J2QyJ9