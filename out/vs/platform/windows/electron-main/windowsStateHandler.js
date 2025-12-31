/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var WindowsStateHandler_1;
import electron from 'electron';
import { Disposable } from '../../../base/common/lifecycle.js';
import { isMacintosh } from '../../../base/common/platform.js';
import { extUriBiasedIgnorePathCase } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { ILifecycleMainService } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { IStateService } from '../../state/node/state.js';
import { IWindowsMainService } from './windows.js';
import { defaultWindowState, } from '../../window/electron-main/window.js';
import { isSingleFolderWorkspaceIdentifier, isWorkspaceIdentifier, } from '../../workspace/common/workspace.js';
let WindowsStateHandler = class WindowsStateHandler extends Disposable {
    static { WindowsStateHandler_1 = this; }
    static { this.windowsStateStorageKey = 'windowsState'; }
    get state() {
        return this._state;
    }
    constructor(windowsMainService, stateService, lifecycleMainService, logService, configurationService) {
        super();
        this.windowsMainService = windowsMainService;
        this.stateService = stateService;
        this.lifecycleMainService = lifecycleMainService;
        this.logService = logService;
        this.configurationService = configurationService;
        this.lastClosedState = undefined;
        this.shuttingDown = false;
        this._state = restoreWindowsState(this.stateService.getItem(WindowsStateHandler_1.windowsStateStorageKey));
        this.registerListeners();
    }
    registerListeners() {
        // When a window looses focus, save all windows state. This allows to
        // prevent loss of window-state data when OS is restarted without properly
        // shutting down the application (https://github.com/microsoft/vscode/issues/87171)
        electron.app.on('browser-window-blur', () => {
            if (!this.shuttingDown) {
                this.saveWindowsState();
            }
        });
        // Handle various lifecycle events around windows
        this._register(this.lifecycleMainService.onBeforeCloseWindow((window) => this.onBeforeCloseWindow(window)));
        this._register(this.lifecycleMainService.onBeforeShutdown(() => this.onBeforeShutdown()));
        this._register(this.windowsMainService.onDidChangeWindowsCount((e) => {
            if (e.newCount - e.oldCount > 0) {
                // clear last closed window state when a new window opens. this helps on macOS where
                // otherwise closing the last window, opening a new window and then quitting would
                // use the state of the previously closed window when restarting.
                this.lastClosedState = undefined;
            }
        }));
        // try to save state before destroy because close will not fire
        this._register(this.windowsMainService.onDidDestroyWindow((window) => this.onBeforeCloseWindow(window)));
    }
    // Note that onBeforeShutdown() and onBeforeCloseWindow() are fired in different order depending on the OS:
    // - macOS: since the app will not quit when closing the last window, you will always first get
    //          the onBeforeShutdown() event followed by N onBeforeCloseWindow() events for each window
    // - other: on other OS, closing the last window will quit the app so the order depends on the
    //          user interaction: closing the last window will first trigger onBeforeCloseWindow()
    //          and then onBeforeShutdown(). Using the quit action however will first issue onBeforeShutdown()
    //          and then onBeforeCloseWindow().
    //
    // Here is the behavior on different OS depending on action taken (Electron 1.7.x):
    //
    // Legend
    // -  quit(N): quit application with N windows opened
    // - close(1): close one window via the window close button
    // - closeAll: close all windows via the taskbar command
    // - onBeforeShutdown(N): number of windows reported in this event handler
    // - onBeforeCloseWindow(N, M): number of windows reported and quitRequested boolean in this event handler
    //
    // macOS
    // 	-     quit(1): onBeforeShutdown(1), onBeforeCloseWindow(1, true)
    // 	-     quit(2): onBeforeShutdown(2), onBeforeCloseWindow(2, true), onBeforeCloseWindow(2, true)
    // 	-     quit(0): onBeforeShutdown(0)
    // 	-    close(1): onBeforeCloseWindow(1, false)
    //
    // Windows
    // 	-     quit(1): onBeforeShutdown(1), onBeforeCloseWindow(1, true)
    // 	-     quit(2): onBeforeShutdown(2), onBeforeCloseWindow(2, true), onBeforeCloseWindow(2, true)
    // 	-    close(1): onBeforeCloseWindow(2, false)[not last window]
    // 	-    close(1): onBeforeCloseWindow(1, false), onBeforeShutdown(0)[last window]
    // 	- closeAll(2): onBeforeCloseWindow(2, false), onBeforeCloseWindow(2, false), onBeforeShutdown(0)
    //
    // Linux
    // 	-     quit(1): onBeforeShutdown(1), onBeforeCloseWindow(1, true)
    // 	-     quit(2): onBeforeShutdown(2), onBeforeCloseWindow(2, true), onBeforeCloseWindow(2, true)
    // 	-    close(1): onBeforeCloseWindow(2, false)[not last window]
    // 	-    close(1): onBeforeCloseWindow(1, false), onBeforeShutdown(0)[last window]
    // 	- closeAll(2): onBeforeCloseWindow(2, false), onBeforeCloseWindow(2, false), onBeforeShutdown(0)
    //
    onBeforeShutdown() {
        this.shuttingDown = true;
        this.saveWindowsState();
    }
    saveWindowsState() {
        // TODO@electron workaround for Electron not being able to restore
        // multiple (native) fullscreen windows on the same display at once
        // on macOS.
        // https://github.com/electron/electron/issues/34367
        const displaysWithFullScreenWindow = new Set();
        const currentWindowsState = {
            openedWindows: [],
            lastPluginDevelopmentHostWindow: this._state.lastPluginDevelopmentHostWindow,
            lastActiveWindow: this.lastClosedState,
        };
        // 1.) Find a last active window (pick any other first window otherwise)
        if (!currentWindowsState.lastActiveWindow) {
            let activeWindow = this.windowsMainService.getLastActiveWindow();
            if (!activeWindow || activeWindow.isExtensionDevelopmentHost) {
                activeWindow = this.windowsMainService
                    .getWindows()
                    .find((window) => !window.isExtensionDevelopmentHost);
            }
            if (activeWindow) {
                currentWindowsState.lastActiveWindow = this.toWindowState(activeWindow);
                if (currentWindowsState.lastActiveWindow.uiState.mode === 3 /* WindowMode.Fullscreen */) {
                    displaysWithFullScreenWindow.add(currentWindowsState.lastActiveWindow.uiState.display); // always allow fullscreen for active window
                }
            }
        }
        // 2.) Find extension host window
        const extensionHostWindow = this.windowsMainService
            .getWindows()
            .find((window) => window.isExtensionDevelopmentHost && !window.isExtensionTestHost);
        if (extensionHostWindow) {
            currentWindowsState.lastPluginDevelopmentHostWindow = this.toWindowState(extensionHostWindow);
            if (currentWindowsState.lastPluginDevelopmentHostWindow.uiState.mode === 3 /* WindowMode.Fullscreen */) {
                if (displaysWithFullScreenWindow.has(currentWindowsState.lastPluginDevelopmentHostWindow.uiState.display)) {
                    if (isMacintosh && !extensionHostWindow.win?.isSimpleFullScreen()) {
                        currentWindowsState.lastPluginDevelopmentHostWindow.uiState.mode = 1 /* WindowMode.Normal */;
                    }
                }
                else {
                    displaysWithFullScreenWindow.add(currentWindowsState.lastPluginDevelopmentHostWindow.uiState.display);
                }
            }
        }
        // 3.) All windows (except extension host) for N >= 2 to support `restoreWindows: all` or for auto update
        //
        // Careful here: asking a window for its window state after it has been closed returns bogus values (width: 0, height: 0)
        // so if we ever want to persist the UI state of the last closed window (window count === 1), it has
        // to come from the stored lastClosedWindowState on Win/Linux at least
        if (this.windowsMainService.getWindowCount() > 1) {
            currentWindowsState.openedWindows = this.windowsMainService
                .getWindows()
                .filter((window) => !window.isExtensionDevelopmentHost)
                .map((window) => {
                const windowState = this.toWindowState(window);
                if (windowState.uiState.mode === 3 /* WindowMode.Fullscreen */) {
                    if (displaysWithFullScreenWindow.has(windowState.uiState.display)) {
                        if (isMacintosh &&
                            windowState.windowId !== currentWindowsState.lastActiveWindow?.windowId &&
                            !window.win?.isSimpleFullScreen()) {
                            windowState.uiState.mode = 1 /* WindowMode.Normal */;
                        }
                    }
                    else {
                        displaysWithFullScreenWindow.add(windowState.uiState.display);
                    }
                }
                return windowState;
            });
        }
        // Persist
        const state = getWindowsStateStoreData(currentWindowsState);
        this.stateService.setItem(WindowsStateHandler_1.windowsStateStorageKey, state);
        if (this.shuttingDown) {
            this.logService.trace('[WindowsStateHandler] onBeforeShutdown', state);
        }
    }
    // See note on #onBeforeShutdown() for details how these events are flowing
    onBeforeCloseWindow(window) {
        if (this.lifecycleMainService.quitRequested) {
            return; // during quit, many windows close in parallel so let it be handled in the before-quit handler
        }
        // On Window close, update our stored UI state of this window
        const state = this.toWindowState(window);
        if (window.isExtensionDevelopmentHost && !window.isExtensionTestHost) {
            this._state.lastPluginDevelopmentHostWindow = state; // do not let test run window state overwrite our extension development state
        }
        // Any non extension host window with same workspace or folder
        else if (!window.isExtensionDevelopmentHost && window.openedWorkspace) {
            this._state.openedWindows.forEach((openedWindow) => {
                const sameWorkspace = isWorkspaceIdentifier(window.openedWorkspace) &&
                    openedWindow.workspace?.id === window.openedWorkspace.id;
                const sameFolder = isSingleFolderWorkspaceIdentifier(window.openedWorkspace) &&
                    openedWindow.folderUri &&
                    extUriBiasedIgnorePathCase.isEqual(openedWindow.folderUri, window.openedWorkspace.uri);
                if (sameWorkspace || sameFolder) {
                    openedWindow.uiState = state.uiState;
                }
            });
        }
        // On Windows and Linux closing the last window will trigger quit. Since we are storing all UI state
        // before quitting, we need to remember the UI state of this window to be able to persist it.
        // On macOS we keep the last closed window state ready in case the user wants to quit right after or
        // wants to open another window, in which case we use this state over the persisted one.
        if (this.windowsMainService.getWindowCount() === 1) {
            this.lastClosedState = state;
        }
    }
    toWindowState(window) {
        return {
            windowId: window.id,
            workspace: isWorkspaceIdentifier(window.openedWorkspace) ? window.openedWorkspace : undefined,
            folderUri: isSingleFolderWorkspaceIdentifier(window.openedWorkspace)
                ? window.openedWorkspace.uri
                : undefined,
            backupPath: window.backupPath,
            remoteAuthority: window.remoteAuthority,
            uiState: window.serializeWindowState(),
        };
    }
    getNewWindowState(configuration) {
        const state = this.doGetNewWindowState(configuration);
        const windowConfig = this.configurationService.getValue('window');
        // Fullscreen state gets special treatment
        if (state.mode === 3 /* WindowMode.Fullscreen */) {
            // Window state is not from a previous session: only allow fullscreen if we inherit it or user wants fullscreen
            let allowFullscreen;
            if (state.hasDefaultState) {
                allowFullscreen = !!(windowConfig?.newWindowDimensions &&
                    ['fullscreen', 'inherit', 'offset'].indexOf(windowConfig.newWindowDimensions) >= 0);
            }
            // Window state is from a previous session: only allow fullscreen when we got updated or user wants to restore
            else {
                allowFullscreen = !!(this.lifecycleMainService.wasRestarted || windowConfig?.restoreFullscreen);
            }
            if (!allowFullscreen) {
                state.mode = 1 /* WindowMode.Normal */;
            }
        }
        return state;
    }
    doGetNewWindowState(configuration) {
        const lastActive = this.windowsMainService.getLastActiveWindow();
        // Restore state unless we are running extension tests
        if (!configuration.extensionTestsPath) {
            // extension development host Window - load from stored settings if any
            if (!!configuration.extensionDevelopmentPath && this.state.lastPluginDevelopmentHostWindow) {
                return this.state.lastPluginDevelopmentHostWindow.uiState;
            }
            // Known Workspace - load from stored settings
            const workspace = configuration.workspace;
            if (isWorkspaceIdentifier(workspace)) {
                const stateForWorkspace = this.state.openedWindows
                    .filter((openedWindow) => openedWindow.workspace && openedWindow.workspace.id === workspace.id)
                    .map((openedWindow) => openedWindow.uiState);
                if (stateForWorkspace.length) {
                    return stateForWorkspace[0];
                }
            }
            // Known Folder - load from stored settings
            if (isSingleFolderWorkspaceIdentifier(workspace)) {
                const stateForFolder = this.state.openedWindows
                    .filter((openedWindow) => openedWindow.folderUri &&
                    extUriBiasedIgnorePathCase.isEqual(openedWindow.folderUri, workspace.uri))
                    .map((openedWindow) => openedWindow.uiState);
                if (stateForFolder.length) {
                    return stateForFolder[0];
                }
            }
            // Empty windows with backups
            else if (configuration.backupPath) {
                const stateForEmptyWindow = this.state.openedWindows
                    .filter((openedWindow) => openedWindow.backupPath === configuration.backupPath)
                    .map((openedWindow) => openedWindow.uiState);
                if (stateForEmptyWindow.length) {
                    return stateForEmptyWindow[0];
                }
            }
            // First Window
            const lastActiveState = this.lastClosedState || this.state.lastActiveWindow;
            if (!lastActive && lastActiveState) {
                return lastActiveState.uiState;
            }
        }
        //
        // In any other case, we do not have any stored settings for the window state, so we come up with something smart
        //
        // We want the new window to open on the same display that the last active one is in
        let displayToUse;
        const displays = electron.screen.getAllDisplays();
        // Single Display
        if (displays.length === 1) {
            displayToUse = displays[0];
        }
        // Multi Display
        else {
            // on mac there is 1 menu per window so we need to use the monitor where the cursor currently is
            if (isMacintosh) {
                const cursorPoint = electron.screen.getCursorScreenPoint();
                displayToUse = electron.screen.getDisplayNearestPoint(cursorPoint);
            }
            // if we have a last active window, use that display for the new window
            if (!displayToUse && lastActive) {
                displayToUse = electron.screen.getDisplayMatching(lastActive.getBounds());
            }
            // fallback to primary display or first display
            if (!displayToUse) {
                displayToUse = electron.screen.getPrimaryDisplay() || displays[0];
            }
        }
        // Compute x/y based on display bounds
        // Note: important to use Math.round() because Electron does not seem to be too happy about
        // display coordinates that are not absolute numbers.
        let state = defaultWindowState();
        state.x = Math.round(displayToUse.bounds.x + displayToUse.bounds.width / 2 - state.width / 2);
        state.y = Math.round(displayToUse.bounds.y + displayToUse.bounds.height / 2 - state.height / 2);
        // Check for newWindowDimensions setting and adjust accordingly
        const windowConfig = this.configurationService.getValue('window');
        let ensureNoOverlap = true;
        if (windowConfig?.newWindowDimensions) {
            if (windowConfig.newWindowDimensions === 'maximized') {
                state.mode = 0 /* WindowMode.Maximized */;
                ensureNoOverlap = false;
            }
            else if (windowConfig.newWindowDimensions === 'fullscreen') {
                state.mode = 3 /* WindowMode.Fullscreen */;
                ensureNoOverlap = false;
            }
            else if ((windowConfig.newWindowDimensions === 'inherit' ||
                windowConfig.newWindowDimensions === 'offset') &&
                lastActive) {
                const lastActiveState = lastActive.serializeWindowState();
                if (lastActiveState.mode === 3 /* WindowMode.Fullscreen */) {
                    state.mode = 3 /* WindowMode.Fullscreen */; // only take mode (fixes https://github.com/microsoft/vscode/issues/19331)
                }
                else {
                    state = {
                        ...lastActiveState,
                        zoomLevel: undefined, // do not inherit zoom level
                    };
                }
                ensureNoOverlap =
                    state.mode !== 3 /* WindowMode.Fullscreen */ && windowConfig.newWindowDimensions === 'offset';
            }
        }
        if (ensureNoOverlap) {
            state = this.ensureNoOverlap(state);
        }
        ;
        state.hasDefaultState = true; // flag as default state
        return state;
    }
    ensureNoOverlap(state) {
        if (this.windowsMainService.getWindows().length === 0) {
            return state;
        }
        state.x = typeof state.x === 'number' ? state.x : 0;
        state.y = typeof state.y === 'number' ? state.y : 0;
        const existingWindowBounds = this.windowsMainService
            .getWindows()
            .map((window) => window.getBounds());
        while (existingWindowBounds.some((bounds) => bounds.x === state.x || bounds.y === state.y)) {
            state.x += 30;
            state.y += 30;
        }
        return state;
    }
};
WindowsStateHandler = WindowsStateHandler_1 = __decorate([
    __param(0, IWindowsMainService),
    __param(1, IStateService),
    __param(2, ILifecycleMainService),
    __param(3, ILogService),
    __param(4, IConfigurationService)
], WindowsStateHandler);
export { WindowsStateHandler };
export function restoreWindowsState(data) {
    const result = { openedWindows: [] };
    const windowsState = data || { openedWindows: [] };
    if (windowsState.lastActiveWindow) {
        result.lastActiveWindow = restoreWindowState(windowsState.lastActiveWindow);
    }
    if (windowsState.lastPluginDevelopmentHostWindow) {
        result.lastPluginDevelopmentHostWindow = restoreWindowState(windowsState.lastPluginDevelopmentHostWindow);
    }
    if (Array.isArray(windowsState.openedWindows)) {
        result.openedWindows = windowsState.openedWindows.map((windowState) => restoreWindowState(windowState));
    }
    return result;
}
function restoreWindowState(windowState) {
    const result = { uiState: windowState.uiState };
    if (windowState.backupPath) {
        result.backupPath = windowState.backupPath;
    }
    if (windowState.remoteAuthority) {
        result.remoteAuthority = windowState.remoteAuthority;
    }
    if (windowState.folder) {
        result.folderUri = URI.parse(windowState.folder);
    }
    if (windowState.workspaceIdentifier) {
        result.workspace = {
            id: windowState.workspaceIdentifier.id,
            configPath: URI.parse(windowState.workspaceIdentifier.configURIPath),
        };
    }
    return result;
}
export function getWindowsStateStoreData(windowsState) {
    return {
        lastActiveWindow: windowsState.lastActiveWindow && serializeWindowState(windowsState.lastActiveWindow),
        lastPluginDevelopmentHostWindow: windowsState.lastPluginDevelopmentHostWindow &&
            serializeWindowState(windowsState.lastPluginDevelopmentHostWindow),
        openedWindows: windowsState.openedWindows.map((ws) => serializeWindowState(ws)),
    };
}
function serializeWindowState(windowState) {
    return {
        workspaceIdentifier: windowState.workspace && {
            id: windowState.workspace.id,
            configURIPath: windowState.workspace.configPath.toString(),
        },
        folder: windowState.folderUri && windowState.folderUri.toString(),
        backupPath: windowState.backupPath,
        remoteAuthority: windowState.remoteAuthority,
        uiState: windowState.uiState,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93c1N0YXRlSGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3dpbmRvd3MvZWxlY3Ryb24tbWFpbi93aW5kb3dzU3RhdGVIYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLFFBQVEsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbkYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDN0YsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3JELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUV6RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDbEQsT0FBTyxFQUNOLGtCQUFrQixHQUlsQixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFDTixpQ0FBaUMsRUFDakMscUJBQXFCLEdBRXJCLE1BQU0scUNBQXFDLENBQUE7QUFtQ3JDLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsVUFBVTs7YUFDMUIsMkJBQXNCLEdBQUcsY0FBYyxBQUFqQixDQUFpQjtJQUUvRCxJQUFJLEtBQUs7UUFDUixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUE7SUFDbkIsQ0FBQztJQU9ELFlB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