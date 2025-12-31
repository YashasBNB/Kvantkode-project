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
import { IBrowserWorkbenchEnvironmentService } from '../../../services/environment/browser/environmentService.js';
import { IRemoteExplorerService } from '../../../services/remote/common/remoteExplorerService.js';
let ShowCandidateContribution = class ShowCandidateContribution extends Disposable {
    static { this.ID = 'workbench.contrib.showPortCandidate'; }
    constructor(remoteExplorerService, environmentService) {
        super();
        const showPortCandidate = environmentService.options?.tunnelProvider?.showPortCandidate;
        if (showPortCandidate) {
            this._register(remoteExplorerService.setCandidateFilter(async (candidates) => {
                const filters = await Promise.all(candidates.map((candidate) => showPortCandidate(candidate.host, candidate.port, candidate.detail ?? '')));
                const filteredCandidates = [];
                if (filters.length !== candidates.length) {
                    return candidates;
                }
                for (let i = 0; i < candidates.length; i++) {
                    if (filters[i]) {
                        filteredCandidates.push(candidates[i]);
                    }
                }
                return filteredCandidates;
            }));
        }
    }
};
ShowCandidateContribution = __decorate([
    __param(0, IRemoteExplorerService),
    __param(1, IBrowserWorkbenchEnvironmentService)
], ShowCandidateContribution);
export { ShowCandidateContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hvd0NhbmRpZGF0ZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3JlbW90ZS9icm93c2VyL3Nob3dDYW5kaWRhdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQ2pILE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBRzFGLElBQU0seUJBQXlCLEdBQS9CLE1BQU0seUJBQTBCLFNBQVEsVUFBVTthQUN4QyxPQUFFLEdBQUcscUNBQXFDLEFBQXhDLENBQXdDO0lBRTFELFlBQ3lCLHFCQUE2QyxFQUNoQyxrQkFBdUQ7UUFFNUYsS0FBSyxFQUFFLENBQUE7UUFDUCxNQUFNLGlCQUFpQixHQUFHLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxjQUFjLEVBQUUsaUJBQWlCLENBQUE7UUFDdkYsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxTQUFTLENBQ2IscUJBQXFCLENBQUMsa0JBQWtCLENBQ3ZDLEtBQUssRUFBRSxVQUEyQixFQUE0QixFQUFFO2dCQUMvRCxNQUFNLE9BQU8sR0FBYyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQzNDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUM1QixpQkFBaUIsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLE1BQU0sSUFBSSxFQUFFLENBQUMsQ0FDekUsQ0FDRCxDQUFBO2dCQUNELE1BQU0sa0JBQWtCLEdBQW9CLEVBQUUsQ0FBQTtnQkFDOUMsSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDMUMsT0FBTyxVQUFVLENBQUE7Z0JBQ2xCLENBQUM7Z0JBQ0QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztvQkFDNUMsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQzt3QkFDaEIsa0JBQWtCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO29CQUN2QyxDQUFDO2dCQUNGLENBQUM7Z0JBQ0QsT0FBTyxrQkFBa0IsQ0FBQTtZQUMxQixDQUFDLENBQ0QsQ0FDRCxDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUM7O0FBaENXLHlCQUF5QjtJQUluQyxXQUFBLHNCQUFzQixDQUFBO0lBQ3RCLFdBQUEsbUNBQW1DLENBQUE7R0FMekIseUJBQXlCLENBaUNyQyJ9