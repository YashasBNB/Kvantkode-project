/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isLinux } from './platform.js';
export var Source;
(function (Source) {
    Source[Source["stdout"] = 0] = "stdout";
    Source[Source["stderr"] = 1] = "stderr";
})(Source || (Source = {}));
export var TerminateResponseCode;
(function (TerminateResponseCode) {
    TerminateResponseCode[TerminateResponseCode["Success"] = 0] = "Success";
    TerminateResponseCode[TerminateResponseCode["Unknown"] = 1] = "Unknown";
    TerminateResponseCode[TerminateResponseCode["AccessDenied"] = 2] = "AccessDenied";
    TerminateResponseCode[TerminateResponseCode["ProcessNotFound"] = 3] = "ProcessNotFound";
})(TerminateResponseCode || (TerminateResponseCode = {}));
/**
 * Sanitizes a VS Code process environment by removing all Electron/VS Code-related values.
 */
export function sanitizeProcessEnvironment(env, ...preserve) {
    const set = preserve.reduce((set, key) => {
        set[key] = true;
        return set;
    }, {});
    const keysToRemove = [
        /^ELECTRON_.+$/,
        /^VSCODE_(?!(PORTABLE|SHELL_LOGIN|ENV_REPLACE|ENV_APPEND|ENV_PREPEND)).+$/,
        /^SNAP(|_.*)$/,
        /^GDK_PIXBUF_.+$/,
    ];
    const envKeys = Object.keys(env);
    envKeys
        .filter((key) => !set[key])
        .forEach((envKey) => {
        for (let i = 0; i < keysToRemove.length; i++) {
            if (envKey.search(keysToRemove[i]) !== -1) {
                delete env[envKey];
                break;
            }
        }
    });
}
/**
 * Remove dangerous environment variables that have caused crashes
 * in forked processes (i.e. in ELECTRON_RUN_AS_NODE processes)
 *
 * @param env The env object to change
 */
export function removeDangerousEnvVariables(env) {
    if (!env) {
        return;
    }
    // Unset `DEBUG`, as an invalid value might lead to process crashes
    // See https://github.com/microsoft/vscode/issues/130072
    delete env['DEBUG'];
    if (isLinux) {
        // Unset `LD_PRELOAD`, as it might lead to process crashes
        // See https://github.com/microsoft/vscode/issues/134177
        delete env['LD_PRELOAD'];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9wcm9jZXNzZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUF1QixPQUFPLEVBQUUsTUFBTSxlQUFlLENBQUE7QUErQzVELE1BQU0sQ0FBTixJQUFrQixNQUdqQjtBQUhELFdBQWtCLE1BQU07SUFDdkIsdUNBQU0sQ0FBQTtJQUNOLHVDQUFNLENBQUE7QUFDUCxDQUFDLEVBSGlCLE1BQU0sS0FBTixNQUFNLFFBR3ZCO0FBMkJELE1BQU0sQ0FBTixJQUFrQixxQkFLakI7QUFMRCxXQUFrQixxQkFBcUI7SUFDdEMsdUVBQVcsQ0FBQTtJQUNYLHVFQUFXLENBQUE7SUFDWCxpRkFBZ0IsQ0FBQTtJQUNoQix1RkFBbUIsQ0FBQTtBQUNwQixDQUFDLEVBTGlCLHFCQUFxQixLQUFyQixxQkFBcUIsUUFLdEM7QUFhRDs7R0FFRztBQUNILE1BQU0sVUFBVSwwQkFBMEIsQ0FBQyxHQUF3QixFQUFFLEdBQUcsUUFBa0I7SUFDekYsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBMEIsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7UUFDakUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQTtRQUNmLE9BQU8sR0FBRyxDQUFBO0lBQ1gsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQ04sTUFBTSxZQUFZLEdBQUc7UUFDcEIsZUFBZTtRQUNmLDBFQUEwRTtRQUMxRSxjQUFjO1FBQ2QsaUJBQWlCO0tBQ2pCLENBQUE7SUFDRCxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ2hDLE9BQU87U0FDTCxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQzFCLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1FBQ25CLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDOUMsSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQzNDLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUNsQixNQUFLO1lBQ04sQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQTtBQUNKLENBQUM7QUFFRDs7Ozs7R0FLRztBQUNILE1BQU0sVUFBVSwyQkFBMkIsQ0FBQyxHQUFvQztJQUMvRSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDVixPQUFNO0lBQ1AsQ0FBQztJQUVELG1FQUFtRTtJQUNuRSx3REFBd0Q7SUFDeEQsT0FBTyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUE7SUFFbkIsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUNiLDBEQUEwRDtRQUMxRCx3REFBd0Q7UUFDeEQsT0FBTyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDekIsQ0FBQztBQUNGLENBQUMifQ==