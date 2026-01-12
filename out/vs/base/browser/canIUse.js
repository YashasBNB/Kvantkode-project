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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FuSVVzZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL2NhbklVc2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE9BQU8sTUFBTSxjQUFjLENBQUE7QUFDdkMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUN4QyxPQUFPLEtBQUssUUFBUSxNQUFNLHVCQUF1QixDQUFBO0FBRWpELE1BQU0sQ0FBTixJQUFrQixlQUlqQjtBQUpELFdBQWtCLGVBQWU7SUFDaEMseURBQU0sQ0FBQTtJQUNOLGlFQUFVLENBQUE7SUFDVixxREFBSSxDQUFBO0FBQ0wsQ0FBQyxFQUppQixlQUFlLEtBQWYsZUFBZSxRQUloQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFHO0lBQzlCLFNBQVMsRUFBRTtRQUNWLFNBQVMsRUFDUixRQUFRLENBQUMsUUFBUTtZQUNqQixDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsSUFBSSxRQUFRLENBQUMscUJBQXFCLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDMUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxJQUFJLFNBQVMsQ0FBQyxTQUFTLElBQUksU0FBUyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUM7UUFDdEUsUUFBUSxFQUNQLFFBQVEsQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxJQUFJLFNBQVMsQ0FBQyxTQUFTLElBQUksU0FBUyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUM7S0FDMUY7SUFDRCxRQUFRLEVBQUUsQ0FBQyxHQUFHLEVBQUU7UUFDZixJQUFJLFFBQVEsQ0FBQyxRQUFRLElBQUksT0FBTyxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUM7WUFDakQsc0NBQTZCO1FBQzlCLENBQUM7UUFFRCxJQUFVLFNBQVUsQ0FBQyxRQUFRLElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ25ELDBDQUFpQztRQUNsQyxDQUFDO1FBRUQsb0NBQTJCO0lBQzVCLENBQUMsQ0FBQyxFQUFFO0lBRUosaUhBQWlIO0lBQ2pILCtGQUErRjtJQUMvRixLQUFLLEVBQUUsY0FBYyxJQUFJLFVBQVUsSUFBSSxTQUFTLENBQUMsY0FBYyxHQUFHLENBQUM7SUFDbkUsYUFBYSxFQUNaLFVBQVUsQ0FBQyxZQUFZLElBQUksQ0FBQyxjQUFjLElBQUksVUFBVSxJQUFJLFNBQVMsQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFDO0NBQzFGLENBQUEifQ==