/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getZoomLevel, setZoomFactor, setZoomLevel } from '../../../base/browser/browser.js';
import { getActiveWindow, getWindows } from '../../../base/browser/dom.js';
import { mainWindow } from '../../../base/browser/window.js';
import { ipcRenderer, webFrame, } from '../../../base/parts/sandbox/electron-sandbox/globals.js';
import { zoomLevelToZoomFactor } from '../common/window.js';
export var ApplyZoomTarget;
(function (ApplyZoomTarget) {
    ApplyZoomTarget[ApplyZoomTarget["ACTIVE_WINDOW"] = 1] = "ACTIVE_WINDOW";
    ApplyZoomTarget[ApplyZoomTarget["ALL_WINDOWS"] = 2] = "ALL_WINDOWS";
})(ApplyZoomTarget || (ApplyZoomTarget = {}));
export const MAX_ZOOM_LEVEL = 8;
export const MIN_ZOOM_LEVEL = -8;
/**
 * Apply a zoom level to the window. Also sets it in our in-memory
 * browser helper so that it can be accessed in non-electron layers.
 */
export function applyZoom(zoomLevel, target) {
    zoomLevel = Math.min(Math.max(zoomLevel, MIN_ZOOM_LEVEL), MAX_ZOOM_LEVEL); // cap zoom levels between -8 and 8
    const targetWindows = [];
    if (target === ApplyZoomTarget.ACTIVE_WINDOW) {
        targetWindows.push(getActiveWindow());
    }
    else if (target === ApplyZoomTarget.ALL_WINDOWS) {
        targetWindows.push(...Array.from(getWindows()).map(({ window }) => window));
    }
    else {
        targetWindows.push(target);
    }
    for (const targetWindow of targetWindows) {
        getGlobals(targetWindow)?.webFrame?.setZoomLevel(zoomLevel);
        setZoomFactor(zoomLevelToZoomFactor(zoomLevel), targetWindow);
        setZoomLevel(zoomLevel, targetWindow);
    }
}
function getGlobals(win) {
    if (win === mainWindow) {
        // main window
        return { ipcRenderer, webFrame };
    }
    else {
        // auxiliary window
        const auxiliaryWindow = win;
        if (auxiliaryWindow?.vscode?.ipcRenderer && auxiliaryWindow?.vscode?.webFrame) {
            return auxiliaryWindow.vscode;
        }
    }
    return undefined;
}
export function zoomIn(target) {
    applyZoom(getZoomLevel(typeof target === 'number' ? getActiveWindow() : target) + 1, target);
}
export function zoomOut(target) {
    applyZoom(getZoomLevel(typeof target === 'number' ? getActiveWindow() : target) - 1, target);
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS93aW5kb3cvZWxlY3Ryb24tc2FuZGJveC93aW5kb3cudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDNUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxVQUFVLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFNUQsT0FBTyxFQUVOLFdBQVcsRUFDWCxRQUFRLEdBQ1IsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUUzRCxNQUFNLENBQU4sSUFBWSxlQUdYO0FBSEQsV0FBWSxlQUFlO0lBQzFCLHVFQUFpQixDQUFBO0lBQ2pCLG1FQUFXLENBQUE7QUFDWixDQUFDLEVBSFcsZUFBZSxLQUFmLGVBQWUsUUFHMUI7QUFFRCxNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsQ0FBQyxDQUFBO0FBQy9CLE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyxDQUFDLENBQUMsQ0FBQTtBQUVoQzs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsU0FBUyxDQUFDLFNBQWlCLEVBQUUsTUFBZ0M7SUFDNUUsU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLEVBQUUsY0FBYyxDQUFDLENBQUEsQ0FBQyxtQ0FBbUM7SUFFN0csTUFBTSxhQUFhLEdBQWEsRUFBRSxDQUFBO0lBQ2xDLElBQUksTUFBTSxLQUFLLGVBQWUsQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUM5QyxhQUFhLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUE7SUFDdEMsQ0FBQztTQUFNLElBQUksTUFBTSxLQUFLLGVBQWUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNuRCxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7SUFDNUUsQ0FBQztTQUFNLENBQUM7UUFDUCxhQUFhLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQzNCLENBQUM7SUFFRCxLQUFLLE1BQU0sWUFBWSxJQUFJLGFBQWEsRUFBRSxDQUFDO1FBQzFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsRUFBRSxRQUFRLEVBQUUsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzNELGFBQWEsQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQTtRQUM3RCxZQUFZLENBQUMsU0FBUyxFQUFFLFlBQVksQ0FBQyxDQUFBO0lBQ3RDLENBQUM7QUFDRixDQUFDO0FBRUQsU0FBUyxVQUFVLENBQUMsR0FBVztJQUM5QixJQUFJLEdBQUcsS0FBSyxVQUFVLEVBQUUsQ0FBQztRQUN4QixjQUFjO1FBQ2QsT0FBTyxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsQ0FBQTtJQUNqQyxDQUFDO1NBQU0sQ0FBQztRQUNQLG1CQUFtQjtRQUNuQixNQUFNLGVBQWUsR0FBRyxHQUE2QyxDQUFBO1FBQ3JFLElBQUksZUFBZSxFQUFFLE1BQU0sRUFBRSxXQUFXLElBQUksZUFBZSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsQ0FBQztZQUMvRSxPQUFPLGVBQWUsQ0FBQyxNQUFNLENBQUE7UUFDOUIsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLFNBQVMsQ0FBQTtBQUNqQixDQUFDO0FBRUQsTUFBTSxVQUFVLE1BQU0sQ0FBQyxNQUFnQztJQUN0RCxTQUFTLENBQUMsWUFBWSxDQUFDLE9BQU8sTUFBTSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtBQUM3RixDQUFDO0FBRUQsTUFBTSxVQUFVLE9BQU8sQ0FBQyxNQUFnQztJQUN2RCxTQUFTLENBQUMsWUFBWSxDQUFDLE9BQU8sTUFBTSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtBQUM3RixDQUFDO0FBMEJELFlBQVkifQ==