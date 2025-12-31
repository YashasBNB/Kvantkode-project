"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
;
(function () {
    const preloadGlobals = window.vscode; // defined by preload.ts
    const safeProcess = preloadGlobals.process;
    async function load(esModule, options) {
        // Window Configuration from Preload Script
        const configuration = await resolveWindowConfiguration();
        // Signal before import()
        options?.beforeImport?.(configuration);
        // Developer settings
        const { enableDeveloperKeybindings, removeDeveloperKeybindingsAfterLoad, developerDeveloperKeybindingsDisposable, forceDisableShowDevtoolsOnError, } = setupDeveloperKeybindings(configuration, options);
        // NLS
        setupNLS(configuration);
        // Compute base URL and set as global
        const baseUrl = new URL(`${fileUriFromPath(configuration.appRoot, { isWindows: safeProcess.platform === 'win32', scheme: 'vscode-file', fallbackAuthority: 'vscode-app' })}/out/`);
        globalThis._VSCODE_FILE_ROOT = baseUrl.toString();
        // Dev only: CSS import map tricks
        setupCSSImportMaps(configuration, baseUrl);
        // ESM Import
        try {
            const result = await import(new URL(`${esModule}.js`, baseUrl).href);
            if (developerDeveloperKeybindingsDisposable && removeDeveloperKeybindingsAfterLoad) {
                developerDeveloperKeybindingsDisposable();
            }
            return { result, configuration };
        }
        catch (error) {
            onUnexpectedError(error, enableDeveloperKeybindings && !forceDisableShowDevtoolsOnError);
            throw error;
        }
    }
    async function resolveWindowConfiguration() {
        const timeout = setTimeout(() => {
            console.error(`[resolve window config] Could not resolve window configuration within 10 seconds, but will continue to wait...`);
        }, 10000);
        performance.mark('code/willWaitForWindowConfig');
        const configuration = (await preloadGlobals.context.resolveConfiguration());
        performance.mark('code/didWaitForWindowConfig');
        clearTimeout(timeout);
        return configuration;
    }
    function setupDeveloperKeybindings(configuration, options) {
        const { forceEnableDeveloperKeybindings, disallowReloadKeybinding, removeDeveloperKeybindingsAfterLoad, forceDisableShowDevtoolsOnError, } = typeof options?.configureDeveloperSettings === 'function'
            ? options.configureDeveloperSettings(configuration)
            : {
                forceEnableDeveloperKeybindings: false,
                disallowReloadKeybinding: false,
                removeDeveloperKeybindingsAfterLoad: false,
                forceDisableShowDevtoolsOnError: false,
            };
        const isDev = !!safeProcess.env['VSCODE_DEV'];
        const enableDeveloperKeybindings = Boolean(isDev || forceEnableDeveloperKeybindings);
        let developerDeveloperKeybindingsDisposable = undefined;
        if (enableDeveloperKeybindings) {
            developerDeveloperKeybindingsDisposable =
                registerDeveloperKeybindings(disallowReloadKeybinding);
        }
        return {
            enableDeveloperKeybindings,
            removeDeveloperKeybindingsAfterLoad,
            developerDeveloperKeybindingsDisposable,
            forceDisableShowDevtoolsOnError,
        };
    }
    function registerDeveloperKeybindings(disallowReloadKeybinding) {
        const ipcRenderer = preloadGlobals.ipcRenderer;
        const extractKey = function (e) {
            return [
                e.ctrlKey ? 'ctrl-' : '',
                e.metaKey ? 'meta-' : '',
                e.altKey ? 'alt-' : '',
                e.shiftKey ? 'shift-' : '',
                e.keyCode,
            ].join('');
        };
        // Devtools & reload support
        const TOGGLE_DEV_TOOLS_KB = safeProcess.platform === 'darwin' ? 'meta-alt-73' : 'ctrl-shift-73'; // mac: Cmd-Alt-I, rest: Ctrl-Shift-I
        const TOGGLE_DEV_TOOLS_KB_ALT = '123'; // F12
        const RELOAD_KB = safeProcess.platform === 'darwin' ? 'meta-82' : 'ctrl-82'; // mac: Cmd-R, rest: Ctrl-R
        let listener = function (e) {
            const key = extractKey(e);
            if (key === TOGGLE_DEV_TOOLS_KB || key === TOGGLE_DEV_TOOLS_KB_ALT) {
                ipcRenderer.send('vscode:toggleDevTools');
            }
            else if (key === RELOAD_KB && !disallowReloadKeybinding) {
                ipcRenderer.send('vscode:reloadWindow');
            }
        };
        window.addEventListener('keydown', listener);
        return function () {
            if (listener) {
                window.removeEventListener('keydown', listener);
                listener = undefined;
            }
        };
    }
    function setupNLS(configuration) {
        globalThis._VSCODE_NLS_MESSAGES = configuration.nls.messages;
        globalThis._VSCODE_NLS_LANGUAGE = configuration.nls.language;
        let language = configuration.nls.language || 'en';
        if (language === 'zh-tw') {
            language = 'zh-Hant';
        }
        else if (language === 'zh-cn') {
            language = 'zh-Hans';
        }
        window.document.documentElement.setAttribute('lang', language);
    }
    function onUnexpectedError(error, showDevtoolsOnError) {
        if (showDevtoolsOnError) {
            const ipcRenderer = preloadGlobals.ipcRenderer;
            ipcRenderer.send('vscode:openDevTools');
        }
        console.error(`[uncaught exception]: ${error}`);
        if (error && typeof error !== 'string' && error.stack) {
            console.error(error.stack);
        }
    }
    function fileUriFromPath(path, config) {
        // Since we are building a URI, we normalize any backslash
        // to slashes and we ensure that the path begins with a '/'.
        let pathName = path.replace(/\\/g, '/');
        if (pathName.length > 0 && pathName.charAt(0) !== '/') {
            pathName = `/${pathName}`;
        }
        let uri;
        // Windows: in order to support UNC paths (which start with '//')
        // that have their own authority, we do not use the provided authority
        // but rather preserve it.
        if (config.isWindows && pathName.startsWith('//')) {
            uri = encodeURI(`${config.scheme || 'file'}:${pathName}`);
        }
        // Otherwise we optionally add the provided authority if specified
        else {
            uri = encodeURI(`${config.scheme || 'file'}://${config.fallbackAuthority || ''}${pathName}`);
        }
        return uri.replace(/#/g, '%23');
    }
    function setupCSSImportMaps(configuration, baseUrl) {
        // DEV ---------------------------------------------------------------------------------------
        // DEV: This is for development and enables loading CSS via import-statements via import-maps.
        // DEV: For each CSS modules that we have we defined an entry in the import map that maps to
        // DEV: a blob URL that loads the CSS via a dynamic @import-rule.
        // DEV ---------------------------------------------------------------------------------------
        if (Array.isArray(configuration.cssModules) && configuration.cssModules.length > 0) {
            performance.mark('code/willAddCssLoader');
            const style = document.createElement('style');
            style.type = 'text/css';
            style.media = 'screen';
            style.id = 'vscode-css-loading';
            document.head.appendChild(style);
            globalThis._VSCODE_CSS_LOAD = function (url) {
                style.textContent += `@import url(${url});\n`;
            };
            const importMap = { imports: {} };
            for (const cssModule of configuration.cssModules) {
                const cssUrl = new URL(cssModule, baseUrl).href;
                const jsSrc = `globalThis._VSCODE_CSS_LOAD('${cssUrl}');\n`;
                const blob = new Blob([jsSrc], { type: 'application/javascript' });
                importMap.imports[cssUrl] = URL.createObjectURL(blob);
            }
            const ttp = window.trustedTypes?.createPolicy('vscode-bootstrapImportMap', {
                createScript(value) {
                    return value;
                },
            });
            const importMapSrc = JSON.stringify(importMap, undefined, 2);
            const importMapScript = document.createElement('script');
            importMapScript.type = 'importmap';
            importMapScript.setAttribute('nonce', '0c6a828f1297');
            // @ts-ignore
            importMapScript.textContent = ttp?.createScript(importMapSrc) ?? importMapSrc;
            document.head.appendChild(importMapScript);
            performance.mark('code/didAddCssLoader');
        }
    }
    ;
    globalThis.MonacoBootstrapWindow = { load };
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLXdpbmRvdy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbImJvb3RzdHJhcC13aW5kb3cudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Z0dBR2dHO0FBRWhHLENBQUM7QUFBQSxDQUFDO0lBWUQsTUFBTSxjQUFjLEdBQStCLE1BQWMsQ0FBQyxNQUFNLENBQUEsQ0FBQyx3QkFBd0I7SUFDakcsTUFBTSxXQUFXLEdBQUcsY0FBYyxDQUFDLE9BQU8sQ0FBQTtJQUUxQyxLQUFLLFVBQVUsSUFBSSxDQUNsQixRQUFnQixFQUNoQixPQUF3QjtRQUV4QiwyQ0FBMkM7UUFDM0MsTUFBTSxhQUFhLEdBQUcsTUFBTSwwQkFBMEIsRUFBSyxDQUFBO1FBRTNELHlCQUF5QjtRQUN6QixPQUFPLEVBQUUsWUFBWSxFQUFFLENBQUMsYUFBYSxDQUFDLENBQUE7UUFFdEMscUJBQXFCO1FBQ3JCLE1BQU0sRUFDTCwwQkFBMEIsRUFDMUIsbUNBQW1DLEVBQ25DLHVDQUF1QyxFQUN2QywrQkFBK0IsR0FDL0IsR0FBRyx5QkFBeUIsQ0FBQyxhQUFhLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFFckQsTUFBTTtRQUNOLFFBQVEsQ0FBSSxhQUFhLENBQUMsQ0FBQTtRQUUxQixxQ0FBcUM7UUFDckMsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLENBQ3RCLEdBQUcsZUFBZSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsRUFBRSxTQUFTLEVBQUUsV0FBVyxDQUFDLFFBQVEsS0FBSyxPQUFPLEVBQUUsTUFBTSxFQUFFLGFBQWEsRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQ3pKLENBQUE7UUFDRCxVQUFVLENBQUMsaUJBQWlCLEdBQUcsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBRWpELGtDQUFrQztRQUNsQyxrQkFBa0IsQ0FBSSxhQUFhLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFFN0MsYUFBYTtRQUNiLElBQUksQ0FBQztZQUNKLE1BQU0sTUFBTSxHQUFHLE1BQU0sTUFBTSxDQUFDLElBQUksR0FBRyxDQUFDLEdBQUcsUUFBUSxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUE7WUFFcEUsSUFBSSx1Q0FBdUMsSUFBSSxtQ0FBbUMsRUFBRSxDQUFDO2dCQUNwRix1Q0FBdUMsRUFBRSxDQUFBO1lBQzFDLENBQUM7WUFFRCxPQUFPLEVBQUUsTUFBTSxFQUFFLGFBQWEsRUFBRSxDQUFBO1FBQ2pDLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLGlCQUFpQixDQUFDLEtBQUssRUFBRSwwQkFBMEIsSUFBSSxDQUFDLCtCQUErQixDQUFDLENBQUE7WUFFeEYsTUFBTSxLQUFLLENBQUE7UUFDWixDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssVUFBVSwwQkFBMEI7UUFDeEMsTUFBTSxPQUFPLEdBQUcsVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUMvQixPQUFPLENBQUMsS0FBSyxDQUNaLGdIQUFnSCxDQUNoSCxDQUFBO1FBQ0YsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ1QsV0FBVyxDQUFDLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxDQUFBO1FBRWhELE1BQU0sYUFBYSxHQUFHLENBQUMsTUFBTSxjQUFjLENBQUMsT0FBTyxDQUFDLG9CQUFvQixFQUFFLENBQU0sQ0FBQTtRQUNoRixXQUFXLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLENBQUE7UUFFL0MsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBRXJCLE9BQU8sYUFBYSxDQUFBO0lBQ3JCLENBQUM7SUFFRCxTQUFTLHlCQUF5QixDQUNqQyxhQUFnQixFQUNoQixPQUF3QjtRQUV4QixNQUFNLEVBQ0wsK0JBQStCLEVBQy9CLHdCQUF3QixFQUN4QixtQ0FBbUMsRUFDbkMsK0JBQStCLEdBQy9CLEdBQ0EsT0FBTyxPQUFPLEVBQUUsMEJBQTBCLEtBQUssVUFBVTtZQUN4RCxDQUFDLENBQUMsT0FBTyxDQUFDLDBCQUEwQixDQUFDLGFBQWEsQ0FBQztZQUNuRCxDQUFDLENBQUM7Z0JBQ0EsK0JBQStCLEVBQUUsS0FBSztnQkFDdEMsd0JBQXdCLEVBQUUsS0FBSztnQkFDL0IsbUNBQW1DLEVBQUUsS0FBSztnQkFDMUMsK0JBQStCLEVBQUUsS0FBSzthQUN0QyxDQUFBO1FBRUosTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDN0MsTUFBTSwwQkFBMEIsR0FBRyxPQUFPLENBQUMsS0FBSyxJQUFJLCtCQUErQixDQUFDLENBQUE7UUFDcEYsSUFBSSx1Q0FBdUMsR0FBeUIsU0FBUyxDQUFBO1FBQzdFLElBQUksMEJBQTBCLEVBQUUsQ0FBQztZQUNoQyx1Q0FBdUM7Z0JBQ3RDLDRCQUE0QixDQUFDLHdCQUF3QixDQUFDLENBQUE7UUFDeEQsQ0FBQztRQUVELE9BQU87WUFDTiwwQkFBMEI7WUFDMUIsbUNBQW1DO1lBQ25DLHVDQUF1QztZQUN2QywrQkFBK0I7U0FDL0IsQ0FBQTtJQUNGLENBQUM7SUFFRCxTQUFTLDRCQUE0QixDQUFDLHdCQUE2QztRQUNsRixNQUFNLFdBQVcsR0FBRyxjQUFjLENBQUMsV0FBVyxDQUFBO1FBRTlDLE1BQU0sVUFBVSxHQUFHLFVBQVUsQ0FBZ0I7WUFDNUMsT0FBTztnQkFDTixDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ3hCLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDeEIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUN0QixDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQzFCLENBQUMsQ0FBQyxPQUFPO2FBQ1QsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDWCxDQUFDLENBQUE7UUFFRCw0QkFBNEI7UUFDNUIsTUFBTSxtQkFBbUIsR0FBRyxXQUFXLENBQUMsUUFBUSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUEsQ0FBQyxxQ0FBcUM7UUFDckksTUFBTSx1QkFBdUIsR0FBRyxLQUFLLENBQUEsQ0FBQyxNQUFNO1FBQzVDLE1BQU0sU0FBUyxHQUFHLFdBQVcsQ0FBQyxRQUFRLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQSxDQUFDLDJCQUEyQjtRQUV2RyxJQUFJLFFBQVEsR0FBNkMsVUFBVSxDQUFDO1lBQ25FLE1BQU0sR0FBRyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN6QixJQUFJLEdBQUcsS0FBSyxtQkFBbUIsSUFBSSxHQUFHLEtBQUssdUJBQXVCLEVBQUUsQ0FBQztnQkFDcEUsV0FBVyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO1lBQzFDLENBQUM7aUJBQU0sSUFBSSxHQUFHLEtBQUssU0FBUyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztnQkFDM0QsV0FBVyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1lBQ3hDLENBQUM7UUFDRixDQUFDLENBQUE7UUFFRCxNQUFNLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBRTVDLE9BQU87WUFDTixJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUNkLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUE7Z0JBQy9DLFFBQVEsR0FBRyxTQUFTLENBQUE7WUFDckIsQ0FBQztRQUNGLENBQUMsQ0FBQTtJQUNGLENBQUM7SUFFRCxTQUFTLFFBQVEsQ0FBa0MsYUFBZ0I7UUFDbEUsVUFBVSxDQUFDLG9CQUFvQixHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFBO1FBQzVELFVBQVUsQ0FBQyxvQkFBb0IsR0FBRyxhQUFhLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQTtRQUU1RCxJQUFJLFFBQVEsR0FBRyxhQUFhLENBQUMsR0FBRyxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUE7UUFDakQsSUFBSSxRQUFRLEtBQUssT0FBTyxFQUFFLENBQUM7WUFDMUIsUUFBUSxHQUFHLFNBQVMsQ0FBQTtRQUNyQixDQUFDO2FBQU0sSUFBSSxRQUFRLEtBQUssT0FBTyxFQUFFLENBQUM7WUFDakMsUUFBUSxHQUFHLFNBQVMsQ0FBQTtRQUNyQixDQUFDO1FBRUQsTUFBTSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUMvRCxDQUFDO0lBRUQsU0FBUyxpQkFBaUIsQ0FBQyxLQUFxQixFQUFFLG1CQUE0QjtRQUM3RSxJQUFJLG1CQUFtQixFQUFFLENBQUM7WUFDekIsTUFBTSxXQUFXLEdBQUcsY0FBYyxDQUFDLFdBQVcsQ0FBQTtZQUM5QyxXQUFXLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUE7UUFDeEMsQ0FBQztRQUVELE9BQU8sQ0FBQyxLQUFLLENBQUMseUJBQXlCLEtBQUssRUFBRSxDQUFDLENBQUE7UUFFL0MsSUFBSSxLQUFLLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxJQUFJLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUN2RCxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUMzQixDQUFDO0lBQ0YsQ0FBQztJQUVELFNBQVMsZUFBZSxDQUN2QixJQUFZLEVBQ1osTUFBNEU7UUFFNUUsMERBQTBEO1FBQzFELDREQUE0RDtRQUM1RCxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUN2QyxJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7WUFDdkQsUUFBUSxHQUFHLElBQUksUUFBUSxFQUFFLENBQUE7UUFDMUIsQ0FBQztRQUVELElBQUksR0FBVyxDQUFBO1FBRWYsaUVBQWlFO1FBQ2pFLHNFQUFzRTtRQUN0RSwwQkFBMEI7UUFDMUIsSUFBSSxNQUFNLENBQUMsU0FBUyxJQUFJLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNuRCxHQUFHLEdBQUcsU0FBUyxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sSUFBSSxNQUFNLElBQUksUUFBUSxFQUFFLENBQUMsQ0FBQTtRQUMxRCxDQUFDO1FBRUQsa0VBQWtFO2FBQzdELENBQUM7WUFDTCxHQUFHLEdBQUcsU0FBUyxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sSUFBSSxNQUFNLE1BQU0sTUFBTSxDQUFDLGlCQUFpQixJQUFJLEVBQUUsR0FBRyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1FBQzdGLENBQUM7UUFFRCxPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ2hDLENBQUM7SUFFRCxTQUFTLGtCQUFrQixDQUFrQyxhQUFnQixFQUFFLE9BQVk7UUFDMUYsOEZBQThGO1FBQzlGLDhGQUE4RjtRQUM5Riw0RkFBNEY7UUFDNUYsaUVBQWlFO1FBQ2pFLDhGQUE4RjtRQUU5RixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxJQUFJLGFBQWEsQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3BGLFdBQVcsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtZQUV6QyxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQzdDLEtBQUssQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFBO1lBQ3ZCLEtBQUssQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFBO1lBQ3RCLEtBQUssQ0FBQyxFQUFFLEdBQUcsb0JBQW9CLENBQUE7WUFDL0IsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUE7WUFFaEMsVUFBVSxDQUFDLGdCQUFnQixHQUFHLFVBQVUsR0FBRztnQkFDMUMsS0FBSyxDQUFDLFdBQVcsSUFBSSxlQUFlLEdBQUcsTUFBTSxDQUFBO1lBQzlDLENBQUMsQ0FBQTtZQUVELE1BQU0sU0FBUyxHQUF3QyxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsQ0FBQTtZQUN0RSxLQUFLLE1BQU0sU0FBUyxJQUFJLGFBQWEsQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDbEQsTUFBTSxNQUFNLEdBQUcsSUFBSSxHQUFHLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQTtnQkFDL0MsTUFBTSxLQUFLLEdBQUcsZ0NBQWdDLE1BQU0sT0FBTyxDQUFBO2dCQUMzRCxNQUFNLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLHdCQUF3QixFQUFFLENBQUMsQ0FBQTtnQkFDbEUsU0FBUyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ3RELENBQUM7WUFFRCxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsWUFBWSxFQUFFLFlBQVksQ0FBQywyQkFBMkIsRUFBRTtnQkFDMUUsWUFBWSxDQUFDLEtBQUs7b0JBQ2pCLE9BQU8sS0FBSyxDQUFBO2dCQUNiLENBQUM7YUFDRCxDQUFDLENBQUE7WUFDRixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDNUQsTUFBTSxlQUFlLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUN4RCxlQUFlLENBQUMsSUFBSSxHQUFHLFdBQVcsQ0FBQTtZQUNsQyxlQUFlLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxjQUFjLENBQUMsQ0FBQTtZQUNyRCxhQUFhO1lBQ2IsZUFBZSxDQUFDLFdBQVcsR0FBRyxHQUFHLEVBQUUsWUFBWSxDQUFDLFlBQVksQ0FBQyxJQUFJLFlBQVksQ0FBQTtZQUM3RSxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsQ0FBQTtZQUUxQyxXQUFXLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLENBQUE7UUFDekMsQ0FBQztJQUNGLENBQUM7SUFFRCxDQUFDO0lBQUMsVUFBa0IsQ0FBQyxxQkFBcUIsR0FBRyxFQUFFLElBQUksRUFBRSxDQUFBO0FBQ3RELENBQUMsQ0FBQyxFQUFFLENBQUEifQ==