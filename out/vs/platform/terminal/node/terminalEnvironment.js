/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as os from 'os';
import { FileAccess } from '../../../base/common/network.js';
import * as path from '../../../base/common/path.js';
import { isMacintosh, isWindows } from '../../../base/common/platform.js';
import * as process from '../../../base/common/process.js';
import { format } from '../../../base/common/strings.js';
import { EnvironmentVariableMutatorType } from '../common/environmentVariable.js';
import { deserializeEnvironmentVariableCollections } from '../common/environmentVariableShared.js';
import { MergedEnvironmentVariableCollection } from '../common/environmentVariableCollection.js';
import { chmod, realpathSync, mkdirSync } from 'fs';
import { promisify } from 'util';
export function getWindowsBuildNumber() {
    const osVersion = /(\d+)\.(\d+)\.(\d+)/g.exec(os.release());
    let buildNumber = 0;
    if (osVersion && osVersion.length === 4) {
        buildNumber = parseInt(osVersion[3]);
    }
    return buildNumber;
}
/**
 * For a given shell launch config, returns arguments to replace and an optional environment to
 * mixin to the SLC's environment to enable shell integration. This must be run within the context
 * that creates the process to ensure accuracy. Returns undefined if shell integration cannot be
 * enabled.
 */
export async function getShellIntegrationInjection(shellLaunchConfig, options, env, logService, productService, skipStickyBit = false) {
    // Conditionally disable shell integration arg injection
    // - The global setting is disabled
    // - There is no executable (not sure what script to run)
    // - The terminal is used by a feature like tasks or debugging
    const useWinpty = isWindows && (!options.windowsEnableConpty || getWindowsBuildNumber() < 18309);
    if (
    // The global setting is disabled
    !options.shellIntegration.enabled ||
        // There is no executable (so there's no way to determine how to inject)
        !shellLaunchConfig.executable ||
        // It's a feature terminal (tasks, debug), unless it's explicitly being forced
        (shellLaunchConfig.isFeatureTerminal && !shellLaunchConfig.forceShellIntegration) ||
        // The ignoreShellIntegration flag is passed (eg. relaunching without shell integration)
        shellLaunchConfig.ignoreShellIntegration ||
        // Winpty is unsupported
        useWinpty) {
        return undefined;
    }
    const originalArgs = shellLaunchConfig.args;
    const shell = process.platform === 'win32'
        ? path.basename(shellLaunchConfig.executable).toLowerCase()
        : path.basename(shellLaunchConfig.executable);
    const appRoot = path.dirname(FileAccess.asFileUri('').fsPath);
    let newArgs;
    const envMixin = {
        VSCODE_INJECTION: '1',
    };
    if (options.shellIntegration.nonce) {
        envMixin['VSCODE_NONCE'] = options.shellIntegration.nonce;
    }
    if (shellLaunchConfig.shellIntegrationEnvironmentReporting) {
        if (isWindows) {
            const enableWindowsEnvReporting = options.windowsUseConptyDll ||
                (options.windowsEnableConpty && getWindowsBuildNumber() >= 22631 && shell !== 'bash.exe');
            if (enableWindowsEnvReporting) {
                envMixin['VSCODE_SHELL_ENV_REPORTING'] = '1';
            }
        }
        else {
            envMixin['VSCODE_SHELL_ENV_REPORTING'] = '1';
        }
    }
    // Windows
    if (isWindows) {
        if (shell === 'pwsh.exe' || shell === 'powershell.exe') {
            if (!originalArgs || arePwshImpliedArgs(originalArgs)) {
                newArgs = shellIntegrationArgs.get(ShellIntegrationExecutable.WindowsPwsh);
            }
            else if (arePwshLoginArgs(originalArgs)) {
                newArgs = shellIntegrationArgs.get(ShellIntegrationExecutable.WindowsPwshLogin);
            }
            if (!newArgs) {
                return undefined;
            }
            newArgs = [...newArgs]; // Shallow clone the array to avoid setting the default array
            newArgs[newArgs.length - 1] = format(newArgs[newArgs.length - 1], appRoot, '');
            envMixin['VSCODE_STABLE'] = productService.quality === 'stable' ? '1' : '0';
            if (options.shellIntegration.suggestEnabled) {
                envMixin['VSCODE_SUGGEST'] = '1';
            }
            return { newArgs, envMixin };
        }
        else if (shell === 'bash.exe') {
            if (!originalArgs || originalArgs.length === 0) {
                newArgs = shellIntegrationArgs.get(ShellIntegrationExecutable.Bash);
            }
            else if (areZshBashFishLoginArgs(originalArgs)) {
                envMixin['VSCODE_SHELL_LOGIN'] = '1';
                addEnvMixinPathPrefix(options, envMixin, shell);
                newArgs = shellIntegrationArgs.get(ShellIntegrationExecutable.Bash);
            }
            if (!newArgs) {
                return undefined;
            }
            newArgs = [...newArgs]; // Shallow clone the array to avoid setting the default array
            newArgs[newArgs.length - 1] = format(newArgs[newArgs.length - 1], appRoot);
            envMixin['VSCODE_STABLE'] = productService.quality === 'stable' ? '1' : '0';
            return { newArgs, envMixin };
        }
        logService.warn(`Shell integration cannot be enabled for executable "${shellLaunchConfig.executable}" and args`, shellLaunchConfig.args);
        return undefined;
    }
    // Linux & macOS
    switch (shell) {
        case 'bash': {
            if (!originalArgs || originalArgs.length === 0) {
                newArgs = shellIntegrationArgs.get(ShellIntegrationExecutable.Bash);
            }
            else if (areZshBashFishLoginArgs(originalArgs)) {
                envMixin['VSCODE_SHELL_LOGIN'] = '1';
                addEnvMixinPathPrefix(options, envMixin, shell);
                newArgs = shellIntegrationArgs.get(ShellIntegrationExecutable.Bash);
            }
            if (!newArgs) {
                return undefined;
            }
            newArgs = [...newArgs]; // Shallow clone the array to avoid setting the default array
            newArgs[newArgs.length - 1] = format(newArgs[newArgs.length - 1], appRoot);
            envMixin['VSCODE_STABLE'] = productService.quality === 'stable' ? '1' : '0';
            return { newArgs, envMixin };
        }
        case 'fish': {
            if (!originalArgs || originalArgs.length === 0) {
                newArgs = shellIntegrationArgs.get(ShellIntegrationExecutable.Fish);
            }
            else if (areZshBashFishLoginArgs(originalArgs)) {
                newArgs = shellIntegrationArgs.get(ShellIntegrationExecutable.FishLogin);
            }
            else if (originalArgs === shellIntegrationArgs.get(ShellIntegrationExecutable.Fish) ||
                originalArgs === shellIntegrationArgs.get(ShellIntegrationExecutable.FishLogin)) {
                newArgs = originalArgs;
            }
            if (!newArgs) {
                return undefined;
            }
            // On fish, '$fish_user_paths' is always prepended to the PATH, for both login and non-login shells, so we need
            // to apply the path prefix fix always, not only for login shells (see #232291)
            addEnvMixinPathPrefix(options, envMixin, shell);
            newArgs = [...newArgs]; // Shallow clone the array to avoid setting the default array
            newArgs[newArgs.length - 1] = format(newArgs[newArgs.length - 1], appRoot);
            return { newArgs, envMixin };
        }
        case 'pwsh': {
            if (!originalArgs || arePwshImpliedArgs(originalArgs)) {
                newArgs = shellIntegrationArgs.get(ShellIntegrationExecutable.Pwsh);
            }
            else if (arePwshLoginArgs(originalArgs)) {
                newArgs = shellIntegrationArgs.get(ShellIntegrationExecutable.PwshLogin);
            }
            if (!newArgs) {
                return undefined;
            }
            if (options.shellIntegration.suggestEnabled) {
                envMixin['VSCODE_SUGGEST'] = '1';
            }
            newArgs = [...newArgs]; // Shallow clone the array to avoid setting the default array
            newArgs[newArgs.length - 1] = format(newArgs[newArgs.length - 1], appRoot, '');
            envMixin['VSCODE_STABLE'] = productService.quality === 'stable' ? '1' : '0';
            return { newArgs, envMixin };
        }
        case 'zsh': {
            if (!originalArgs || originalArgs.length === 0) {
                newArgs = shellIntegrationArgs.get(ShellIntegrationExecutable.Zsh);
            }
            else if (areZshBashFishLoginArgs(originalArgs)) {
                newArgs = shellIntegrationArgs.get(ShellIntegrationExecutable.ZshLogin);
                addEnvMixinPathPrefix(options, envMixin, shell);
            }
            else if (originalArgs === shellIntegrationArgs.get(ShellIntegrationExecutable.Zsh) ||
                originalArgs === shellIntegrationArgs.get(ShellIntegrationExecutable.ZshLogin)) {
                newArgs = originalArgs;
            }
            if (!newArgs) {
                return undefined;
            }
            newArgs = [...newArgs]; // Shallow clone the array to avoid setting the default array
            newArgs[newArgs.length - 1] = format(newArgs[newArgs.length - 1], appRoot);
            // Move .zshrc into $ZDOTDIR as the way to activate the script
            let username;
            try {
                username = os.userInfo().username;
            }
            catch {
                username = 'unknown';
            }
            // Resolve the actual tmp directory so we can set the sticky bit
            const realTmpDir = realpathSync(os.tmpdir());
            const zdotdir = path.join(realTmpDir, `${username}-${productService.applicationName}-zsh`);
            // Set directory permissions using octal notation:
            // - 0o1700:
            // - Sticky bit is set, preventing non-owners from deleting or renaming files within this directory (1)
            // - Owner has full read (4), write (2), execute (1) permissions
            // - Group has no permissions (0)
            // - Others have no permissions (0)
            if (!skipStickyBit) {
                // skip for tests
                try {
                    const chmodAsync = promisify(chmod);
                    await chmodAsync(zdotdir, 0o1700);
                }
                catch (err) {
                    if (err.message.includes('ENOENT')) {
                        try {
                            mkdirSync(zdotdir);
                        }
                        catch (err) {
                            logService.error(`Failed to create zdotdir at ${zdotdir}: ${err}`);
                            return undefined;
                        }
                        try {
                            const chmodAsync = promisify(chmod);
                            await chmodAsync(zdotdir, 0o1700);
                        }
                        catch {
                            logService.error(`Failed to set sticky bit on ${zdotdir}: ${err}`);
                            return undefined;
                        }
                    }
                    logService.error(`Failed to set sticky bit on ${zdotdir}: ${err}`);
                    return undefined;
                }
            }
            envMixin['ZDOTDIR'] = zdotdir;
            const userZdotdir = env?.ZDOTDIR ?? os.homedir() ?? `~`;
            envMixin['USER_ZDOTDIR'] = userZdotdir;
            const filesToCopy = [];
            filesToCopy.push({
                source: path.join(appRoot, 'out/vs/workbench/contrib/terminal/common/scripts/shellIntegration-rc.zsh'),
                dest: path.join(zdotdir, '.zshrc'),
            });
            filesToCopy.push({
                source: path.join(appRoot, 'out/vs/workbench/contrib/terminal/common/scripts/shellIntegration-profile.zsh'),
                dest: path.join(zdotdir, '.zprofile'),
            });
            filesToCopy.push({
                source: path.join(appRoot, 'out/vs/workbench/contrib/terminal/common/scripts/shellIntegration-env.zsh'),
                dest: path.join(zdotdir, '.zshenv'),
            });
            filesToCopy.push({
                source: path.join(appRoot, 'out/vs/workbench/contrib/terminal/common/scripts/shellIntegration-login.zsh'),
                dest: path.join(zdotdir, '.zlogin'),
            });
            return { newArgs, envMixin, filesToCopy };
        }
    }
    logService.warn(`Shell integration cannot be enabled for executable "${shellLaunchConfig.executable}" and args`, shellLaunchConfig.args);
    return undefined;
}
/**
 * There are a few situations where some directories are added to the beginning of the PATH.
 * 1. On macOS when the profile calls path_helper.
 * 2. For fish terminals, which always prepend "$fish_user_paths" to the PATH.
 *
 * This causes significant problems for the environment variable
 * collection API as the custom paths added to the end will now be somewhere in the middle of
 * the PATH. To combat this, VSCODE_PATH_PREFIX is used to re-apply any prefix after the profile
 * has run. This will cause duplication in the PATH but should fix the issue.
 *
 * See #99878 for more information.
 */
function addEnvMixinPathPrefix(options, envMixin, shell) {
    if ((isMacintosh || shell === 'fish') && options.environmentVariableCollections) {
        // Deserialize and merge
        const deserialized = deserializeEnvironmentVariableCollections(options.environmentVariableCollections);
        const merged = new MergedEnvironmentVariableCollection(deserialized);
        // Get all prepend PATH entries
        const pathEntry = merged
            .getVariableMap({ workspaceFolder: options.workspaceFolder })
            .get('PATH');
        const prependToPath = [];
        if (pathEntry) {
            for (const mutator of pathEntry) {
                if (mutator.type === EnvironmentVariableMutatorType.Prepend) {
                    prependToPath.push(mutator.value);
                }
            }
        }
        // Add to the environment mixin to be applied in the shell integration script
        if (prependToPath.length > 0) {
            envMixin['VSCODE_PATH_PREFIX'] = prependToPath.join('');
        }
    }
}
var ShellIntegrationExecutable;
(function (ShellIntegrationExecutable) {
    ShellIntegrationExecutable["WindowsPwsh"] = "windows-pwsh";
    ShellIntegrationExecutable["WindowsPwshLogin"] = "windows-pwsh-login";
    ShellIntegrationExecutable["Pwsh"] = "pwsh";
    ShellIntegrationExecutable["PwshLogin"] = "pwsh-login";
    ShellIntegrationExecutable["Zsh"] = "zsh";
    ShellIntegrationExecutable["ZshLogin"] = "zsh-login";
    ShellIntegrationExecutable["Bash"] = "bash";
    ShellIntegrationExecutable["Fish"] = "fish";
    ShellIntegrationExecutable["FishLogin"] = "fish-login";
})(ShellIntegrationExecutable || (ShellIntegrationExecutable = {}));
const shellIntegrationArgs = new Map();
// The try catch swallows execution policy errors in the case of the archive distributable
shellIntegrationArgs.set(ShellIntegrationExecutable.WindowsPwsh, [
    '-noexit',
    '-command',
    'try { . \"{0}\\out\\vs\\workbench\\contrib\\terminal\\common\\scripts\\shellIntegration.ps1\" } catch {}{1}',
]);
shellIntegrationArgs.set(ShellIntegrationExecutable.WindowsPwshLogin, [
    '-l',
    '-noexit',
    '-command',
    'try { . \"{0}\\out\\vs\\workbench\\contrib\\terminal\\common\\scripts\\shellIntegration.ps1\" } catch {}{1}',
]);
shellIntegrationArgs.set(ShellIntegrationExecutable.Pwsh, [
    '-noexit',
    '-command',
    '. "{0}/out/vs/workbench/contrib/terminal/common/scripts/shellIntegration.ps1"{1}',
]);
shellIntegrationArgs.set(ShellIntegrationExecutable.PwshLogin, [
    '-l',
    '-noexit',
    '-command',
    '. "{0}/out/vs/workbench/contrib/terminal/common/scripts/shellIntegration.ps1"',
]);
shellIntegrationArgs.set(ShellIntegrationExecutable.Zsh, ['-i']);
shellIntegrationArgs.set(ShellIntegrationExecutable.ZshLogin, ['-il']);
shellIntegrationArgs.set(ShellIntegrationExecutable.Bash, [
    '--init-file',
    '{0}/out/vs/workbench/contrib/terminal/common/scripts/shellIntegration-bash.sh',
]);
shellIntegrationArgs.set(ShellIntegrationExecutable.Fish, [
    '--init-command',
    'source "{0}/out/vs/workbench/contrib/terminal/common/scripts/shellIntegration.fish"',
]);
shellIntegrationArgs.set(ShellIntegrationExecutable.FishLogin, [
    '-l',
    '--init-command',
    'source "{0}/out/vs/workbench/contrib/terminal/common/scripts/shellIntegration.fish"',
]);
const pwshLoginArgs = ['-login', '-l'];
const shLoginArgs = ['--login', '-l'];
const shInteractiveArgs = ['-i', '--interactive'];
const pwshImpliedArgs = ['-nol', '-nologo'];
function arePwshLoginArgs(originalArgs) {
    if (typeof originalArgs === 'string') {
        return pwshLoginArgs.includes(originalArgs.toLowerCase());
    }
    else {
        return ((originalArgs.length === 1 && pwshLoginArgs.includes(originalArgs[0].toLowerCase())) ||
            (originalArgs.length === 2 &&
                (pwshLoginArgs.includes(originalArgs[0].toLowerCase()) ||
                    pwshLoginArgs.includes(originalArgs[1].toLowerCase())) &&
                (pwshImpliedArgs.includes(originalArgs[0].toLowerCase()) ||
                    pwshImpliedArgs.includes(originalArgs[1].toLowerCase()))));
    }
}
function arePwshImpliedArgs(originalArgs) {
    if (typeof originalArgs === 'string') {
        return pwshImpliedArgs.includes(originalArgs.toLowerCase());
    }
    else {
        return (originalArgs.length === 0 ||
            (originalArgs?.length === 1 && pwshImpliedArgs.includes(originalArgs[0].toLowerCase())));
    }
}
function areZshBashFishLoginArgs(originalArgs) {
    if (typeof originalArgs !== 'string') {
        originalArgs = originalArgs.filter((arg) => !shInteractiveArgs.includes(arg.toLowerCase()));
    }
    return ((originalArgs === 'string' && shLoginArgs.includes(originalArgs.toLowerCase())) ||
        (typeof originalArgs !== 'string' &&
            originalArgs.length === 1 &&
            shLoginArgs.includes(originalArgs[0].toLowerCase())));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFbnZpcm9ubWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvbm9kZS90ZXJtaW5hbEVudmlyb25tZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3hCLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM1RCxPQUFPLEtBQUssSUFBSSxNQUFNLDhCQUE4QixDQUFBO0FBQ3BELE9BQU8sRUFBdUIsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzlGLE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUE7QUFDMUQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBUXhELE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSx5Q0FBeUMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBRSxNQUFNLElBQUksQ0FBQTtBQUNuRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sTUFBTSxDQUFBO0FBRWhDLE1BQU0sVUFBVSxxQkFBcUI7SUFDcEMsTUFBTSxTQUFTLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO0lBQzNELElBQUksV0FBVyxHQUFXLENBQUMsQ0FBQTtJQUMzQixJQUFJLFNBQVMsSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ3pDLFdBQVcsR0FBRyxR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