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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3Nlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci9icm93c2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBYyxVQUFVLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFDcEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTVDLE1BQU0sYUFBYTtJQUFuQjtRQUdDLGlCQUFpQjtRQUVBLDJCQUFzQixHQUFHLElBQUksR0FBRyxFQUFrQixDQUFBO1FBRWxELDBCQUFxQixHQUFHLElBQUksT0FBTyxFQUFVLENBQUE7UUFDckQseUJBQW9CLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQTtRQWVoRSxrQkFBa0I7UUFFRCw0QkFBdUIsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQTtRQVNwRSxpQkFBaUI7UUFFQSwyQkFBc0IsR0FBRyxJQUFJLE9BQU8sRUFBVSxDQUFBO1FBQ3RELDBCQUFxQixHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUE7UUFFakQsNEJBQXVCLEdBQUcsSUFBSSxHQUFHLEVBQW1CLENBQUE7SUFrQnRFLENBQUM7YUF4RGdCLGFBQVEsR0FBRyxJQUFJLGFBQWEsRUFBRSxBQUF0QixDQUFzQjtJQVM5QyxZQUFZLENBQUMsWUFBb0I7UUFDaEMsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDNUUsQ0FBQztJQUNELFlBQVksQ0FBQyxTQUFpQixFQUFFLFlBQW9CO1FBQ25ELElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNuRCxPQUFNO1FBQ1AsQ0FB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