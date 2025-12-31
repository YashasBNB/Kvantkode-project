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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbFN0YXRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vbGFuZ3VhZ2VNb2RlbFN0YXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDNUYsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBRXZELE9BQU8sRUFDTixVQUFVLEVBQ1YsbUNBQW1DLEdBRW5DLE1BQU0sbUVBQW1FLENBQUE7QUFDMUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFN0QsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsZUFBZSxDQUN4RCw0QkFBNEIsQ0FDNUIsQ0FBQTtBQWFNLElBQU0seUJBQXlCLEdBQS9CLE1BQU0seUJBQTBCLFNBQVEsVUFBVTtJQUd4RCxZQUVrQixrQ0FBdUUsRUFDdkUsY0FBK0I7UUFFaEQsS0FBSyxFQUFFLENBQUE7UUFIVSx1Q0FBa0MsR0FBbEMsa0NBQWtDLENBQXFDO1FBSXhGLG1EQUFtRDtRQUNuRCxLQUFLLE1BQU0sR0FBRyxJQUFJLGNBQWMsQ0FBQyxJQUFJLCtEQUE4QyxFQUFFLENBQUM7WUFDckYsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLHFCQUFxQixDQUFDLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUM7Z0JBQ3JGLGNBQWMsQ0FBQyxNQUFNLENBQUMsR0FBRyxvQ0FBMkIsQ0FBQTtZQUNyRCxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsTUFBTSxDQUNYLEtBQWEsRUFDYixXQUFnQyxFQUNoQyxLQUF5QixFQUN6QixVQUE4QjtRQUU5QixNQUFNLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxTQUFTLENBQ3RELFdBQVcsRUFDWCw4QkFBOEIsQ0FDOUIsQ0FBQTtJQUNGLENBQUM7Q0FDRCxDQUFBO0FBNUJZLHlCQUF5QjtJQUluQyxXQUFBLG1DQUFtQyxDQUFBO0lBRW5DLFdBQUEsZUFBZSxDQUFBO0dBTkwseUJBQXlCLENBNEJyQzs7QUFFRCxNQUFNLENBQUMsTUFBTSw4QkFBOEIsR0FBRyxTQUFTLENBQUE7QUFDdkQsUUFBUSxDQUFDLEVBQUUsQ0FDVixVQUFVLENBQUMseUJBQXlCLENBQ3BDLENBQUMsd0JBQXdCLENBQUM7SUFDMUIsRUFBRSxFQUFFLDhCQUE4QjtJQUNsQyxLQUFLLEVBQUUsUUFBUSxDQUFDLGlCQUFpQixFQUFFLFNBQVMsQ0FBQztJQUM3QyxXQUFXLEVBQUUsUUFBUSxDQUFDLGdCQUFnQixFQUFFLHFEQUFxRCxDQUFDO0lBQzlGLElBQUksRUFBRSxPQUFPLENBQUMsT0FBTztJQUNyQixNQUFNLEVBQUU7UUFDUCxTQUFTLEVBQUUsS0FBSztLQUNoQjtJQUNELGVBQWUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQztDQUN6QyxDQUFDLENBQUEifQ==