/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as os from 'os';
import * as path from 'path';
const cwd = process.env['VSCODE_CWD'] || process.cwd();
/**
 * Returns the user data path to use with some rules:
 * - respect portable mode
 * - respect VSCODE_APPDATA environment variable
 * - respect --user-data-dir CLI argument
 */
export function getUserDataPath(cliArgs, productName) {
    const userDataPath = doGetUserDataPath(cliArgs, productName);
    const pathsToResolve = [userDataPath];
    // If the user-data-path is not absolute, make
    // sure to resolve it against the passed in
    // current working directory. We cannot use the
    // node.js `path.resolve()` logic because it will
    // not pick up our `VSCODE_CWD` environment variable
    // (https://github.com/microsoft/vscode/issues/120269)
    if (!path.isAbsolute(userDataPath)) {
        pathsToResolve.unshift(cwd);
    }
    return path.resolve(...pathsToResolve);
}
function doGetUserDataPath(cliArgs, productName) {
    // 0. Running out of sources has a fixed productName
    if (process.env['VSCODE_DEV']) {
        productName = 'code-oss-dev';
    }
    // 1. Support portable mode
    const portablePath = process.env['VSCODE_PORTABLE'];
    if (portablePath) {
        return path.join(portablePath, 'user-data');
    }
    // 2. Support global VSCODE_APPDATA environment variable
    let appDataPath = process.env['VSCODE_APPDATA'];
    if (appDataPath) {
        return path.join(appDataPath, productName);
    }
    // With Electron>=13 --user-data-dir switch will be propagated to
    // all processes https://github.com/electron/electron/blob/1897b14af36a02e9aa7e4d814159303441548251/shell/browser/electron_browser_client.cc#L546-L553
    // Check VSCODE_PORTABLE and VSCODE_APPDATA before this case to get correct values.
    // 3. Support explicit --user-data-dir
    const cliPath = cliArgs['user-data-dir'];
    if (cliPath) {
        return cliPath;
    }
    // 4. Otherwise check per platform
    switch (process.platform) {
        case 'win32':
            appDataPath = process.env['APPDATA'];
            if (!appDataPath) {
                const userProfile = process.env['USERPROFILE'];
                if (typeof userProfile !== 'string') {
                    throw new Error('Windows: Unexpected undefined %USERPROFILE% environment variable');
                }
                appDataPath = path.join(userProfile, 'AppData', 'Roaming');
            }
            break;
        case 'darwin':
            appDataPath = path.join(os.homedir(), 'Library', 'Application Support');
            break;
        case 'linux':
            appDataPath = process.env['XDG_CONFIG_HOME'] || path.join(os.homedir(), '.config');
            break;
        default:
            throw new Error('Platform not supported');
    }
    return path.join(appDataPath, productName);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQYXRoLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZW52aXJvbm1lbnQvbm9kZS91c2VyRGF0YVBhdGgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDeEIsT0FBTyxLQUFLLElBQUksTUFBTSxNQUFNLENBQUE7QUFHNUIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsSUFBSSxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUE7QUFFdEQ7Ozs7O0dBS0c7QUFDSCxNQUFNLFVBQVUsZUFBZSxDQUFDLE9BQXlCLEVBQUUsV0FBbUI7SUFDN0UsTUFBTSxZQUFZLEdBQUcsaUJBQWlCLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFBO0lBQzVELE1BQU0sY0FBYyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7SUFFckMsOENBQThDO0lBQzlDLDJDQUEyQztJQUMzQywrQ0FBK0M7SUFDL0MsaURBQWlEO0lBQ2pELG9EQUFvRDtJQUNwRCxzREFBc0Q7SUFDdEQsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQztRQUNwQyxjQUFjLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQzVCLENBQUM7SUFFRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxjQUFjLENBQUMsQ0FBQTtBQUN2QyxDQUFDO0FBRUQsU0FBUyxpQkFBaUIsQ0FBQyxPQUF5QixFQUFFLFdBQW1CO0lBQ3hFLG9EQUFvRDtJQUNwRCxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQztRQUMvQixXQUFXLEdBQUcsY0FBYyxDQUFBO0lBQzdCLENBQUM7SUFFRCwyQkFBMkI7SUFDM0IsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ25ELElBQUksWUFBWSxFQUFFLENBQUM7UUFDbEIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxXQUFXLENBQUMsQ0FBQTtJQUM1QyxDQUFDO0lBRUQsd0RBQXdEO0lBQ3hELElBQUksV0FBVyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtJQUMvQyxJQUFJLFdBQVcsRUFBRSxDQUFDO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELGlFQUFpRTtJQUNqRSxzSkFBc0o7SUFDdEosbUZBQW1GO0lBQ25GLHNDQUFzQztJQUN0QyxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUE7SUFDeEMsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUNiLE9BQU8sT0FBTyxDQUFBO0lBQ2YsQ0FBQztJQUVELGtDQUFrQztJQUNsQyxRQUFRLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUMxQixLQUFLLE9BQU87WUFDWCxXQUFXLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUNwQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ2xCLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7Z0JBQzlDLElBQUksT0FBTyxXQUFXLEtBQUssUUFBUSxFQUFFLENBQUM7b0JBQ3JDLE1BQU0sSUFBSSxLQUFLLENBQUMsa0VBQWtFLENBQUMsQ0FBQTtnQkFDcEYsQ0FBQztnQkFFRCxXQUFXLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQzNELENBQUM7WUFDRCxNQUFLO1FBQ04sS0FBSyxRQUFRO1lBQ1osV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxFQUFFLFNBQVMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFBO1lBQ3ZFLE1BQUs7UUFDTixLQUFLLE9BQU87WUFDWCxXQUFXLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQ2xGLE1BQUs7UUFDTjtZQUNDLE1BQU0sSUFBSSxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxXQUFXLENBQUMsQ0FBQTtBQUMzQyxDQUFDIn0=