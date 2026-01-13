/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { localize } from '../../../nls.js';
import { NATIVE_CLI_COMMANDS, OPTIONS, parseArgs } from './argv.js';
function parseAndValidate(cmdLineArgs, reportWarnings) {
    const onMultipleValues = (id, val) => {
        console.warn(localize('multipleValues', "Option '{0}' is defined more than once. Using value '{1}'.", id, val));
    };
    const onEmptyValue = (id) => {
        console.warn(localize('emptyValue', "Option '{0}' requires a non empty value. Ignoring the option.", id));
    };
    const onDeprecatedOption = (deprecatedOption, message) => {
        console.warn(localize('deprecatedArgument', "Option '{0}' is deprecated: {1}", deprecatedOption, message));
    };
    const getSubcommandReporter = (command) => ({
        onUnknownOption: (id) => {
            if (!NATIVE_CLI_COMMANDS.includes(command)) {
                console.warn(localize('unknownSubCommandOption', "Warning: '{0}' is not in the list of known options for subcommand '{1}'", id, command));
            }
        },
        onMultipleValues,
        onEmptyValue,
        onDeprecatedOption,
        getSubcommandReporter: NATIVE_CLI_COMMANDS.includes(command)
            ? getSubcommandReporter
            : undefined,
    });
    const errorReporter = {
        onUnknownOption: (id) => {
            console.warn(localize('unknownOption', "Warning: '{0}' is not in the list of known options, but still passed to Electron/Chromium.", id));
        },
        onMultipleValues,
        onEmptyValue,
        onDeprecatedOption,
        getSubcommandReporter,
    };
    const args = parseArgs(cmdLineArgs, OPTIONS, reportWarnings ? errorReporter : undefined);
    if (args.goto) {
        args._.forEach((arg) => assert(/^(\w:)?[^:]+(:\d*){0,2}:?$/.test(arg), localize('gotoValidation', 'Arguments in `--goto` mode should be in the format of `FILE(:LINE(:CHARACTER))`.')));
    }
    return args;
}
function stripAppPath(argv) {
    const index = argv.findIndex((a) => !/^-/.test(a));
    if (index > -1) {
        return [...argv.slice(0, index), ...argv.slice(index + 1)];
    }
    return undefined;
}
/**
 * Use this to parse raw code process.argv such as: `Electron . --verbose --wait`
 */
export function parseMainProcessArgv(processArgv) {
    let [, ...args] = processArgv;
    // If dev, remove the first non-option argument: it's the app location
    if (process.env['VSCODE_DEV']) {
        args = stripAppPath(args) || [];
    }
    // If called from CLI, don't report warnings as they are already reported.
    const reportWarnings = !isLaunchedFromCli(process.env);
    return parseAndValidate(args, reportWarnings);
}
/**
 * Use this to parse raw code CLI process.argv such as: `Electron cli.js . --verbose --wait`
 */
export function parseCLIProcessArgv(processArgv) {
    let [, , ...args] = processArgv; // remove the first non-option argument: it's always the app location
    // If dev, remove the first non-option argument: it's the app location
    if (process.env['VSCODE_DEV']) {
        args = stripAppPath(args) || [];
    }
    return parseAndValidate(args, true);
}
export function addArg(argv, ...args) {
    const endOfArgsMarkerIndex = argv.indexOf('--');
    if (endOfArgsMarkerIndex === -1) {
        argv.push(...args);
    }
    else {
        // if the we have an argument "--" (end of argument marker)
        // we cannot add arguments at the end. rather, we add
        // arguments before the "--" marker.
        argv.splice(endOfArgsMarkerIndex, 0, ...args);
    }
    return argv;
}
export function isLaunchedFromCli(env) {
    return env['VSCODE_CLI'] === '1';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJndkhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZW52aXJvbm1lbnQvbm9kZS9hcmd2SGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUUzQixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFFMUMsT0FBTyxFQUFpQixtQkFBbUIsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sV0FBVyxDQUFBO0FBRWxGLFNBQVMsZ0JBQWdCLENBQUMsV0FBcUIsRUFBRSxjQUF1QjtJQUN2RSxNQUFNLGdCQUFnQixHQUFHLENBQUMsRUFBVSxFQUFFLEdBQVcsRUFBRSxFQUFFO1FBQ3BELE9BQU8sQ0FBQyxJQUFJLENBQ1gsUUFBUSxDQUNQLGdCQUFnQixFQUNoQiw0REFBNEQsRUFDNUQsRUFBRSxFQUNGLEdBQUcsQ0FDSCxDQUNELENBQUE7SUFDRixDQUFDLENBQUE7SUFDRCxNQUFNLFlBQVksR0FBRyxDQUFDLEVBQVUsRUFBRSxFQUFFO1FBQ25DLE9BQU8sQ0FBQyxJQUFJLENBQ1gsUUFBUSxDQUFDLFlBQVksRUFBRSwrREFBK0QsRUFBRSxFQUFFLENBQUMsQ0FDM0YsQ0FBQTtJQUNGLENBQUMsQ0FBQTtJQUNELE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxnQkFBd0IsRUFBRSxPQUFlLEVBQUUsRUFBRTtRQUN4RSxPQUFPLENBQUMsSUFBSSxDQUNYLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxpQ0FBaUMsRUFBRSxnQkFBZ0IsRUFBRSxPQUFPLENBQUMsQ0FDNUYsQ0FBQTtJQUNGLENBQUMsQ0FBQTtJQUNELE1BQU0scUJBQXFCLEdBQUcsQ0FBQyxPQUFlLEVBQUUsRUFBRSxDQUFDLENBQUM7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