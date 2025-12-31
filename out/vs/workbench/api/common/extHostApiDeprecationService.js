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
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../platform/log/common/log.js';
import * as extHostProtocol from './extHost.protocol.js';
import { IExtHostRpcService } from './extHostRpcService.js';
export const IExtHostApiDeprecationService = createDecorator('IExtHostApiDeprecationService');
let ExtHostApiDeprecationService = class ExtHostApiDeprecationService {
    constructor(rpc, _extHostLogService) {
        this._extHostLogService = _extHostLogService;
        this._reportedUsages = new Set();
        this._telemetryShape = rpc.getProxy(extHostProtocol.MainContext.MainThreadTelemetry);
    }
    report(apiId, extension, migrationSuggestion) {
        const key = this.getUsageKey(apiId, extension);
        if (this._reportedUsages.has(key)) {
            return;
        }
        this._reportedUsages.add(key);
        if (extension.isUnderDevelopment) {
            this._extHostLogService.warn(`[Deprecation Warning] '${apiId}' is deprecated. ${migrationSuggestion}`);
        }
        this._telemetryShape.$publicLog2('extHostDeprecatedApiUsage', {
            extensionId: extension.identifier.value,
            apiId: apiId,
        });
    }
    getUsageKey(apiId, extension) {
        return `${apiId}-${extension.identifier.value}`;
    }
};
ExtHostApiDeprecationService = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, ILogService)
], ExtHostApiDeprecationService);
export { ExtHostApiDeprecationService };
export const NullApiDeprecationService = Object.freeze(new (class {
    report(_apiId, _extension, _warningMessage) {
        // noop
    }
})());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEFwaURlcHJlY2F0aW9uU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RBcGlEZXByZWNhdGlvblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNqRSxPQUFPLEtBQUssZUFBZSxNQUFNLHVCQUF1QixDQUFBO0FBQ3hELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBUTNELE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLGVBQWUsQ0FDM0QsK0JBQStCLENBQy9CLENBQUE7QUFFTSxJQUFNLDRCQUE0QixHQUFsQyxNQUFNLDRCQUE0QjtJQU14QyxZQUNxQixHQUF1QixFQUM5QixrQkFBZ0Q7UUFBL0IsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFhO1FBTDdDLG9CQUFlLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQTtRQU9uRCxJQUFJLENBQUMsZUFBZSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO0lBQ3JGLENBQUM7SUFFTSxNQUFNLENBQ1osS0FBYSxFQUNiLFNBQWdDLEVBQ2hDLG1CQUEyQjtRQUUzQixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUM5QyxJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDbkMsT0FBTTtRQUNQLENBQUM7UUFDRCxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUU3QixJQUFJLFNBQVMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQ2xDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQzNCLDBCQUEwQixLQUFLLG9CQUFvQixtQkFBbUIsRUFBRSxDQUN4RSxDQUFBO1FBQ0YsQ0FBQztRQW9CRCxJQUFJLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FDL0IsMkJBQTJCLEVBQzNCO1lBQ0MsV0FBVyxFQUFFLFNBQVMsQ0FBQyxVQUFVLENBQUMsS0FBSztZQUN2QyxLQUFLLEVBQUUsS0FBSztTQUNaLENBQ0QsQ0FBQTtJQUNGLENBQUM7SUFFTyxXQUFXLENBQUMsS0FBYSxFQUFFLFNBQWdDO1FBQ2xFLE9BQU8sR0FBRyxLQUFLLElBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUNoRCxDQUFDO0NBQ0QsQ0FBQTtBQTVEWSw0QkFBNEI7SUFPdEMsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLFdBQVcsQ0FBQTtHQVJELDRCQUE0QixDQTREeEM7O0FBRUQsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FDckQsSUFBSSxDQUFDO0lBR0csTUFBTSxDQUNaLE1BQWMsRUFDZCxVQUFpQyxFQUNqQyxlQUF1QjtRQUV2QixPQUFPO0lBQ1IsQ0FBQztDQUNELENBQUMsRUFBRSxDQUNKLENBQUEifQ==