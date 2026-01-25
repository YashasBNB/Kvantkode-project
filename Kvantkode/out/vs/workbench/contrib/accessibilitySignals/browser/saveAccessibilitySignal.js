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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2F2ZUFjY2Vzc2liaWxpdHlTaWduYWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FjY2Vzc2liaWxpdHlTaWduYWxzL2Jyb3dzZXIvc2F2ZUFjY2Vzc2liaWxpdHlTaWduYWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsMkJBQTJCLEdBQzNCLE1BQU0sZ0ZBQWdGLENBQUE7QUFHdkYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFekYsSUFBTSxtQ0FBbUMsR0FBekMsTUFBTSxtQ0FDWixTQUFRLFVBQVU7YUFHRixPQUFFLEdBQUcsMkNBQTJDLEFBQTlDLENBQThDO0lBRWhFLFlBRWtCLDJCQUF3RCxFQUNuQyxtQkFBd0M7UUFFOUUsS0FBSyxFQUFFLENBQUE7UUFIVSxnQ0FBMkIsR0FBM0IsMkJBQTJCLENBQTZCO1FBQ25DLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBcUI7UUFHOUUsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDeEMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUU7WUFDckUsV0FBVyxFQUFFLENBQUMsQ0FBQyxNQUFNLGdDQUF3QjtTQUM3QyxDQUFDLENBQ0YsQ0FDRCxDQUFBO0lBQ0YsQ0FBQzs7QUFuQlcsbUNBQW1DO0lBTzdDLFdBQUEsMkJBQTJCLENBQUE7SUFFM0IsV0FBQSxtQkFBbUIsQ0FBQTtHQVRULG1DQUFtQyxDQW9CL0MifQ==