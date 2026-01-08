/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import electron from 'electron';
import { DEFAULT_AUX_WINDOW_SIZE, DEFAULT_WINDOW_SIZE, } from '../common/window.js';
export var LoadReason;
(function (LoadReason) {
    /**
     * The window is loaded for the first time.
     */
    LoadReason[LoadReason["INITIAL"] = 1] = "INITIAL";
    /**
     * The window is loaded into a different workspace context.
     */
    LoadReason[LoadReason["LOAD"] = 2] = "LOAD";
    /**
     * The window is reloaded.
     */
    LoadReason[LoadReason["RELOAD"] = 3] = "RELOAD";
})(LoadReason || (LoadReason = {}));
export var UnloadReason;
(function (UnloadReason) {
    /**
     * The window is closed.
     */
    UnloadReason[UnloadReason["CLOSE"] = 1] = "CLOSE";
    /**
     * All windows unload because the application quits.
     */
    UnloadReason[UnloadReason["QUIT"] = 2] = "QUIT";
    /**
     * The window is reloaded.
     */
    UnloadReason[UnloadReason["RELOAD"] = 3] = "RELOAD";
    /**
     * The window is loaded into a different workspace context.
     */
    UnloadReason[UnloadReason["LOAD"] = 4] = "LOAD";
})(UnloadReason || (UnloadReason = {}));
export const defaultWindowState = function (mode = 1 /* WindowMode.Normal */) {
    return {
        width: DEFAULT_WINDOW_SIZE.width,
        height: DEFAULT_WINDOW_SIZE.height,
        mode,
    };
};
export const defaultAuxWindowState = function () {
    // Auxiliary windows are being created from a `window.open` call
    // that sets `windowFeatures` that encode the desired size and
    // position of the new window (`top`, `left`).
    // In order to truly override this to a good default window state
    // we need to set not only width and height but also x and y to
    // a good location on the primary display.
    const width = DEFAULT_AUX_WINDOW_SIZE.width;
    const height = DEFAULT_AUX_WINDOW_SIZE.height;
    const workArea = electron.screen.getPrimaryDisplay().workArea;
    const x = Math.max(workArea.x + workArea.width / 2 - width / 2, 0);
    const y = Math.max(workArea.y + workArea.height / 2 - height / 2, 0);
    return {
        x,
        y,
        width,
        height,
        mode: 1 /* WindowMode.Normal */,
    };
};
export var WindowMode;
(function (WindowMode) {
    WindowMode[WindowMode["Maximized"] = 0] = "Maximized";
    WindowMode[WindowMode["Normal"] = 1] = "Normal";
    WindowMode[WindowMode["Minimized"] = 2] = "Minimized";
    WindowMode[WindowMode["Fullscreen"] = 3] = "Fullscreen";
})(WindowMode || (WindowMode = {}));
export var WindowError;
(function (WindowError) {
    /**
     * Maps to the `unresponsive` event on a `BrowserWindow`.
     */
    WindowError[WindowError["UNRESPONSIVE"] = 1] = "UNRESPONSIVE";
    /**
     * Maps to the `render-process-gone` event on a `WebContents`.
     */
    WindowError[WindowError["PROCESS_GONE"] = 2] = "PROCESS_GONE";
    /**
     * Maps to the `did-fail-load` event on a `WebContents`.
     */
    WindowError[WindowError["LOAD"] = 3] = "LOAD";
    /**
     * Maps to the `responsive` event on a `BrowserWindow`.
     */
    WindowError[WindowError["RESPONSIVE"] = 4] = "RESPONSIVE";
})(WindowError || (WindowError = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS93aW5kb3cvZWxlY3Ryb24tbWFpbi93aW5kb3cudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxRQUFRLE1BQU0sVUFBVSxDQUFBO0FBTy9CLE9BQU8sRUFDTix1QkFBdUIsRUFDdkIsbUJBQW1CLEdBRW5CLE1BQU0scUJBQXFCLENBQUE7QUFpRjVCLE1BQU0sQ0FBTixJQUFrQixVQWVqQjtBQWZELFdBQWtCLFVBQVU7SUFDM0I7O09BRUc7SUFDSCxpREFBVyxDQUFBO0lBRVg7O09BRUc7SUFDSCwyQ0FBSSxDQUFBO0lBRUo7O09BRUc7SUFDSCwrQ0FBTSxDQUFBO0FBQ1AsQ0FBQyxFQWZpQixVQUFVLEtBQVYsVUFBVSxRQWUzQjtBQUVELE1BQU0sQ0FBTixJQUFrQixZQW9CakI7QUFwQkQsV0FBa0IsWUFBWTtJQUM3Qjs7T0FFRztJQUNILGlEQUFTLENBQUE7SUFFVDs7T0FFRztJQUNILCtDQUFJLENBQUE7SUFFSjs7T0FFRztJQUNILG1EQUFNLENBQUE7SUFFTjs7T0FFRztJQUNILCtDQUFJLENBQUE7QUFDTCxDQUFDLEVBcEJpQixZQUFZLEtBQVosWUFBWSxRQW9CN0I7QUFZRCxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxVQUFVLElBQUksNEJBQW9CO0lBQ25FLE9BQU87UUFDTixLQUFLLEVBQUUsbUJBQW1CLENBQUMsS0FBSztRQUNoQyxNQUFNLEVBQUUsbUJBQW1CLENBQUMsTUFBTTtRQUNsQyxJQUFJO0tBQ0osQ0FBQTtBQUNGLENBQUMsQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHO0lBQ3BDLGdFQUFnRTtJQUNoRSw4REFBOEQ7SUFDOUQsOENBQThDO0lBQzlDLGlFQUFpRTtJQUNqRSwrREFBK0Q7SUFDL0QsMENBQTBDO0lBRTFDLE1BQU0sS0FBSyxHQUFHLHVCQUF1QixDQUFDLEtBQUssQ0FBQTtJQUMzQyxNQUFNLE1BQU0sR0FBRyx1QkFBdUIsQ0FBQyxNQUFNLENBQUE7SUFDN0MsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLFFBQVEsQ0FBQTtJQUM3RCxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLEtBQUssR0FBRyxDQUFDLEdBQUcsS0FBSyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNsRSxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEdBQUcsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUVwRSxPQUFPO1FBQ04sQ0FBQztRQUNELENBQUM7UUFDRCxLQUFLO1FBQ0wsTUFBTTtRQUNOLElBQUksMkJBQW1CO0tBQ3ZCLENBQUE7QUFDRixDQUFDLENBQUE7QUFFRCxNQUFNLENBQU4sSUFBa0IsVUFLakI7QUFMRCxXQUFrQixVQUFVO0lBQzNCLHFEQUFTLENBQUE7SUFDVCwrQ0FBTSxDQUFBO0lBQ04scURBQVMsQ0FBQTtJQUNULHVEQUFVLENBQUE7QUFDWCxDQUFDLEVBTGlCLFVBQVUsS0FBVixVQUFVLFFBSzNCO0FBT0QsTUFBTSxDQUFOLElBQWtCLFdBb0JqQjtBQXBCRCxXQUFrQixXQUFXO0lBQzVCOztPQUVHO0lBQ0gsNkRBQWdCLENBQUE7SUFFaEI7O09BRUc7SUFDSCw2REFBZ0IsQ0FBQTtJQUVoQjs7T0FFRztJQUNILDZDQUFRLENBQUE7SUFFUjs7T0FFRztJQUNILHlEQUFjLENBQUE7QUFDZixDQUFDLEVBcEJpQixXQUFXLEtBQVgsV0FBVyxRQW9CNUIifQ==