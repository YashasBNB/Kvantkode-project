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
import { ISpeechService } from '../common/speechService.js';
let SpeechAccessibilitySignalContribution = class SpeechAccessibilitySignalContribution extends Disposable {
    static { this.ID = 'workbench.contrib.speechAccessibilitySignal'; }
    constructor(_accessibilitySignalService, _speechService) {
        super();
        this._accessibilitySignalService = _accessibilitySignalService;
        this._speechService = _speechService;
        this._register(this._speechService.onDidStartSpeechToTextSession(() => this._accessibilitySignalService.playSignal(AccessibilitySignal.voiceRecordingStarted)));
        this._register(this._speechService.onDidEndSpeechToTextSession(() => this._accessibilitySignalService.playSignal(AccessibilitySignal.voiceRecordingStopped)));
    }
};
SpeechAccessibilitySignalContribution = __decorate([
    __param(0, IAccessibilitySignalService),
    __param(1, ISpeechService)
], SpeechAccessibilitySignalContribution);
export { SpeechAccessibilitySignalContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3BlZWNoQWNjZXNzaWJpbGl0eVNpZ25hbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NwZWVjaC9icm93c2VyL3NwZWVjaEFjY2Vzc2liaWxpdHlTaWduYWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsMkJBQTJCLEdBQzNCLE1BQU0sZ0ZBQWdGLENBQUE7QUFFdkYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBRXBELElBQU0scUNBQXFDLEdBQTNDLE1BQU0scUNBQ1osU0FBUSxVQUFVO2FBR0YsT0FBRSxHQUFHLDZDQUE2QyxBQUFoRCxDQUFnRDtJQUVsRSxZQUVrQiwyQkFBd0QsRUFDeEMsY0FBOEI7UUFFL0QsS0FBSyxFQUFFLENBQUE7UUFIVSxnQ0FBMkIsR0FBM0IsMkJBQTJCLENBQTZCO1FBQ3hDLG1CQUFjLEdBQWQsY0FBYyxDQUFnQjtRQUkvRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxjQUFjLENBQUMsNkJBQTZCLENBQUMsR0FBRyxFQUFFLENBQ3RELElBQUksQ0FBQywyQkFBMkIsQ0FBQyxVQUFVLENBQUMsbUJBQW1CLENBQUMscUJBQXFCLENBQUMsQ0FDdEYsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsY0FBYyxDQUFDLDJCQUEyQixDQUFDLEdBQUcsRUFBRSxDQUNwRCxJQUFJLENBQUMsMkJBQTJCLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDLHFCQUFxQixDQUFDLENBQ3RGLENBQ0QsQ0FBQTtJQUNGLENBQUM7O0FBdkJXLHFDQUFxQztJQU8vQyxXQUFBLDJCQUEyQixDQUFBO0lBRTNCLFdBQUEsY0FBYyxDQUFBO0dBVEoscUNBQXFDLENBd0JqRCJ9