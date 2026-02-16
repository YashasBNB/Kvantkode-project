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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLXdpbmRvdy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsiYm9vdHN0cmFwLXdpbmRvdy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztnR0FHZ0c7QUFFaEcsQ0FBQztBQUFBLENBQUM7SUFZRCxNQUFNLGNBQWMsR0FBK0IsTUFBYyxDQUFDLE1BQU0sQ0FBQSxDQUFDLHdCQUF3QjtJQUNqRyxNQUFNLFdBQVcsR0FBRyxjQUFjLENBQUMsT0FBTyxDQUFBO0lBRTFDLEtBQUssVUFBVSxJQUFJLENBQ2xCLFFBQWdCLEVBQ2hCLE9BQXdCO1FBRXhCLDJDQUEyQztRQUMzQyxNQUFNLGFBQWEsR0FBRyxNQUFNLDBCQUEwQixFQUFLLENBQUE7UUFFM0QseUJBQXlCO1FBQ3pCLE9BQU8sRUFBRSxZQUFZLEVBQUUsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUV0QyxxQkFBcUI7UUFDckIsTUFBTSxFQUNMLDBCQUEwQixFQUMxQixtQ0FBbUMsRUFDbkMsdUNBQXVDLEVBQ3ZDLCtCQUErQixHQUMvQixHQUFHLHlCQUF5QixDQUFDLGFBQWEsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUVyRCxNQUFNO1FBQ04sUUFBUSxDQUFJLGFBQWEsQ0FBQyxDQUFBO1FBRTFCLHFDQUFxQztRQUNyQyxNQUFNLE9BQU8sR0FBRyxJQUFJLEdBQUcsQ0FDdEIsR0FBRyxlQUFlLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxFQUFFLFNBQVMsRUFBRSxXQUFXLENBQUMsUUFBUSxLQUFLLE9BQU8sRUFBRSxNQUFNLEVBQUUsYUFBYSxFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FDekosQ0FBQTtRQUNELFVBQVUsQ0FBQyxpQkFBaUIsR0FBRyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUE7UUFFakQsa0NBQWtDO1FBQ2xD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