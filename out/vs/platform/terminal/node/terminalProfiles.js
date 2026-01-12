/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import * as cp from 'child_process';
import { Codicon } from '../../../base/common/codicons.js';
import { basename, delimiter, normalize } from '../../../base/common/path.js';
import { isLinux, isWindows } from '../../../base/common/platform.js';
import { findExecutable } from '../../../base/node/processes.js';
import { isString } from '../../../base/common/types.js';
import * as pfs from '../../../base/node/pfs.js';
import { enumeratePowerShellInstallations } from '../../../base/node/powershell.js';
import { getWindowsBuildNumber } from './terminalEnvironment.js';
import { dirname, resolve } from 'path';
var Constants;
(function (Constants) {
    Constants["UnixShellsPath"] = "/etc/shells";
})(Constants || (Constants = {}));
let profileSources;
let logIfWslNotInstalled = true;
export function detectAvailableProfiles(profiles, defaultProfile, includeDetectedProfiles, configurationService, shellEnv = process.env, fsProvider, logService, variableResolver, testPwshSourcePaths) {
    fsProvider = fsProvider || {
        existsFile: pfs.SymlinkSupport.existsFile,
        readFile: fs.promises.readFile,
    };
    if (isWindows) {
        return detectAvailableWindowsProfiles(includeDetectedProfiles, fsProvider, shellEnv, logService, configurationService.getValue("terminal.integrated.useWslProfiles" /* TerminalSettingId.UseWslProfiles */) !== false, profiles && typeof profiles === 'object'
            ? { ...profiles }
            : configurationService.getValue("terminal.integrated.profiles.windows" /* TerminalSettingId.ProfilesWindows */), typeof defaultProfile === 'string'
            ? defaultProfile
            : configurationService.getValue("terminal.integrated.defaultProfile.windows" /* TerminalSettingId.DefaultProfileWindows */), testPwshSourcePaths, variableResolver);
    }
    return detectAvailableUnixProfiles(fsProvider, logService, includeDetectedProfiles, profiles && typeof profiles === 'object'
        ? { ...profiles }
        : configurationService.getValue(isLinux ? "terminal.integrated.profiles.linux" /* TerminalSettingId.ProfilesLinux */ : "terminal.integrated.profiles.osx" /* TerminalSettingId.ProfilesMacOs */), typeof defaultProfile === 'string'
        ? defaultProfile
        : configurationService.getValue(isLinux ? "terminal.integrated.defaultProfile.linux" /* TerminalSettingId.DefaultProfileLinux */ : "terminal.integrated.defaultProfile.osx" /* TerminalSettingId.DefaultProfileMacOs */), testPwshSourcePaths, variableResolver, shellEnv);
}
async function detectAvailableWindowsProfiles(includeDetectedProfiles, fsProvider, shellEnv, logService, useWslProfiles, configProfiles, defaultProfileName, testPwshSourcePaths, variableResolver) {
    // Determine the correct System32 path. We want to point to Sysnative
    // when the 32-bit version of VS Code is running on a 64-bit machine.
    // The reason for this is because PowerShell's important PSReadline
    // module doesn't work if this is not the case. See #27915.
    const is32ProcessOn64Windows = process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432');
    const system32Path = `${process.env['windir']}\\${is32ProcessOn64Windows ? 'Sysnative' : 'System32'}`;
    let useWSLexe = false;
    if (getWindowsBuildNumber() >= 16299) {
        useWSLexe = true;
    }
    await initializeWindowsProfiles(testPwshSourcePaths);
    const detectedProfiles = new Map();
    // Add auto detected profiles
    if (includeDetectedProfiles) {
        detectedProfiles.set('PowerShell', {
            source: "PowerShell" /* ProfileSource.Pwsh */,
            icon: Codicon.terminalPowershell,
            isAutoDetected: true,
        });
        detectedProfiles.set('Windows PowerShell', {
            path: `${system32Path}\\WindowsPowerShell\\v1.0\\powershell.exe`,
            icon: Codicon.terminalPowershell,
            isAutoDetected: true,
        });
        detectedProfiles.set('Git Bash', {
            source: "Git Bash" /* ProfileSource.GitBash */,
            isAutoDetected: true,
        });
        detectedProfiles.set('Command Prompt', {
            path: `${system32Path}\\cmd.exe`,
            icon: Codicon.terminalCmd,
            isAutoDetected: true,
        });
        detectedProfiles.set('Cygwin', {
            path: [
                { path: `${process.env['HOMEDRIVE']}\\cygwin64\\bin\\bash.exe`, isUnsafe: true },
                { path: `${process.env['HOMEDRIVE']}\\cygwin\\bin\\bash.exe`, isUnsafe: true },
            ],
            args: ['--login'],
            isAutoDetected: true,
        });
        detectedProfiles.set('bash (MSYS2)', {
            path: [{ path: `${process.env['HOMEDRIVE']}\\msys64\\usr\\bin\\bash.exe`, isUnsafe: true }],
            args: ['--login', '-i'],
            // CHERE_INVOKING retains current working directory
            env: { CHERE_INVOKING: '1' },
            icon: Codicon.terminalBash,
            isAutoDetected: true,
        });
        const cmderPath = `${process.env['CMDER_ROOT'] || `${process.env['HOMEDRIVE']}\\cmder`}\\vendor\\bin\\vscode_init.cmd`;
        detectedProfiles.set('Cmder', {
            path: `${system32Path}\\cmd.exe`,
            args: ['/K', cmderPath],
            // The path is safe if it was derived from CMDER_ROOT
            requiresPath: process.env['CMDER_ROOT'] ? cmderPath : { path: cmderPath, isUnsafe: true },
            isAutoDetected: true,
        });
    }
    applyConfigProfilesToMap(configProfiles, detectedProfiles);
    const resultProfiles = await transformToTerminalProfiles(detectedProfiles.entries(), defaultProfileName, fsProvider, shellEnv, logService, variableResolver);
    if (includeDetectedProfiles && useWslProfiles) {
        try {
            const result = await getWslProfiles(`${system32Path}\\${useWSLexe ? 'wsl' : 'bash'}.exe`, defaultProfileName);
            for (const wslProfile of result) {
                if (!configProfiles || !(wslProfile.profileName in configProfiles)) {
                    resultProfiles.push(wslProfile);
                }
            }
        }
        catch (e) {
            if (logIfWslNotInstalled) {
                logService?.trace('WSL is not installed, so could not detect WSL profiles');
                logIfWslNotInstalled = false;
            }
        }
    }
    return resultProfiles;
}
async function transformToTerminalProfiles(entries, defaultProfileName, fsProvider, shellEnv = process.env, logService, variableResolver) {
    const promises = [];
    for (const [profileName, profile] of entries) {
        promises.push(getValidatedProfile(profileName, profile, defaultProfileName, fsProvider, shellEnv, logService, variableResolver));
    }
    return (await Promise.all(promises)).filter((e) => !!e);
}
async function getValidatedProfile(profileName, profile, defaultProfileName, fsProvider, shellEnv = process.env, logService, variableResolver) {
    if (profile === null) {
        return undefined;
    }
    let originalPaths;
    let args;
    let icon = undefined;
    // use calculated values if path is not specified
    if ('source' in profile && !('path' in profile)) {
        const source = profileSources?.get(profile.source);
        if (!source) {
            return undefined;
        }
        originalPaths = source.paths;
        // if there are configured args, override the default ones
        args = profile.args || source.args;
        if (profile.icon) {
            icon = validateIcon(profile.icon);
        }
        else if (source.icon) {
            icon = source.icon;
        }
    }
    else {
        originalPaths = Array.isArray(profile.path) ? profile.path : [profile.path];
        args = isWindows ? profile.args : Array.isArray(profile.args) ? profile.args : undefined;
        icon = validateIcon(profile.icon);
    }
    let paths;
    if (variableResolver) {
        // Convert to string[] for resolve
        const mapped = originalPaths.map((e) => (typeof e === 'string' ? e : e.path));
        const resolved = await variableResolver(mapped);
        // Convert resolved back to (T | string)[]
        paths = new Array(originalPaths.length);
        for (let i = 0; i < originalPaths.length; i++) {
            if (typeof originalPaths[i] === 'string') {
                paths[i] = resolved[i];
            }
            else {
                paths[i] = {
                    path: resolved[i],
                    isUnsafe: true,
                };
            }
        }
    }
    else {
        paths = originalPaths.slice();
    }
    let requiresUnsafePath;
    if (profile.requiresPath) {
        // Validate requiresPath exists
        let actualRequiredPath;
        if (isString(profile.requiresPath)) {
            actualRequiredPath = profile.requiresPath;
        }
        else {
            actualRequiredPath = profile.requiresPath.path;
            if (profile.requiresPath.isUnsafe) {
                requiresUnsafePath = actualRequiredPath;
            }
        }
        const result = await fsProvider.existsFile(actualRequiredPath);
        if (!result) {
            return;
        }
    }
    const validatedProfile = await validateProfilePaths(profileName, defaultProfileName, paths, fsProvider, shellEnv, args, profile.env, profile.overrideName, profile.isAutoDetected, requiresUnsafePath);
    if (!validatedProfile) {
        logService?.debug('Terminal profile not validated', profileName, originalPaths);
        return undefined;
    }
    validatedProfile.isAutoDetected = profile.isAutoDetected;
    validatedProfile.icon = icon;
    validatedProfile.color = profile.color;
    return validatedProfile;
}
function validateIcon(icon) {
    if (typeof icon === 'string') {
        return { id: icon };
    }
    return icon;
}
async function initializeWindowsProfiles(testPwshSourcePaths) {
    if (profileSources && !testPwshSourcePaths) {
        return;
    }
    const [gitBashPaths, pwshPaths] = await Promise.all([
        getGitBashPaths(),
        testPwshSourcePaths || getPowershellPaths(),
    ]);
    profileSources = new Map();
    profileSources.set("Git Bash" /* ProfileSource.GitBash */, {
        profileName: 'Git Bash',
        paths: gitBashPaths,
        args: ['--login', '-i'],
    });
    profileSources.set("PowerShell" /* ProfileSource.Pwsh */, {
        profileName: 'PowerShell',
        paths: pwshPaths,
        icon: Codicon.terminalPowershell,
    });
}
async function getGitBashPaths() {
    const gitDirs = new Set();
    // Look for git.exe on the PATH and use that if found. git.exe is located at
    // `<installdir>/cmd/git.exe`. This is not an unsafe location because the git executable is
    // located on the PATH which is only controlled by the user/admin.
    const gitExePath = await findExecutable('git.exe');
    if (gitExePath) {
        const gitExeDir = dirname(gitExePath);
        gitDirs.add(resolve(gitExeDir, '../..'));
    }
    function addTruthy(set, value) {
        if (value) {
            set.add(value);
        }
    }
    // Add common git install locations
    addTruthy(gitDirs, process.env['ProgramW6432']);
    addTruthy(gitDirs, process.env['ProgramFiles']);
    addTruthy(gitDirs, process.env['ProgramFiles(X86)']);
    addTruthy(gitDirs, `${process.env['LocalAppData']}\\Program`);
    const gitBashPaths = [];
    for (const gitDir of gitDirs) {
        gitBashPaths.push(`${gitDir}\\Git\\bin\\bash.exe`, `${gitDir}\\Git\\usr\\bin\\bash.exe`, `${gitDir}\\usr\\bin\\bash.exe`);
    }
    // Add special installs that don't follow the standard directory structure
    gitBashPaths.push(`${process.env['UserProfile']}\\scoop\\apps\\git\\current\\bin\\bash.exe`);
    gitBashPaths.push(`${process.env['UserProfile']}\\scoop\\apps\\git-with-openssh\\current\\bin\\bash.exe`);
    return gitBashPaths;
}
async function getPowershellPaths() {
    const paths = [];
    // Add all of the different kinds of PowerShells
    for await (const pwshExe of enumeratePowerShellInstallations()) {
        paths.push(pwshExe.exePath);
    }
    return paths;
}
async function getWslProfiles(wslPath, defaultProfileName) {
    const profiles = [];
    const distroOutput = await new Promise((resolve, reject) => {
        // wsl.exe output is encoded in utf16le (ie. A -> 0x4100)
        cp.exec('wsl.exe -l -q', { encoding: 'utf16le', timeout: 1000 }, (err, stdout) => {
            if (err) {
                return reject('Problem occurred when getting wsl distros');
            }
            resolve(stdout);
        });
    });
    if (!distroOutput) {
        return [];
    }
    const regex = new RegExp(/[\r?\n]/);
    const distroNames = distroOutput.split(regex).filter((t) => t.trim().length > 0 && t !== '');
    for (const distroName of distroNames) {
        // Skip empty lines
        if (distroName === '') {
            continue;
        }
        // docker-desktop and docker-desktop-data are treated as implementation details of
        // Docker Desktop for Windows and therefore not exposed
        if (distroName.startsWith('docker-desktop')) {
            continue;
        }
        // Create the profile, adding the icon depending on the distro
        const profileName = `${distroName} (WSL)`;
        const profile = {
            profileName,
            path: wslPath,
            args: [`-d`, `${distroName}`],
            isDefault: profileName === defaultProfileName,
            icon: getWslIcon(distroName),
            isAutoDetected: false,
        };
        // Add the profile
        profiles.push(profile);
    }
    return profiles;
}
function getWslIcon(distroName) {
    if (distroName.includes('Ubuntu')) {
        return Codicon.terminalUbuntu;
    }
    else if (distroName.includes('Debian')) {
        return Codicon.terminalDebian;
    }
    else {
        return Codicon.terminalLinux;
    }
}
async function detectAvailableUnixProfiles(fsProvider, logService, includeDetectedProfiles, configProfiles, defaultProfileName, testPaths, variableResolver, shellEnv) {
    const detectedProfiles = new Map();
    // Add non-quick launch profiles
    if (includeDetectedProfiles && (await fsProvider.existsFile("/etc/shells" /* Constants.UnixShellsPath */))) {
        const contents = (await fsProvider.readFile("/etc/shells" /* Constants.UnixShellsPath */)).toString();
        const profiles = (testPaths || contents.split('\n'))
            .map((e) => {
            const index = e.indexOf('#');
            return index === -1 ? e : e.substring(0, index);
        })
            .filter((e) => e.trim().length > 0);
        const counts = new Map();
        for (const profile of profiles) {
            let profileName = basename(profile);
            let count = counts.get(profileName) || 0;
            count++;
            if (count > 1) {
                profileName = `${profileName} (${count})`;
            }
            counts.set(profileName, count);
            detectedProfiles.set(profileName, { path: profile, isAutoDetected: true });
        }
    }
    applyConfigProfilesToMap(configProfiles, detectedProfiles);
    return await transformToTerminalProfiles(detectedProfiles.entries(), defaultProfileName, fsProvider, shellEnv, logService, variableResolver);
}
function applyConfigProfilesToMap(configProfiles, profilesMap) {
    if (!configProfiles) {
        return;
    }
    for (const [profileName, value] of Object.entries(configProfiles)) {
        if (value === null ||
            typeof value !== 'object' ||
            (!('path' in value) && !('source' in value))) {
            profilesMap.delete(profileName);
        }
        else {
            value.icon = value.icon || profilesMap.get(profileName)?.icon;
            profilesMap.set(profileName, value);
        }
    }
}
async function validateProfilePaths(profileName, defaultProfileName, potentialPaths, fsProvider, shellEnv, args, env, overrideName, isAutoDetected, requiresUnsafePath) {
    if (potentialPaths.length === 0) {
        return Promise.resolve(undefined);
    }
    const path = potentialPaths.shift();
    if (path === '') {
        return validateProfilePaths(profileName, defaultProfileName, potentialPaths, fsProvider, shellEnv, args, env, overrideName, isAutoDetected);
    }
    const isUnsafePath = typeof path !== 'string' && path.isUnsafe;
    const actualPath = typeof path === 'string' ? path : path.path;
    const profile = {
        profileName,
        path: actualPath,
        args,
        env,
        overrideName,
        isAutoDetected,
        isDefault: profileName === defaultProfileName,
        isUnsafePath,
        requiresUnsafePath,
    };
    // For non-absolute paths, check if it's available on $PATH
    if (basename(actualPath) === actualPath) {
        // The executable isn't an absolute path, try find it on the PATH
        const envPaths = shellEnv.PATH
            ? shellEnv.PATH.split(delimiter)
            : undefined;
        const executable = await findExecutable(actualPath, undefined, envPaths, undefined, fsProvider.existsFile);
        if (!executable) {
            return validateProfilePaths(profileName, defaultProfileName, potentialPaths, fsProvider, shellEnv, args);
        }
        profile.path = executable;
        profile.isFromPath = true;
        return profile;
    }
    const result = await fsProvider.existsFile(normalize(actualPath));
    if (result) {
        return profile;
    }
    return validateProfilePaths(profileName, defaultProfileName, potentialPaths, fsProvider, shellEnv, args, env, overrideName, isAutoDetected);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9maWxlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvbm9kZS90ZXJtaW5hbFByb2ZpbGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3hCLE9BQU8sS0FBSyxFQUFFLE1BQU0sZUFBZSxDQUFBO0FBQ25DLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFeEQsT0FBTyxLQUFLLEdBQUcsTUFBTSwyQkFBMkIsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQWFuRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUVoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLE1BQU0sQ0FBQTtBQUV2QyxJQUFXLFNBRVY7QUFGRCxXQUFXLFNBQVM7SUFDbkIsMkNBQThCLENBQUE7QUFDL0IsQ0FBQyxFQUZVLFNBQVMsS0FBVCxTQUFTLFFBRW5CO0FBRUQsSUFBSSxjQUFrRSxDQUFBO0FBQ3RFLElBQUksb0JBQW9CLEdBQVksSUFBSSxDQUFBO0FBRXhDLE1BQU0sVUFBVSx1QkFBdUIsQ0FDdEMsUUFBaUIsRUFDakIsY0FBdUIsRUFDdkIsdUJBQWdD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