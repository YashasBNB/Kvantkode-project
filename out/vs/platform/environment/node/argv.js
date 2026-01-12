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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJndi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZW52aXJvbm1lbnQvbm9kZS9hcmd2LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sUUFBUSxNQUFNLFVBQVUsQ0FBQTtBQUMvQixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBRzFDOztHQUVHO0FBQ0gsTUFBTSxjQUFjLEdBQUc7SUFDdEIsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxTQUFTLENBQUM7SUFDMUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSx1QkFBdUIsQ0FBQztJQUM1RCxDQUFDLEVBQUUsUUFBUSxDQUFDLGlCQUFpQixFQUFFLGlCQUFpQixDQUFDO0NBQ2pELENBQUE7QUErQkQsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFVLENBQUE7QUFFbkUsTUFBTSxDQUFDLE1BQU0sT0FBTyxHQUFtRDtJQUN0RSxNQUFNLEVBQUU7UUFDUCxJQUFJLEVBQUUsWUFBWTtRQUNsQixXQUFXLEVBQ1YsK0ZBQStGO1FBQ2hHLE9BQU8sRUFBRTtZQUNSLGNBQWMsRUFBRTtnQkFDZixJQUFJLEVBQUUsUUFBUTtnQkFDZCxJQUFJLEVBQUUsS0FBSztnQkFDWCxXQUFXLEVBQUUsUUFBUSxDQUFDLFlBQVksRUFBRSxnREFBZ0QsQ0FBQzthQUNyRjtZQUNELG1CQUFtQixFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRTtZQUN4QyxpQkFBaUIsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUU7WUFDckMsSUFBSSxFQUFFO2dCQUNMLElBQUksRUFBRSxZQUFZO2dCQUNs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