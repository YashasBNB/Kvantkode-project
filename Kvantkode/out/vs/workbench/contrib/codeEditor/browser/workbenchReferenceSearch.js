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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoUmVmZXJlbmNlU2VhcmNoLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb2RlRWRpdG9yL2Jyb3dzZXIvd29ya2JlbmNoUmVmZXJlbmNlU2VhcmNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFFTiwwQkFBMEIsR0FDMUIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQTtBQUNqSCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFekUsSUFBTSw2QkFBNkIsR0FBbkMsTUFBTSw2QkFBOEIsU0FBUSxvQkFBb0I7SUFDdEUsWUFDQyxNQUFtQixFQUNDLGlCQUFxQyxFQUNyQyxhQUFpQyxFQUMvQixtQkFBeUMsRUFDeEMsb0JBQTJDLEVBQ2pELGNBQStCLEVBQ3pCLG9CQUEyQztRQUVsRSxLQUFLLENBQ0osS0FBSyxFQUNMLE1BQU0sRUFDTixpQkFBaUIsRUFDakIsYUFBYSxFQUNiLG1CQUFtQixFQUNuQixvQkFBb0IsRUFDcEIsY0FBYyxFQUNkLG9CQUFvQixDQUNwQixDQUFBO0lBQ0YsQ0FBQztDQUNELENBQUE7QUFyQlksNkJBQTZCO0lBR3ZDLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLG9CQUFvQixDQUFBO0lBQ3BCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLHFCQUFxQixDQUFBO0dBUlgsNkJBQTZCLENBcUJ6Qzs7QUFFRCwwQkFBMEIsQ0FDekIsb0JBQW9CLENBQUMsRUFBRSxFQUN2Qiw2QkFBNkIsK0NBRTdCLENBQUEifQ==