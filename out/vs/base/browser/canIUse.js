/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as browser from './browser.js';
import { mainWindow } from './window.js';
import * as platform from '../common/platform.js';
export var KeyboardSupport;
(function (KeyboardSupport) {
    KeyboardSupport[KeyboardSupport["Always"] = 0] = "Always";
    KeyboardSupport[KeyboardSupport["FullScreen"] = 1] = "FullScreen";
    KeyboardSupport[KeyboardSupport["None"] = 2] = "None";
})(KeyboardSupport || (KeyboardSupport = {}));
/**
 * Browser feature we can support in current platform, browser and environment.
 */
export const BrowserFeatures = {
    clipboard: {
        writeText: platform.isNative ||
            (document.queryCommandSupported && document.queryCommandSupported('copy')) ||
            !!(navigator && navigator.clipboard && navigator.clipboard.writeText),
        readText: platform.isNative || !!(navigator && navigator.clipboard && navigator.clipboard.readText),
    },
    keyboard: (() => {
        if (platform.isNative || browser.isStandalone()) {
            return 0 /* KeyboardSupport.Always */;
        }
        if (navigator.keyboard || browser.isSafari) {
            return 1 /* KeyboardSupport.FullScreen */;
        }
        return 2 /* KeyboardSupport.None */;
    })(),
    // 'ontouchstart' in window always evaluates to true with typescript's modern typings. This causes `window` to be
    // `never` later in `window.navigator`. That's why we need the explicit `window as Window` cast
    touch: 'ontouchstart' in mainWindow || navigator.maxTouchPoints > 0,
    pointerEvents: mainWindow.PointerEvent && ('ontouchstart' in mainWindow || navigator.maxTouchPoints > 0),
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FuSVVzZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci9jYW5JVXNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxPQUFPLE1BQU0sY0FBYyxDQUFBO0FBQ3ZDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFDeEMsT0FBTyxLQUFLLFFBQVEsTUFBTSx1QkFBdUIsQ0FBQTtBQUVqRCxNQUFNLENBQU4sSUFBa0IsZUFJakI7QUFKRCxXQUFrQixlQUFlO0lBQ2hDLHlEQUFNLENBQUE7SUFDTixpRUFBVSxDQUFBO0lBQ1YscURBQUksQ0FBQTtBQUNMLENBQUMsRUFKaUIsZUFBZSxLQUFmLGVBQWUsUUFJaEM7QUFFRDs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRztJQUM5QixTQUFTLEVBQUU7UUFDVixTQUFTLEVBQ1IsUUFBUSxDQUFDLFFBQVE7WUFDakIsQ0FBQyxRQUFRLENBQUMscUJBQXFCLElBQUksUUFBUSxDQUFDLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsSUFBSSxTQUFTLENBQUMsU0FBUyxJQUFJLFNBQVMsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDO1FBQ3RFLFFBQVEsRUFDUCxRQUFRLENBQUMsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsSUFBSSxTQUFTLENBQUMsU0FBUyxJQUFJLFNBQVMsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDO0tBQzFGO0lBQ0QsUUFBUSxFQUFFLENBQUMsR0FBRyxFQUFFO1FBQ2YsSUFBSSxRQUFRLENBQUMsUUFBUSxJQUFJLE9BQU8sQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDO1lBQ2pELHNDQUE2QjtRQUM5QixDQUFDO1FBRUQsSUFBVSxTQUFVLENBQUMsUUFBUSxJQUFJLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNuRCwwQ0FBaUM7UUFDbEMsQ0FBQztRQUVELG9DQUEyQjtJQUM1QixDQUFDLENBQUMsRUFBRTtJQUVKLGlIQUFpSDtJQUNqSCwrRkFBK0Y7SUFDL0YsS0FBSyxFQUFFLGNBQWMsSUFBSSxVQUFVLElBQUksU0FBUyxDQUFDLGNBQWMsR0FBRyxDQUFDO0lBQ25FLGFBQWEsRUFDWixVQUFVLENBQUMsWUFBWSxJQUFJLENBQUMsY0FBYyxJQUFJLFVBQVUsSUFBSSxTQUFTLENBQUMsY0FBYyxHQUFHLENBQUMsQ0FBQztDQUMxRixDQUFBIn0=