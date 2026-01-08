/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ContextKeyExpr } from '../../contextkey/common/contextkey.js';
import { CONFIG_KEY, DEFAULT_SOURCE_FOLDER, LOCATIONS_CONFIG_KEY } from './constants.js';
/**
 * Configuration helper for the `reusable prompts` feature.
 * @see {@link CONFIG_KEY} and {@link LOCATIONS_CONFIG_KEY}.
 *
 * ### Functions
 *
 * - {@link enabled} allows to check if the feature is enabled
 * - {@link getLocationsValue} allows to current read configuration value
 * - {@link promptSourceFolders} gets list of source folders for prompt files
 *
 * ### File Paths Resolution
 *
 * We resolve only `*.prompt.md` files inside the resulting source folders. Relative paths are resolved
 * relative to:
 *
 * - the current workspace `root`, if applicable, in other words one of the workspace folders
 *   can be used as a prompt files source folder
 * - root of each top-level folder in the workspace (if there are multiple workspace folders)
 * - current root folder (if a single folder is open)
 */
export var PromptsConfig;
(function (PromptsConfig) {
    PromptsConfig.KEY = CONFIG_KEY;
    PromptsConfig.LOCATIONS_KEY = LOCATIONS_CONFIG_KEY;
    /**
     * Checks if the feature is enabled.
     * @see {@link CONFIG_KEY}.
     */
    PromptsConfig.enabled = (configService) => {
        const enabledValue = configService.getValue(CONFIG_KEY);
        return asBoolean(enabledValue) ?? false;
    };
    /**
     * Context key expression for the `reusable prompts` feature `enabled` status.
     */
    PromptsConfig.enabledCtx = ContextKeyExpr.equals(`config.${CONFIG_KEY}`, true);
    /**
     * Get value of the `reusable prompt locations` configuration setting.
     * @see {@link LOCATIONS_CONFIG_KEY}.
     */
    PromptsConfig.getLocationsValue = (configService) => {
        const configValue = configService.getValue(LOCATIONS_CONFIG_KEY);
        if (configValue === undefined || configValue === null || Array.isArray(configValue)) {
            return undefined;
        }
        // note! this would be also true for `null` and `array`,
        // 		 but those cases are already handled above
        if (typeof configValue === 'object') {
            const paths = {};
            for (const [path, value] of Object.entries(configValue)) {
                const cleanPath = path.trim();
                const booleanValue = asBoolean(value);
                // if value can be mapped to a boolean, and the clean
                // path is not empty, add it to the map
                if (booleanValue !== undefined && cleanPath) {
                    paths[cleanPath] = booleanValue;
                }
            }
            return paths;
        }
        return undefined;
    };
    /**
     * Gets list of source folders for prompt files.
     * Defaults to {@link DEFAULT_SOURCE_FOLDER}.
     */
    PromptsConfig.promptSourceFolders = (configService) => {
        const value = PromptsConfig.getLocationsValue(configService);
        // note! the `value &&` part handles the `undefined`, `null`, and `false` cases
        if (value && typeof value === 'object') {
            const paths = [];
            // if the default source folder is not explicitly disabled, add it
            if (value[DEFAULT_SOURCE_FOLDER] !== false) {
                paths.push(DEFAULT_SOURCE_FOLDER);
            }
            // copy all the enabled paths to the result list
            for (const [path, enabled] of Object.entries(value)) {
                // we already added the default source folder, so skip it
                if (enabled === false || path === DEFAULT_SOURCE_FOLDER) {
                    continue;
                }
                paths.push(path);
            }
            return paths;
        }
        // `undefined`, `null`, and `false` cases
        return [];
    };
})(PromptsConfig || (PromptsConfig = {}));
/**
 * Helper to parse an input value of `any` type into a boolean.
 *
 * @param value - input value to parse
 * @returns `true` if the value is the boolean `true` value or a string that can
 * 			be clearly mapped to a boolean (e.g., `"true"`, `"TRUE"`, `"FaLSe"`, etc.),
 * 			`undefined` for rest of the values
 */
function asBoolean(value) {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        const cleanValue = value.trim().toLowerCase();
        if (cleanValue === 'true') {
            return true;
        }
        if (cleanValue === 'false') {
            return false;
        }
        return undefined;
    }
    return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9wcm9tcHRzL2NvbW1vbi9jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRXRFLE9BQU8sRUFBRSxVQUFVLEVBQUUscUJBQXFCLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUV4Rjs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQW1CRztBQUNILE1BQU0sS0FBVyxhQUFhLENBc0Y3QjtBQXRGRCxXQUFpQixhQUFhO0lBQ2hCLGlCQUFHLEdBQUcsVUFBVSxDQUFBO0lBQ2hCLDJCQUFhLEdBQUcsb0JBQW9CLENBQUE7SUFFakQ7OztPQUdHO0lBQ1UscUJBQU8sR0FBRyxDQUFDLGFBQW9DLEVBQVcsRUFBRTtRQUN4RSxNQUFNLFlBQVksR0FBRyxhQUFhLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBRXZELE9BQU8sU0FBUyxDQUFDLFlBQVksQ0FBQyxJQUFJLEtBQUssQ0FBQTtJQUN4QyxDQUFDLENBQUE7SUFFRDs7T0FFRztJQUNVLHdCQUFVLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQyxVQUFVLFVBQVUsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO0lBRTdFOzs7T0FHRztJQUNVLCtCQUFpQixHQUFHLENBQ2hDLGFBQW9DLEVBQ0UsRUFBRTtRQUN4QyxNQUFNLFdBQVcsR0FBRyxhQUFhLENBQUMsUUFBUSxDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFFaEUsSUFBSSxXQUFXLEtBQUssU0FBUyxJQUFJLFdBQVcsS0FBSyxJQUFJLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO1lBQ3JGLE9BQU8sU0FBUyxDQUFBO1FB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