/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as os from 'os';
import * as path from '../common/path.js';
import * as pfs from './pfs.js';
// This is required, since parseInt("7-preview") will return 7.
const IntRegex = /^\d+$/;
const PwshMsixRegex = /^Microsoft.PowerShell_.*/;
const PwshPreviewMsixRegex = /^Microsoft.PowerShellPreview_.*/;
var Arch;
(function (Arch) {
    Arch[Arch["x64"] = 0] = "x64";
    Arch[Arch["x86"] = 1] = "x86";
    Arch[Arch["ARM"] = 2] = "ARM";
})(Arch || (Arch = {}));
let processArch;
switch (process.arch) {
    case 'ia32':
        processArch = 1 /* Arch.x86 */;
        break;
    case 'arm':
    case 'arm64':
        processArch = 2 /* Arch.ARM */;
        break;
    default:
        processArch = 0 /* Arch.x64 */;
        break;
}
/*
Currently, here are the values for these environment variables on their respective archs:

On x86 process on x86:
PROCESSOR_ARCHITECTURE is X86
PROCESSOR_ARCHITEW6432 is undefined

On x86 process on x64:
PROCESSOR_ARCHITECTURE is X86
PROCESSOR_ARCHITEW6432 is AMD64

On x64 process on x64:
PROCESSOR_ARCHITECTURE is AMD64
PROCESSOR_ARCHITEW6432 is undefined

On ARM process on ARM:
PROCESSOR_ARCHITECTURE is ARM64
PROCESSOR_ARCHITEW6432 is undefined

On x86 process on ARM:
PROCESSOR_ARCHITECTURE is X86
PROCESSOR_ARCHITEW6432 is ARM64

On x64 process on ARM:
PROCESSOR_ARCHITECTURE is ARM64
PROCESSOR_ARCHITEW6432 is undefined
*/
let osArch;
if (process.env['PROCESSOR_ARCHITEW6432']) {
    osArch = process.env['PROCESSOR_ARCHITEW6432'] === 'ARM64' ? 2 /* Arch.ARM */ : 0 /* Arch.x64 */;
}
else if (process.env['PROCESSOR_ARCHITECTURE'] === 'ARM64') {
    osArch = 2 /* Arch.ARM */;
}
else if (process.env['PROCESSOR_ARCHITECTURE'] === 'X86') {
    osArch = 1 /* Arch.x86 */;
}
else {
    osArch = 0 /* Arch.x64 */;
}
class PossiblePowerShellExe {
    constructor(exePath, displayName, knownToExist) {
        this.exePath = exePath;
        this.displayName = displayName;
        this.knownToExist = knownToExist;
    }
    async exists() {
        if (this.knownToExist === undefined) {
            this.knownToExist = await pfs.SymlinkSupport.existsFile(this.exePath);
        }
        return this.knownToExist;
    }
}
function getProgramFilesPath({ useAlternateBitness = false, } = {}) {
    if (!useAlternateBitness) {
        // Just use the native system bitness
        return process.env.ProgramFiles || null;
    }
    // We might be a 64-bit process looking for 32-bit program files
    if (processArch === 0 /* Arch.x64 */) {
        return process.env['ProgramFiles(x86)'] || null;
    }
    // We might be a 32-bit process looking for 64-bit program files
    if (osArch === 0 /* Arch.x64 */) {
        return process.env.ProgramW6432 || null;
    }
    // We're a 32-bit process on 32-bit Windows, there is no other Program Files dir
    return null;
}
async function findPSCoreWindowsInstallation({ useAlternateBitness = false, findPreview = false, } = {}) {
    const programFilesPath = getProgramFilesPath({ useAlternateBitness });
    if (!programFilesPath) {
        return null;
    }
    const powerShellInstallBaseDir = path.join(programFilesPath, 'PowerShell');
    // Ensure the base directory exists
    if (!(await pfs.SymlinkSupport.existsDirectory(powerShellInstallBaseDir))) {
        return null;
    }
    let highestSeenVersion = -1;
    let pwshExePath = null;
    for (const item of await pfs.Promises.readdir(powerShellInstallBaseDir)) {
        let currentVersion = -1;
        if (findPreview) {
            // We are looking for something like "7-preview"
            // Preview dirs all have dashes in them
            const dashIndex = item.indexOf('-');
            if (dashIndex < 0) {
                continue;
            }
            // Verify that the part before the dash is an integer
            // and that the part after the dash is "preview"
            const intPart = item.substring(0, dashIndex);
            if (!IntRegex.test(intPart) || item.substring(dashIndex + 1) !== 'preview') {
                continue;
            }
            currentVersion = parseInt(intPart, 10);
        }
        else {
            // Search for a directory like "6" or "7"
            if (!IntRegex.test(item)) {
                continue;
            }
            currentVersion = parseInt(item, 10);
        }
        // Ensure we haven't already seen a higher version
        if (currentVersion <= highestSeenVersion) {
            continue;
        }
        // Now look for the file
        const exePath = path.join(powerShellInstallBaseDir, item, 'pwsh.exe');
        if (!(await pfs.SymlinkSupport.existsFile(exePath))) {
            continue;
        }
        pwshExePath = exePath;
        highestSeenVersion = currentVersion;
    }
    if (!pwshExePath) {
        return null;
    }
    const bitness = programFilesPath.includes('x86') ? ' (x86)' : '';
    const preview = findPreview ? ' Preview' : '';
    return new PossiblePowerShellExe(pwshExePath, `PowerShell${preview}${bitness}`, true);
}
async function findPSCoreMsix({ findPreview, } = {}) {
    // We can't proceed if there's no LOCALAPPDATA path
    if (!process.env.LOCALAPPDATA) {
        return null;
    }
    // Find the base directory for MSIX application exe shortcuts
    const msixAppDir = path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WindowsApps');
    if (!(await pfs.SymlinkSupport.existsDirectory(msixAppDir))) {
        return null;
    }
    // Define whether we're looking for the preview or the stable
    const { pwshMsixDirRegex, pwshMsixName } = findPreview
        ? { pwshMsixDirRegex: PwshPreviewMsixRegex, pwshMsixName: 'PowerShell Preview (Store)' }
        : { pwshMsixDirRegex: PwshMsixRegex, pwshMsixName: 'PowerShell (Store)' };
    // We should find only one such application, so return on the first one
    for (const subdir of await pfs.Promises.readdir(msixAppDir)) {
        if (pwshMsixDirRegex.test(subdir)) {
            const pwshMsixPath = path.join(msixAppDir, subdir, 'pwsh.exe');
            return new PossiblePowerShellExe(pwshMsixPath, pwshMsixName);
        }
    }
    // If we find nothing, return null
    return null;
}
function findPSCoreDotnetGlobalTool() {
    const dotnetGlobalToolExePath = path.join(os.homedir(), '.dotnet', 'tools', 'pwsh.exe');
    return new PossiblePowerShellExe(dotnetGlobalToolExePath, '.NET Core PowerShell Global Tool');
}
function findPSCoreScoopInstallation() {
    const scoopAppsDir = path.join(os.homedir(), 'scoop', 'apps');
    const scoopPwsh = path.join(scoopAppsDir, 'pwsh', 'current', 'pwsh.exe');
    return new PossiblePowerShellExe(scoopPwsh, 'PowerShell (Scoop)');
}
function findWinPS() {
    const winPSPath = path.join(process.env.windir, processArch === 1 /* Arch.x86 */ && osArch !== 1 /* Arch.x86 */ ? 'SysNative' : 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    return new PossiblePowerShellExe(winPSPath, 'Windows PowerShell', true);
}
/**
 * Iterates through all the possible well-known PowerShell installations on a machine.
 * Returned values may not exist, but come with an .exists property
 * which will check whether the executable exists.
 */
async function* enumerateDefaultPowerShellInstallations() {
    // Find PSCore stable first
    let pwshExe = await findPSCoreWindowsInstallation();
    if (pwshExe) {
        yield pwshExe;
    }
    // Windows may have a 32-bit pwsh.exe
    pwshExe = await findPSCoreWindowsInstallation({ useAlternateBitness: true });
    if (pwshExe) {
        yield pwshExe;
    }
    // Also look for the MSIX/UWP installation
    pwshExe = await findPSCoreMsix();
    if (pwshExe) {
        yield pwshExe;
    }
    // Look for the .NET global tool
    // Some older versions of PowerShell have a bug in this where startup will fail,
    // but this is fixed in newer versions
    pwshExe = findPSCoreDotnetGlobalTool();
    if (pwshExe) {
        yield pwshExe;
    }
    // Look for PSCore preview
    pwshExe = await findPSCoreWindowsInstallation({ findPreview: true });
    if (pwshExe) {
        yield pwshExe;
    }
    // Find a preview MSIX
    pwshExe = await findPSCoreMsix({ findPreview: true });
    if (pwshExe) {
        yield pwshExe;
    }
    // Look for pwsh-preview with the opposite bitness
    pwshExe = await findPSCoreWindowsInstallation({ useAlternateBitness: true, findPreview: true });
    if (pwshExe) {
        yield pwshExe;
    }
    pwshExe = await findPSCoreScoopInstallation();
    if (pwshExe) {
        yield pwshExe;
    }
    // Finally, get Windows PowerShell
    pwshExe = findWinPS();
    if (pwshExe) {
        yield pwshExe;
    }
}
/**
 * Iterates through PowerShell installations on the machine according
 * to configuration passed in through the constructor.
 * PowerShell items returned by this object are verified
 * to exist on the filesystem.
 */
export async function* enumeratePowerShellInstallations() {
    // Get the default PowerShell installations first
    for await (const defaultPwsh of enumerateDefaultPowerShellInstallations()) {
        if (await defaultPwsh.exists()) {
            yield defaultPwsh;
        }
    }
}
/**
 * Returns the first available PowerShell executable found in the search order.
 */
export async function getFirstAvailablePowerShellInstallation() {
    for await (const pwsh of enumeratePowerShellInstallations()) {
        return pwsh;
    }
    return null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG93ZXJzaGVsbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2Uvbm9kZS9wb3dlcnNoZWxsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3hCLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUE7QUFFL0IsK0RBQStEO0FBQy9ELE1BQU0sUUFBUSxHQUFXLE9BQU8sQ0FBQTtBQUVoQyxNQUFNLGFBQWEsR0FBVywwQkFBMEIsQ0FBQTtBQUN4RCxNQUFNLG9CQUFvQixHQUFXLGlDQUFpQyxDQUFBO0FBRXRFLElBQVcsSUFJVjtBQUpELFdBQVcsSUFBSTtJQUNkLDZCQUFHLENBQUE7SUFDSCw2QkFBRyxDQUFBO0lBQ0gsNkJBQUcsQ0FBQTtBQUNKLENBQUMsRUFKVSxJQUFJLEtBQUosSUFBSSxRQUlkO0FBRUQsSUFBSSxXQUFpQixDQUFBO0FBQ3JCLFFBQVEsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ3RCLEtBQUssTUFBTTtRQUNWLFdBQVcsbUJBQVcsQ0FBQTtRQUN0QixNQUFLO0lBQ04sS0FBSyxLQUFLLENBQUM7SUFDWCxLQUFLLE9BQU87UUFDWCxXQUFXLG1CQUFXLENBQUE7UUFDdEIsTUFBSztJQUNOO1FBQ0MsV0FBVyxtQkFBVyxDQUFBO1FBQ3RCLE1BQUs7QUFDUCxDQUFDO0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0VBMEJFO0FBQ0YsSUFBSSxNQUFZLENBQUE7QUFDaEIsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLEVBQUUsQ0FBQztJQUMzQyxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLE9BQU8sQ0FB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