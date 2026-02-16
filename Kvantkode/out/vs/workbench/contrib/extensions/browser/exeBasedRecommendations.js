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
import { IExtensionTipsService, } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { ExtensionRecommendations } from './extensionRecommendations.js';
import { localize } from '../../../../nls.js';
let ExeBasedRecommendations = class ExeBasedRecommendations extends ExtensionRecommendations {
    get otherRecommendations() {
        return this._otherTips.map((tip) => this.toExtensionRecommendation(tip));
    }
    get importantRecommendations() {
        return this._importantTips.map((tip) => this.toExtensionRecommendation(tip));
    }
    get recommendations() {
        return [...this.importantRecommendations, ...this.otherRecommendations];
    }
    constructor(extensionTipsService) {
        super();
        this.extensionTipsService = extensionTipsService;
        this._otherTips = [];
        this._importantTips = [];
    }
    getRecommendations(exe) {
        const important = this._importantTips
            .filter((tip) => tip.exeName.toLowerCase() === exe.toLowerCase())
            .map((tip) => this.toExtensionRecommendation(tip));
        const others = this._otherTips
            .filter((tip) => tip.exeName.toLowerCase() === exe.toLowerCase())
            .map((tip) => this.toExtensionRecommendation(tip));
        return { important, others };
    }
    async doActivate() {
        this._otherTips = await this.extensionTipsService.getOtherExecutableBasedTips();
        await this.fetchImportantExeBasedRecommendations();
    }
    async fetchImportantExeBasedRecommendations() {
        if (!this._importantExeBasedRecommendations) {
            this._importantExeBasedRecommendations = this.doFetchImportantExeBasedRecommendations();
        }
        return this._importantExeBasedRecommendations;
    }
    async doFetchImportantExeBasedRecommendations() {
        const importantExeBasedRecommendations = new Map();
        this._importantTips = await this.extensionTipsService.getImportantExecutableBasedTips();
        this._importantTips.forEach((tip) => importantExeBasedRecommendations.set(tip.extensionId.toLowerCase(), tip));
        return importantExeBasedRecommendations;
    }
    toExtensionRecommendation(tip) {
        return {
            extension: tip.extensionId.toLowerCase(),
            reason: {
                reasonId: 2 /* ExtensionRecommendationReason.Executable */,
                reasonText: localize('exeBasedRecommendation', 'This extension is recommended because you have {0} installed.', tip.exeFriendlyName),
            },
        };
    }
};
ExeBasedRecommendations = __decorate([
    __param(0, IExtensionTipsService)
], ExeBasedRecommendations);
export { ExeBasedRecommendations };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlQmFzZWRSZWNvbW1lbmRhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvYnJvd3Nlci9leGVCYXNlZFJlY29tbWVuZGF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sd0VBQXdFLENBQUE7QUFDL0UsT0FBTyxFQUFFLHdCQUF3QixFQUEyQixNQUFNLCtCQUErQixDQUFBO0FBQ2pHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUd0QyxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF3QixTQUFRLHdCQUF3QjtJQUlwRSxJQUFJLG9CQUFvQjtRQUN2QixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUN6RSxDQUFDO0lBQ0QsSUFBSSx3QkFBd0I7UUFDM0IsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDN0UsQ0FBQztJQUVELElBQUksZUFBZTtRQUNsQixPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtJQUN4RSxDQUFDO0lBRUQsWUFBbUMsb0JBQTREO1FBQzlGLEtBQUssRUFBRSxDQUFBO1FBRDRDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFkdkYsZUFBVSxHQUFtQyxFQUFFLENBQUE7UUFDL0MsbUJBQWMsR0FBbUMsRUFBRSxDQUFBO0lBZTNELENBQUM7SUFFRCxrQkFBa0IsQ0FBQyxHQUFXO1FBSTdCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxjQUFjO2FBQ25DLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsS0FBSyxHQUFHLENBQUMsV0FBVyxFQUFFLENBQUM7YUFDaEUsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUVuRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsVUFBVTthQUM1QixNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLEtBQUssR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDO2FBQ2hFLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFFbkQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsQ0FBQTtJQUM3QixDQUFDO0lBRVMsS0FBSyxDQUFDLFVBQVU7UUFDekIsSUFBSSxDQUFDLFVBQVUsR0FBRyxNQUFNLElBQUksQ0FBQyxvQkFBb0IsQ0FBQywyQkFBMkIsRUFBRSxDQUFBO1FBQy9FLE1BQU0sSUFBSSxDQUFDLHFDQUFxQyxFQUFFLENBQUE7SUFDbkQsQ0FBQztJQUtPLEtBQUssQ0FBQyxxQ0FBcUM7UUFHbEQsSUFBSSxDQUFDLElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxDQUFDO1lBQzdDLElBQUksQ0FBQyxpQ0FBaUMsR0FBRyxJQUFJLENBQUMsdUNBQXVDLEVBQUUsQ0FBQTtRQUN4RixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsaUNBQWlDLENBQUE7SUFDOUMsQ0FBQztJQUVPLEtBQUssQ0FBQyx1Q0FBdUM7UUFHcEQsTUFBTSxnQ0FBZ0MsR0FBRyxJQUFJLEdBQUcsRUFBd0MsQ0FBQTtRQUN4RixJQUFJLENBQUMsY0FBYyxHQUFHLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUFDLCtCQUErQixFQUFFLENBQUE7UUFDdkYsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUNuQyxnQ0FBZ0MsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FDeEUsQ0FBQTtRQUNELE9BQU8sZ0NBQWdDLENBQUE7SUFDeEMsQ0FBQztJQUVPLHlCQUF5QixDQUFDLEdBQWlDO1FBQ2xFLE9BQU87WUFDTixTQUFTLEVBQUUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUU7WUFDeEMsTUFBTSxFQUFFO2dCQUNQLFFBQVEsa0RBQTBDO2dCQUNsRCxVQUFVLEVBQUUsUUFBUSxDQUNuQix3QkFBd0IsRUFDeEIsK0RBQStELEVBQy9ELEdBQUcsQ0FBQyxlQUFlLENBQ25CO2FBQ0Q7U0FDRCxDQUFBO0lBQ0YsQ0FBQztDQUNELENBQUE7QUEzRVksdUJBQXVCO0lBZXRCLFdBQUEscUJBQXFCLENBQUE7R0FmdEIsdUJBQXVCLENBMkVuQyJ9