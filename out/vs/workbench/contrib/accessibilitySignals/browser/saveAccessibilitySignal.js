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
import { AccessibilitySignal, IAccessibilitySignalService, } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IWorkingCopyService } from '../../../services/workingCopy/common/workingCopyService.js';
let SaveAccessibilitySignalContribution = class SaveAccessibilitySignalContribution extends Disposable {
    static { this.ID = 'workbench.contrib.saveAccessibilitySignal'; }
    constructor(_accessibilitySignalService, _workingCopyService) {
        super();
        this._accessibilitySignalService = _accessibilitySignalService;
        this._workingCopyService = _workingCopyService;
        this._register(this._workingCopyService.onDidSave((e) => this._accessibilitySignalService.playSignal(AccessibilitySignal.save, {
            userGesture: e.reason === 1 /* SaveReason.EXPLICIT */,
        })));
    }
};
SaveAccessibilitySignalContribution = __decorate([
    __param(0, IAccessibilitySignalService),
    __param(1, IWorkingCopyService)
], SaveAccessibilitySignalContribution);
export { SaveAccessibilitySignalContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2F2ZUFjY2Vzc2liaWxpdHlTaWduYWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9hY2Nlc3NpYmlsaXR5U2lnbmFscy9icm93c2VyL3NhdmVBY2Nlc3NpYmlsaXR5U2lnbmFsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLDJCQUEyQixHQUMzQixNQUFNLGdGQUFnRixDQUFBO0FBR3ZGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRXpGLElBQU0sbUNBQW1DLEdBQXpDLE1BQU0sbUNBQ1osU0FBUSxVQUFVO2FBR0YsT0FBRSxHQUFHLDJDQUEyQyxBQUE5QyxDQUE4QztJQUVoRSxZQUVrQiwyQkFBd0QsRUFDbkMsbUJBQXdDO1FBRTlFLEtBQUssRUFBRSxDQUFBO1FBSFUsZ0NBQTJCLEdBQTNCLDJCQUEyQixDQUE2QjtRQUNuQyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXFCO1FBRzlFLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ3hDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxVQUFVLENBQUMsbUJBQW1CLENBQUMsSUFBSSxFQUFFO1lBQ3JFLFdBQVcsRUFBRSxDQUFDLENBQUMsTUFBTSxnQ0FBd0I7U0FDN0MsQ0FBQyxDQUNGLENBQ0QsQ0FBQTtJQUNGLENBQUM7O0FBbkJXLG1DQUFtQztJQU83QyxXQUFBLDJCQUEyQixDQUFBO0lBRTNCLFdBQUEsbUJBQW1CLENBQUE7R0FUVCxtQ0FBbUMsQ0FvQi9DIn0=