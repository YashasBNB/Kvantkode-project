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
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { Extensions, IExtensionFeaturesManagementService, } from '../../../services/extensionManagement/common/extensionFeatures.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { localize } from '../../../../nls.js';
import { Codicon } from '../../../../base/common/codicons.js';
export const ILanguageModelStatsService = createDecorator('ILanguageModelStatsService');
let LanguageModelStatsService = class LanguageModelStatsService extends Disposable {
    constructor(extensionFeaturesManagementService, storageService) {
        super();
        this.extensionFeaturesManagementService = extensionFeaturesManagementService;
        // TODO: @sandy081 - remove this code after a while
        for (const key in storageService.keys(-1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */)) {
            if (key.startsWith('languageModelStats.') || key.startsWith('languageModelAccess.')) {
                storageService.remove(key, -1 /* StorageScope.APPLICATION */);
            }
        }
    }
    async update(model, extensionId, agent, tokenCount) {
        await this.extensionFeaturesManagementService.getAccess(extensionId, CopilotUsageExtensionFeatureId);
    }
};
LanguageModelStatsService = __decorate([
    __param(0, IExtensionFeaturesManagementService),
    __param(1, IStorageService)
], LanguageModelStatsService);
export { LanguageModelStatsService };
export const CopilotUsageExtensionFeatureId = 'copilot';
Registry.as(Extensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: CopilotUsageExtensionFeatureId,
    label: localize('Language Models', 'Copilot'),
    description: localize('languageModels', 'Language models usage statistics of this extension.'),
    icon: Codicon.copilot,
    access: {
        canToggle: false,
    },
    accessDataLabel: localize('chat', 'chat'),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbFN0YXRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9sYW5ndWFnZU1vZGVsU3RhdHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUM1RixPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFFdkQsT0FBTyxFQUNOLFVBQVUsRUFDVixtQ0FBbUMsR0FFbkMsTUFBTSxtRUFBbUUsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUU3RCxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxlQUFlLENBQ3hELDRCQUE0QixDQUM1QixDQUFBO0FBYU0sSUFBTSx5QkFBeUIsR0FBL0IsTUFBTSx5QkFBMEIsU0FBUSxVQUFVO0lBR3hELFlBRWtCLGtDQUF1RSxFQUN2RSxjQUErQjtRQUVoRCxLQUFLLEVBQUUsQ0FBQTtRQUhVLHVDQUFrQyxHQUFsQyxrQ0FBa0MsQ0FBcUM7UUFJeEYsbURBQW1EO1FBQ25ELEtBQUssTUFBTSxHQUFHLElBQUksY0FBYyxDQUFDLElBQUksK0RBQThDLEVBQUUsQ0FBQztZQUNyRixJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMscUJBQXFCLENBQUMsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLHNCQUFzQixDQUFDLEVBQUUsQ0FBQztnQkFDckYsY0FBYyxDQUFDLE1BQU0sQ0FBQyxHQUFHLG9DQUEyQixDQUFBO1lBQ3JELENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxNQUFNLENBQ1gsS0FBYSxFQUNiLFdBQWdDLEVBQ2hDLEtBQXlCLEVBQ3pCLFVBQThCO1FBRTlCLE1BQU0sSUFBSSxDQUFDLGtDQUFrQyxDQUFDLFNBQVMsQ0FDdEQsV0FBVyxFQUNYLDhCQUE4QixDQUM5QixDQUFBO0lBQ0YsQ0FBQztDQUNELENBQUE7QUE1QlkseUJBQXlCO0lBSW5DLFdBQUEsbUNBQW1DLENBQUE7SUFFbkMsV0FBQSxlQUFlLENBQUE7R0FOTCx5QkFBeUIsQ0E0QnJDOztBQUVELE1BQU0sQ0FBQyxNQUFNLDhCQUE4QixHQUFHLFNBQVMsQ0FBQTtBQUN2RCxRQUFRLENBQUMsRUFBRSxDQUNWLFVBQVUsQ0FBQyx5QkFBeUIsQ0FDcEMsQ0FBQyx3QkFBd0IsQ0FBQztJQUMxQixFQUFFLEVBQUUsOEJBQThCO0lBQ2xDLEtBQUssRUFBRSxRQUFRLENBQUMsaUJBQWlCLEVBQUUsU0FBUyxDQUFDO0lBQzdDLFdBQVcsRUFBRSxRQUFRLENBQUMsZ0JBQWdCLEVBQUUscURBQXFELENBQUM7SUFDOUYsSUFBSSxFQUFFLE9BQU8sQ0FBQyxPQUFPO0lBQ3JCLE1BQU0sRUFBRTtRQUNQLFNBQVMsRUFBRSxLQUFLO0tBQ2hCO0lBQ0QsZUFBZSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDO0NBQ3pDLENBQUMsQ0FBQSJ9