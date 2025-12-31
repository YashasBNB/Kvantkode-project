/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { userInfo } from 'os';
import * as platform from '../common/platform.js';
import { getFirstAvailablePowerShellInstallation } from './powershell.js';
import * as processes from './processes.js';
/**
 * Gets the detected default shell for the _system_, not to be confused with VS Code's _default_
 * shell that the terminal uses by default.
 * @param os The platform to detect the shell of.
 */
export async function getSystemShell(os, env) {
    if (os === 1 /* platform.OperatingSystem.Windows */) {
        if (platform.isWindows) {
            return getSystemShellWindows();
        }
        // Don't detect Windows shell when not on Windows
        return processes.getWindowsShell(env);
    }
    return getSystemShellUnixLike(os, env);
}
let _TERMINAL_DEFAULT_SHELL_UNIX_LIKE = null;
function getSystemShellUnixLike(os, env) {
    // Only use $SHELL for the current OS
    if ((platform.isLinux && os === 2 /* platform.OperatingSystem.Macintosh */) ||
        (platform.isMacintosh && os === 3 /* platform.OperatingSystem.Linux */)) {
        return '/bin/bash';
    }
    if (!_TERMINAL_DEFAULT_SHELL_UNIX_LIKE) {
        let unixLikeTerminal;
        if (platform.isWindows) {
            unixLikeTerminal = '/bin/bash'; // for WSL
        }
        else {
            unixLikeTerminal = env['SHELL'];
            if (!unixLikeTerminal) {
                try {
                    // It's possible for $SHELL to be unset, this API reads /etc/passwd. See https://github.com/github/codespaces/issues/1639
                    // Node docs: "Throws a SystemError if a user has no username or homedir."
                    unixLikeTerminal = userInfo().shell;
                }
                catch (err) { }
            }
            if (!unixLikeTerminal) {
                unixLikeTerminal = 'sh';
            }
            // Some systems have $SHELL set to /bin/false which breaks the terminal
            if (unixLikeTerminal === '/bin/false') {
                unixLikeTerminal = '/bin/bash';
            }
        }
        _TERMINAL_DEFAULT_SHELL_UNIX_LIKE = unixLikeTerminal;
    }
    return _TERMINAL_DEFAULT_SHELL_UNIX_LIKE;
}
let _TERMINAL_DEFAULT_SHELL_WINDOWS = null;
async function getSystemShellWindows() {
    if (!_TERMINAL_DEFAULT_SHELL_WINDOWS) {
        _TERMINAL_DEFAULT_SHELL_WINDOWS = (await getFirstAvailablePowerShellInstallation()).exePath;
    }
    return _TERMINAL_DEFAULT_SHELL_WINDOWS;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hlbGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL25vZGUvc2hlbGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLElBQUksQ0FBQTtBQUM3QixPQUFPLEtBQUssUUFBUSxNQUFNLHVCQUF1QixDQUFBO0FBQ2pELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQ3pFLE9BQU8sS0FBSyxTQUFTLE1BQU0sZ0JBQWdCLENBQUE7QUFFM0M7Ozs7R0FJRztBQUNILE1BQU0sQ0FBQyxLQUFLLFVBQVUsY0FBYyxDQUNuQyxFQUE0QixFQUM1QixHQUFpQztJQUVqQyxJQUFJLEVBQUUsNkNBQXFDLEVBQUUsQ0FBQztRQUM3QyxJQUFJLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUN4QixPQUFPLHFCQUFxQixFQUFFLENBQUE7UUFDL0IsQ0FBQztRQUNELGlEQUFpRDtRQUNqRCxPQUFPLFNBQVMsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDdEMsQ0FBQztJQUVELE9BQU8sc0JBQXNCLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFBO0FBQ3ZDLENBQUM7QUFFRCxJQUFJLGlDQUFpQyxHQUFrQixJQUFJLENBQUE7QUFDM0QsU0FBUyxzQkFBc0IsQ0FDOUIsRUFBNEIsRUFDNUIsR0FBaUM7SUFFakMscUNBQXFDO0lBQ3JDLElBQ0MsQ0FBQyxRQUFRLENBQUMsT0FBTyxJQUFJLEVBQUUsK0NBQXVDLENBQUM7UUFDL0QsQ0FBQyxRQUFRLENBQUMsV0FBVyxJQUFJLEVBQUUsMkNBQW1DLENBQUMsRUFDOUQsQ0FBQztRQUNGLE9BQU8sV0FBVyxDQUFBO0lBQ25CLENBQUM7SUFFRCxJQUFJLENBQUMsaUNBQWlDLEVBQUUsQ0FBQztRQUN4QyxJQUFJLGdCQUEyQyxDQUFBO1FBQy9DLElBQUksUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3hCLGdCQUFnQixHQUFHLFdBQVcsQ0FBQSxDQUFDLFVBQVU7UUFDMUMsQ0FBQzthQUFNLENBQUM7WUFDUCxnQkFBZ0IsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUE7WUFFL0IsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7Z0JBQ3ZCLElBQUksQ0FBQztvQkFDSix5SEFBeUg7b0JBQ3pILDBFQUEwRTtvQkFDMUUsZ0JBQWdCLEdBQUcsUUFBUSxFQUFFLENBQUMsS0FBSyxDQUFBO2dCQUNwQyxDQUFDO2dCQUFDLE9BQU8sR0FBRyxFQUFFLENBQUMsQ0FBQSxDQUFDO1lBQ2pCLENBQUM7WUFFRCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztnQkFDdkIsZ0JBQWdCLEdBQUcsSUFBSSxDQUFBO1lBQ3hCLENBQUM7WUFFRCx1RUFBdUU7WUFDdkUsSUFBSSxnQkFBZ0IsS0FBSyxZQUFZLEVBQUUsQ0FBQztnQkFDdkMsZ0JBQWdCLEdBQUcsV0FBVyxDQUFBO1lBQy9CLENBQUM7UUFDRixDQUFDO1FBQ0QsaUNBQWlDLEdBQUcsZ0JBQWdCLENBQUE7SUFDckQsQ0FBQztJQUNELE9BQU8saUNBQWlDLENBQUE7QUFDekMsQ0FBQztBQUVELElBQUksK0JBQStCLEdBQWtCLElBQUksQ0FBQTtBQUN6RCxLQUFLLFVBQVUscUJBQXFCO0lBQ25DLElBQUksQ0FBQywrQkFBK0IsRUFBRSxDQUFDO1FBQ3RDLCtCQUErQixHQUFHLENBQUMsTUFBTSx1Q0FBdUMsRUFBRSxDQUFFLENBQUMsT0FBTyxDQUFBO0lBQzdGLENBQUM7SUFDRCxPQUFPLCtCQUErQixDQUFBO0FBQ3ZDLENBQUMifQ==