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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vd2luZG93L2VsZWN0cm9uLXNhbmRib3gvd2luZG93LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzVGLE9BQU8sRUFBRSxlQUFlLEVBQUUsVUFBVSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDMUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRTVELE9BQU8sRUFFTixXQUFXLEVBQ1gsUUFBUSxHQUNSLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFFM0QsTUFBTSxDQUFOLElBQVksZUFHWDtBQUhELFdBQVksZUFBZTtJQUMxQix1RUFBaUIsQ0FBQTtJQUNqQixtRUFBVyxDQUFBO0FBQ1osQ0FBQyxFQUhXLGVBQWUsS0FBZixlQUFlLFFBRzFCO0FBRUQsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLENBQUMsQ0FBQTtBQUMvQixNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsQ0FBQyxDQUFDLENBQUE7QUFFaEM7OztHQUdHO0FBQ0gsTUFBTSxVQUFVLFNBQVMsQ0FBQyxTQUFpQixFQUFFLE1BQWdDO0lBQzVFLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxDQUFBLENBQUMsbUNBQW1DO0lBRTdHLE1BQU0sYUFBYSxHQUFhLEVBQUUsQ0FBQTtJQUNsQyxJQUFJLE1BQU0sS0FBSyxlQUFlLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDOUMsYUFBYSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFBO0lBQ3RDLENBQUM7U0FBTSxJQUFJLE1BQU0sS0FBSyxlQUFlLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDbkQsYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO0lBQzVFLENBQUM7U0FBTSxDQUFDO1FBQ1AsYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUMzQixDQUFDO0lBRUQsS0FBSyxNQUFNLFlBQVksSUFBSSxhQUFhLEVBQUUsQ0FBQztRQUMxQyxVQUFVLENBQUMsWUFBWSxDQUFDLEVBQUUsUUFBUSxFQUFFLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUMzRCxhQUFhLENBQUMscUJBQXFCLENBQUMsU0FBUyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFDN0QsWUFBWSxDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUMsQ0FBQTtJQUN0QyxDQUFDO0FBQ0YsQ0FBQztBQUVELFNBQVMsVUFBVSxDQUFDLEdBQVc7SUFDOUIsSUFBSSxHQUFHLEtBQUssVUFBVSxFQUFFLENBQUM7UUFDeEIsY0FBYztRQUNkLE9BQU8sRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLENBQUE7SUFDakMsQ0FBQztTQUFNLENBQUM7UUFDUCxtQkFBbUI7UUFDbkIsTUFBTSxlQUFlLEdBQUcsR0FBNkMsQ0FBQTtRQUNyRSxJQUFJLGVBQWUsRUFBRSxNQUFNLEVBQUUsV0FBVyxJQUFJLGVBQWUsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLENBQUM7WUFDL0UsT0FBTyxlQUFlLENBQUMsTUFBTSxDQUFBO1FBQzlCLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxTQUFTLENBQUE7QUFDakIsQ0FBQztBQUVELE1BQU0sVUFBVSxNQUFNLENBQUMsTUFBZ0M7SUFDdEQsU0FBUyxDQUFDLFlBQVksQ0FBQyxPQUFPLE1BQU0sS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7QUFDN0YsQ0FBQztBQUVELE1BQU0sVUFBVSxPQUFPLENBQUMsTUFBZ0M7SUFDdkQsU0FBUyxDQUFDLFlBQVksQ0FBQyxPQUFPLE1BQU0sS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7QUFDN0YsQ0FBQztBQTBCRCxZQUFZIn0=