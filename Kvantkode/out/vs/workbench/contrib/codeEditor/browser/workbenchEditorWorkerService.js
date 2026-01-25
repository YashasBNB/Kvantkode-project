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
import { WebWorkerDescriptor } from '../../../../base/browser/webWorkerFactory.js';
import { FileAccess } from '../../../../base/common/network.js';
import { EditorWorkerService } from '../../../../editor/browser/services/editorWorkerService.js';
import { ILanguageConfigurationService } from '../../../../editor/common/languages/languageConfigurationRegistry.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { ILogService } from '../../../../platform/log/common/log.js';
let WorkbenchEditorWorkerService = class WorkbenchEditorWorkerService extends EditorWorkerService {
    constructor(modelService, configurationService, logService, languageConfigurationService, languageFeaturesService) {
        const workerDescriptor = new WebWorkerDescriptor(FileAccess.asBrowserUri('vs/editor/common/services/editorWebWorkerMain.js'), 'TextEditorWorker');
        super(workerDescriptor, modelService, configurationService, logService, languageConfigurationService, languageFeaturesService);
    }
};
WorkbenchEditorWorkerService = __decorate([
    __param(0, IModelService),
    __param(1, ITextResourceConfigurationService),
    __param(2, ILogService),
    __param(3, ILanguageConfigurationService),
    __param(4, ILanguageFeaturesService)
], WorkbenchEditorWorkerService);
export { WorkbenchEditorWorkerService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoRWRpdG9yV29ya2VyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29kZUVkaXRvci9icm93c2VyL3dvcmtiZW5jaEVkaXRvcldvcmtlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDbEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHNFQUFzRSxDQUFBO0FBQ3BILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUNuSCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFN0QsSUFBTSw0QkFBNEIsR0FBbEMsTUFBTSw0QkFBNkIsU0FBUSxtQkFBbUI7SUFDcEUsWUFDZ0IsWUFBMkIsRUFDUCxvQkFBdUQsRUFDN0UsVUFBdUIsRUFDTCw0QkFBMkQsRUFDaEUsdUJBQWlEO1FBRTNFLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxtQkFBbUIsQ0FDL0MsVUFBVSxDQUFDLFlBQVksQ0FBQyxrREFBa0QsQ0FBQyxFQUMzRSxrQkFBa0IsQ0FDbEIsQ0FBQTtRQUNELEtBQUssQ0FDSixnQkFBZ0IsRUFDaEIsWUFBWSxFQUNaLG9CQUFvQixFQUNwQixVQUFVLEVBQ1YsNEJBQTRCLEVBQzVCLHVCQUF1QixDQUN2QixDQUFBO0lBQ0YsQ0FBQztDQUNELENBQUE7QUFyQlksNEJBQTRCO0lBRXRDLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxpQ0FBaUMsQ0FBQTtJQUNqQyxXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEsNkJBQTZCLENBQUE7SUFDN0IsV0FBQSx3QkFBd0IsQ0FBQTtHQU5kLDRCQUE0QixDQXFCeEMifQ==