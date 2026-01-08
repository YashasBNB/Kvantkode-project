/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as path from 'path';
import * as fs from 'original-fs';
import * as os from 'os';
import { performance } from 'perf_hooks';
import { configurePortable } from './bootstrap-node.js';
import { bootstrapESM } from './bootstrap-esm.js';
import { fileURLToPath } from 'url';
import { app, protocol, crashReporter, Menu, contentTracing, nativeImage } from 'electron';
import minimist from 'minimist';
import { product } from './bootstrap-meta.js';
import { parse } from './vs/base/common/jsonc.js';
import { getUserDataPath } from './vs/platform/environment/node/userDataPath.js';
import * as perf from './vs/base/common/performance.js';
import { resolveNLSConfiguration } from './vs/base/node/nls.js';
import { getUNCHost, addUNCHostToAllowlist } from './vs/base/node/unc.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
perf.mark('code/didStartMain');
perf.mark('code/willLoadMainBundle', {
    // When built, the main bundle is a single JS file with all
    // dependencies inlined. As such, we mark `willLoadMainBundle`
    // as the start of the main bundle loading process.
    startTime: Math.floor(performance.timeOrigin),
});
perf.mark('code/didLoadMainBundle');
// Enable portable support
const portable = configurePortable(product);
const args = parseCLIArgs();
// Configure static command line arguments
const argvConfig = configureCommandlineSwitchesSync(args);
// Enable sandbox globally unless
// 1) disabled via command line using either
//    `--no-sandbox` or `--disable-chromium-sandbox` argument.
// 2) argv.json contains `disable-chromium-sandbox: true`.
if (args['sandbox'] &&
    !args['disable-chromium-sandbox'] &&
    !argvConfig['disable-chromium-sandbox']) {
    app.enableSandbox();
}
else if (app.commandLine.hasSwitch('no-sandbox') &&
    !app.commandLine.hasSwitch('disable-gpu-sandbox')) {
    // Disable GPU sandbox whenever --no-sandbox is used.
    app.commandLine.appendSwitch('disable-gpu-sandbox');
}
else {
    app.commandLine.appendSwitch('no-sandbox');
    app.commandLine.appendSwitch('disable-gpu-sandbox');
}
// Set userData path before app 'ready' event
const userDataPath = getUserDataPath(args, product.nameShort ?? 'code-oss-dev');
if (process.platform === 'win32') {
    const userDataUNCHost = getUNCHost(userDataPath);
    if (userDataUNCHost) {
        addUNCHostToAllowlist(userDataUNCHost); // enables to use UNC paths in userDataPath
    }
}
app.setPath('userData', userDataPath);
// On macOS, ensure the top-left app menu displays the correct name at runtime
if (process.platform === 'darwin') {
    try {
        const appName = product.nameLong || 'KvantKode';
        // Prefer setName if available
        if (typeof app.setName === 'function') {
            ;
            app.setName(appName);
        }
        // Fallback assignment
        ;
        app.name = appName;
    }
    catch { }
}
// Resolve code cache path
const codeCachePath = getCodeCachePath();
// Disable default menu (https://github.com/electron/electron/issues/35512)
Menu.setApplicationMenu(null);
// Configure crash reporter
perf.mark('code/willStartCrashReporter');
// If a crash-reporter-directory is specified we store the crash reports
// in the specified directory and don't upload them to the crash server.
//
// Appcenter crash reporting is enabled if
// * enable-crash-reporter runtime argument is set to 'true'
// * --disable-crash-reporter command line parameter is not set
//
// Disable crash reporting in all other cases.
if (args['crash-reporter-directory'] ||
    (argvConfig['enable-crash-reporter'] && !args['disable-crash-reporter'])) {
    configureCrashReporter();
}
perf.mark('code/didStartCrashReporter');
// Set logs path before app 'ready' event if running portable
// to ensure that no 'logs' folder is created on disk at a
// location outside of the portable directory
// (https://github.com/microsoft/vscode/issues/56651)
if (portable && portable.isPortable) {
    app.setAppLogsPath(path.join(userDataPath, 'logs'));
}
// Register custom schemes with privileges
protocol.registerSchemesAsPrivileged([
    {
        scheme: 'vscode-webview',
        privileges: {
            standard: true,
            secure: true,
            supportFetchAPI: true,
            corsEnabled: true,
            allowServiceWorkers: true,
            codeCache: true,
        },
    },
    {
        scheme: 'vscode-file',
        privileges: {
            secure: true,
            standard: true,
            supportFetchAPI: true,
            corsEnabled: true,
            codeCache: true,
        },
    },
]);
// Global app listeners
registerListeners();
/**
 * We can resolve the NLS configuration early if it is defined
 * in argv.json before `app.ready` event. Otherwise we can only
 * resolve NLS after `app.ready` event to resolve the OS locale.
 */
let nlsConfigurationPromise = undefined;
// Use the most preferred OS language for language recommendation.
// The API might return an empty array on Linux, such as when
// the 'C' locale is the user's only configured locale.
// No matter the OS, if the array is empty, default back to 'en'.
const osLocale = processZhLocale((app.getPreferredSystemLanguages()?.[0] ?? 'en').toLowerCase());
const userLocale = getUserDefinedLocale(argvConfig);
if (userLocale) {
    nlsConfigurationPromise = resolveNLSConfiguration({
        userLocale,
        osLocale,
        commit: product.commit,
        userDataPath,
        nlsMetadataPath: __dirname,
    });
}
// Pass in the locale to Electron so that the
// Windows Control Overlay is rendered correctly on Windows.
// For now, don't pass in the locale on macOS due to
// https://github.com/microsoft/vscode/issues/167543.
// If the locale is `qps-ploc`, the Microsoft
// Pseudo Language Language Pack is being used.
// In that case, use `en` as the Electron locale.
if (process.platform === 'win32' || process.platform === 'linux') {
    const electronLocale = !userLocale || userLocale === 'qps-ploc' ? 'en' : userLocale;
    app.commandLine.appendSwitch('lang', electronLocale);
}
// Load our code once ready
app.once('ready', function () {
    // Set KvantKode dock icon on macOS during dev/runtime
    if (process.platform === 'darwin') {
        try {
            const iconPath = '/Users/yashasnaidu/Kvantcode/kvantkode_dock_256.png';
            console.log('Setting dock icon:', iconPath);
            const img = nativeImage.createFromPath(iconPath);
            console.log('Image created, empty:', img.isEmpty(), 'size:', img.getSize());
            // Try multiple methods to set the icon
            if (!img.isEmpty() && app.dock) {
                // Method 1: Direct set
                app.dock.setIcon(img);
                console.log('Dock icon set successfully (method 1)');
                // Method 2: Force update after delay
                setTimeout(() => {
                    if (app.dock) {
                        app.dock.setIcon(img);
                        app.dock.bounce();
                        console.log('Dock icon updated (method 2)');
                    }
                }, 1000);
                // Method 3: Clear and reset
                setTimeout(() => {
                    if (app.dock) {
                        const emptyImg = nativeImage.createEmpty();
                        app.dock.setIcon(emptyImg); // Clear first
                        setTimeout(() => {
                            app.dock.setIcon(img); // Then set again
                            console.log('Dock icon reset (method 3)');
                        }, 100);
                    }
                }, 3000);
            }
            else {
                console.log('Failed to set dock icon - image empty or dock unavailable');
            }
        }
        catch (error) {
            console.error('Error setting dock icon:', error);
        }
    }
    if (args['trace']) {
        let traceOptions;
        if (args['trace-memory-infra']) {
            const customCategories = args['trace-category-filter']?.split(',') || [];
            customCategories.push('disabled-by-default-memory-infra', 'disabled-by-default-memory-infra.v8.code_stats');
            traceOptions = {
                included_categories: customCategories,
                excluded_categories: ['*'],
                memory_dump_config: {
                    allowed_dump_modes: ['light', 'detailed'],
                    triggers: [
                        {
                            type: 'periodic_interval',
                            mode: 'detailed',
                            min_time_between_dumps_ms: 10000,
                        },
                        {
                            type: 'periodic_interval',
                            mode: 'light',
                            min_time_between_dumps_ms: 1000,
                        },
                    ],
                },
            };
        }
        else {
            traceOptions = {
                categoryFilter: args['trace-category-filter'] || '*',
                traceOptions: args['trace-options'] || 'record-until-full,enable-sampling',
            };
        }
        contentTracing.startRecording(traceOptions).finally(() => onReady());
    }
    else {
        onReady();
    }
});
async function onReady() {
    perf.mark('code/mainAppReady');
    try {
        const [, nlsConfig] = await Promise.all([
            mkdirpIgnoreError(codeCachePath),
            resolveNlsConfiguration(),
        ]);
        await startup(codeCachePath, nlsConfig);
    }
    catch (error) {
        console.error(error);
    }
}
/**
 * Main startup routine
 */
async function startup(codeCachePath, nlsConfig) {
    process.env['VSCODE_NLS_CONFIG'] = JSON.stringify(nlsConfig);
    process.env['VSCODE_CODE_CACHE_PATH'] = codeCachePath || '';
    // Bootstrap ESM
    await bootstrapESM();
    // Load Main
    await import('./vs/code/electron-main/main.js');
    perf.mark('code/didRunMainBundle');
}
function configureCommandlineSwitchesSync(cliArgs) {
    const SUPPORTED_ELECTRON_SWITCHES = [
        // alias from us for --disable-gpu
        'disable-hardware-acceleration',
        // override for the color profile to use
        'force-color-profile',
        // disable LCD font rendering, a Chromium flag
        'disable-lcd-text',
        // bypass any specified proxy for the given semi-colon-separated list of hosts
        'proxy-bypass-list',
    ];
    if (process.platform === 'linux') {
        // Force enable screen readers on Linux via this flag
        SUPPORTED_ELECTRON_SWITCHES.push('force-renderer-accessibility');
        // override which password-store is used on Linux
        SUPPORTED_ELECTRON_SWITCHES.push('password-store');
    }
    const SUPPORTED_MAIN_PROCESS_SWITCHES = [
        // Persistently enable proposed api via argv.json: https://github.com/microsoft/vscode/issues/99775
        'enable-proposed-api',
        // Log level to use. Default is 'info'. Allowed values are 'error', 'warn', 'info', 'debug', 'trace', 'off'.
        'log-level',
        // Use an in-memory storage for secrets
        'use-inmemory-secretstorage',
    ];
    // Read argv config
    const argvConfig = readArgvConfigSync();
    Object.keys(argvConfig).forEach((argvKey) => {
        const argvValue = argvConfig[argvKey];
        // Append Electron flags to Electron
        if (SUPPORTED_ELECTRON_SWITCHES.indexOf(argvKey) !== -1) {
            if (argvValue === true || argvValue === 'true') {
                if (argvKey === 'disable-hardware-acceleration') {
                    app.disableHardwareAcceleration(); // needs to be called explicitly
                }
                else {
                    app.commandLine.appendSwitch(argvKey);
                }
            }
            else if (typeof argvValue === 'string' && argvValue) {
                if (argvKey === 'password-store') {
                    // Password store
                    // TODO@TylerLeonhardt: Remove this migration in 3 months
                    let migratedArgvValue = argvValue;
                    if (argvValue === 'gnome' || argvValue === 'gnome-keyring') {
                        migratedArgvValue = 'gnome-libsecret';
                    }
                    app.commandLine.appendSwitch(argvKey, migratedArgvValue);
                }
                else {
                    app.commandLine.appendSwitch(argvKey, argvValue);
                }
            }
        }
        // Append main process flags to process.argv
        else if (SUPPORTED_MAIN_PROCESS_SWITCHES.indexOf(argvKey) !== -1) {
            switch (argvKey) {
                case 'enable-proposed-api':
                    if (Array.isArray(argvValue)) {
                        argvValue.forEach((id) => id && typeof id === 'string' && process.argv.push('--enable-proposed-api', id));
                    }
                    else {
                        console.error(`Unexpected value for \`enable-proposed-api\` in argv.json. Expected array of extension ids.`);
                    }
                    break;
                case 'log-level':
                    if (typeof argvValue === 'string') {
                        process.argv.push('--log', argvValue);
                    }
                    else if (Array.isArray(argvValue)) {
                        for (const value of argvValue) {
                            process.argv.push('--log', value);
                        }
                    }
                    break;
                case 'use-inmemory-secretstorage':
                    if (argvValue) {
                        process.argv.push('--use-inmemory-secretstorage');
                    }
                    break;
            }
        }
    });
    // Following features are enabled from the runtime:
    // `DocumentPolicyIncludeJSCallStacksInCrashReports` - https://www.electronjs.org/docs/latest/api/web-frame-main#framecollectjavascriptcallstack-experimental
    const featuresToEnable = `DocumentPolicyIncludeJSCallStacksInCrashReports, ${app.commandLine.getSwitchValue('enable-features')}`;
    app.commandLine.appendSwitch('enable-features', featuresToEnable);
    // Following features are disabled from the runtime:
    // `CalculateNativeWinOcclusion` - Disable native window occlusion tracker (https://groups.google.com/a/chromium.org/g/embedder-dev/c/ZF3uHHyWLKw/m/VDN2hDXMAAAJ)
    const featuresToDisable = `CalculateNativeWinOcclusion,${app.commandLine.getSwitchValue('disable-features')}`;
    app.commandLine.appendSwitch('disable-features', featuresToDisable);
    // Blink features to configure.
    // `FontMatchingCTMigration` - Siwtch font matching on macOS to Appkit (Refs https://github.com/microsoft/vscode/issues/224496#issuecomment-2270418470).
    // `StandardizedBrowserZoom` - Disable zoom adjustment for bounding box (https://github.com/microsoft/vscode/issues/232750#issuecomment-2459495394)
    const blinkFeaturesToDisable = `FontMatchingCTMigration,StandardizedBrowserZoom,${app.commandLine.getSwitchValue('disable-blink-features')}`;
    app.commandLine.appendSwitch('disable-blink-features', blinkFeaturesToDisable);
    // Support JS Flags
    const jsFlags = getJSFlags(cliArgs);
    if (jsFlags) {
        app.commandLine.appendSwitch('js-flags', jsFlags);
    }
    // Use portal version 4 that supports current_folder option
    // to address https://github.com/microsoft/vscode/issues/213780
    // Runtime sets the default version to 3, refs https://github.com/electron/electron/pull/44426
    app.commandLine.appendSwitch('xdg-portal-required-version', '4');
    return argvConfig;
}
function readArgvConfigSync() {
    // Read or create the argv.json config file sync before app('ready')
    const argvConfigPath = getArgvConfigPath();
    let argvConfig = undefined;
    try {
        argvConfig = parse(fs.readFileSync(argvConfigPath).toString());
    }
    catch (error) {
        if (error && error.code === 'ENOENT') {
            createDefaultArgvConfigSync(argvConfigPath);
        }
        else {
            console.warn(`Unable to read argv.json configuration file in ${argvConfigPath}, falling back to defaults (${error})`);
        }
    }
    // Fallback to default
    if (!argvConfig) {
        argvConfig = {};
    }
    return argvConfig;
}
function createDefaultArgvConfigSync(argvConfigPath) {
    try {
        // Ensure argv config parent exists
        const argvConfigPathDirname = path.dirname(argvConfigPath);
        if (!fs.existsSync(argvConfigPathDirname)) {
            fs.mkdirSync(argvConfigPathDirname);
        }
        // Default argv content
        const defaultArgvConfigContent = [
            '// This configuration file allows you to pass permanent command line arguments to VS Code.',
            '// Only a subset of arguments is currently supported to reduce the likelihood of breaking',
            '// the installation.',
            '//',
            '// PLEASE DO NOT CHANGE WITHOUT UNDERSTANDING THE IMPACT',
            '//',
            '// NOTE: Changing this file requires a restart of VS Code.',
            '{',
            '	// Use software rendering instead of hardware accelerated rendering.',
            '	// This can help in cases where you see rendering issues in VS Code.',
            '	// "disable-hardware-acceleration": true',
            '}',
        ];
        // Create initial argv.json with default content
        fs.writeFileSync(argvConfigPath, defaultArgvConfigContent.join('\n'));
    }
    catch (error) {
        console.error(`Unable to create argv.json configuration file in ${argvConfigPath}, falling back to defaults (${error})`);
    }
}
function getArgvConfigPath() {
    const vscodePortable = process.env['VSCODE_PORTABLE'];
    if (vscodePortable) {
        return path.join(vscodePortable, 'argv.json');
    }
    let dataFolderName = product.dataFolderName;
    if (process.env['VSCODE_DEV']) {
        dataFolderName = `${dataFolderName}-dev`;
    }
    return path.join(os.homedir(), dataFolderName, 'argv.json');
}
function configureCrashReporter() {
    let crashReporterDirectory = args['crash-reporter-directory'];
    let submitURL = '';
    if (crashReporterDirectory) {
        crashReporterDirectory = path.normalize(crashReporterDirectory);
        if (!path.isAbsolute(crashReporterDirectory)) {
            console.error(`The path '${crashReporterDirectory}' specified for --crash-reporter-directory must be absolute.`);
            app.exit(1);
        }
        if (!fs.existsSync(crashReporterDirectory)) {
            try {
                fs.mkdirSync(crashReporterDirectory, { recursive: true });
            }
            catch (error) {
                console.error(`The path '${crashReporterDirectory}' specified for --crash-reporter-directory does not seem to exist or cannot be created.`);
                app.exit(1);
            }
        }
        // Crashes are stored in the crashDumps directory by default, so we
        // need to change that directory to the provided one
        console.log(`Found --crash-reporter-directory argument. Setting crashDumps directory to be '${crashReporterDirectory}'`);
        app.setPath('crashDumps', crashReporterDirectory);
    }
    // Otherwise we configure the crash reporter from product.json
    else {
        const appCenter = product.appCenter;
        if (appCenter) {
            const isWindows = process.platform === 'win32';
            const isLinux = process.platform === 'linux';
            const isDarwin = process.platform === 'darwin';
            const crashReporterId = argvConfig['crash-reporter-id'];
            const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (crashReporterId && uuidPattern.test(crashReporterId)) {
                if (isWindows) {
                    switch (process.arch) {
                        case 'x64':
                            submitURL = appCenter['win32-x64'];
                            break;
                        case 'arm64':
                            submitURL = appCenter['win32-arm64'];
                            break;
                    }
                }
                else if (isDarwin) {
                    if (product.darwinUniversalAssetId) {
                        submitURL = appCenter['darwin-universal'];
                    }
                    else {
                        switch (process.arch) {
                            case 'x64':
                                submitURL = appCenter['darwin'];
                                break;
                            case 'arm64':
                                submitURL = appCenter['darwin-arm64'];
                                break;
                        }
                    }
                }
                else if (isLinux) {
                    submitURL = appCenter['linux-x64'];
                }
                submitURL = submitURL.concat('&uid=', crashReporterId, '&iid=', crashReporterId, '&sid=', crashReporterId);
                // Send the id for child node process that are explicitly starting crash reporter.
                // For vscode this is ExtensionHost process currently.
                const argv = process.argv;
                const endOfArgsMarkerIndex = argv.indexOf('--');
                if (endOfArgsMarkerIndex === -1) {
                    argv.push('--crash-reporter-id', crashReporterId);
                }
                else {
                    // if the we have an argument "--" (end of argument marker)
                    // we cannot add arguments at the end. rather, we add
                    // arguments before the "--" marker.
                    argv.splice(endOfArgsMarkerIndex, 0, '--crash-reporter-id', crashReporterId);
                }
            }
        }
    }
    // Start crash reporter for all processes
    const productName = (product.crashReporter ? product.crashReporter.productName : undefined) || product.nameShort;
    const companyName = (product.crashReporter ? product.crashReporter.companyName : undefined) || 'Microsoft';
    const uploadToServer = Boolean(!process.env['VSCODE_DEV'] && submitURL && !crashReporterDirectory);
    crashReporter.start({
        companyName,
        productName: process.env['VSCODE_DEV'] ? `${productName} Dev` : productName,
        submitURL,
        uploadToServer,
        compress: true,
    });
}
function getJSFlags(cliArgs) {
    const jsFlags = [];
    // Add any existing JS flags we already got from the command line
    if (cliArgs['js-flags']) {
        jsFlags.push(cliArgs['js-flags']);
    }
    if (process.platform === 'linux') {
        // Fix cppgc crash on Linux with 16KB page size.
        // Refs https://issues.chromium.org/issues/378017037
        // The fix from https://github.com/electron/electron/commit/6c5b2ef55e08dc0bede02384747549c1eadac0eb
        // only affects non-renderer process.
        // The following will ensure that the flag will be
        // applied to the renderer process as well.
        // TODO(deepak1556): Remove this once we update to
        // Chromium >= 134.
        jsFlags.push('--nodecommit_pooled_pages');
    }
    return jsFlags.length > 0 ? jsFlags.join(' ') : null;
}
function parseCLIArgs() {
    return minimist(process.argv, {
        string: ['user-data-dir', 'locale', 'js-flags', 'crash-reporter-directory'],
        boolean: ['disable-chromium-sandbox'],
        default: {
            sandbox: true,
        },
        alias: {
            'no-sandbox': 'sandbox',
        },
    });
}
function registerListeners() {
    /**
     * macOS: when someone drops a file to the not-yet running VSCode, the open-file event fires even before
     * the app-ready event. We listen very early for open-file and remember this upon startup as path to open.
     */
    const macOpenFiles = [];
    globalThis['macOpenFiles'] = macOpenFiles;
    app.on('open-file', function (event, path) {
        macOpenFiles.push(path);
    });
    /**
     * macOS: react to open-url requests.
     */
    const openUrls = [];
    const onOpenUrl = function (event, url) {
        event.preventDefault();
        openUrls.push(url);
    };
    app.on('will-finish-launching', function () {
        app.on('open-url', onOpenUrl);
    });
    globalThis['getOpenUrls'] = function () {
        app.removeListener('open-url', onOpenUrl);
        return openUrls;
    };
}
function getCodeCachePath() {
    // explicitly disabled via CLI args
    if (process.argv.indexOf('--no-cached-data') > 0) {
        return undefined;
    }
    // running out of sources
    if (process.env['VSCODE_DEV']) {
        return undefined;
    }
    // require commit id
    const commit = product.commit;
    if (!commit) {
        return undefined;
    }
    return path.join(userDataPath, 'CachedData', commit);
}
async function mkdirpIgnoreError(dir) {
    if (typeof dir === 'string') {
        try {
            await fs.promises.mkdir(dir, { recursive: true });
            return dir;
        }
        catch (error) {
            // ignore
        }
    }
    return undefined;
}
//#region NLS Support
function processZhLocale(appLocale) {
    if (appLocale.startsWith('zh')) {
        const region = appLocale.split('-')[1];
        // On Windows and macOS, Chinese languages returned by
        // app.getPreferredSystemLanguages() start with zh-hans
        // for Simplified Chinese or zh-hant for Traditional Chinese,
        // so we can easily determine whether to use Simplified or Traditional.
        // However, on Linux, Chinese languages returned by that same API
        // are of the form zh-XY, where XY is a country code.
        // For China (CN), Singapore (SG), and Malaysia (MY)
        // country codes, assume they use Simplified Chinese.
        // For other cases, assume they use Traditional.
        if (['hans', 'cn', 'sg', 'my'].includes(region)) {
            return 'zh-cn';
        }
        return 'zh-tw';
    }
    return appLocale;
}
/**
 * Resolve the NLS configuration
 */
async function resolveNlsConfiguration() {
    // First, we need to test a user defined locale.
    // If it fails we try the app locale.
    // If that fails we fall back to English.
    const nlsConfiguration = nlsConfigurationPromise ? await nlsConfigurationPromise : undefined;
    if (nlsConfiguration) {
        return nlsConfiguration;
    }
    // Try to use the app locale which is only valid
    // after the app ready event has been fired.
    let userLocale = app.getLocale();
    if (!userLocale) {
        return {
            userLocale: 'en',
            osLocale,
            resolvedLanguage: 'en',
            defaultMessagesFile: path.join(__dirname, 'nls.messages.json'),
            // NLS: below 2 are a relic from old times only used by vscode-nls and deprecated
            locale: 'en',
            availableLanguages: {},
        };
    }
    // See above the comment about the loader and case sensitiveness
    userLocale = processZhLocale(userLocale.toLowerCase());
    return resolveNLSConfiguration({
        userLocale,
        osLocale,
        commit: product.commit,
        userDataPath,
        nlsMetadataPath: __dirname,
    });
}
/**
 * Language tags are case insensitive however an ESM loader is case sensitive
 * To make this work on case preserving & insensitive FS we do the following:
 * the language bundles have lower case language tags and we always lower case
 * the locale we receive from the user or OS.
 */
function getUserDefinedLocale(argvConfig) {
    const locale = args['locale'];
    if (locale) {
        return locale.toLowerCase(); // a directly provided --locale always wins
    }
    return typeof argvConfig?.locale === 'string' ? argvConfig.locale.toLowerCase() : undefined;
}
//#endregion
// Delayed dock icon setting as fallback
if (process.platform === 'darwin') {
    setTimeout(() => {
        try {
            const iconPath = '/Users/yashasnaidu/Kvantcode/kvantkode_dock_256.png';
            console.log('Delayed dock icon setting:', iconPath);
            const img = nativeImage.createFromPath(iconPath);
            if (!img.isEmpty() && app.dock) {
                app.dock.setIcon(img);
                app.dock.bounce();
                console.log('Delayed dock icon set successfully!');
            }
        }
        catch (error) {
            console.error('Error in delayed dock icon setting:', error);
        }
    }, 5000); // 5 second delay
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsibWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssSUFBSSxNQUFNLE1BQU0sQ0FBQTtBQUM1QixPQUFPLEtBQUssRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUNqQyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQTtBQUN4QixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBQ3hDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sS0FBSyxDQUFBO0FBQ25DLE9BQU8sRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLFdBQVcsRUFBRSxNQUFNLFVBQVUsQ0FBQTtBQUMxRixPQUFPLFFBQVEsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDaEYsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFJekUsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENB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