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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vcHJvY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQWdCLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFFcEUsSUFBSSxXQUFzRSxDQUFBO0FBRzFFLDZCQUE2QjtBQUM3QixNQUFNLFlBQVksR0FBSSxVQUFrQixDQUFDLE1BQU0sQ0FBQTtBQUMvQyxJQUFJLE9BQU8sWUFBWSxLQUFLLFdBQVcsSUFBSSxPQUFPLFlBQVksQ0FBQyxPQUFPLEtBQUssV0FBVyxFQUFFLENBQUM7SUFDeEYsTUFBTSxjQUFjLEdBQWlCLFlBQVksQ0FBQyxPQUFPLENBQUE7SUFDekQsV0FBVyxHQUFHO1FBQ2IsSUFBSSxRQUFRO1lBQ1gsT0FBTyxjQUFjLENBQUMsUUFBUSxDQUFBO1FBQy9CLENBQUM7UUFDRCxJQUFJLElBQUk7WUFDUCxPQUFPLGNBQWMsQ0FBQyxJQUFJLENBQUE7UUFDM0IsQ0FBQztRQUNELElBQUksR0FBRztZQUNOLE9BQU8sY0FBYyxDQUFDLEdBQUcsQ0FBQTtRQUMxQixDQUFDO1FBQ0QsR0FBRztZQUNGLE9BQU8sY0FBYyxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQzVCLENBQUM7S0FDRCxDQUFBO0FBQ0YsQ0FBQztBQUVELDZCQUE2QjtLQUN4QixJQUFJLE9BQU8sT0FBTyxLQUFLLFdBQVcsSUFBSSxPQUFPLE9BQU8sRUFBRSxRQUFRLEVBQUUsSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO0lBQ3hGLFdBQVcsR0FBRztRQUNiLElBQUksUUFBUTtZQUNYLE9BQU8sT0FBTyxDQUFDLFFBQVEsQ0FBQTtRQUN4QixDQUFDO1FBQ0QsSUFBSSxJQUFJO1lBQ1AsT0FBTyxPQUFPLENBQUMsSUFBSSxDQUFBO1FBQ3BCLENBQUM7UUFDRCxJQUFJLEdBQUc7WUFDTixPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUE7UUFDbkIsQ0FBQztRQUNELEdBQUc7WUFDRixPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLElBQUksT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQ2xELENBQUM7S0FDRCxDQUFBO0FBQ0YsQ0FBQztBQUVELGtCQUFrQjtLQUNiLENBQUM7SUFDTCxXQUFXLEdBQUc7UUFDYixZQUFZO1FBQ1osSUFBSSxRQUFRO1lBQ1gsT0FBTyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQTtRQUM5RCxDQUFDO1FBQ0QsSUFBSSxJQUFJO1lBQ1AsT0FBTyxTQUFTLENBQUEsQ0FBQyw4QkFBOEI7UUFDaEQsQ0FBQztRQUVELGNBQWM7UUFDZCxJQUFJLEdBQUc7WUFDTixPQUFPLEVBQUUsQ0FBQTtRQUNWLENBQUM7UUFDRCxHQUFHO1lBQ0YsT0FBTyxHQUFHLENBQUE7UUFDWCxDQUFDO0tBQ0QsQ0FBQTtBQUNGLENBQUM7QUFFRDs7Ozs7OztHQU9HO0FBQ0gsTUFBTSxDQUFDLE1BQU0sR0FBRyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUE7QUFFbEM7Ozs7O0dBS0c7QUFDSCxNQUFNLENBQUMsTUFBTSxHQUFHLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQTtBQUVsQzs7O0dBR0c7QUFDSCxNQUFNLENBQUMsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQTtBQUU1Qzs7OztHQUlHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUEifQ==