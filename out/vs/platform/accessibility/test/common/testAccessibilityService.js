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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdEFjY2Vzc2liaWxpdHlTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vYWNjZXNzaWJpbGl0eS90ZXN0L2NvbW1vbi90ZXN0QWNjZXNzaWJpbGl0eVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBR3hELE1BQU0sT0FBTyx3QkFBd0I7SUFBckM7UUFHQyxxQ0FBZ0MsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1FBQzdDLDZCQUF3QixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7SUFpQnRDLENBQUM7SUFmQSx1QkFBdUI7UUFDdEIsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBQ0QsZUFBZTtRQUNkLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUNELHlCQUF5QjtRQUN4QixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDOUIsQ0FBQztJQUNELHVCQUF1QixDQUFDLG9CQUEwQyxJQUFTLENBQUM7SUFDNUUsdUJBQXVCO1FBQ3RCLDRDQUFtQztJQUNwQyxDQUFDO0lBQ0QsS0FBSyxDQUFDLE9BQWUsSUFBUyxDQUFDO0lBQy9CLE1BQU0sQ0FBQyxPQUFlLElBQVMsQ0FBQztDQUNoQyJ9