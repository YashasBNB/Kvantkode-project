/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { mainWindow } from './window.js';
import { Emitter } from '../common/event.js';
class WindowManager {
    constructor() {
        // --- Zoom Level
        this.mapWindowIdToZoomLevel = new Map();
        this._onDidChangeZoomLevel = new Emitter();
        this.onDidChangeZoomLevel = this._onDidChangeZoomLevel.event;
        // --- Zoom Factor
        this.mapWindowIdToZoomFactor = new Map();
        // --- Fullscreen
        this._onDidChangeFullscreen = new Emitter();
        this.onDidChangeFullscreen = this._onDidChangeFullscreen.event;
        this.mapWindowIdToFullScreen = new Map();
    }
    static { this.INSTANCE = new WindowManager(); }
    getZoomLevel(targetWindow) {
        return this.mapWindowIdToZoomLevel.get(this.getWindowId(targetWindow)) ?? 0;
    }
    setZoomLevel(zoomLevel, targetWindow) {
        if (this.getZoomLevel(targetWindow) === zoomLevel) {
            return;
        }
        const targetWindowId = this.getWindowId(targetWindow);
        this.mapWindowIdToZoomLevel.set(targetWindowId, zoomLevel);
        this._onDidChangeZoomLevel.fire(targetWindowId);
    }
    getZoomFactor(targetWindow) {
        return this.mapWindowIdToZoomFactor.get(this.getWindowId(targetWindow)) ?? 1;
    }
    setZoomFactor(zoomFactor, targetWindow) {
        this.mapWindowIdToZoomFactor.set(this.getWindowId(targetWindow), zoomFactor);
    }
    setFullscreen(fullscreen, targetWindow) {
        if (this.isFullscreen(targetWindow) === fullscreen) {
            return;
        }
        const windowId = this.getWindowId(targetWindow);
        this.mapWindowIdToFullScreen.set(windowId, fullscreen);
        this._onDidChangeFullscreen.fire(windowId);
    }
    isFullscreen(targetWindow) {
        return !!this.mapWindowIdToFullScreen.get(this.getWindowId(targetWindow));
    }
    getWindowId(targetWindow) {
        return targetWindow.vscodeWindowId;
    }
}
export function addMatchMediaChangeListener(targetWindow, query, callback) {
    if (typeof query === 'string') {
        query = targetWindow.matchMedia(query);
    }
    query.addEventListener('change', callback);
}
/** A zoom index, e.g. 1, 2, 3 */
export function setZoomLevel(zoomLevel, targetWindow) {
    WindowManager.INSTANCE.setZoomLevel(zoomLevel, targetWindow);
}
export function getZoomLevel(targetWindow) {
    return WindowManager.INSTANCE.getZoomLevel(targetWindow);
}
export const onDidChangeZoomLevel = WindowManager.INSTANCE.onDidChangeZoomLevel;
/** The zoom scale for an index, e.g. 1, 1.2, 1.4 */
export function getZoomFactor(targetWindow) {
    return WindowManager.INSTANCE.getZoomFactor(targetWindow);
}
export function setZoomFactor(zoomFactor, targetWindow) {
    WindowManager.INSTANCE.setZoomFactor(zoomFactor, targetWindow);
}
export function setFullscreen(fullscreen, targetWindow) {
    WindowManager.INSTANCE.setFullscreen(fullscreen, targetWindow);
}
export function isFullscreen(targetWindow) {
    return WindowManager.INSTANCE.isFullscreen(targetWindow);
}
export const onDidChangeFullscreen = WindowManager.INSTANCE.onDidChangeFullscreen;
const userAgent = navigator.userAgent;
export const isFirefox = userAgent.indexOf('Firefox') >= 0;
export const isWebKit = userAgent.indexOf('AppleWebKit') >= 0;
export const isChrome = userAgent.indexOf('Chrome') >= 0;
export const isSafari = !isChrome && userAgent.indexOf('Safari') >= 0;
export const isWebkitWebView = !isChrome && !isSafari && isWebKit;
export const isElectron = userAgent.indexOf('Electron/') >= 0;
export const isAndroid = userAgent.indexOf('Android') >= 0;
let standalone = false;
if (typeof mainWindow.matchMedia === 'function') {
    const standaloneMatchMedia = mainWindow.matchMedia('(display-mode: standalone) or (display-mode: window-controls-overlay)');
    const fullScreenMatchMedia = mainWindow.matchMedia('(display-mode: fullscreen)');
    standalone = standaloneMatchMedia.matches;
    addMatchMediaChangeListener(mainWindow, standaloneMatchMedia, ({ matches }) => {
        // entering fullscreen would change standaloneMatchMedia.matches to false
        // if standalone is true (running as PWA) and entering fullscreen, skip this change
        if (standalone && fullScreenMatchMedia.matches) {
            return;
        }
        // otherwise update standalone (browser to PWA or PWA to browser)
        standalone = matches;
    });
}
export function isStandalone() {
    return standalone;
}
// Visible means that the feature is enabled, not necessarily being rendered
// e.g. visible is true even in fullscreen mode where the controls are hidden
// See docs at https://developer.mozilla.org/en-US/docs/Web/API/WindowControlsOverlay/visible
export function isWCOEnabled() {
    return navigator?.windowControlsOverlay?.visible;
}
// Returns the bounding rect of the titlebar area if it is supported and defined
// See docs at https://developer.mozilla.org/en-US/docs/Web/API/WindowControlsOverlay/getTitlebarAreaRect
export function getWCOTitlebarAreaRect(targetWindow) {
    return targetWindow.navigator?.windowControlsOverlay?.getTitlebarAreaRect();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3Nlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL2Jyb3dzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFjLFVBQVUsRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFNUMsTUFBTSxhQUFhO0lBQW5CO1FBR0MsaUJBQWlCO1FBRUEsMkJBQXNCLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUE7UUFFbEQsMEJBQXFCLEdBQUcsSUFBSSxPQUFPLEVBQVUsQ0FBQTtRQUNyRCx5QkFBb0IsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFBO1FBZWhFLGtCQUFrQjtRQUVELDRCQUF1QixHQUFHLElBQUksR0FBRyxFQUFrQixDQUFBO1FBU3BFLGlCQUFpQjtRQUVBLDJCQUFzQixHQUFHLElBQUksT0FBTyxFQUFVLENBQUE7UUFDdEQsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQTtRQUVqRCw0QkFBdUIsR0FBRyxJQUFJLEdBQUcsRUFBbUIsQ0FBQTtJQWtCdEUsQ0FBQzthQXhEZ0IsYUFBUSxHQUFHLElBQUksYUFBYSxFQUFFLEFBQXRCLENBQXNCO0lBUzlDLFlBQVksQ0FBQyxZQUFvQjtRQUNoQyxPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUM1RSxDQUFDO0lBQ0QsWUFBWSxDQUFDLFNBQWlCLEVBQUUsWUFBb0I7UUFDbkQsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ25ELE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUNyRCxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUMxRCxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFBO0lBQ2hELENBQUM7SUFNRCxhQUFhLENBQUMsWUFBb0I7UUFDakMsT0FBTyxJQUFJLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDN0UsQ0FBQztJQUNELGFBQWEsQ0FBQyxVQUFrQixFQUFFLFlBQW9CO1FBQ3JELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQTtJQUM3RSxDQUFDO0lBU0QsYUFBYSxDQUFDLFVBQW1CLEVBQUUsWUFBb0I7UUFDdEQsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQ3BELE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUMvQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUN0RCxJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFDRCxZQUFZLENBQUMsWUFBb0I7UUFDaEMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUE7SUFDMUUsQ0FBQztJQUVPLFdBQVcsQ0FBQyxZQUFvQjtRQUN2QyxPQUFRLFlBQTJCLENBQUMsY0FBYyxDQUFBO0lBQ25ELENBQUM7O0FBR0YsTUFBTSxVQUFVLDJCQUEyQixDQUMxQyxZQUFvQixFQUNwQixLQUE4QixFQUM5QixRQUFvRTtJQUVwRSxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQy9CLEtBQUssR0FBRyxZQUFZLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3ZDLENBQUM7SUFDRCxLQUFLLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0FBQzNDLENBQUM7QUFFRCxpQ0FBaUM7QUFDakMsTUFBTSxVQUFVLFlBQVksQ0FBQyxTQUFpQixFQUFFLFlBQW9CO0lBQ25FLGFBQWEsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUMsQ0FBQTtBQUM3RCxDQUFDO0FBQ0QsTUFBTSxVQUFVLFlBQVksQ0FBQyxZQUFvQjtJQUNoRCxPQUFPLGFBQWEsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFBO0FBQ3pELENBQUM7QUFDRCxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxhQUFhLENBQUMsUUFBUSxDQUFDLG9CQUFvQixDQUFBO0FBRS9FLG9EQUFvRDtBQUNwRCxNQUFNLFVBQVUsYUFBYSxDQUFDLFlBQW9CO0lBQ2pELE9BQU8sYUFBYSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLENBQUE7QUFDMUQsQ0FBQztBQUNELE1BQU0sVUFBVSxhQUFhLENBQUMsVUFBa0IsRUFBRSxZQUFvQjtJQUNyRSxhQUFhLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxVQUFVLEVBQUUsWUFBWSxDQUFDLENBQUE7QUFDL0QsQ0FBQztBQUVELE1BQU0sVUFBVSxhQUFhLENBQUMsVUFBbUIsRUFBRSxZQUFvQjtJQUN0RSxhQUFhLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxVQUFVLEVBQUUsWUFBWSxDQUFDLENBQUE7QUFDL0QsQ0FBQztBQUNELE1BQU0sVUFBVSxZQUFZLENBQUMsWUFBb0I7SUFDaEQsT0FBTyxhQUFhLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsQ0FBQTtBQUN6RCxDQUFDO0FBQ0QsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsYUFBYSxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQTtBQUVqRixNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFBO0FBRXJDLE1BQU0sQ0FBQyxNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtBQUMxRCxNQUFNLENBQUMsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUE7QUFDN0QsTUFBTSxDQUFDLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO0FBQ3hELE1BQU0sQ0FBQyxNQUFNLFFBQVEsR0FBRyxDQUFDLFFBQVEsSUFBSSxTQUFTLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtBQUNyRSxNQUFNLENBQUMsTUFBTSxlQUFlLEdBQUcsQ0FBQyxRQUFRLElBQUksQ0FBQyxRQUFRLElBQUksUUFBUSxDQUFBO0FBQ2pFLE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtBQUM3RCxNQUFNLENBQUMsTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUE7QUFFMUQsSUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFBO0FBQ3RCLElBQUksT0FBTyxVQUFVLENBQUMsVUFBVSxLQUFLLFVBQVUsRUFBRSxDQUFDO0lBQ2pELE1BQU0sb0JBQW9CLEdBQUcsVUFBVSxDQUFDLFVBQVUsQ0FDakQsdUVBQXVFLENBQ3ZFLENBQUE7SUFDRCxNQUFNLG9CQUFvQixHQUFHLFVBQVUsQ0FBQyxVQUFVLENBQUMsNEJBQTRCLENBQUMsQ0FBQTtJQUNoRixVQUFVLEdBQUcsb0JBQW9CLENBQUMsT0FBTyxDQUFBO0lBQ3pDLDJCQUEyQixDQUFDLFVBQVUsRUFBRSxvQkFBb0IsRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRTtRQUM3RSx5RUFBeUU7UUFDekUsbUZBQW1GO1FBQ25GLElBQUksVUFBVSxJQUFJLG9CQUFvQixDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2hELE9BQU07UUFDUCxDQUFDO1FBQ0QsaUVBQWlFO1FBQ2pFLFVBQVUsR0FBRyxPQUFPLENBQUE7SUFDckIsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDO0FBQ0QsTUFBTSxVQUFVLFlBQVk7SUFDM0IsT0FBTyxVQUFVLENBQUE7QUFDbEIsQ0FBQztBQUVELDRFQUE0RTtBQUM1RSw2RUFBNkU7QUFDN0UsNkZBQTZGO0FBQzdGLE1BQU0sVUFBVSxZQUFZO0lBQzNCLE9BQVEsU0FBaUIsRUFBRSxxQkFBcUIsRUFBRSxPQUFPLENBQUE7QUFDMUQsQ0FBQztBQUVELGdGQUFnRjtBQUNoRix5R0FBeUc7QUFDekcsTUFBTSxVQUFVLHNCQUFzQixDQUFDLFlBQW9CO0lBQzFELE9BQVEsWUFBWSxDQUFDLFNBQWlCLEVBQUUscUJBQXFCLEVBQUUsbUJBQW1CLEVBQUUsQ0FBQTtBQUNyRixDQUFDIn0=