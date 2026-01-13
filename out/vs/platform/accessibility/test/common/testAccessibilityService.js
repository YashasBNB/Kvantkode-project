/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../base/common/event.js';
export class TestAccessibilityService {
    constructor() {
        this.onDidChangeScreenReaderOptimized = Event.None;
        this.onDidChangeReducedMotion = Event.None;
    }
    isScreenReaderOptimized() {
        return false;
    }
    isMotionReduced() {
        return false;
    }
    alwaysUnderlineAccessKeys() {
        return Promise.resolve(false);
    }
    setAccessibilitySupport(accessibilitySupport) { }
    getAccessibilitySupport() {
        return 0 /* AccessibilitySupport.Unknown */;
    }
    alert(message) { }
    status(message) { }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdEFjY2Vzc2liaWxpdHlTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9hY2Nlc3NpYmlsaXR5L3Rlc3QvY29tbW9uL3Rlc3RBY2Nlc3NpYmlsaXR5U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFHeEQsTUFBTSxPQUFPLHdCQUF3QjtJQUFyQztRQUdDLHFDQUFnQyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7UUFDN0MsNkJBQXdCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtJQWlCdEMsQ0FBQztJQWZBLHVCQUF1QjtRQUN0QixPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFDRCxlQUFlO1FBQ2QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBQ0QseUJBQXlCO1FBQ3hCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUM5QixDQUFDO0lBQ0QsdUJBQXVCLENBQUMsb0JBQTBDLElBQVMsQ0FBQztJQUM1RSx1QkFBdUI7UUFDdEIsNENBQW1DO0lBQ3BDLENBQUM7SUFDRCxLQUFLLENBQUMsT0FBZSxJQUFTLENBQUM7SUFDL0IsTUFBTSxDQUFDLE9BQWUsSUFBUyxDQUFDO0NBQ2hDIn0=