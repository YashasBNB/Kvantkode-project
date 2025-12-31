/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../nls.js';
export const LANGUAGE_DEFAULT = 'en';
let _isWindows = false;
let _isMacintosh = false;
let _isLinux = false;
let _isLinuxSnap = false;
let _isNative = false;
let _isWeb = false;
let _isElectron = false;
let _isIOS = false;
let _isCI = false;
let _isMobile = false;
let _locale = undefined;
let _language = LANGUAGE_DEFAULT;
let _platformLocale = LANGUAGE_DEFAULT;
let _translationsConfigFile = undefined;
let _userAgent = undefined;
const $globalThis = globalThis;
let nodeProcess = undefined;
if (typeof $globalThis.vscode !== 'undefined' &&
    typeof $globalThis.vscode.process !== 'undefined') {
    // Native environment (sandboxed)
    nodeProcess = $globalThis.vscode.process;
}
else if (typeof process !== 'undefined' && typeof process?.versions?.node === 'string') {
    // Native environment (non-sandboxed)
    nodeProcess = process;
}
const isElectronProcess = typeof nodeProcess?.versions?.electron === 'string';
const isElectronRenderer = isElectronProcess && nodeProcess?.type === 'renderer';
// Native environment
if (typeof nodeProcess === 'object') {
    _isWindows = nodeProcess.platform === 'win32';
    _isMacintosh = nodeProcess.platform === 'darwin';
    _isLinux = nodeProcess.platform === 'linux';
    _isLinuxSnap = _isLinux && !!nodeProcess.env['SNAP'] && !!nodeProcess.env['SNAP_REVISION'];
    _isElectron = isElectronProcess;
    _isCI = !!nodeProcess.env['CI'] || !!nodeProcess.env['BUILD_ARTIFACTSTAGINGDIRECTORY'];
    _locale = LANGUAGE_DEFAULT;
    _language = LANGUAGE_DEFAULT;
    const rawNlsConfig = nodeProcess.env['VSCODE_NLS_CONFIG'];
    if (rawNlsConfig) {
        try {
            const nlsConfig = JSON.parse(rawNlsConfig);
            _locale = nlsConfig.userLocale;
            _platformLocale = nlsConfig.osLocale;
            _language = nlsConfig.resolvedLanguage || LANGUAGE_DEFAULT;
            _translationsConfigFile = nlsConfig.languagePack?.translationsConfigFile;
        }
        catch (e) { }
    }
    _isNative = true;
}
// Web environment
else if (typeof navigator === 'object' && !isElectronRenderer) {
    _userAgent = navigator.userAgent;
    _isWindows = _userAgent.indexOf('Windows') >= 0;
    _isMacintosh = _userAgent.indexOf('Macintosh') >= 0;
    _isIOS =
        (_userAgent.indexOf('Macintosh') >= 0 ||
            _userAgent.indexOf('iPad') >= 0 ||
            _userAgent.indexOf('iPhone') >= 0) &&
            !!navigator.maxTouchPoints &&
            navigator.maxTouchPoints > 0;
    _isLinux = _userAgent.indexOf('Linux') >= 0;
    _isMobile = _userAgent?.indexOf('Mobi') >= 0;
    _isWeb = true;
    _language = nls.getNLSLanguage() || LANGUAGE_DEFAULT;
    _locale = navigator.language.toLowerCase();
    _platformLocale = _locale;
}
// Unknown environment
else {
    console.error('Unable to resolve platform.');
}
export var Platform;
(function (Platform) {
    Platform[Platform["Web"] = 0] = "Web";
    Platform[Platform["Mac"] = 1] = "Mac";
    Platform[Platform["Linux"] = 2] = "Linux";
    Platform[Platform["Windows"] = 3] = "Windows";
})(Platform || (Platform = {}));
export function PlatformToString(platform) {
    switch (platform) {
        case 0 /* Platform.Web */:
            return 'Web';
        case 1 /* Platform.Mac */:
            return 'Mac';
        case 2 /* Platform.Linux */:
            return 'Linux';
        case 3 /* Platform.Windows */:
            return 'Windows';
    }
}
let _platform = 0 /* Platform.Web */;
if (_isMacintosh) {
    _platform = 1 /* Platform.Mac */;
}
else if (_isWindows) {
    _platform = 3 /* Platform.Windows */;
}
else if (_isLinux) {
    _platform = 2 /* Platform.Linux */;
}
export const isWindows = _isWindows;
export const isMacintosh = _isMacintosh;
export const isLinux = _isLinux;
export const isLinuxSnap = _isLinuxSnap;
export const isNative = _isNative;
export const isElectron = _isElectron;
export const isWeb = _isWeb;
export const isWebWorker = _isWeb && typeof $globalThis.importScripts === 'function';
export const webWorkerOrigin = isWebWorker ? $globalThis.origin : undefined;
export const isIOS = _isIOS;
export const isMobile = _isMobile;
/**
 * Whether we run inside a CI environment, such as
 * GH actions or Azure Pipelines.
 */
export const isCI = _isCI;
export const platform = _platform;
export const userAgent = _userAgent;
/**
 * The language used for the user interface. The format of
 * the string is all lower case (e.g. zh-tw for Traditional
 * Chinese or de for German)
 */
export const language = _language;
export var Language;
(function (Language) {
    function value() {
        return language;
    }
    Language.value = value;
    function isDefaultVariant() {
        if (language.length === 2) {
            return language === 'en';
        }
        else if (language.length >= 3) {
            return language[0] === 'e' && language[1] === 'n' && language[2] === '-';
        }
        else {
            return false;
        }
    }
    Language.isDefaultVariant = isDefaultVariant;
    function isDefault() {
        return language === 'en';
    }
    Language.isDefault = isDefault;
})(Language || (Language = {}));
/**
 * Desktop: The OS locale or the locale specified by --locale or `argv.json`.
 * Web: matches `platformLocale`.
 *
 * The UI is not necessarily shown in the provided locale.
 */
export const locale = _locale;
/**
 * This will always be set to the OS/browser's locale regardless of
 * what was specified otherwise. The format of the string is all
 * lower case (e.g. zh-tw for Traditional Chinese). The UI is not
 * necessarily shown in the provided locale.
 */
export const platformLocale = _platformLocale;
/**
 * The translations that are available through language packs.
 */
export const translationsConfigFile = _translationsConfigFile;
export const setTimeout0IsFaster = typeof $globalThis.postMessage === 'function' && !$globalThis.importScripts;
/**
 * See https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#:~:text=than%204%2C%20then-,set%20timeout%20to%204,-.
 *
 * Works similarly to `setTimeout(0)` but doesn't suffer from the 4ms artificial delay
 * that browsers set when the nesting level is > 5.
 */
export const setTimeout0 = (() => {
    if (setTimeout0IsFaster) {
        const pending = [];
        $globalThis.addEventListener('message', (e) => {
            if (e.data && e.data.vscodeScheduleAsyncWork) {
                for (let i = 0, len = pending.length; i < len; i++) {
                    const candidate = pending[i];
                    if (candidate.id === e.data.vscodeScheduleAsyncWork) {
                        pending.splice(i, 1);
                        candidate.callback();
                        return;
                    }
                }
            }
        });
        let lastId = 0;
        return (callback) => {
            const myId = ++lastId;
            pending.push({
                id: myId,
                callback: callback,
            });
            $globalThis.postMessage({ vscodeScheduleAsyncWork: myId }, '*');
        };
    }
    return (callback) => setTimeout(callback);
})();
export var OperatingSystem;
(function (OperatingSystem) {
    OperatingSystem[OperatingSystem["Windows"] = 1] = "Windows";
    OperatingSystem[OperatingSystem["Macintosh"] = 2] = "Macintosh";
    OperatingSystem[OperatingSystem["Linux"] = 3] = "Linux";
})(OperatingSystem || (OperatingSystem = {}));
export const OS = _isMacintosh || _isIOS
    ? 2 /* OperatingSystem.Macintosh */
    : _isWindows
        ? 1 /* OperatingSystem.Windows */
        : 3 /* OperatingSystem.Linux */;
let _isLittleEndian = true;
let _isLittleEndianComputed = false;
export function isLittleEndian() {
    if (!_isLittleEndianComputed) {
        _isLittleEndianComputed = true;
        const test = new Uint8Array(2);
        test[0] = 1;
        test[1] = 2;
        const view = new Uint16Array(test.buffer);
        _isLittleEndian = view[0] === (2 << 8) + 1;
    }
    return _isLittleEndian;
}
export const isChrome = !!(userAgent && userAgent.indexOf('Chrome') >= 0);
export const isFirefox = !!(userAgent && userAgent.indexOf('Firefox') >= 0);
export const isSafari = !!(!isChrome && userAgent && userAgent.indexOf('Safari') >= 0);
export const isEdge = !!(userAgent && userAgent.indexOf('Edg/') >= 0);
export const isAndroid = !!(userAgent && userAgent.indexOf('Android') >= 0);
export function isBigSurOrNewer(osVersion) {
    return parseFloat(osVersion) >= 20;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxhdGZvcm0uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9wbGF0Zm9ybS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGNBQWMsQ0FBQTtBQUVuQyxNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUE7QUFFcEMsSUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFBO0FBQ3RCLElBQUksWUFBWSxHQUFHLEtBQUssQ0FBQTtBQUN4QixJQUFJLFFBQVEsR0FBRyxLQUFLLENBQUE7QUFDcEIsSUFBSSxZQUFZLEdBQUcsS0FBSyxDQUFBO0FBQ3hCLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQTtBQUNyQixJQUFJLE1BQU0sR0FBRyxLQUFLLENBQUE7QUFDbEIsSUFBSSxXQUFXLEdBQUcsS0FBSyxDQUFBO0FBQ3ZCLElBQUksTUFBTSxHQUFHLEtBQUssQ0FBQTtBQUNsQixJQUFJLEtBQUssR0FBRyxLQUFLLENBQUE7QUFDakIsSUFBSSxTQUFTLEdBQUcsS0FBSyxDQUFBO0FBQ3JCLElBQUksT0FBTyxHQUF1QixTQUFTLENBQUE7QUFDM0MsSUFBSSxTQUFTLEdBQVcsZ0JBQWdCLENBQUE7QUFDeEMsSUFBSSxlQUFlLEdBQVcsZ0JBQWdCLENBQUE7QUFDOUMsSUFBSSx1QkFBdUIsR0FBdUIsU0FBUyxDQUFBO0FBQzNELElBQUksVUFBVSxHQUF1QixTQUFTLENBQUE7QUE0QjlDLE1BQU0sV0FBVyxHQUFRLFVBQVUsQ0FBQTtBQUVuQyxJQUFJLFdBQVcsR0FBNkIsU0FBUyxDQUFBO0FBQ3JELElBQ0MsT0FBTyxXQUFXLENBQUMsTUFBTSxLQUFLLFdBQVc7SUFDekMsT0FBTyxXQUFXLENBQUMsTUFBTSxDQUFDLE9BQU8sS0FBSyxXQUFXLEVBQ2hELENBQUM7SUFDRixpQ0FBaUM7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