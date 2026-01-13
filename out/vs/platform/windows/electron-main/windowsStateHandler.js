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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93c1N0YXRlSGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vd2luZG93cy9lbGVjdHJvbi1tYWluL3dpbmRvd3NTdGF0ZUhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sUUFBUSxNQUFNLFVBQVUsQ0FBQTtBQUMvQixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzlELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNuRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDckQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBRXpELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUNsRCxPQUFPLEVBQ04sa0JBQWtCLEdBSWxCLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUNOLGlDQUFpQyxFQUNqQyxxQkFBcUIsR0FFckIsTUFBTSxxQ0FBcUMsQ0FBQTtBQW1DckMsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxVQUFVOzthQUMxQiwyQkFBc0IsR0FBRyxjQUFjLEFBQWpCLENBQWlCO0lBRS9ELElBQUksS0FBSztRQUNSLE9BQU8sSUFBSSxDQUFDLE1BQU0s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