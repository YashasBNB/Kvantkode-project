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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3BlZWNoQWNjZXNzaWJpbGl0eVNpZ25hbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc3BlZWNoL2Jyb3dzZXIvc3BlZWNoQWNjZXNzaWJpbGl0eVNpZ25hbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUNOLG1CQUFtQixFQUNuQiwyQkFBMkIsR0FDM0IsTUFBTSxnRkFBZ0YsQ0FBQTtBQUV2RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFFcEQsSUFBTSxxQ0FBcUMsR0FBM0MsTUFBTSxxQ0FDWixTQUFRLFVBQVU7YUFHRixPQUFFLEdBQUcsNkNBQTZDLEFBQWhELENBQWdEO0lBRWxFLFlBRWtCLDJCQUF3RCxFQUN4QyxjQUE4QjtRQUUvRCxLQUFLLEVBQUUsQ0FBQTtRQUhVLGdDQUEyQixHQUEzQiwyQkFBMkIsQ0FBNkI7UUFDeEMsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1FBSS9ELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLGNBQWMsQ0FBQyw2QkFBNkIsQ0FBQyxHQUFHLEVBQUUsQ0FDdEQsSUFBSSxDQUFDLDJCQUEyQixDQUFDLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQyxxQkFBcUIsQ0FBQyxDQUN0RixDQUNELENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxjQUFjLENBQUMsMkJBQTJCLENBQUMsR0FBRyxFQUFFLENBQ3BELElBQUksQ0FBQywyQkFBMkIsQ0FBQyxVQUFVLENBQUMsbUJBQW1CLENBQUMscUJBQXFCLENBQUMsQ0FDdEYsQ0FDRCxDQUFBO0lBQ0YsQ0FBQzs7QUF2QlcscUNBQXFDO0lBTy9DLFdBQUEsMkJBQTJCLENBQUE7SUFFM0IsV0FBQSxjQUFjLENBQUE7R0FUSixxQ0FBcUMsQ0F3QmpEIn0=