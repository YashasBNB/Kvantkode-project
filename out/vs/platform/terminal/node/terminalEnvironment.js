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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFbnZpcm9ubWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL25vZGUvdGVybWluYWxFbnZpcm9ubWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQTtBQUN4QixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDNUQsT0FBTyxLQUFLLElBQUksTUFBTSw4QkFBOEIsQ0FBQTtBQUNwRCxPQUFPLEVBQXVCLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM5RixPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQVF4RCxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRixPQUFPLEVBQUUseUNBQXlDLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxTQUFTLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDbkQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLE1BQU0sQ0FBQTtBQUVoQyxNQUFNLFVBQVUscUJBQXFCO0lBQ3BDLE1BQU0sU0FBUyxHQUFHLHNCQUFzQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtJQUMzRCxJQUFJLFdBQVcsR0FBVyxDQUFDLENBQUE7SUFDM0IsSUFBSSxTQUFTLElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUN6QyxXQUFXLEdBQUcsUUFBUSxD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