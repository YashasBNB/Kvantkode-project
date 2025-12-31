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
import { registerEditorContribution, } from '../../../../editor/browser/editorExtensions.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { ReferencesController } from '../../../../editor/contrib/gotoSymbol/browser/peek/referencesController.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
let WorkbenchReferencesController = class WorkbenchReferencesController extends ReferencesController {
    constructor(editor, contextKeyService, editorService, notificationService, instantiationService, storageService, configurationService) {
        super(false, editor, contextKeyService, editorService, notificationService, instantiationService, storageService, configurationService);
    }
};
WorkbenchReferencesController = __decorate([
    __param(1, IContextKeyService),
    __param(2, ICodeEditorService),
    __param(3, INotificationService),
    __param(4, IInstantiationService),
    __param(5, IStorageService),
    __param(6, IConfigurationService)
], WorkbenchReferencesController);
export { WorkbenchReferencesController };
registerEditorContribution(ReferencesController.ID, WorkbenchReferencesController, 4 /* EditorContributionInstantiation.Lazy */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoUmVmZXJlbmNlU2VhcmNoLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29kZUVkaXRvci9icm93c2VyL3dvcmtiZW5jaFJlZmVyZW5jZVNlYXJjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBRU4sMEJBQTBCLEdBQzFCLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDN0YsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNEVBQTRFLENBQUE7QUFDakgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDL0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRXpFLElBQU0sNkJBQTZCLEdBQW5DLE1BQU0sNkJBQThCLFNBQVEsb0JBQW9CO0lBQ3RFLFlBQ0MsTUFBbUIsRUFDQyxpQkFBcUMsRUFDckMsYUFBaUMsRUFDL0IsbUJBQXlDLEVBQ3hDLG9CQUEyQyxFQUNqRCxjQUErQixFQUN6QixvQkFBMkM7UUFFbEUsS0FBSyxDQUNKLEtBQUssRUFDTCxNQUFNLEVBQ04saUJBQWlCLEVBQ2pCLGFBQWEsRUFDYixtQkFBbUIsRUFDbkIsb0JBQW9CLEVBQ3BCLGNBQWMsRUFDZCxvQkFBb0IsQ0FDcEIsQ0FBQTtJQUNGLENBQUM7Q0FDRCxDQUFBO0FBckJZLDZCQUE2QjtJQUd2QyxXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxvQkFBb0IsQ0FBQTtJQUNwQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxxQkFBcUIsQ0FBQTtHQVJYLDZCQUE2QixDQXFCekM7O0FBRUQsMEJBQTBCLENBQ3pCLG9CQUFvQixDQUFDLEVBQUUsRUFDdkIsNkJBQTZCLCtDQUU3QixDQUFBIn0=