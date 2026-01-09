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
import { IModelService } from '../../../../editor/common/services/model.js';
import { ModelService } from '../../../../editor/common/services/modelService.js';
import { ITextResourcePropertiesService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IUndoRedoService } from '../../../../platform/undoRedo/common/undoRedo.js';
import { IPathService } from '../../path/common/pathService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
let WorkbenchModelService = class WorkbenchModelService extends ModelService {
    constructor(configurationService, resourcePropertiesService, undoRedoService, _pathService, instantiationService) {
        super(configurationService, resourcePropertiesService, undoRedoService, instantiationService);
        this._pathService = _pathService;
    }
    _schemaShouldMaintainUndoRedoElements(resource) {
        return (super._schemaShouldMaintainUndoRedoElements(resource) ||
            resource.scheme === this._pathService.defaultUriScheme);
    }
};
WorkbenchModelService = __decorate([
    __param(0, IConfigurationService),
    __param(1, ITextResourcePropertiesService),
    __param(2, IUndoRedoService),
    __param(3, IPathService),
    __param(4, IInstantiationService)
], WorkbenchModelService);
export { WorkbenchModelService };
registerSingleton(IModelService, WorkbenchModelService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvbW9kZWwvY29tbW9uL21vZGVsU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQ2hILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNuRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDL0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFM0YsSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBc0IsU0FBUSxZQUFZO0lBQ3RELFlBQ3dCLG9CQUEyQyxFQUNsQyx5QkFBeUQsRUFDdkUsZUFBaUMsRUFDcEIsWUFBMEIsRUFDbEMsb0JBQTJDO1FBRWxFLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSx5QkFBeUIsRUFBRSxlQUFlLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtRQUg5RCxpQkFBWSxHQUFaLFlBQVksQ0FBYztJQUkxRCxDQUFDO0lBRWtCLHFDQUFxQyxDQUFDLFFBQWE7UUFDckUsT0FBTyxDQUNOLEtBQUssQ0FBQyxxQ0FBcUMsQ0FBQyxRQUFRLENBQUM7WUFDckQsUUFBUSxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUMsWUFBWSxDQUFDLGdCQUFnQixDQUN0RCxDQUFBO0lBQ0YsQ0FBQztDQUNELENBQUE7QUFqQlkscUJBQXFCO0lBRS9CLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSw4QkFBOEIsQ0FBQTtJQUM5QixXQUFBLGdCQUFnQixDQUFBO0lBQ2hCLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxxQkFBcUIsQ0FBQTtHQU5YLHFCQUFxQixDQWlCakM7O0FBRUQsaUJBQWlCLENBQUMsYUFBYSxFQUFFLHFCQUFxQixvQ0FBNEIsQ0FBQSJ9