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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9maWxlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL25vZGUvdGVybWluYWxQcm9maWxlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQTtBQUN4QixPQUFPLEtBQUssRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUNuQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDN0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRXhELE9BQU8sS0FBSyxHQUFHLE1BQU0sMkJBQTJCLENBQUE7QUFDaEQsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFhbkYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxNQUFNLENBQUE7QUFFdkMsSUFBVyxTQUVWO0FBRkQsV0FBVyxTQUFTO0lBQ25CLDJDQUE4QixDQUFBO0FBQy9CLENBQUMsRUFGVSxTQUFTLEtBQVQsU0FBUyxRQUVuQjtBQUVELElBQUksY0FBa0UsQ0FBQTtBQUN0RSxJQUFJLG9CQUFvQixHQUFZLElBQUksQ0FBQTtBQUV4QyxNQUFNLFVBQVUsdUJBQXVCLENBQ3RDLFFBQWlCLEVBQ2pCLGNBQXVCLEVBQ3ZCLHVCQUFnQyxFQUNo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