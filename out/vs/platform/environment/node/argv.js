/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import minimist from 'minimist';
import { isWindows } from '../../../base/common/platform.js';
import { localize } from '../../../nls.js';
/**
 * This code is also used by standalone cli's. Avoid adding any other dependencies.
 */
const helpCategories = {
    o: localize('optionsUpperCase', 'Options'),
    e: localize('extensionsManagement', 'Extensions Management'),
    t: localize('troubleshooting', 'Troubleshooting'),
};
export const NATIVE_CLI_COMMANDS = ['tunnel', 'serve-web'];
export const OPTIONS = {
    tunnel: {
        type: 'subcommand',
        description: 'Make the current machine accessible from vscode.dev or other machines through a secure tunnel',
        options: {
            'cli-data-dir': {
                type: 'string',
                args: 'dir',
                description: localize('cliDataDir', 'Directory where CLI metadata should be stored.'),
            },
            'disable-telemetry': { type: 'boolean' },
            'telemetry-level': { type: 'string' },
            user: {
                type: 'subcommand',
                options: {
                    login: {
                        type: 'subcommand',
                        options: {
                            provider: { type: 'string' },
                            'access-token': { type: 'string' },
                        },
                    },
                },
            },
        },
    },
    'serve-web': {
        type: 'subcommand',
        description: 'Run a server that displays the editor UI in browsers.',
        options: {
            'cli-data-dir': {
                type: 'string',
                args: 'dir',
                description: localize('cliDataDir', 'Directory where CLI metadata should be stored.'),
            },
            'disable-telemetry': { type: 'boolean' },
            'telemetry-level': { type: 'string' },
        },
    },
    diff: {
        type: 'boolean',
        cat: 'o',
        alias: 'd',
        args: ['file', 'file'],
        description: localize('diff', 'Compare two files with each other.'),
    },
    merge: {
        type: 'boolean',
        cat: 'o',
        alias: 'm',
        args: ['path1', 'path2', 'base', 'result'],
        description: localize('merge', 'Perform a three-way merge by providing paths for two modified versions of a file, the common origin of both modified versions and the output file to save merge results.'),
    },
    add: {
        type: 'boolean',
        cat: 'o',
        alias: 'a',
        args: 'folder',
        description: localize('add', 'Add folder(s) to the last active window.'),
    },
    remove: {
        type: 'boolean',
        cat: 'o',
        args: 'folder',
        description: localize('remove', 'Remove folder(s) from the last active window.'),
    },
    goto: {
        type: 'boolean',
        cat: 'o',
        alias: 'g',
        args: 'file:line[:character]',
        description: localize('goto', 'Open a file at the path on the specified line and character position.'),
    },
    'new-window': {
        type: 'boolean',
        cat: 'o',
        alias: 'n',
        description: localize('newWindow', 'Force to open a new window.'),
    },
    'reuse-window': {
        type: 'boolean',
        cat: 'o',
        alias: 'r',
        description: localize('reuseWindow', 'Force to open a file or folder in an already opened window.'),
    },
    wait: {
        type: 'boolean',
        cat: 'o',
        alias: 'w',
        description: localize('wait', 'Wait for the files to be closed before returning.'),
    },
    waitMarkerFilePath: { type: 'string' },
    locale: {
        type: 'string',
        cat: 'o',
        args: 'locale',
        description: localize('locale', 'The locale to use (e.g. en-US or zh-TW).'),
    },
    'user-data-dir': {
        type: 'string',
        cat: 'o',
        args: 'dir',
        description: localize('userDataDir', 'Specifies the directory that user data is kept in. Can be used to open multiple distinct instances of Code.'),
    },
    profile: {
        type: 'string',
        cat: 'o',
        args: 'profileName',
        description: localize('profileName', 'Opens the provided folder or workspace with the given profile and associates the profile with the workspace. If the profile does not exist, a new empty one is created.'),
    },
    help: { type: 'boolean', cat: 'o', alias: 'h', description: localize('help', 'Print usage.') },
    'extensions-dir': {
        type: 'string',
        deprecates: ['extensionHomePath'],
        cat: 'e',
        args: 'dir',
        description: localize('extensionHomePath', 'Set the root path for extensions.'),
    },
    'extensions-download-dir': { type: 'string' },
    'builtin-extensions-dir': { type: 'string' },
    'list-extensions': {
        type: 'boolean',
        cat: 'e',
        description: localize('listExtensions', 'List the installed extensions.'),
    },
    'show-versions': {
        type: 'boolean',
        cat: 'e',
        description: localize('showVersions', 'Show versions of installed extensions, when using --list-extensions.'),
    },
    category: {
        type: 'string',
        allowEmptyValue: true,
        cat: 'e',
        description: localize('category', 'Filters installed extensions by provided category, when using --list-extensions.'),
        args: 'category',
    },
    'install-extension': {
        type: 'string[]',
        cat: 'e',
        args: 'ext-id | path',
        description: localize('installExtension', "Installs or updates an extension. The argument is either an extension id or a path to a VSIX. The identifier of an extension is '${publisher}.${name}'. Use '--force' argument to update to latest version. To install a specific version provide '@${version}'. For example: 'vscode.csharp@1.2.3'."),
    },
    'pre-release': {
        type: 'boolean',
        cat: 'e',
        description: localize('install prerelease', 'Installs the pre-release version of the extension, when using --install-extension'),
    },
    'uninstall-extension': {
        type: 'string[]',
        cat: 'e',
        args: 'ext-id',
        description: localize('uninstallExtension', 'Uninstalls an extension.'),
    },
    'update-extensions': {
        type: 'boolean',
        cat: 'e',
        description: localize('updateExtensions', 'Update the installed extensions.'),
    },
    'enable-proposed-api': {
        type: 'string[]',
        allowEmptyValue: true,
        cat: 'e',
        args: 'ext-id',
        description: localize('experimentalApis', 'Enables proposed API features for extensions. Can receive one or more extension IDs to enable individually.'),
    },
    'add-mcp': {
        type: 'string[]',
        cat: 'o',
        args: 'json',
        description: localize('addMcp', 'Adds a Model Context Protocol server definition to the user profile, or workspace or folder when used with --mcp-workspace. Accepts JSON input in the form \'{"name":"server-name","command":...}\''),
    },
    version: {
        type: 'boolean',
        cat: 't',
        alias: 'v',
        description: localize('version', 'Print version.'),
    },
    verbose: {
        type: 'boolean',
        cat: 't',
        global: true,
        description: localize('verbose', 'Print verbose output (implies --wait).'),
    },
    log: {
        type: 'string[]',
        cat: 't',
        args: 'level',
        global: true,
        description: localize('log', "Log level to use. Default is 'info'. Allowed values are 'critical', 'error', 'warn', 'info', 'debug', 'trace', 'off'. You can also configure the log level of an extension by passing extension id and log level in the following format: '${publisher}.${name}:${logLevel}'. For example: 'vscode.csharp:trace'. Can receive one or more such entries."),
    },
    status: {
        type: 'boolean',
        alias: 's',
        cat: 't',
        description: localize('status', 'Print process usage and diagnostics information.'),
    },
    'prof-startup': {
        type: 'boolean',
        cat: 't',
        description: localize('prof-startup', 'Run CPU profiler during startup.'),
    },
    'prof-append-timers': { type: 'string' },
    'prof-duration-markers': { type: 'string[]' },
    'prof-duration-markers-file': { type: 'string' },
    'no-cached-data': { type: 'boolean' },
    'prof-startup-prefix': { type: 'string' },
    'prof-v8-extensions': { type: 'boolean' },
    'disable-extensions': {
        type: 'boolean',
        deprecates: ['disableExtensions'],
        cat: 't',
        description: localize('disableExtensions', 'Disable all installed extensions. This option is not persisted and is effective only when the command opens a new window.'),
    },
    'disable-extension': {
        type: 'string[]',
        cat: 't',
        args: 'ext-id',
        description: localize('disableExtension', 'Disable the provided extension. This option is not persisted and is effective only when the command opens a new window.'),
    },
    sync: {
        type: 'string',
        cat: 't',
        description: localize('turn sync', 'Turn sync on or off.'),
        args: ['on | off'],
    },
    'inspect-extensions': {
        type: 'string',
        allowEmptyValue: true,
        deprecates: ['debugPluginHost'],
        args: 'port',
        cat: 't',
        description: localize('inspect-extensions', 'Allow debugging and profiling of extensions. Check the developer tools for the connection URI.'),
    },
    'inspect-brk-extensions': {
        type: 'string',
        allowEmptyValue: true,
        deprecates: ['debugBrkPluginHost'],
        args: 'port',
        cat: 't',
        description: localize('inspect-brk-extensions', 'Allow debugging and profiling of extensions with the extension host being paused after start. Check the developer tools for the connection URI.'),
    },
    'disable-lcd-text': {
        type: 'boolean',
        cat: 't',
        description: localize('disableLCDText', 'Disable LCD font rendering.'),
    },
    'disable-gpu': {
        type: 'boolean',
        cat: 't',
        description: localize('disableGPU', 'Disable GPU hardware acceleration.'),
    },
    'disable-chromium-sandbox': {
        type: 'boolean',
        cat: 't',
        description: localize('disableChromiumSandbox', 'Use this option only when there is requirement to launch the application as sudo user on Linux or when running as an elevated user in an applocker environment on Windows.'),
    },
    sandbox: { type: 'boolean' },
    'locate-shell-integration-path': {
        type: 'string',
        cat: 't',
        args: ['shell'],
        description: localize('locateShellIntegrationPath', "Print the path to a terminal shell integration script. Allowed values are 'bash', 'pwsh', 'zsh' or 'fish'."),
    },
    telemetry: {
        type: 'boolean',
        cat: 't',
        description: localize('telemetry', 'Shows all telemetry events which VS code collects.'),
    },
    remote: { type: 'string', allowEmptyValue: true },
    'folder-uri': { type: 'string[]', cat: 'o', args: 'uri' },
    'file-uri': { type: 'string[]', cat: 'o', args: 'uri' },
    'locate-extension': { type: 'string[]' },
    extensionDevelopmentPath: { type: 'string[]' },
    extensionDevelopmentKind: { type: 'string[]' },
    extensionTestsPath: { type: 'string' },
    extensionEnvironment: { type: 'string' },
    debugId: { type: 'string' },
    debugRenderer: { type: 'boolean' },
    'inspect-ptyhost': { type: 'string', allowEmptyValue: true },
    'inspect-brk-ptyhost': { type: 'string', allowEmptyValue: true },
    'inspect-search': { type: 'string', deprecates: ['debugSearch'], allowEmptyValue: true },
    'inspect-brk-search': { type: 'string', deprecates: ['debugBrkSearch'], allowEmptyValue: true },
    'inspect-sharedprocess': { type: 'string', allowEmptyValue: true },
    'inspect-brk-sharedprocess': { type: 'string', allowEmptyValue: true },
    'export-default-configuration': { type: 'string' },
    'install-source': { type: 'string' },
    'enable-smoke-test-driver': { type: 'boolean' },
    logExtensionHostCommunication: { type: 'boolean' },
    'skip-release-notes': { type: 'boolean' },
    'skip-welcome': { type: 'boolean' },
    'disable-telemetry': { type: 'boolean' },
    'disable-updates': { type: 'boolean' },
    'use-inmemory-secretstorage': { type: 'boolean', deprecates: ['disable-keytar'] },
    'password-store': { type: 'string' },
    'disable-workspace-trust': { type: 'boolean' },
    'disable-crash-reporter': { type: 'boolean' },
    'crash-reporter-directory': { type: 'string' },
    'crash-reporter-id': { type: 'string' },
    'skip-add-to-recently-opened': { type: 'boolean' },
    'open-url': { type: 'boolean' },
    'file-write': { type: 'boolean' },
    'file-chmod': { type: 'boolean' },
    'install-builtin-extension': { type: 'string[]' },
    force: { type: 'boolean' },
    'do-not-sync': { type: 'boolean' },
    'do-not-include-pack-dependencies': { type: 'boolean' },
    trace: { type: 'boolean' },
    'trace-memory-infra': { type: 'boolean' },
    'trace-category-filter': { type: 'string' },
    'trace-options': { type: 'string' },
    'preserve-env': { type: 'boolean' },
    'force-user-env': { type: 'boolean' },
    'force-disable-user-env': { type: 'boolean' },
    'open-devtools': { type: 'boolean' },
    'disable-gpu-sandbox': { type: 'boolean' },
    logsPath: { type: 'string' },
    '__enable-file-policy': { type: 'boolean' },
    editSessionId: { type: 'string' },
    continueOn: { type: 'string' },
    'enable-coi': { type: 'boolean' },
    'unresponsive-sample-interval': { type: 'string' },
    'unresponsive-sample-period': { type: 'string' },
    // chromium flags
    'no-proxy-server': { type: 'boolean' },
    // Minimist incorrectly parses keys that start with `--no`
    // https://github.com/substack/minimist/blob/aeb3e27dae0412de5c0494e9563a5f10c82cc7a9/index.js#L118-L121
    // If --no-sandbox is passed via cli wrapper it will be treated as --sandbox which is incorrect, we use
    // the alias here to make sure --no-sandbox is always respected.
    // For https://github.com/microsoft/vscode/issues/128279
    'no-sandbox': { type: 'boolean', alias: 'sandbox' },
    'proxy-server': { type: 'string' },
    'proxy-bypass-list': { type: 'string' },
    'proxy-pac-url': { type: 'string' },
    'js-flags': { type: 'string' }, // chrome js flags
    inspect: { type: 'string', allowEmptyValue: true },
    'inspect-brk': { type: 'string', allowEmptyValue: true },
    nolazy: { type: 'boolean' }, // node inspect
    'force-device-scale-factor': { type: 'string' },
    'force-renderer-accessibility': { type: 'boolean' },
    'ignore-certificate-errors': { type: 'boolean' },
    'allow-insecure-localhost': { type: 'boolean' },
    'log-net-log': { type: 'string' },
    vmodule: { type: 'string' },
    _urls: { type: 'string[]' },
    'disable-dev-shm-usage': { type: 'boolean' },
    'profile-temp': { type: 'boolean' },
    'ozone-platform': { type: 'string' },
    'enable-tracing': { type: 'string' },
    'trace-startup-format': { type: 'string' },
    'trace-startup-file': { type: 'string' },
    'trace-startup-duration': { type: 'string' },
    'xdg-portal-required-version': { type: 'string' },
    _: { type: 'string[]' }, // main arguments
};
const ignoringReporter = {
    onUnknownOption: () => { },
    onMultipleValues: () => { },
    onEmptyValue: () => { },
    onDeprecatedOption: () => { },
};
export function parseArgs(args, options, errorReporter = ignoringReporter) {
    const firstArg = args.find((a) => a.length > 0 && a[0] !== '-');
    const alias = {};
    const stringOptions = ['_'];
    const booleanOptions = [];
    const globalOptions = {};
    let command = undefined;
    for (const optionId in options) {
        const o = options[optionId];
        if (o.type === 'subcommand') {
            if (optionId === firstArg) {
                command = o;
            }
        }
        else {
            if (o.alias) {
                alias[optionId] = o.alias;
            }
            if (o.type === 'string' || o.type === 'string[]') {
                stringOptions.push(optionId);
                if (o.deprecates) {
                    stringOptions.push(...o.deprecates);
                }
            }
            else if (o.type === 'boolean') {
                booleanOptions.push(optionId);
                if (o.deprecates) {
                    booleanOptions.push(...o.deprecates);
                }
            }
            if (o.global) {
                globalOptions[optionId] = o;
            }
        }
    }
    if (command && firstArg) {
        const options = globalOptions;
        for (const optionId in command.options) {
            options[optionId] = command.options[optionId];
        }
        const newArgs = args.filter((a) => a !== firstArg);
        const reporter = errorReporter.getSubcommandReporter
            ? errorReporter.getSubcommandReporter(firstArg)
            : undefined;
        const subcommandOptions = parseArgs(newArgs, options, reporter);
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        return {
            [firstArg]: subcommandOptions,
            _: [],
        };
    }
    // remove aliases to avoid confusion
    const parsedArgs = minimist(args, { string: stringOptions, boolean: booleanOptions, alias });
    const cleanedArgs = {};
    const remainingArgs = parsedArgs;
    // https://github.com/microsoft/vscode/issues/58177, https://github.com/microsoft/vscode/issues/106617
    cleanedArgs._ = parsedArgs._.map((arg) => String(arg)).filter((arg) => arg.length > 0);
    delete remainingArgs._;
    for (const optionId in options) {
        const o = options[optionId];
        if (o.type === 'subcommand') {
            continue;
        }
        if (o.alias) {
            delete remainingArgs[o.alias];
        }
        let val = remainingArgs[optionId];
        if (o.deprecates) {
            for (const deprecatedId of o.deprecates) {
                if (remainingArgs.hasOwnProperty(deprecatedId)) {
                    if (!val) {
                        val = remainingArgs[deprecatedId];
                        if (val) {
                            errorReporter.onDeprecatedOption(deprecatedId, o.deprecationMessage ||
                                localize('deprecated.useInstead', 'Use {0} instead.', optionId));
                        }
                    }
                    delete remainingArgs[deprecatedId];
                }
            }
        }
        if (typeof val !== 'undefined') {
            if (o.type === 'string[]') {
                if (!Array.isArray(val)) {
                    val = [val];
                }
                if (!o.allowEmptyValue) {
                    const sanitized = val.filter((v) => v.length > 0);
                    if (sanitized.length !== val.length) {
                        errorReporter.onEmptyValue(optionId);
                        val = sanitized.length > 0 ? sanitized : undefined;
                    }
                }
            }
            else if (o.type === 'string') {
                if (Array.isArray(val)) {
                    val = val.pop(); // take the last
                    errorReporter.onMultipleValues(optionId, val);
                }
                else if (!val && !o.allowEmptyValue) {
                    errorReporter.onEmptyValue(optionId);
                    val = undefined;
                }
            }
            cleanedArgs[optionId] = val;
            if (o.deprecationMessage) {
                errorReporter.onDeprecatedOption(optionId, o.deprecationMessage);
            }
        }
        delete remainingArgs[optionId];
    }
    for (const key in remainingArgs) {
        errorReporter.onUnknownOption(key);
    }
    return cleanedArgs;
}
function formatUsage(optionId, option) {
    let args = '';
    if (option.args) {
        if (Array.isArray(option.args)) {
            args = ` <${option.args.join('> <')}>`;
        }
        else {
            args = ` <${option.args}>`;
        }
    }
    if (option.alias) {
        return `-${option.alias} --${optionId}${args}`;
    }
    return `--${optionId}${args}`;
}
// exported only for testing
export function formatOptions(options, columns) {
    const usageTexts = [];
    for (const optionId in options) {
        const o = options[optionId];
        const usageText = formatUsage(optionId, o);
        usageTexts.push([usageText, o.description]);
    }
    return formatUsageTexts(usageTexts, columns);
}
function formatUsageTexts(usageTexts, columns) {
    const maxLength = usageTexts.reduce((previous, e) => Math.max(previous, e[0].length), 12);
    const argLength = maxLength + 2 /*left padding*/ + 1; /*right padding*/
    if (columns - argLength < 25) {
        // Use a condensed version on narrow terminals
        return usageTexts.reduce((r, ut) => r.concat([`  ${ut[0]}`, `      ${ut[1]}`]), []);
    }
    const descriptionColumns = columns - argLength - 1;
    const result = [];
    for (const ut of usageTexts) {
        const usage = ut[0];
        const wrappedDescription = wrapText(ut[1], descriptionColumns);
        const keyPadding = indent(argLength - usage.length - 2 /*left padding*/);
        result.push('  ' + usage + keyPadding + wrappedDescription[0]);
        for (let i = 1; i < wrappedDescription.length; i++) {
            result.push(indent(argLength) + wrappedDescription[i]);
        }
    }
    return result;
}
function indent(count) {
    return ' '.repeat(count);
}
function wrapText(text, columns) {
    const lines = [];
    while (text.length) {
        let index = text.length < columns ? text.length : text.lastIndexOf(' ', columns);
        if (index === 0) {
            index = columns;
        }
        const line = text.slice(0, index).trim();
        text = text.slice(index).trimStart();
        lines.push(line);
    }
    return lines;
}
export function buildHelpMessage(productName, executableName, version, options, capabilities) {
    const columns = (process.stdout.isTTY && process.stdout.columns) || 80;
    const inputFiles = capabilities?.noInputFiles !== true ? `[${localize('paths', 'paths')}...]` : '';
    const help = [`${productName} ${version}`];
    help.push('');
    help.push(`${localize('usage', 'Usage')}: ${executableName} [${localize('options', 'options')}]${inputFiles}`);
    help.push('');
    if (capabilities?.noPipe !== true) {
        if (isWindows) {
            help.push(localize('stdinWindows', "To read output from another program, append '-' (e.g. 'echo Hello World | {0} -')", executableName));
        }
        else {
            help.push(localize('stdinUnix', "To read from stdin, append '-' (e.g. 'ps aux | grep code | {0} -')", executableName));
        }
        help.push('');
    }
    const optionsByCategory = {};
    const subcommands = [];
    for (const optionId in options) {
        const o = options[optionId];
        if (o.type === 'subcommand') {
            if (o.description) {
                subcommands.push({ command: optionId, description: o.description });
            }
        }
        else if (o.description && o.cat) {
            let optionsByCat = optionsByCategory[o.cat];
            if (!optionsByCat) {
                optionsByCategory[o.cat] = optionsByCat = {};
            }
            optionsByCat[optionId] = o;
        }
    }
    for (const helpCategoryKey in optionsByCategory) {
        const key = helpCategoryKey;
        const categoryOptions = optionsByCategory[key];
        if (categoryOptions) {
            help.push(helpCategories[key]);
            help.push(...formatOptions(categoryOptions, columns));
            help.push('');
        }
    }
    if (subcommands.length) {
        help.push(localize('subcommands', 'Subcommands'));
        help.push(...formatUsageTexts(subcommands.map((s) => [s.command, s.description]), columns));
        help.push('');
    }
    return help.join('\n');
}
export function buildVersionMessage(version, commit) {
    return `${version || localize('unknownVersion', 'Unknown version')}\n${commit || localize('unknownCommit', 'Unknown commit')}\n${process.arch}`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJndi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2Vudmlyb25tZW50L25vZGUvYXJndi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLFFBQVEsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUcxQzs7R0FFRztBQUNILE1BQU0sY0FBYyxHQUFHO0lBQ3RCLENBQUMsRUFBRSxRQUFRLENBQUMsa0JBQWtCLEVBQUUsU0FBUyxDQUFDO0lBQzFDLENBQUMsRUFBRSxRQUFRLENBQUMsc0JBQXNCLEVBQUUsdUJBQXVCLENBQUM7SUFDNUQsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxpQkFBaUIsQ0FBQztDQUNqRCxDQUFBO0FBK0JELE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBVSxDQUFBO0FBRW5FLE1BQU0sQ0FBQyxNQUFNLE9BQU8sR0FBbUQ7SUFDdEUsTUFBTSxFQUFFO1FBQ1AsSUFBSSxFQUFFLFlBQVk7UUFDbEIsV0FBVyxFQUNWLCtGQUErRjtRQUNoRyxPQUFPLEVBQUU7WUFDUixjQUFjLEVBQUU7Z0JBQ2YsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsSUFBSSxFQUFFLEtBQUs7Z0JBQ1gsV0FBVyxFQUFFLFFBQVEsQ0FBQyxZQUFZLEVBQUUsZ0RBQWdELENBQUM7YUFDckY7WUFDRCxtQkFBbUIsRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUU7WUFDeEMsaUJBQWlCLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFO1lBQ3JDLElBQUksRUFBRTtnQkFDTCxJQUFJLEVBQUUsWUFBWTtnQkFDbEIsT0FB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