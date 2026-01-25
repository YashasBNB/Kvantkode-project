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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hlbGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2Uvbm9kZS9zaGVsbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQzdCLE9BQU8sS0FBSyxRQUFRLE1BQU0sdUJBQXVCLENBQUE7QUFDakQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDekUsT0FBTyxLQUFLLFNBQVMsTUFBTSxnQkFBZ0IsQ0FBQTtBQUUzQzs7OztHQUlHO0FBQ0gsTUFBTSxDQUFDLEtBQUssVUFBVSxjQUFjLENBQ25DLEVBQTRCLEVBQzVCLEdBQWlDO0lBRWpDLElBQUksRUFBRSw2Q0FBcUMsRUFBRSxDQUFDO1FBQzdDLElBQUksUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3hCLE9BQU8scUJBQXFCLEVBQUUsQ0FBQTtRQUMvQixDQUFDO1FBQ0QsaURBQWlEO1FBQ2pELE9BQU8sU0FBUyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUN0QyxDQUFDO0lBRUQsT0FBTyxzQkFBc0IsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7QUFDdkMsQ0FBQztBQUVELElBQUksaUNBQWlDLEdBQWtCLElBQUksQ0FBQTtBQUMzRCxTQUFTLHNCQUFzQixDQUM5QixFQUE0QixFQUM1QixHQUFpQztJQUVqQyxxQ0FBcUM7SUFDckMsSUFDQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLElBQUksRUFBRSwrQ0FBdUMsQ0FBQztRQUMvRCxDQUFDLFFBQVEsQ0FBQyxXQUFXLElBQUksRUFBRSwyQ0FBbUMsQ0FBQyxFQUM5RCxDQUFDO1FBQ0YsT0FBTyxXQUFXLENBQUE7SUFDbkIsQ0FBQztJQUVELElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxDQUFDO1FBQ3hDLElBQUksZ0JBQTJDLENBQUE7UUFDL0MsSUFBSSxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDeEIsZ0JBQWdCLEdBQUcsV0FBVyxDQUFBLENBQUMsVUFBVTtRQUMxQyxDQUFDO2FBQU0sQ0FBQztZQUNQLGdCQUFnQixHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUUvQixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztnQkFDdkIsSUFBSSxDQUFDO29CQUNKLHlIQUF5SDtvQkFDekgsMEVBQTBFO29CQUMxRSxnQkFBZ0IsR0FBRyxRQUFRLEVBQUUsQ0FBQyxLQUFLLENBQUE7Z0JBQ3BDLENBQUM7Z0JBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQyxDQUFBLENBQUM7WUFDakIsQ0FBQztZQUVELElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO2dCQUN2QixnQkFBZ0IsR0FBRyxJQUFJLENBQUE7WUFDeEIsQ0FBQztZQUVELHVFQUF1RTtZQUN2RSxJQUFJLGdCQUFnQixLQUFLLFlBQVksRUFBRSxDQUFDO2dCQUN2QyxnQkFBZ0IsR0FBRyxXQUFXLENBQUE7WUFDL0IsQ0FBQztRQUNGLENBQUM7UUFDRCxpQ0FBaUMsR0FBRyxnQkFBZ0IsQ0FBQTtJQUNyRCxDQUFDO0lBQ0QsT0FBTyxpQ0FBaUMsQ0FBQTtBQUN6QyxDQUFDO0FBRUQsSUFBSSwrQkFBK0IsR0FBa0IsSUFBSSxDQUFBO0FBQ3pELEtBQUssVUFBVSxxQkFBcUI7SUFDbkMsSUFBSSxDQUFDLCtCQUErQixFQUFFLENBQUM7UUFDdEMsK0JBQStCLEdBQUcsQ0FBQyxNQUFNLHVDQUF1QyxFQUFFLENBQUUsQ0FBQyxPQUFPLENBQUE7SUFDN0YsQ0FBQztJQUNELE9BQU8sK0JBQStCLENBQUE7QUFDdkMsQ0FBQyJ9