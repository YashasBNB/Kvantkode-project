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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IBrowserWorkbenchEnvironmentService } from '../../../services/environment/browser/environmentService.js';
let ExternalUriResolverContribution = class ExternalUriResolverContribution extends Disposable {
    static { this.ID = 'workbench.contrib.externalUriResolver'; }
    constructor(_openerService, _workbenchEnvironmentService) {
        super();
        if (_workbenchEnvironmentService.options?.resolveExternalUri) {
            this._register(_openerService.registerExternalUriResolver({
                resolveExternalUri: async (resource) => {
                    return {
                        resolved: await _workbenchEnvironmentService.options.resolveExternalUri(resource),
                        dispose: () => {
                            // TODO@mjbvz - do we need to do anything here?
                        },
                    };
                },
            }));
        }
    }
};
ExternalUriResolverContribution = __decorate([
    __param(0, IOpenerService),
    __param(1, IBrowserWorkbenchEnvironmentService)
], ExternalUriResolverContribution);
export { ExternalUriResolverContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZXJuYWxVcmlSZXNvbHZlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3VybC9icm93c2VyL2V4dGVybmFsVXJpUmVzb2x2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUU3RSxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUUxRyxJQUFNLCtCQUErQixHQUFyQyxNQUFNLCtCQUFnQyxTQUFRLFVBQVU7YUFDOUMsT0FBRSxHQUFHLHVDQUF1QyxBQUExQyxDQUEwQztJQUU1RCxZQUNpQixjQUE4QixFQUU5Qyw0QkFBaUU7UUFFakUsS0FBSyxFQUFFLENBQUE7UUFFUCxJQUFJLDRCQUE0QixDQUFDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxDQUFDO1lBQzlELElBQUksQ0FBQyxTQUFTLENBQ2IsY0FBYyxDQUFDLDJCQUEyQixDQUFDO2dCQUMxQyxrQkFBa0IsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLEVBQUU7b0JBQ3RDLE9BQU87d0JBQ04sUUFBUSxFQUFFLE1BQU0sNEJBQTRCLENBQUMsT0FBUSxDQUFDLGtCQUFtQixDQUFDLFFBQVEsQ0FBQzt3QkFDbkYsT0FBTyxFQUFFLEdBQUcsRUFBRTs0QkFDYiwrQ0FBK0M7d0JBQ2hELENBQUM7cUJBQ0QsQ0FBQTtnQkFDRixDQUFDO2FBQ0QsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQzs7QUF4QlcsK0JBQStCO0lBSXpDLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxtQ0FBbUMsQ0FBQTtHQUx6QiwrQkFBK0IsQ0F5QjNDIn0=