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
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { autorunWithStore, observableFromEvent } from '../../../../base/common/observable.js';
import { IAccessibilitySignalService, AccessibilitySignal, } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IDebugService } from '../../debug/common/debug.js';
let AccessibilitySignalLineDebuggerContribution = class AccessibilitySignalLineDebuggerContribution extends Disposable {
    constructor(debugService, accessibilitySignalService) {
        super();
        this.accessibilitySignalService = accessibilitySignalService;
        const isEnabled = observableFromEvent(this, accessibilitySignalService.onSoundEnabledChanged(AccessibilitySignal.onDebugBreak), () => accessibilitySignalService.isSoundEnabled(AccessibilitySignal.onDebugBreak));
        this._register(autorunWithStore((reader, store) => {
            /** @description subscribe to debug sessions */
            if (!isEnabled.read(reader)) {
                return;
            }
            const sessionDisposables = new Map();
            store.add(toDisposable(() => {
                sessionDisposables.forEach((d) => d.dispose());
                sessionDisposables.clear();
            }));
            store.add(debugService.onDidNewSession((session) => sessionDisposables.set(session, this.handleSession(session))));
            store.add(debugService.onDidEndSession(({ session }) => {
                sessionDisposables.get(session)?.dispose();
                sessionDisposables.delete(session);
            }));
            debugService
                .getModel()
                .getSessions()
                .forEach((session) => sessionDisposables.set(session, this.handleSession(session)));
        }));
    }
    handleSession(session) {
        return session.onDidChangeState((e) => {
            const stoppedDetails = session.getStoppedDetails();
            const BREAKPOINT_STOP_REASON = 'breakpoint';
            if (stoppedDetails && stoppedDetails.reason === BREAKPOINT_STOP_REASON) {
                this.accessibilitySignalService.playSignal(AccessibilitySignal.onDebugBreak);
            }
        });
    }
};
AccessibilitySignalLineDebuggerContribution = __decorate([
    __param(0, IDebugService),
    __param(1, IAccessibilitySignalService)
], AccessibilitySignalLineDebuggerContribution);
export { AccessibilitySignalLineDebuggerContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJpbGl0eVNpZ25hbERlYnVnZ2VyQ29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWNjZXNzaWJpbGl0eVNpZ25hbHMvYnJvd3Nlci9hY2Nlc3NpYmlsaXR5U2lnbmFsRGVidWdnZXJDb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM1RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM3RixPQUFPLEVBQ04sMkJBQTJCLEVBQzNCLG1CQUFtQixHQUVuQixNQUFNLGdGQUFnRixDQUFBO0FBRXZGLE9BQU8sRUFBRSxhQUFhLEVBQWlCLE1BQU0sNkJBQTZCLENBQUE7QUFFbkUsSUFBTSwyQ0FBMkMsR0FBakQsTUFBTSwyQ0FDWixTQUFRLFVBQVU7SUFHbEIsWUFDZ0IsWUFBMkIsRUFFekIsMEJBQXNEO1FBRXZFLEtBQUssRUFBRSxDQUFBO1FBRlUsK0JBQTBCLEdBQTFCLDBCQUEwQixDQUE0QjtRQUl2RSxNQUFNLFNBQVMsR0FBRyxtQkFBbUIsQ0FDcEMsSUFBSSxFQUNKLDBCQUEwQixDQUFDLHFCQUFxQixDQUFDLG1CQUFtQixDQUFDLFlBQVksQ0FBQyxFQUNsRixHQUFHLEVBQUUsQ0FBQywwQkFBMEIsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsWUFBWSxDQUFDLENBQ2pGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLGdCQUFnQixDQUFDLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQ2xDLCtDQUErQztZQUMvQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUM3QixPQUFNO1lBQ1AsQ0FBQztZQUVELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxHQUFHLEVBQThCLENBQUE7WUFDaEUsS0FBSyxDQUFDLEdBQUcsQ0FDUixZQUFZLENBQUMsR0FBRyxFQUFFO2dCQUNqQixrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO2dCQUM5QyxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtZQUMzQixDQUFDLENBQUMsQ0FDRixDQUFBO1lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FDUixZQUFZLENBQUMsZUFBZSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FDeEMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQzVELENBQ0QsQ0FBQTtZQUVELEtBQUssQ0FBQyxHQUFHLENBQ1IsWUFBWSxDQUFDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRTtnQkFDNUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFBO2dCQUMxQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDbkMsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUVELFlBQVk7aUJBQ1YsUUFBUSxFQUFFO2lCQUNWLFdBQVcsRUFBRTtpQkFDYixPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDckYsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFTyxhQUFhLENBQUMsT0FBc0I7UUFDM0MsT0FBTyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNyQyxNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtZQUNsRCxNQUFNLHNCQUFzQixHQUFHLFlBQVksQ0FBQTtZQUMzQyxJQUFJLGNBQWMsSUFBSSxjQUFjLENBQUMsTUFBTSxLQUFLLHNCQUFzQixFQUFFLENBQUM7Z0JBQ3hFLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxVQUFVLENBQUMsbUJBQW1CLENBQUMsWUFBWSxDQUFDLENBQUE7WUFDN0UsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztDQUNELENBQUE7QUE3RFksMkNBQTJDO0lBS3JELFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSwyQkFBMkIsQ0FBQTtHQU5qQiwyQ0FBMkMsQ0E2RHZEIn0=