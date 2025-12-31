/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isMacintosh, isWindows } from './platform.js';
let safeProcess;
// Native sandbox environment
const vscodeGlobal = globalThis.vscode;
if (typeof vscodeGlobal !== 'undefined' && typeof vscodeGlobal.process !== 'undefined') {
    const sandboxProcess = vscodeGlobal.process;
    safeProcess = {
        get platform() {
            return sandboxProcess.platform;
        },
        get arch() {
            return sandboxProcess.arch;
        },
        get env() {
            return sandboxProcess.env;
        },
        cwd() {
            return sandboxProcess.cwd();
        },
    };
}
// Native node.js environment
else if (typeof process !== 'undefined' && typeof process?.versions?.node === 'string') {
    safeProcess = {
        get platform() {
            return process.platform;
        },
        get arch() {
            return process.arch;
        },
        get env() {
            return process.env;
        },
        cwd() {
            return process.env['VSCODE_CWD'] || process.cwd();
        },
    };
}
// Web environment
else {
    safeProcess = {
        // Supported
        get platform() {
            return isWindows ? 'win32' : isMacintosh ? 'darwin' : 'linux';
        },
        get arch() {
            return undefined; /* arch is undefined in web */
        },
        // Unsupported
        get env() {
            return {};
        },
        cwd() {
            return '/';
        },
    };
}
/**
 * Provides safe access to the `cwd` property in node.js, sandboxed or web
 * environments.
 *
 * Note: in web, this property is hardcoded to be `/`.
 *
 * @skipMangle
 */
export const cwd = safeProcess.cwd;
/**
 * Provides safe access to the `env` property in node.js, sandboxed or web
 * environments.
 *
 * Note: in web, this property is hardcoded to be `{}`.
 */
export const env = safeProcess.env;
/**
 * Provides safe access to the `platform` property in node.js, sandboxed or web
 * environments.
 */
export const platform = safeProcess.platform;
/**
 * Provides safe access to the `arch` method in node.js, sandboxed or web
 * environments.
 * Note: `arch` is `undefined` in web
 */
export const arch = safeProcess.arch;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL3Byb2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFnQixXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0sZUFBZSxDQUFBO0FBRXBFLElBQUksV0FBc0UsQ0FBQTtBQUcxRSw2QkFBNkI7QUFDN0IsTUFBTSxZQUFZLEdBQUksVUFBa0IsQ0FBQyxNQUFNLENBQUE7QUFDL0MsSUFBSSxPQUFPLFlBQVksS0FBSyxXQUFXLElBQUksT0FBTyxZQUFZLENBQUMsT0FBTyxLQUFLLFdBQVcsRUFBRSxDQUFDO0lBQ3hGLE1BQU0sY0FBYyxHQUFpQixZQUFZLENBQUMsT0FBTyxDQUFBO0lBQ3pELFdBQVcsR0FBRztRQUNiLElBQUksUUFBUTtZQUNYLE9BQU8sY0FBYyxDQUFDLFFBQVEsQ0FBQTtRQUMvQixDQUFDO1FBQ0QsSUFBSSxJQUFJO1lBQ1AsT0FBTyxjQUFjLENBQUMsSUFBSSxDQUFBO1FBQzNCLENBQUM7UUFDRCxJQUFJLEdBQUc7WUFDTixPQUFPLGNBQWMsQ0FBQyxHQUFHLENBQUE7UUFDMUIsQ0FBQztRQUNELEdBQUc7WUFDRixPQUFPLGNBQWMsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtRQUM1QixDQUFDO0tBQ0QsQ0FBQTtBQUNGLENBQUM7QUFFRCw2QkFBNkI7S0FDeEIsSUFBSSxPQUFPLE9BQU8sS0FBSyxXQUFXLElBQUksT0FBTyxPQUFPLEVBQUUsUUFBUSxFQUFFLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztJQUN4RixXQUFXLEdBQUc7UUFDYixJQUFJLFFBQVE7WUFDWCxPQUFPLE9BQU8sQ0FBQyxRQUFRLENBQUE7UUFDeEIsQ0FBQztRQUNELElBQUksSUFBSTtZQUNQLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQTtRQUNwQixDQUFDO1FBQ0QsSUFBSSxHQUFHO1lBQ04sT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFBO1FBQ25CLENBQUM7UUFDRCxHQUFHO1lBQ0YsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxJQUFJLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQTtRQUNsRCxDQUFDO0tBQ0QsQ0FBQTtBQUNGLENBQUM7QUFFRCxrQkFBa0I7S0FDYixDQUFDO0lBQ0wsV0FBVyxHQUFHO1FBQ2IsWUFBWTtRQUNaLElBQUksUUFBUTtZQUNYLE9BQU8sU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUE7UUFDOUQsQ0FBQztRQUNELElBQUksSUFBSTtZQUNQLE9BQU8sU0FBUyxDQUFBLENBQUMsOEJBQThCO1FBQ2hELENBQUM7UUFFRCxjQUFjO1FBQ2QsSUFBSSxHQUFHO1lBQ04sT0FBTyxFQUFFLENBQUE7UUFDVixDQUFDO1FBQ0QsR0FBRztZQUNGLE9BQU8sR0FBRyxDQUFBO1FBQ1gsQ0FBQztLQUNELENBQUE7QUFDRixDQUFDO0FBRUQ7Ozs7Ozs7R0FPRztBQUNILE1BQU0sQ0FBQyxNQUFNLEdBQUcsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFBO0FBRWxDOzs7OztHQUtHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sR0FBRyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUE7QUFFbEM7OztHQUdHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUE7QUFFNUM7Ozs7R0FJRztBQUNILE1BQU0sQ0FBQyxNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFBIn0=