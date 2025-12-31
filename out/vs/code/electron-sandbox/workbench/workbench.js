"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* eslint-disable no-restricted-globals */
;
(async function () {
    // Add a perf entry right from the top
    performance.mark('code/didStartRenderer');
    const bootstrapWindow = window.MonacoBootstrapWindow; // defined by bootstrap-window.ts
    const preloadGlobals = window.vscode; // defined by preload.ts
    //#region Splash Screen Helpers
    function showSplash(configuration) {
        performance.mark('code/willShowPartsSplash');
        let data = configuration.partsSplash;
        if (data) {
            if (configuration.autoDetectHighContrast && configuration.colorScheme.highContrast) {
                if ((configuration.colorScheme.dark && data.baseTheme !== 'hc-black') ||
                    (!configuration.colorScheme.dark && data.baseTheme !== 'hc-light')) {
                    data = undefined; // high contrast mode has been turned by the OS -> ignore stored colors and layouts
                }
            }
            else if (configuration.autoDetectColorScheme) {
                if ((configuration.colorScheme.dark && data.baseTheme !== 'vs-dark') ||
                    (!configuration.colorScheme.dark && data.baseTheme !== 'vs')) {
                    data = undefined; // OS color scheme is tracked and has changed
                }
            }
        }
        // developing an extension -> ignore stored layouts
        if (data && configuration.extensionDevelopmentPath) {
            data.layoutInfo = undefined;
        }
        // minimal color configuration (works with or without persisted data)
        let baseTheme;
        let shellBackground;
        let shellForeground;
        if (data) {
            baseTheme = data.baseTheme;
            shellBackground = data.colorInfo.editorBackground;
            shellForeground = data.colorInfo.foreground;
        }
        else if (configuration.autoDetectHighContrast && configuration.colorScheme.highContrast) {
            if (configuration.colorScheme.dark) {
                baseTheme = 'hc-black';
                shellBackground = '#000000';
                shellForeground = '#FFFFFF';
            }
            else {
                baseTheme = 'hc-light';
                shellBackground = '#FFFFFF';
                shellForeground = '#000000';
            }
        }
        else if (configuration.autoDetectColorScheme) {
            if (configuration.colorScheme.dark) {
                baseTheme = 'vs-dark';
                shellBackground = '#1E1E1E';
                shellForeground = '#CCCCCC';
            }
            else {
                baseTheme = 'vs';
                shellBackground = '#FFFFFF';
                shellForeground = '#000000';
            }
        }
        const style = document.createElement('style');
        style.className = 'initialShellColors';
        window.document.head.appendChild(style);
        style.textContent = `body {	background-color: ${shellBackground}; color: ${shellForeground}; margin: 0; padding: 0; }`;
        // set zoom level as soon as possible
        if (typeof data?.zoomLevel === 'number' &&
            typeof preloadGlobals?.webFrame?.setZoomLevel === 'function') {
            preloadGlobals.webFrame.setZoomLevel(data.zoomLevel);
        }
        // restore parts if possible (we might not always store layout info)
        if (data?.layoutInfo) {
            const { layoutInfo, colorInfo } = data;
            const splash = document.createElement('div');
            splash.id = 'monaco-parts-splash';
            splash.className = baseTheme ?? 'vs-dark';
            if (layoutInfo.windowBorder && colorInfo.windowBorder) {
                const borderElement = document.createElement('div');
                borderElement.style.position = 'absolute';
                borderElement.style.width = 'calc(100vw - 2px)';
                borderElement.style.height = 'calc(100vh - 2px)';
                borderElement.style.zIndex = '1'; // allow border above other elements
                borderElement.style.border = `1px solid var(--window-border-color)`;
                borderElement.style.setProperty('--window-border-color', colorInfo.windowBorder);
                if (layoutInfo.windowBorderRadius) {
                    borderElement.style.borderRadius = layoutInfo.windowBorderRadius;
                }
                splash.appendChild(borderElement);
            }
            // ensure there is enough space
            layoutInfo.auxiliarySideBarWidth = Math.min(layoutInfo.auxiliarySideBarWidth, window.innerWidth -
                (layoutInfo.activityBarWidth + layoutInfo.editorPartMinWidth + layoutInfo.sideBarWidth));
            layoutInfo.sideBarWidth = Math.min(layoutInfo.sideBarWidth, window.innerWidth -
                (layoutInfo.activityBarWidth +
                    layoutInfo.editorPartMinWidth +
                    layoutInfo.auxiliarySideBarWidth));
            // part: title
            if (layoutInfo.titleBarHeight > 0) {
                const titleDiv = document.createElement('div');
                titleDiv.style.position = 'absolute';
                titleDiv.style.width = '100%';
                titleDiv.style.height = `${layoutInfo.titleBarHeight}px`;
                titleDiv.style.left = '0';
                titleDiv.style.top = '0';
                titleDiv.style.backgroundColor = `${colorInfo.titleBarBackground}`;
                titleDiv.style['-webkit-app-region'] = 'drag';
                splash.appendChild(titleDiv);
                if (colorInfo.titleBarBorder) {
                    const titleBorder = document.createElement('div');
                    titleBorder.style.position = 'absolute';
                    titleBorder.style.width = '100%';
                    titleBorder.style.height = '1px';
                    titleBorder.style.left = '0';
                    titleBorder.style.bottom = '0';
                    titleBorder.style.borderBottom = `1px solid ${colorInfo.titleBarBorder}`;
                    titleDiv.appendChild(titleBorder);
                }
            }
            // part: activity bar
            if (layoutInfo.activityBarWidth > 0) {
                const activityDiv = document.createElement('div');
                activityDiv.style.position = 'absolute';
                activityDiv.style.width = `${layoutInfo.activityBarWidth}px`;
                activityDiv.style.height = `calc(100% - ${layoutInfo.titleBarHeight + layoutInfo.statusBarHeight}px)`;
                activityDiv.style.top = `${layoutInfo.titleBarHeight}px`;
                if (layoutInfo.sideBarSide === 'left') {
                    activityDiv.style.left = '0';
                }
                else {
                    activityDiv.style.right = '0';
                }
                activityDiv.style.backgroundColor = `${colorInfo.activityBarBackground}`;
                splash.appendChild(activityDiv);
                if (colorInfo.activityBarBorder) {
                    const activityBorderDiv = document.createElement('div');
                    activityBorderDiv.style.position = 'absolute';
                    activityBorderDiv.style.width = '1px';
                    activityBorderDiv.style.height = '100%';
                    activityBorderDiv.style.top = '0';
                    if (layoutInfo.sideBarSide === 'left') {
                        activityBorderDiv.style.right = '0';
                        activityBorderDiv.style.borderRight = `1px solid ${colorInfo.activityBarBorder}`;
                    }
                    else {
                        activityBorderDiv.style.left = '0';
                        activityBorderDiv.style.borderLeft = `1px solid ${colorInfo.activityBarBorder}`;
                    }
                    activityDiv.appendChild(activityBorderDiv);
                }
            }
            // part: side bar (only when opening workspace/folder)
            if (configuration.workspace && layoutInfo.sideBarWidth > 0) {
                const sideDiv = document.createElement('div');
                sideDiv.style.position = 'absolute';
                sideDiv.style.width = `${layoutInfo.sideBarWidth}px`;
                sideDiv.style.height = `calc(100% - ${layoutInfo.titleBarHeight + layoutInfo.statusBarHeight}px)`;
                sideDiv.style.top = `${layoutInfo.titleBarHeight}px`;
                if (layoutInfo.sideBarSide === 'left') {
                    sideDiv.style.left = `${layoutInfo.activityBarWidth}px`;
                }
                else {
                    sideDiv.style.right = `${layoutInfo.activityBarWidth}px`;
                }
                sideDiv.style.backgroundColor = `${colorInfo.sideBarBackground}`;
                splash.appendChild(sideDiv);
                if (colorInfo.sideBarBorder) {
                    const sideBorderDiv = document.createElement('div');
                    sideBorderDiv.style.position = 'absolute';
                    sideBorderDiv.style.width = '1px';
                    sideBorderDiv.style.height = '100%';
                    sideBorderDiv.style.top = '0';
                    sideBorderDiv.style.right = '0';
                    if (layoutInfo.sideBarSide === 'left') {
                        sideBorderDiv.style.borderRight = `1px solid ${colorInfo.sideBarBorder}`;
                    }
                    else {
                        sideBorderDiv.style.left = '0';
                        sideBorderDiv.style.borderLeft = `1px solid ${colorInfo.sideBarBorder}`;
                    }
                    sideDiv.appendChild(sideBorderDiv);
                }
            }
            // part: auxiliary sidebar
            if (layoutInfo.auxiliarySideBarWidth > 0) {
                const auxSideDiv = document.createElement('div');
                auxSideDiv.style.position = 'absolute';
                auxSideDiv.style.width = `${layoutInfo.auxiliarySideBarWidth}px`;
                auxSideDiv.style.height = `calc(100% - ${layoutInfo.titleBarHeight + layoutInfo.statusBarHeight}px)`;
                auxSideDiv.style.top = `${layoutInfo.titleBarHeight}px`;
                if (layoutInfo.sideBarSide === 'left') {
                    auxSideDiv.style.right = '0';
                }
                else {
                    auxSideDiv.style.left = '0';
                }
                auxSideDiv.style.backgroundColor = `${colorInfo.sideBarBackground}`;
                splash.appendChild(auxSideDiv);
                if (colorInfo.sideBarBorder) {
                    const auxSideBorderDiv = document.createElement('div');
                    auxSideBorderDiv.style.position = 'absolute';
                    auxSideBorderDiv.style.width = '1px';
                    auxSideBorderDiv.style.height = '100%';
                    auxSideBorderDiv.style.top = '0';
                    if (layoutInfo.sideBarSide === 'left') {
                        auxSideBorderDiv.style.left = '0';
                        auxSideBorderDiv.style.borderLeft = `1px solid ${colorInfo.sideBarBorder}`;
                    }
                    else {
                        auxSideBorderDiv.style.right = '0';
                        auxSideBorderDiv.style.borderRight = `1px solid ${colorInfo.sideBarBorder}`;
                    }
                    auxSideDiv.appendChild(auxSideBorderDiv);
                }
            }
            // part: statusbar
            if (layoutInfo.statusBarHeight > 0) {
                const statusDiv = document.createElement('div');
                statusDiv.style.position = 'absolute';
                statusDiv.style.width = '100%';
                statusDiv.style.height = `${layoutInfo.statusBarHeight}px`;
                statusDiv.style.bottom = '0';
                statusDiv.style.left = '0';
                if (configuration.workspace && colorInfo.statusBarBackground) {
                    statusDiv.style.backgroundColor = colorInfo.statusBarBackground;
                }
                else if (!configuration.workspace && colorInfo.statusBarNoFolderBackground) {
                    statusDiv.style.backgroundColor = colorInfo.statusBarNoFolderBackground;
                }
                splash.appendChild(statusDiv);
                if (colorInfo.statusBarBorder) {
                    const statusBorderDiv = document.createElement('div');
                    statusBorderDiv.style.position = 'absolute';
                    statusBorderDiv.style.width = '100%';
                    statusBorderDiv.style.height = '1px';
                    statusBorderDiv.style.top = '0';
                    statusBorderDiv.style.borderTop = `1px solid ${colorInfo.statusBarBorder}`;
                    statusDiv.appendChild(statusBorderDiv);
                }
            }
            window.document.body.appendChild(splash);
        }
        performance.mark('code/didShowPartsSplash');
    }
    //#endregion
    const { result, configuration } = await bootstrapWindow.load('vs/workbench/workbench.desktop.main', {
        configureDeveloperSettings: function (windowConfig) {
            return {
                // disable automated devtools opening on error when running extension tests
                // as this can lead to nondeterministic test execution (devtools steals focus)
                forceDisableShowDevtoolsOnError: typeof windowConfig.extensionTestsPath === 'string' ||
                    windowConfig['enable-smoke-test-driver'] === true,
                // enable devtools keybindings in extension development window
                forceEnableDeveloperKeybindings: Array.isArray(windowConfig.extensionDevelopmentPath) &&
                    windowConfig.extensionDevelopmentPath.length > 0,
                removeDeveloperKeybindingsAfterLoad: true,
            };
        },
        beforeImport: function (windowConfig) {
            // Show our splash as early as possible
            showSplash(windowConfig);
            // Code windows have a `vscodeWindowId` property to identify them
            Object.defineProperty(window, 'vscodeWindowId', {
                get: () => windowConfig.windowId,
            });
            // It looks like browsers only lazily enable
            // the <canvas> element when needed. Since we
            // leverage canvas elements in our code in many
            // locations, we try to help the browser to
            // initialize canvas when it is idle, right
            // before we wait for the scripts to be loaded.
            window.requestIdleCallback(() => {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                context?.clearRect(0, 0, canvas.width, canvas.height);
                canvas.remove();
            }, { timeout: 50 });
            // Track import() perf
            performance.mark('code/willLoadWorkbenchMain');
        },
    });
    // Mark start of workbench
    performance.mark('code/didLoadWorkbenchMain');
    // Load workbench
    result.main(configuration);
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvY29kZS9lbGVjdHJvbi1zYW5kYm94L3dvcmtiZW5jaC93b3JrYmVuY2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Z0dBR2dHO0FBRWhHLDBDQUEwQztBQUUxQyxDQUFDO0FBQUEsQ0FBQyxLQUFLO0lBQ04sc0NBQXNDO0lBQ3RDLFdBQVcsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtJQVV6QyxNQUFNLGVBQWUsR0FBc0IsTUFBYyxDQUFDLHFCQUFxQixDQUFBLENBQUMsaUNBQWlDO0lBQ2pILE1BQU0sY0FBYyxHQUErQixNQUFjLENBQUMsTUFBTSxDQUFBLENBQUMsd0JBQXdCO0lBRWpHLCtCQUErQjtJQUUvQixTQUFTLFVBQVUsQ0FBQyxhQUF5QztRQUM1RCxXQUFXLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLENBQUE7UUFFNUMsSUFBSSxJQUFJLEdBQUcsYUFBYSxDQUFDLFdBQVcsQ0FBQTtRQUNwQyxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ1YsSUFBSSxhQUFhLENBQUMsc0JBQXNCLElBQUksYUFBYSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDcEYsSUFDQyxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxTQUFTLEtBQUssVUFBVSxDQUFDO29CQUNqRSxDQUFDLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLFNBQVMsS0FBSyxVQUFVLENBQUMsRUFDakUsQ0FBQztvQkFDRixJQUFJLEdBQUcsU0FBUyxDQUFBLENBQUMsbUZBQW1GO2dCQUNyRyxDQUFDO1lBQ0YsQ0FBQztpQkFBTSxJQUFJLGFBQWEsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO2dCQUNoRCxJQUNDLENBQUMsYUFB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