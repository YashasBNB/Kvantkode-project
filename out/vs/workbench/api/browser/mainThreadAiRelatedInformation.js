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
import { CancellationToken } from '../../../base/common/cancellation.js';
import { Disposable, DisposableMap } from '../../../base/common/lifecycle.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { IAiRelatedInformationService, } from '../../services/aiRelatedInformation/common/aiRelatedInformation.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
let MainThreadAiRelatedInformation = class MainThreadAiRelatedInformation extends Disposable {
    constructor(context, _aiRelatedInformationService) {
        super();
        this._aiRelatedInformationService = _aiRelatedInformationService;
        this._registrations = this._register(new DisposableMap());
        this._proxy = context.getProxy(ExtHostContext.ExtHostAiRelatedInformation);
    }
    $getAiRelatedInformation(query, types) {
        // TODO: use a real cancellation token
        return this._aiRelatedInformationService.getRelatedInformation(query, types, CancellationToken.None);
    }
    $registerAiRelatedInformationProvider(handle, type) {
        const provider = {
            provideAiRelatedInformation: (query, token) => {
                return this._proxy.$provideAiRelatedInformation(handle, query, token);
            },
        };
        this._registrations.set(handle, this._aiRelatedInformationService.registerAiRelatedInformationProvider(type, provider));
    }
    $unregisterAiRelatedInformationProvider(handle) {
        this._registrations.deleteAndDispose(handle);
    }
};
MainThreadAiRelatedInformation = __decorate([
    extHostNamedCustomer(MainContext.MainThreadAiRelatedInformation),
    __param(1, IAiRelatedInformationService)
], MainThreadAiRelatedInformation);
export { MainThreadAiRelatedInformation };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEFpUmVsYXRlZEluZm9ybWF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRBaVJlbGF0ZWRJbmZvcm1hdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdFLE9BQU8sRUFFTixjQUFjLEVBQ2QsV0FBVyxHQUVYLE1BQU0sK0JBQStCLENBQUE7QUFFdEMsT0FBTyxFQUVOLDRCQUE0QixHQUU1QixNQUFNLG9FQUFvRSxDQUFBO0FBQzNFLE9BQU8sRUFFTixvQkFBb0IsR0FDcEIsTUFBTSxzREFBc0QsQ0FBQTtBQUd0RCxJQUFNLDhCQUE4QixHQUFwQyxNQUFNLDhCQUNaLFNBQVEsVUFBVTtJQU1sQixZQUNDLE9BQXdCLEVBRXhCLDRCQUEyRTtRQUUzRSxLQUFLLEVBQUUsQ0FBQTtRQUZVLGlDQUE0QixHQUE1Qiw0QkFBNEIsQ0FBOEI7UUFMM0QsbUJBQWMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksYUFBYSxFQUFVLENBQUMsQ0FBQTtRQVE1RSxJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLDJCQUEyQixDQUFDLENBQUE7SUFDM0UsQ0FBQztJQUVELHdCQUF3QixDQUN2QixLQUFhLEVBQ2IsS0FBK0I7UUFFL0Isc0NBQXNDO1FBQ3RDLE9BQU8sSUFBSSxDQUFDLDRCQUE0QixDQUFDLHFCQUFxQixDQUM3RCxLQUFLLEVBQ0wsS0FBSyxFQUNMLGlCQUFpQixDQUFDLElBQUksQ0FDdEIsQ0FBQTtJQUNGLENBQUM7SUFFRCxxQ0FBcUMsQ0FBQyxNQUFjLEVBQUUsSUFBNEI7UUFDakYsTUFBTSxRQUFRLEdBQWtDO1lBQy9DLDJCQUEyQixFQUFFLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFO2dCQUM3QyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsNEJBQTRCLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUN0RSxDQUFDO1NBQ0QsQ0FBQTtRQUNELElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUN0QixNQUFNLEVBQ04sSUFBSSxDQUFDLDRCQUE0QixDQUFDLG9DQUFvQyxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FDdEYsQ0FBQTtJQUNGLENBQUM7SUFFRCx1Q0FBdUMsQ0FBQyxNQUFjO1FBQ3JELElBQUksQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDN0MsQ0FBQztDQUNELENBQUE7QUEzQ1ksOEJBQThCO0lBRDFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQztJQVU5RCxXQUFBLDRCQUE0QixDQUFBO0dBVGxCLDhCQUE4QixDQTJDMUMifQ==