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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG93ZXJzaGVsbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9ub2RlL3Bvd2Vyc2hlbGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDeEIsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQTtBQUN6QyxPQUFPLEtBQUssR0FBRyxNQUFNLFVBQVUsQ0FBQTtBQUUvQiwrREFBK0Q7QUFDL0QsTUFBTSxRQUFRLEdBQVcsT0FBTyxDQUFBO0FBRWhDLE1BQU0sYUFBYSxHQUFXLDBCQUEwQixDQUFBO0FBQ3hELE1BQU0sb0JBQW9CLEdBQVcsaUNBQWlDLENBQUE7QUFFdEUsSUFBVyxJQUlWO0FBSkQsV0FBVyxJQUFJO0lBQ2QsNkJBQUcsQ0FBQTtJQUNILDZCQUFHLENBQUE7SUFDSCw2QkFBRyxDQUFBO0FBQ0osQ0FBQyxFQUpVLElBQUksS0FBSixJQUFJLFFBSWQ7QUFFRCxJQUFJLFdBQWlCLENBQUE7QUFDckIsUUFBUSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDdEIsS0FBSyxNQUFNO1FBQ1YsV0FBVyxtQkFBVyxDQUFBO1FBQ3RCLE1BQUs7SUFDTixLQUFLLEtBQUssQ0FBQztJQUNYLEtBQUssT0FBTztRQUNYLFdBQVcsbUJBQVcsQ0FBQTtRQUN0QixNQUFLO0lBQ047UUFDQyxXQUFXLG1CQUFXLENBQUE7UUFDdEIsTUFBSztBQUNQLENBQUM7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7RUEwQkU7QUFDRixJQUFJLE1BQVksQ0FBQTtBQUNoQixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsRUFBRSxDQUFDO0lBQzNDLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLEtBQUssT0FB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