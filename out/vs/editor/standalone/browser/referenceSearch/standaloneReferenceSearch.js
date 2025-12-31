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
import { registerEditorContribution, } from '../../../browser/editorExtensions.js';
import { ICodeEditorService } from '../../../browser/services/codeEditorService.js';
import { ReferencesController } from '../../../contrib/gotoSymbol/browser/peek/referencesController.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
let StandaloneReferencesController = class StandaloneReferencesController extends ReferencesController {
    constructor(editor, contextKeyService, editorService, notificationService, instantiationService, storageService, configurationService) {
        super(true, editor, contextKeyService, editorService, notificationService, instantiationService, storageService, configurationService);
    }
};
StandaloneReferencesController = __decorate([
    __param(1, IContextKeyService),
    __param(2, ICodeEditorService),
    __param(3, INotificationService),
    __param(4, IInstantiationService),
    __param(5, IStorageService),
    __param(6, IConfigurationService)
], StandaloneReferencesController);
export { StandaloneReferencesController };
registerEditorContribution(ReferencesController.ID, StandaloneReferencesController, 4 /* EditorContributionInstantiation.Lazy */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZVJlZmVyZW5jZVNlYXJjaC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9zdGFuZGFsb25lL2Jyb3dzZXIvcmVmZXJlbmNlU2VhcmNoL3N0YW5kYWxvbmVSZWZlcmVuY2VTZWFyY2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUVOLDBCQUEwQixHQUMxQixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3ZHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUV6RSxJQUFNLDhCQUE4QixHQUFwQyxNQUFNLDhCQUErQixTQUFRLG9CQUFvQjtJQUN2RSxZQUNDLE1BQW1CLEVBQ0MsaUJBQXFDLEVBQ3JDLGFBQWlDLEVBQy9CLG1CQUF5QyxFQUN4QyxvQkFBMkMsRUFDakQsY0FBK0IsRUFDekIsb0JBQTJDO1FBRWxFLEtBQUssQ0FDSixJQUFJLEVBQ0osTUFBTSxFQUNOLGlCQUFpQixFQUNqQixhQUFhLEVBQ2IsbUJBQW1CLEVBQ25CLG9CQUFvQixFQUNwQixjQUFjLEVBQ2Qsb0JBQW9CLENBQ3BCLENBQUE7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQXJCWSw4QkFBOEI7SUFHeEMsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsb0JBQW9CLENBQUE7SUFDcEIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEscUJBQXFCLENBQUE7R0FSWCw4QkFBOEIsQ0FxQjFDOztBQUVELDBCQUEwQixDQUN6QixvQkFBb0IsQ0FBQyxFQUFFLEVBQ3ZCLDhCQUE4QiwrQ0FFOUIsQ0FBQSJ9