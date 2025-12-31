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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlQmFzZWRSZWNvbW1lbmRhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2Jyb3dzZXIvZXhlQmFzZWRSZWNvbW1lbmRhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLHdFQUF3RSxDQUFBO0FBQy9FLE9BQU8sRUFBRSx3QkFBd0IsRUFBMkIsTUFBTSwrQkFBK0IsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFHdEMsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSx3QkFBd0I7SUFJcEUsSUFBSSxvQkFBb0I7UUFDdkIsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDekUsQ0FBQztJQUNELElBQUksd0JBQXdCO1FBQzNCLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQzdFLENBQUM7SUFFRCxJQUFJLGVBQWU7UUFDbEIsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixFQUFFLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUE7SUFDeEUsQ0FBQztJQUVELFlBQW1DLG9CQUE0RDtRQUM5RixLQUFLLEVBQUUsQ0FBQTtRQUQ0Qyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBZHZGLGVBQVUsR0FBbUMsRUFBRSxDQUFBO1FBQy9DLG1CQUFjLEdBQW1DLEVBQUUsQ0FBQTtJQWUzRCxDQUFDO0lBRUQsa0JBQWtCLENBQUMsR0FBVztRQUk3QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsY0FBYzthQUNuQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLEtBQUssR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDO2FBQ2hFLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFFbkQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFVBQVU7YUFDNUIsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxLQUFLLEdBQUcsQ0FBQyxXQUFXLEVBQUUsQ0FBQzthQUNoRSxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBRW5ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLENBQUE7SUFDN0IsQ0FBQztJQUVTLEtBQUssQ0FBQyxVQUFVO1FBQ3pCLElBQUksQ0FBQyxVQUFVLEdBQUcsTUFBTSxJQUFJLENBQUMsb0JBQW9CLENBQUMsMkJBQTJCLEVBQUUsQ0FBQTtRQUMvRSxNQUFNLElBQUksQ0FBQyxxQ0FBcUMsRUFBRSxDQUFBO0lBQ25ELENBQUM7SUFLTyxLQUFLLENBQUMscUNBQXFDO1FBR2xELElBQUksQ0FBQyxJQUFJLENBQUMsaUNBQWlDLEVBQUUsQ0FBQztZQUM3QyxJQUFJLENBQUMsaUNBQWlDLEdBQUcsSUFBSSxDQUFDLHVDQUF1QyxFQUFFLENBQUE7UUFDeEYsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLGlDQUFpQyxDQUFBO0lBQzlDLENBQUM7SUFFTyxLQUFLLENBQUMsdUNBQXVDO1FBR3BELE1BQU0sZ0NBQWdDLEdBQUcsSUFBSSxHQUFHLEVBQXdDLENBQUE7UUFDeEYsSUFBSSxDQUFDLGNBQWMsR0FBRyxNQUFNLElBQUksQ0FBQyxvQkFBb0IsQ0FBQywrQkFBK0IsRUFBRSxDQUFBO1FBQ3ZGLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FDbkMsZ0NBQWdDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQ3hFLENBQUE7UUFDRCxPQUFPLGdDQUFnQyxDQUFBO0lBQ3hDLENBQUM7SUFFTyx5QkFBeUIsQ0FBQyxHQUFpQztRQUNsRSxPQUFPO1lBQ04sU0FBUyxFQUFFLEdBQUcsQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFO1lBQ3hDLE1BQU0sRUFBRTtnQkFDUCxRQUFRLGtEQUEwQztnQkFDbEQsVUFBVSxFQUFFLFFBQVEsQ0FDbkIsd0JBQXdCLEVBQ3hCLCtEQUErRCxFQUMvRCxHQUFHLENBQUMsZUFBZSxDQUNuQjthQUNEO1NBQ0QsQ0FBQTtJQUNGLENBQUM7Q0FDRCxDQUFBO0FBM0VZLHVCQUF1QjtJQWV0QixXQUFBLHFCQUFxQixDQUFBO0dBZnRCLHVCQUF1QixDQTJFbkMifQ==