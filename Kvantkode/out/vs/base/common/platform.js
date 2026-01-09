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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxhdGZvcm0uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL3BsYXRmb3JtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sY0FBYyxDQUFBO0FBRW5DLE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQTtBQUVwQyxJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUE7QUFDdEIsSUFBSSxZQUFZLEdBQUcsS0FBSyxDQUFBO0FBQ3hCLElBQUksUUFBUSxHQUFHLEtBQUssQ0FBQTtBQUNwQixJQUFJLFlBQVksR0FBRyxLQUFLLENBQUE7QUFDeEIsSUFBSSxTQUFTLEdBQUcsS0FBSyxDQUFBO0FBQ3JCLElBQUksTUFBTSxHQUFHLEtBQUssQ0FBQTtBQUNsQixJQUFJLFdBQVcsR0FBRyxLQUFLLENBQUE7QUFDdkIsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFBO0FBQ2xCLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQTtBQUNqQixJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUE7QUFDckIsSUFBSSxPQUFPLEdBQXVCLFNBQVMsQ0FBQTtBQUMzQyxJQUFJLFNBQVMsR0FBVyxnQkFBZ0IsQ0FBQTtBQUN4QyxJQUFJLGVBQWUsR0FBVyxnQkFBZ0IsQ0FBQTtBQUM5QyxJQUFJLHVCQUF1QixHQUF1QixTQUFTLENBQUE7QUFDM0QsSUFBSSxVQUFVLEdBQXVCLFNBQVMsQ0FBQTtBQTRCOUMsTUFBTSxXQUFXLEdBQVEsVUFBVSxDQUFBO0FBRW5DLElBQUksV0FBVyxHQUE2QixTQUFTLENBQUE7QUFDckQsSUFDQyxPQUFPLFdBQVcsQ0FBQyxNQUFNLEtBQUssV0FBVztJQUN6QyxPQUFPLFdBQVcsQ0FBQyxNQUFNLENBQUMsT0FBTyxLQUFLLFdBQVcs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