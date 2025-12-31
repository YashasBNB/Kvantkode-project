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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vd2luZG93L2VsZWN0cm9uLW1haW4vd2luZG93LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sUUFBUSxNQUFNLFVBQVUsQ0FBQTtBQU8vQixPQUFPLEVBQ04sdUJBQXVCLEVBQ3ZCLG1CQUFtQixHQUVuQixNQUFNLHFCQUFxQixDQUFBO0FBaUY1QixNQUFNLENBQU4sSUFBa0IsVUFlakI7QUFmRCxXQUFrQixVQUFVO0lBQzNCOztPQUVHO0lBQ0gsaURBQVcsQ0FBQTtJQUVYOztPQUVHO0lBQ0gsMkNBQUksQ0FBQTtJQUVKOztPQUVHO0lBQ0gsK0NBQU0sQ0FBQTtBQUNQLENBQUMsRUFmaUIsVUFBVSxLQUFWLFVBQVUsUUFlM0I7QUFFRCxNQUFNLENBQU4sSUFBa0IsWUFvQmpCO0FBcEJELFdBQWtCLFlBQVk7SUFDN0I7O09BRUc7SUFDSCxpREFBUyxDQUFBO0lBRVQ7O09BRUc7SUFDSCwrQ0FBSSxDQUFBO0lBRUo7O09BRUc7SUFDSCxtREFBTSxDQUFBO0lBRU47O09BRUc7SUFDSCwrQ0FBSSxDQUFBO0FBQ0wsQ0FBQyxFQXBCaUIsWUFBWSxLQUFaLFlBQVksUUFvQjdCO0FBWUQsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsVUFBVSxJQUFJLDRCQUFvQjtJQUNuRSxPQUFPO1FBQ04sS0FBSyxFQUFFLG1CQUFtQixDQUFDLEtBQUs7UUFDaEMsTUFBTSxFQUFFLG1CQUFtQixDQUFDLE1BQU07UUFDbEMsSUFBSTtLQUNKLENBQUE7QUFDRixDQUFDLENBQUE7QUFFRCxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRztJQUNwQyxnRUFBZ0U7SUFDaEUsOERBQThEO0lBQzlELDhDQUE4QztJQUM5QyxpRUFBaUU7SUFDakUsK0RBQStEO0lBQy9ELDBDQUEwQztJQUUxQyxNQUFNLEtBQUssR0FBRyx1QkFBdUIsQ0FBQyxLQUFLLENBQUE7SUFDM0MsTUFBTSxNQUFNLEdBQUcsdUJBQXVCLENBQUMsTUFBTSxDQUFBO0lBQzdDLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxRQUFRLENBQUE7SUFDN0QsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxHQUFHLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDbEUsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFFcEUsT0FBTztRQUNOLENBQUM7UUFDRCxDQUFDO1FBQ0QsS0FBSztRQUNMLE1BQU07UUFDTixJQUFJLDJCQUFtQjtLQUN2QixDQUFBO0FBQ0YsQ0FBQyxDQUFBO0FBRUQsTUFBTSxDQUFOLElBQWtCLFVBS2pCO0FBTEQsV0FBa0IsVUFBVTtJQUMzQixxREFBUyxDQUFBO0lBQ1QsK0NBQU0sQ0FBQTtJQUNOLHFEQUFTLENBQUE7SUFDVCx1REFBVSxDQUFBO0FBQ1gsQ0FBQyxFQUxpQixVQUFVLEtBQVYsVUFBVSxRQUszQjtBQU9ELE1BQU0sQ0FBTixJQUFrQixXQW9CakI7QUFwQkQsV0FBa0IsV0FBVztJQUM1Qjs7T0FFRztJQUNILDZEQUFnQixDQUFBO0lBRWhCOztPQUVHO0lBQ0gsNkRBQWdCLENBQUE7SUFFaEI7O09BRUc7SUFDSCw2Q0FBUSxDQUFBO0lBRVI7O09BRUc7SUFDSCx5REFBYyxDQUFBO0FBQ2YsQ0FBQyxFQXBCaUIsV0FBVyxLQUFYLFdBQVcsUUFvQjVCIn0=