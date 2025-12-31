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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJndkhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2Vudmlyb25tZW50L25vZGUvYXJndkhlbHBlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFFM0IsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBRTFDLE9BQU8sRUFBaUIsbUJBQW1CLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLFdBQVcsQ0FBQTtBQUVsRixTQUFTLGdCQUFnQixDQUFDLFdBQXFCLEVBQUUsY0FBdUI7SUFDdkUsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLEVBQVUsRUFBRSxHQUFXLEVBQUUsRUFBRTtRQUNwRCxPQUFPLENBQUMsSUFBSSxDQUNYLFFBQVEsQ0FDUCxnQkFBZ0IsRUFDaEIsNERBQTRELEVBQzVELEVBQUUsRUFDRixHQUFHLENBQ0gsQ0FDRCxDQUFBO0lBQ0YsQ0FBQyxDQUFBO0lBQ0QsTUFBTSxZQUFZLEdBQUcsQ0FBQyxFQUFVLEVBQUUsRUFBRTtRQUNuQyxPQUFPLENBQUMsSUFBSSxDQUNYLFFBQVEsQ0FBQyxZQUFZLEVBQUUsK0RBQStELEVBQUUsRUFBRSxDQUFDLENBQzNGLENBQUE7SUFDRixDQUFDLENBQUE7SUFDRCxNQUFNLGtCQUFrQixHQUFHLENBQUMsZ0JBQXdCLEVBQUUsT0FBZSxFQUFFLEVBQUU7UUFDeEUsT0FBTyxDQUFDLElBQUksQ0FDWCxRQUFRLENBQUMsb0JBQW9CLEVBQUUsaUNBQWlDLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLENBQzVGLENBQUE7SUFDRixDQUFDLENBQUE7SUFDRCxNQUFNLHFCQUFxQixHQUFHLENBQUMsT0FBZSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ25ELGVBQWUsRUFBRSxDQUFDLEVB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