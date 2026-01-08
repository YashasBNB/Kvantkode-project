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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jVXRpbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3VzZXJEYXRhU3luYy9jb21tb24vdXNlckRhdGFTeW5jVXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLHlCQUF5QixHQUN6QixNQUFNLDBEQUEwRCxDQUFBO0FBRWpFLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUdoRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN6RixPQUFPLEVBQ04sOEJBQThCLEVBQzlCLGlDQUFpQyxHQUNqQyxNQUFNLGlFQUFpRSxDQUFBO0FBRXhFLElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXVCO0lBRzVCLFlBQ3NDLGtCQUFzQyxFQUN2QyxnQkFBbUMsRUFFdEQsNkJBQTZELEVBRTdELGdDQUFtRTtRQUwvQyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1FBQ3ZDLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFFdEQsa0NBQTZCLEdBQTdCLDZCQUE2QixDQUFnQztRQUU3RCxxQ0FBZ0MsR0FBaEMsZ0NBQWdDLENBQW1DO0lBQ2xGLENBQUM7SUFFSixLQUFLLENBQUMsaUNBQWlDO1FBQ3RDLE9BQU8seUJBQXlCLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDdkMsQ0FBQztJQUVELEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxZQUFzQjtRQUMvQyxNQUFNLElBQUksR0FBOEIsRUFBRSxDQUFBO1FBQzFDLEtBQUssTUFBTSxXQUFXLElBQUksWUFBWSxFQUFFLENBQUM7WUFDeEMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLElBQUksQ0FBQyxrQkFBa0I7aUJBQ3pDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQztpQkFDL0IsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztpQkFDMUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ1osQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxRQUFhO1FBQzNDLElBQUksQ0FBQztZQUNKLE1BQU0sY0FBYyxHQUFHLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ2pGLE1BQU0sRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsVUFBVSxFQUFFLENBQUE7WUFDcEYsTUFBTSxHQUFHLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLENBQUE7WUFDMUQsY0FBYyxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ3hCLE9BQU8sRUFBRSxHQUFHLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxDQUFBO1FBQ3RDLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUEsQ0FBQztRQUNkLE9BQU87WUFDTixHQUFHLEVBQUUsSUFBSSxDQUFDLDZCQUE2QixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUM7WUFDeEQsWUFBWSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsUUFBUSxDQUM3RCxRQUFRLEVBQ1IscUJBQXFCLENBQ3JCO1lBQ0QsT0FBTyxFQUFFLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLGdCQUFnQixDQUFDO1NBQ25GLENBQUE7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQTVDSyx1QkFBdUI7SUFJMUIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsOEJBQThCLENBQUE7SUFFOUIsV0FBQSxpQ0FBaUMsQ0FBQTtHQVI5Qix1QkFBdUIsQ0E0QzVCO0FBRUQsaUJBQWlCLENBQUMsd0JBQXdCLEVBQUUsdUJBQXVCLG9DQUE0QixDQUFBIn0=