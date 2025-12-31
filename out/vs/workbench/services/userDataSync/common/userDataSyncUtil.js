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
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IUserDataSyncUtilService, getDefaultIgnoredSettings, } from '../../../../platform/userDataSync/common/userDataSync.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { ITextResourcePropertiesService, ITextResourceConfigurationService, } from '../../../../editor/common/services/textResourceConfiguration.js';
let UserDataSyncUtilService = class UserDataSyncUtilService {
    constructor(keybindingsService, textModelService, textResourcePropertiesService, textResourceConfigurationService) {
        this.keybindingsService = keybindingsService;
        this.textModelService = textModelService;
        this.textResourcePropertiesService = textResourcePropertiesService;
        this.textResourceConfigurationService = textResourceConfigurationService;
    }
    async resolveDefaultCoreIgnoredSettings() {
        return getDefaultIgnoredSettings(true);
    }
    async resolveUserBindings(userBindings) {
        const keys = {};
        for (const userbinding of userBindings) {
            keys[userbinding] = this.keybindingsService
                .resolveUserBinding(userbinding)
                .map((part) => part.getUserSettingsLabel())
                .join(' ');
        }
        return keys;
    }
    async resolveFormattingOptions(resource) {
        try {
            const modelReference = await this.textModelService.createModelReference(resource);
            const { insertSpaces, tabSize } = modelReference.object.textEditorModel.getOptions();
            const eol = modelReference.object.textEditorModel.getEOL();
            modelReference.dispose();
            return { eol, insertSpaces, tabSize };
        }
        catch (e) { }
        return {
            eol: this.textResourcePropertiesService.getEOL(resource),
            insertSpaces: !!this.textResourceConfigurationService.getValue(resource, 'editor.insertSpaces'),
            tabSize: this.textResourceConfigurationService.getValue(resource, 'editor.tabSize'),
        };
    }
};
UserDataSyncUtilService = __decorate([
    __param(0, IKeybindingService),
    __param(1, ITextModelService),
    __param(2, ITextResourcePropertiesService),
    __param(3, ITextResourceConfigurationService)
], UserDataSyncUtilService);
registerSingleton(IUserDataSyncUtilService, UserDataSyncUtilService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jVXRpbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy91c2VyRGF0YVN5bmMvY29tbW9uL3VzZXJEYXRhU3luY1V0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUNOLHdCQUF3QixFQUN4Qix5QkFBeUIsR0FDekIsTUFBTSwwREFBMEQsQ0FBQTtBQUVqRSxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFHaEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDekYsT0FBTyxFQUNOLDhCQUE4QixFQUM5QixpQ0FBaUMsR0FDakMsTUFBTSxpRUFBaUUsQ0FBQTtBQUV4RSxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF1QjtJQUc1QixZQUNzQyxrQkFBc0MsRUFDdkMsZ0JBQW1DLEVBRXRELDZCQUE2RCxFQUU3RCxnQ0FBbUU7UUFML0MsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtRQUN2QyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBRXRELGtDQUE2QixHQUE3Qiw2QkFBNkIsQ0FBZ0M7UUFFN0QscUNBQWdDLEdBQWhDLGdDQUFnQyxDQUFtQztJQUNsRixDQUFDO0lBRUosS0FBSyxDQUFDLGlDQUFpQztRQUN0QyxPQUFPLHlCQUF5QixDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3ZDLENBQUM7SUFFRCxLQUFLLENBQUMsbUJBQW1CLENBQUMsWUFBc0I7UUFDL0MsTUFBTSxJQUFJLEdBQThCLEVBQUUsQ0FBQTtRQUMxQyxLQUFLLE1BQU0sV0FBVyxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ3hDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxJQUFJLENBQUMsa0JBQWtCO2lCQUN6QyxrQkFBa0IsQ0FBQyxXQUFXLENBQUM7aUJBQy9CLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7aUJBQzFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNaLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRCxLQUFLLENBQUMsd0JBQXdCLENBQUMsUUFBYTtRQUMzQyxJQUFJLENBQUM7WUFDSixNQUFNLGNBQWMsR0FBRyxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUNqRixNQUFNLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsRUFBRSxDQUFBO1lBQ3BGLE1BQU0sR0FBRyxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFBO1lBQzFELGNBQWMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUN4QixPQUFPLEVBQUUsR0FBRyxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsQ0FBQTtRQUN0QyxDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFBLENBQUM7UUFDZCxPQUFPO1lBQ04sR0FBRyxFQUFFLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO1lBQ3hELFlBQVksRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLFFBQVEsQ0FDN0QsUUFBUSxFQUNSLHFCQUFxQixDQUNyQjtZQUNELE9BQU8sRUFBRSxJQUFJLENBQUMsZ0NBQWdDLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxnQkFBZ0IsQ0FBQztTQUNuRixDQUFBO0lBQ0YsQ0FBQztDQUNELENBQUE7QUE1Q0ssdUJBQXVCO0lBSTFCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLDhCQUE4QixDQUFBO0lBRTlCLFdBQUEsaUNBQWlDLENBQUE7R0FSOUIsdUJBQXVCLENBNEM1QjtBQUVELGlCQUFpQixDQUFDLHdCQUF3QixFQUFFLHVCQUF1QixvQ0FBNEIsQ0FBQSJ9