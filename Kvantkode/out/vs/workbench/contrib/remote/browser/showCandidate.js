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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hvd0NhbmRpZGF0ZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcmVtb3RlL2Jyb3dzZXIvc2hvd0NhbmRpZGF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFakUsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDakgsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFHMUYsSUFBTSx5QkFBeUIsR0FBL0IsTUFBTSx5QkFBMEIsU0FBUSxVQUFVO2FBQ3hDLE9BQUUsR0FBRyxxQ0FBcUMsQUFBeEMsQ0FBd0M7SUFFMUQsWUFDeUIscUJBQTZDLEVBQ2hDLGtCQUF1RDtRQUU1RixLQUFLLEVBQUUsQ0FBQTtRQUNQLE1BQU0saUJBQWlCLEdBQUcsa0JBQWtCLENBQUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxpQkFBaUIsQ0FBQTtRQUN2RixJQUFJLGlCQUFpQixFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLFNBQVMsQ0FDYixxQkFBcUIsQ0FBQyxrQkFBa0IsQ0FDdkMsS0FBSyxFQUFFLFVBQTJCLEVBQTRCLEVBQUU7Z0JBQy9ELE1BQU0sT0FBTyxHQUFjLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FDM0MsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQzVCLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsTUFBTSxJQUFJLEVBQUUsQ0FBQyxDQUN6RSxDQUNELENBQUE7Z0JBQ0QsTUFBTSxrQkFBa0IsR0FBb0IsRUFBRSxDQUFBO2dCQUM5QyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUMxQyxPQUFPLFVBQVUsQ0FBQTtnQkFDbEIsQ0FBQztnQkFDRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUM1QyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO3dCQUNoQixrQkFBa0IsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBQ3ZDLENBQUM7Z0JBQ0YsQ0FBQztnQkFDRCxPQUFPLGtCQUFrQixDQUFBO1lBQzFCLENBQUMsQ0FDRCxDQUNELENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQzs7QUFoQ1cseUJBQXlCO0lBSW5DLFdBQUEsc0JBQXNCLENBQUE7SUFDdEIsV0FBQSxtQ0FBbUMsQ0FBQTtHQUx6Qix5QkFBeUIsQ0FpQ3JDIn0=