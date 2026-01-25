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
import { RunOnceScheduler } from '../../../base/common/async.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { AccessibilitySignal, IAccessibilitySignalService } from './accessibilitySignalService.js';
const PROGRESS_SIGNAL_LOOP_DELAY = 5000;
/**
 * Schedules a signal to play while progress is happening.
 */
let AccessibilityProgressSignalScheduler = class AccessibilityProgressSignalScheduler extends Disposable {
    constructor(msDelayTime, msLoopTime, _accessibilitySignalService) {
        super();
        this._accessibilitySignalService = _accessibilitySignalService;
        this._scheduler = new RunOnceScheduler(() => {
            this._signalLoop = this._accessibilitySignalService.playSignalLoop(AccessibilitySignal.progress, msLoopTime ?? PROGRESS_SIGNAL_LOOP_DELAY);
        }, msDelayTime);
        this._scheduler.schedule();
    }
    dispose() {
        super.dispose();
        this._signalLoop?.dispose();
        this._scheduler.dispose();
    }
};
AccessibilityProgressSignalScheduler = __decorate([
    __param(2, IAccessibilitySignalService)
], AccessibilityProgressSignalScheduler);
export { AccessibilityProgressSignalScheduler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3Jlc3NBY2Nlc3NpYmlsaXR5U2lnbmFsU2NoZWR1bGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9hY2Nlc3NpYmlsaXR5U2lnbmFsL2Jyb3dzZXIvcHJvZ3Jlc3NBY2Nlc3NpYmlsaXR5U2lnbmFsU2NoZWR1bGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUVsRyxNQUFNLDBCQUEwQixHQUFHLElBQUksQ0FBQTtBQUV2Qzs7R0FFRztBQUNJLElBQU0sb0NBQW9DLEdBQTFDLE1BQU0sb0NBQXFDLFNBQVEsVUFBVTtJQUduRSxZQUNDLFdBQW1CLEVBQ25CLFVBQThCLEVBRWIsMkJBQXdEO1FBRXpFLEtBQUssRUFBRSxDQUFBO1FBRlUsZ0NBQTJCLEdBQTNCLDJCQUEyQixDQUE2QjtRQUd6RSxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksZ0JBQWdCLENBQUMsR0FBRyxFQUFFO1lBQzNDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLDJCQUEyQixDQUFDLGNBQWMsQ0FDakUsbUJBQW1CLENBQUMsUUFBUSxFQUM1QixVQUFVLElBQUksMEJBQTBCLENBQ3hDLENBQUE7UUFDRixDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDZixJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFBO0lBQzNCLENBQUM7SUFDUSxPQUFPO1FBQ2YsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2YsSUFBSSxDQUFDLFdBQVcsRUFBRSxPQUFPLEVBQUUsQ0FBQTtRQUMzQixJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQzFCLENBQUM7Q0FDRCxDQUFBO0FBdkJZLG9DQUFvQztJQU05QyxXQUFBLDJCQUEyQixDQUFBO0dBTmpCLG9DQUFvQyxDQXVCaEQifQ==