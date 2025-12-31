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
            const iconPath = '/Users/yashasnaidu/Kvantcode/PHOTO-2025-10-24-22-22-34.jpg';
            const img = nativeImage.createFromPath(iconPath);
            if (!img.isEmpty() && app.dock) {
                app.dock.setIcon(img);
            }
        }
        catch { }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbIm1haW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLElBQUksTUFBTSxNQUFNLENBQUE7QUFDNUIsT0FBTyxLQUFLLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFDakMsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDeEIsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUN4QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDakQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLEtBQUssQ0FBQTtBQUNuQyxPQUFPLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxXQUFXLEVBQUUsTUFBTSxVQUFVLENBQUE7QUFDMUYsT0FBTyxRQUFRLE1BQU0sVUFBVSxDQUFBO0FBQy9CLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDakQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUE7QUFDdkQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBSXpFLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENB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